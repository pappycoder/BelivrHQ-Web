import { LEGACY_BRAND } from "../brand/identity";
import type { Workspace } from "./types";

const DB_NAME = "belivrhq-offline-v1";
const STORE = "vault";
const SLOT = "workspace";
interface Envelope {
  revision: number;
  salt: Uint8Array<ArrayBuffer>;
  iv: Uint8Array<ArrayBuffer>;
  ciphertext: ArrayBuffer;
}

export interface VaultStorage {
  read(): Promise<Envelope | undefined>;
  compareAndSwap(
    previousRevision: number | undefined,
    next: Envelope | undefined,
  ): Promise<void>;
}

let selectedDatabase: Promise<string> | undefined;
async function databaseName() {
  if (!selectedDatabase) selectedDatabase = (async () => {
    // Probe the old store without creating one. Existing outboxes remain authoritative.
    return new Promise<string>((resolve) => {
      const probe = indexedDB.open(LEGACY_BRAND.offlineDatabase);
      let missing = false;
      probe.onupgradeneeded = () => { missing = true; probe.transaction?.abort(); };
      probe.onerror = () => resolve(DB_NAME);
      probe.onsuccess = () => { probe.result.close(); resolve(missing ? DB_NAME : LEGACY_BRAND.offlineDatabase); };
      probe.onblocked = () => resolve(LEGACY_BRAND.offlineDatabase);
    });
  })();
  return selectedDatabase;
}
async function database(): Promise<IDBDatabase> {
  const name = await databaseName();
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error("Close other BelivrHQ tabs and try again."));
  });
}

export const indexedDbStorage: VaultStorage = {
  async read() {
    const db = await database();
    try {
      return await new Promise<Envelope | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const request = tx.objectStore(STORE).get(SLOT);
        tx.oncomplete = () => resolve(request.result);
        tx.onabort = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  },
  async compareAndSwap(previousRevision, next) {
    const db = await database();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        const store = tx.objectStore(STORE);
        const request = store.get(SLOT);
        let conflict = false;
        request.onsuccess = () => {
          if (
            (request.result as Envelope | undefined)?.revision !==
            previousRevision
          ) {
            conflict = true;
            tx.abort();
            return;
          }
          if (next) store.put(next, SLOT);
          else store.delete(SLOT);
        };
        tx.oncomplete = () => resolve();
        tx.onabort = () =>
          reject(
            new Error(
              conflict
                ? "Workspace changed in another tab. Reload it before editing."
                : "Unable to save offline data. Check available device storage.",
            ),
          );
      });
    } finally {
      db.close();
    }
  },
};

async function derive(passphrase: string, salt: Uint8Array<ArrayBuffer>) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 600000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export class OfflineVault {
  private key?: CryptoKey;
  private salt?: Uint8Array<ArrayBuffer>;
  private owner?: string;
  private lockVersion = 0;
  private sequence: Promise<unknown> = Promise.resolve();
  constructor(private readonly storage: VaultStorage = indexedDbStorage) {}
  async exists() {
    return !!(await this.storage.read());
  }
  lock() {
    this.lockVersion++;
    this.key = undefined;
    this.salt = undefined;
    this.owner = undefined;
  }
  get unlocked() {
    return !!this.key;
  }

  async enable(passphrase: string, workspace: Workspace) {
    const lockVersion = this.lockVersion;
    if (passphrase.length < 12)
      throw new Error("Use a passphrase with at least 12 characters.");
    if (await this.exists())
      throw new Error(
        "An offline workspace already exists. Unlock it to sync or remove it first.",
      );
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await derive(passphrase, salt);
    const next = await this.encrypt(workspace, key, salt, 1);
    if (lockVersion !== this.lockVersion)
      throw new Error("Preparation was cancelled. Try again while signed in.");
    await this.storage.compareAndSwap(undefined, next);
    if (lockVersion !== this.lockVersion)
      throw new Error("Workspace was saved but locked. Unlock it to continue.");
    this.key = key;
    this.salt = salt;
    this.owner = workspace.profileId;
  }

  async unlock(passphrase: string) {
    const lockVersion = this.lockVersion;
    const stored = await this.storage.read();
    if (!stored)
      throw new Error("Enable offline access while connected first.");
    const key = await derive(passphrase, stored.salt);
    let workspace: Workspace;
    try {
      workspace = await this.decrypt(stored, key);
    } catch {
      throw new Error("Unable to unlock. Check your passphrase.");
    }
    if (lockVersion !== this.lockVersion)
      throw new Error("Unlock was cancelled. Try again.");
    this.key = key;
    this.salt = stored.salt;
    this.owner = workspace.profileId;
    return workspace;
  }

  async read() {
    const key = this.key;
    if (!key) throw new Error("Unlock the offline workspace first.");
    const stored = await this.storage.read();
    if (!stored) throw new Error("Offline workspace was removed.");
    const data = await this.decrypt(stored, key);
    if (data.profileId !== this.owner)
      throw new Error("This workspace belongs to a different account.");
    return data;
  }

  /** Encrypt first, then atomically commit data and outbox together. UI only updates after commit. */
  update(change: (workspace: Workspace) => Workspace | Promise<Workspace>) {
    const run = async () => {
      const key = this.key,
        salt = this.salt,
        owner = this.owner;
      if (!key || !salt) throw new Error("Unlock the offline workspace first.");
      const stored = await this.storage.read();
      if (!stored) throw new Error("Offline workspace was removed.");
      const old = await this.decrypt(stored, key);
      if (old.profileId !== owner)
        throw new Error("Account changed. Unlock again.");
      const updated = await change(old);
      if (
        updated.profileId !== old.profileId ||
        updated.churchId !== old.churchId ||
        updated.branchId !== old.branchId
      )
        throw new Error("Workspace scope cannot change while editing.");
      const encrypted = await this.encrypt(
        updated,
        key,
        salt,
        stored.revision + 1,
      );
      if (key !== this.key)
        throw new Error(
          "Workspace locked before the save completed. Unlock and try again.",
        );
      await this.storage.compareAndSwap(stored.revision, encrypted);
      return updated;
    };
    const pending = this.sequence.then(run, run);
    this.sequence = pending.catch(() => undefined);
    return pending;
  }

  async remove(allowDiscardPending = false) {
    await this.sequence;
    const key = this.key;
    if (!key) throw new Error("Unlock the offline workspace first.");
    const stored = await this.storage.read();
    if (!stored) return;
    const current = await this.decrypt(stored, key);
    if (
      (current.outbox.length ||
        Object.values(current.drafts).some(
          (draft) => Object.keys(draft).length,
        )) &&
      !allowDiscardPending
    )
      throw new Error(
        "Sync or export your pending changes and drafts before removing this workspace.",
      );
    await this.storage.compareAndSwap(stored.revision, undefined);
    this.lock();
  }

  private async encrypt(
    data: Workspace,
    key: CryptoKey,
    salt: Uint8Array<ArrayBuffer>,
    revision: number,
  ): Promise<Envelope> {
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    if (encoded.byteLength > 20 * 1024 * 1024)
      throw new Error("Offline workspace exceeds the 20 MB device limit.");
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: new TextEncoder().encode(LEGACY_BRAND.offlineAad),
      },
      key,
      encoded,
    );
    return { revision, salt, iv, ciphertext };
  }
  private async decrypt(stored: Envelope, key: CryptoKey): Promise<Workspace> {
    const raw = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: stored.iv,
        additionalData: new TextEncoder().encode(LEGACY_BRAND.offlineAad),
      },
      key,
      stored.ciphertext,
    );
    return JSON.parse(new TextDecoder().decode(raw)) as Workspace;
  }
}

export const offlineVault = new OfflineVault();
