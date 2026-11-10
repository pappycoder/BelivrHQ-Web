"use client";

import { RequiredFieldsNotice } from "@/components/ui/required-fields";
import { LEGACY_BRAND } from "@/lib/brand/identity";


import { LoadingState } from "@/components/shared/loading-state";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  LockKeyhole,
  RefreshCw,
  WifiOff,
  Download,
} from "lucide-react";
import { api } from "@/lib/api";
import { fetchCurrentProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TablePagination } from "@/components/shared/table-pagination";
import { BrandLogo } from "@/components/shared/brand-logo";
import { toast } from "@/lib/toast";
import { usePermissions } from "@/hooks/use-permissions";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { offlineVault } from "@/lib/offline/vault";
import {
  assertLease,
  OfflineSync,
  queueMutation,
  recordMutation,
  visibleRecords,
} from "@/lib/offline/engine";
import type {
  Ack,
  OfflineRecord,
  PersonEntity,
  Snapshot,
  Workspace,
} from "@/lib/offline/types";

const sync = new OfflineSync(offlineVault, {
  identity: fetchCurrentProfile,
  push: (mutations, owner) =>
    api.post<Ack[]>("/offline/push", { mutations, ...owner }),
  snapshot: (branchId) =>
    api.get<Snapshot>(
      `/offline/snapshot?branchId=${encodeURIComponent(branchId)}`,
    ),
});
const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : ((error as { message?: string })?.message ??
      "Unable to complete this action.");
const contactLabels: Record<string, string> = {
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  phone: "Phone",
  notes: "Notes",
};

export function OfflineWorkspace() {
  const { ready: permissionsReady, can } = usePermissions();
  const [workspace, setStoredWorkspace] = useState<Workspace>();
  const setWorkspace = (value: Workspace | undefined) => {
    if (!value || offlineVault.unlocked) setStoredWorkspace(value);
  };
  const [exists, setExists] = useState<boolean>();
  const [online, setOnline] = useState(true);
  const [leaseNow, setLeaseNow] = useState(Date.now);
  const [busy, setBusy] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [branchId, setBranchId] = useState("");
  const [branchLocked, setBranchLocked] = useState(false);
  const [tab, setTab] = useState<PersonEntity | "form" | "queue">("member");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [editor, setEditor] = useState<{
    entity: PersonEntity;
    row?: OfflineRecord;
  }>();
  const [contact, setContact] = useState<Record<string, string>>({});
  const [form, setForm] = useState<OfflineRecord>();
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const activity = useRef(Date.now());
  useUnsavedChanges(!!editor || !!form);
  const lock = useCallback(() => {
    offlineVault.lock();
    setStoredWorkspace(undefined);
    setPassphrase("");
    setEditor(undefined);
    setForm(undefined);
    setContact({});
    setAnswers({});
  }, []);
  const action = useCallback(async (run: () => Promise<void>) => {
    setBusy(true);
    try {
      await run();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }, []);
  const synchronize = useCallback(
    () =>
      action(async () => {
        const updated = await sync.run();
        if (offlineVault.unlocked) setStoredWorkspace(updated);
        toast.success(
          updated.outbox.length
            ? "Sync finished. Review the remaining changes."
            : "Workspace is up to date.",
        );
      }),
    [action],
  );

  useEffect(() => {
    setOnline(navigator.onLine);
    offlineVault
      .exists()
      .then(setExists)
      .catch((error) => toast.error(errorMessage(error)));
    const connected = () => {
      setOnline(true);
      if (offlineVault.unlocked) void synchronize();
    };
    const disconnected = () => setOnline(false);
    const active = () => {
      activity.current = Date.now();
    };
    const channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel("belivrhq-session")
        : undefined;
    if (channel) channel.onmessage = () => lock();
    window.addEventListener("online", connected);
    window.addEventListener("offline", disconnected);
    window.addEventListener("belivrhq-session-ended", lock);
    window.addEventListener(LEGACY_BRAND.sessionEnded, lock);
    window.addEventListener("pointerdown", active);
    window.addEventListener("keydown", active);
    const timer = window.setInterval(() => {
      setLeaseNow(Date.now());
      if (Date.now() - activity.current > 15 * 60000) lock();
    }, 30000);
    return () => {
      channel?.close();
      clearInterval(timer);
      window.removeEventListener("online", connected);
      window.removeEventListener("offline", disconnected);
      window.removeEventListener("belivrhq-session-ended", lock);
      window.removeEventListener(LEGACY_BRAND.sessionEnded, lock);
      window.removeEventListener("pointerdown", active);
      window.removeEventListener("keydown", active);
      offlineVault.lock();
    };
  }, [lock, synchronize]);
  const expired = workspace
    ? !workspace.permissions.includes("offline:read") ||
      !Number.isFinite(Date.parse(workspace.expiresAt)) ||
      Math.max(leaseNow, Date.now()) >= Date.parse(workspace.expiresAt)
    : false;
  const records =
    workspace && !expired && (tab === "member" || tab === "visitor")
      ? visibleRecords(workspace, tab).filter((row) =>
          `${row.first_name} ${row.last_name ?? ""} ${row.email ?? ""} ${row.phone ?? ""}`
            .toLowerCase()
            .includes(search.toLowerCase()),
        )
      : [];

  const prepareBranches = () =>
    action(async () => {
      const profile = await fetchCurrentProfile();
      if (!profile.permissions?.includes("offline:read"))
        throw new Error(
          "Offline workspace access is not permitted for this account.",
        );
      if (!profile.isAdminHq) {
        if (!profile.branchId)
          throw new Error(
            "Your account needs a branch before enabling offline access.",
          );
        setBranches([
          { id: profile.branchId, name: profile.branch?.name ?? "Your branch" },
        ]);
        setBranchId(profile.branchId);
        setBranchLocked(true);
        return;
      }
      const response = await api.get<{
        data: { branchId: string; name: string }[];
      }>("/branches?limit=100");
      const available = response.data.map(branch => ({ id: branch.branchId, name: branch.name }));
      setBranches(available);
      setBranchLocked(false);
      setBranchId(current => available.some(branch => branch.id === current)
        ? current : available.length === 1 ? available[0].id : "");
      if (!available.length) throw new Error("No active branches are available to prepare for offline access.");
    });
  const enable = () =>
    action(async () => {
      if (!branchId) throw new Error("Choose a branch to prepare.");
      const snapshot = await api.get<Snapshot>(
        `/offline/snapshot?branchId=${encodeURIComponent(branchId)}`,
      );
      const initial: Workspace = {
        ...snapshot,
        outbox: [],
        drafts: {},
        lastSyncedAt: snapshot.issuedAt,
      };
      await offlineVault.enable(passphrase, initial);
      await navigator.storage?.persist?.().catch(() => false);
      setWorkspace(initial);
      setExists(true);
      setPassphrase("");
      toast.success("Offline access enabled on this device.");
    });
  const unlock = () =>
    action(async () => {
      const current = await offlineVault.unlock(passphrase);
      setPassphrase("");
      setWorkspace(current);
      if (navigator.onLine) setWorkspace(await sync.run());
    });
  const startEdit = (entity: PersonEntity, row?: OfflineRecord) => {
    setEditor({ entity, row });
    setContact({
      firstName: row?.first_name ?? "",
      lastName: row?.last_name ?? "",
      email: row?.email ?? "",
      phone: row?.phone ?? "",
      notes: row?.notes ?? "",
    });
  };
  const saveContact = () =>
    action(async () => {
      if (!workspace || !editor) return;
      const data = Object.fromEntries(
        Object.entries(contact).filter(([, value]) => value || editor.row),
      );
      if (
        !contact.firstName?.trim() ||
        (editor.entity === "member" && !contact.lastName?.trim())
      )
        throw new Error("Enter the required name fields before saving.");
      const updated = await queueMutation(
        offlineVault,
        recordMutation(editor.entity, editor.row, data, workspace.branchId),
      );
      setWorkspace(updated);
      setEditor(undefined);
      toast.success("Saved on this device.");
      if (navigator.onLine) setWorkspace(await sync.run());
    });
  const saveForm = (submit: boolean) =>
    action(async () => {
      if (!workspace || !form) return;
      assertLease(workspace);
      if (
        submit &&
        form.fields?.some(
          (field) =>
            field.required &&
            (answers[field.key] === undefined ||
              answers[field.key] === "" ||
              (Array.isArray(answers[field.key]) &&
                (answers[field.key] as unknown[]).length === 0)),
        )
      )
        throw new Error(
          "Complete the required form fields before queuing a submission.",
        );
      if (submit)
        await queueMutation(offlineVault, {
          mutationId: crypto.randomUUID(),
          entityId: crypto.randomUUID(),
          entity: "submission",
          action: "create",
          branchId: workspace.branchId,
          formId: form.id,
          baseVersion: form.updated_at,
          data: answers,
        });
      const updated = await offlineVault.update((current) => ({
        ...current,
        drafts: { ...current.drafts, [form.id]: submit ? {} : answers },
      }));
      setWorkspace(updated);
      setForm(undefined);
      toast.success(
        submit
          ? "Submission queued on this device."
          : "Draft saved on this device.",
      );
      if (submit && navigator.onLine) setWorkspace(await sync.run());
    });
  const exportPending = () => {
    if (!workspace) return;
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            {
              branch: workspace.branchName,
              outbox: workspace.outbox,
              drafts: workspace.drafts,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "belivrhq-pending-changes.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.info("Export contains personal data. Keep it securely.");
  };
  const review = (mutationId: string) =>
    action(async () => {
      const latest = await sync.run();
      const item = latest.outbox.find(
        (change) => change.mutationId === mutationId,
      );
      if (!item) {
        setWorkspace(latest);
        return;
      }
      setWorkspace(latest);
      const row =
        item.entity === "submission"
          ? latest.records.form.find((record) => record.id === item.formId)
          : latest.records[item.entity].find(
              (record) => record.id === item.entityId,
            );
      if (!row && item.action === "update")
        throw new Error(
          "The record is no longer available. Export your pending changes before discarding.",
        );
      if (
        !window.confirm(
          `Keep your saved changes against the latest server version?\n\nLatest server data:\n${JSON.stringify(row ?? {}, null, 2)}`,
        )
      )
        return;
      setWorkspace(
        await offlineVault.update((current) => ({
          ...current,
          outbox: current.outbox.map((change) =>
            change.mutationId === mutationId
              ? {
                  ...change,
                  mutationId: crypto.randomUUID(),
                  baseVersion: row?.updated_at,
                  status: "pending",
                  message: undefined,
                }
              : change,
          ),
        })),
      );
      toast.info(
        "Your changes are queued against the latest version. Select Sync now to apply them.",
      );
    });

  if (permissionsReady && !can("offline", "read")) {
    return (
      <main className="min-h-dvh bg-background px-4 py-12">
        <Card className="mx-auto max-w-lg">
          <CardHeader>
            <CardTitle>Offline access unavailable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Your account does not have permission to use the offline
              workspace.
            </p>
            <Button asChild>
              <Link href="/home" prefetch={false}>Back to BelivrHQ</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-background px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandLogo variant="mark" emblemClassName="h-10 w-10" />
            <div>
              <h1 className="text-2xl font-semibold">Offline workspace</h1>
              <p className="text-sm text-muted-foreground">
                {workspace?.branchName ??
                  "Continue through connection interruptions"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-2 text-sm">
              {!online && <WifiOff size={16} />}
              {online ? "Connected" : "Offline"}
            </span>
            <Button variant="outline" asChild>
              <Link href="/home" prefetch={false}>Back to BelivrHQ</Link>
            </Button>
            {workspace && (
              <Button variant="outline" onClick={lock}>
                <LockKeyhole size={16} />
                Lock
              </Button>
            )}
          </div>
        </header>
        {busy && (
          <LoadingState label="Loading offline workspace" variant="detail" />
        )}
        {!workspace ? (
          <Card className="mx-auto max-w-lg">
            <CardHeader>
              <CardTitle>
                {exists ? "Unlock this device" : "Enable offline access"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-muted-foreground">
                {exists
                  ? "Use your offline passphrase. Server sign-in still requires internet and your normal verification."
                  : "Sign in online first and prepare one branch. Members, visitors and published forms are encrypted on this device for seven days. Use a trusted personal device."}
              </p>
              {!exists && (
                <>
                  <Button
                    variant="outline"
                    onClick={prepareBranches}
                    disabled={!online || busy}
                  >
                    Load available branches
                  </Button>
                  {branches.length > 0 && (
                    <div className="space-y-2">
                      <Label required htmlFor="offline-branch">Branch</Label>
                      <select
                        id="offline-branch"
                        className="h-11 w-full rounded-xl border bg-background px-3"
                        value={branchId}
                        onChange={(event) => setBranchId(event.target.value)}
                        disabled={branchLocked || busy || !online}
                      >
                        <option value="">Choose a branch</option>
                        {branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                      {branchLocked && <p className="text-xs text-muted-foreground">Offline access is limited to your assigned branch.</p>}
                    </div>
                  )}
                </>
              )}
              <div className="space-y-2">
                <Label required htmlFor="offline-passphrase">Offline passphrase</Label>
                <Input
                  id="offline-passphrase"
                  type="password"
                  autoComplete="off"
                  value={passphrase}
                  onChange={(event) => setPassphrase(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  At least 12 characters. This passphrase stays on your device
                  and cannot be reset.
                </p>
              </div>
              <Button
                className="w-full"
                disabled={busy || exists === undefined || (!exists && (!online || !branchId))}
                onClick={exists ? unlock : enable}
              >
                {exists ? "Unlock workspace" : "Enable on this device"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
                <div>
                  <p className="font-medium">
                    {expired
                      ? "Offline access expired"
                      : workspace.outbox.length
                        ? `${workspace.outbox.length} changes waiting to sync or review`
                        : "All changes synced"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {expired
                      ? "Connect and sign in with the original account to renew access. Pending changes are retained."
                      : `Last refreshed ${new Date(workspace.lastSyncedAt ?? workspace.issuedAt).toLocaleString()}`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => void synchronize()}
                    disabled={!online || busy}
                  >
                    <RefreshCw size={16} />
                    Sync now
                  </Button>
                  <Button variant="outline" onClick={exportPending}>
                    <Download size={16} />
                    Export pending
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      action(async () => {
                        await offlineVault.remove();
                        lock();
                        setExists(false);
                      })
                    }
                  >
                    Remove offline access
                  </Button>
                </div>
              </CardContent>
            </Card>
            <nav aria-label="Offline sections" className="flex flex-wrap gap-2">
              {(["member", "visitor", "form", "queue"] as const)
                .filter(
                  (entity) =>
                    entity === "queue" ||
                    workspace.permissions.includes(
                      entity === "member"
                        ? "members:all:read"
                        : entity === "visitor"
                          ? "visitors:list:read"
                          : "forms:list:read",
                    ),
                )
                .map((entity) => (
                  <Button
                    key={entity}
                    variant={tab === entity ? "default" : "outline"}
                    onClick={() => {
                      setTab(entity);
                      setSearch("");
                      setPage(1);
                      setEditor(undefined);
                      setForm(undefined);
                    }}
                  >
                    {
                      {
                        member: "Members",
                        visitor: "Visitors",
                        form: "Forms",
                        queue: "Pending & review",
                      }[entity]
                    }
                  </Button>
                ))}
            </nav>
            {!expired && (tab === "member" || tab === "visitor") && (
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap justify-between gap-3">
                    <Input
                      aria-label="Search offline records"
                      className="max-w-sm"
                      placeholder="Search name, email or phone"
                      value={search}
                      onChange={(event) => {
                        setSearch(event.target.value);
                        setPage(1);
                      }}
                    />
                    {workspace.permissions.includes(
                      `${tab === "member" ? "members" : "visitors"}:new:create`,
                    ) && (
                      <Button onClick={() => startEdit(tab)} disabled={busy}>
                        Add {tab}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {records.length ? (
                    <div className="divide-y">
                      {records
                        .slice((page - 1) * perPage, page * perPage)
                        .map((row) => (
                          <div
                            key={row.id}
                            className="flex flex-wrap items-center justify-between gap-3 py-4"
                          >
                            <div>
                              <p className="font-medium">
                                {row.first_name} {row.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {row.email || row.phone || "No contact details"}
                              </p>
                              {workspace.outbox.some(
                                (item) => item.entityId === row.id,
                              ) && (
                                <span className="text-xs text-amber-600">
                                  Pending sync or review
                                </span>
                              )}
                            </div>
                            {workspace.permissions.includes(
                              `${tab === "member" ? "members:all:update" : "visitors:list:update"}`,
                            ) && (
                              <Button
                                variant="outline"
                                onClick={() => startEdit(tab, row)}
                                disabled={
                                  busy ||
                                  workspace.outbox.some(
                                    (item) => item.entityId === row.id,
                                  )
                                }
                              >
                                Edit
                              </Button>
                            )}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="py-12 text-center text-muted-foreground">
                      No records match this view.
                    </p>
                  )}
                  <TablePagination
                    page={page}
                    perPage={perPage}
                    total={records.length}
                    itemName={tab === "member" ? "members" : "visitors"}
                    onPageChange={setPage}
                    onPerPageChange={(value) => {
                      setPerPage(value);
                      setPage(1);
                    }}
                  />
                </CardContent>
              </Card>
            )}
            {!expired && editor && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {editor.row ? "Edit" : "Add"} {editor.entity}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <RequiredFieldsNotice className="col-span-full" />
                    {Object.keys(contact).map((key) => (
                      <div className="space-y-2" key={key}>
                        <Label required={key === "firstName" || (key === "lastName" && editor.entity === "member")} htmlFor={`offline-${key}`}>
                          {contactLabels[key]}
                        </Label>
                        <Input
                          id={`offline-${key}`}
                          value={contact[key]}
                          onChange={(event) =>
                            setContact({
                              ...contact,
                              [key]: event.target.value,
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button disabled={busy} onClick={saveContact}>
                      Save on device
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEditor(undefined)}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {!expired && tab === "form" && (
              <Card>
                <CardHeader>
                  <CardTitle>Published forms</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {workspace.records.form.length ? (
                    workspace.records.form.map((row) => (
                      <Button
                        variant="outline"
                        key={row.id}
                        onClick={() => {
                          setForm(row);
                          setAnswers(workspace.drafts[row.id] ?? {});
                        }}
                      >
                        {row.title}
                        {Object.keys(workspace.drafts[row.id] ?? {}).length
                          ? " · Draft"
                          : ""}
                      </Button>
                    ))
                  ) : (
                    <p className="py-12 text-center text-muted-foreground">
                      No published forms in this branch.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
            {!expired && form && (
              <Card>
                <CardHeader>
                  <CardTitle>{form.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <RequiredFieldsNotice />
                  {form.fields?.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label required={field.required} htmlFor={`answer-${field.key}`}>
                        {field.label}
                      </Label>
                      {field.type === "checkbox" ? (
                        <div className="flex flex-wrap gap-3">
                          {field.options?.map((option) => (
                            <label className="flex gap-2 text-sm" key={option}>
                              <input
                                type="checkbox"
                                checked={(
                                  (answers[field.key] as string[]) ?? []
                                ).includes(option)}
                                onChange={(event) => {
                                  const previous =
                                    (answers[field.key] as string[]) ?? [];
                                  setAnswers({
                                    ...answers,
                                    [field.key]: event.target.checked
                                      ? [...previous, option]
                                      : previous.filter(
                                          (value) => value !== option,
                                        ),
                                  });
                                }}
                              />
                              {option}
                            </label>
                          ))}
                        </div>
                      ) : field.type === "dropdown" ? (
                        <select
                          id={`answer-${field.key}`}
                          className="h-11 w-full rounded-xl border bg-background px-3"
                          value={String(answers[field.key] ?? "")}
                          onChange={(event) =>
                            setAnswers({
                              ...answers,
                              [field.key]: event.target.value,
                            })
                          }
                        >
                          <option value="">Choose an option</option>
                          {field.options?.map((option) => (
                            <option key={option}>{option}</option>
                          ))}
                        </select>
                      ) : (
                        <Input picker="wheel"
                          id={`answer-${field.key}`}
                          type={
                            field.type === "number"
                              ? "number"
                              : field.type === "date"
                                ? "date"
                                : field.type === "email"
                                  ? "email"
                                  : "text"
                          }
                          value={String(answers[field.key] ?? "")}
                          onChange={(event) =>
                            setAnswers({
                              ...answers,
                              [field.key]:
                                field.type === "number" &&
                                event.target.value !== ""
                                  ? Number(event.target.value)
                                  : event.target.value,
                            })
                          }
                        />
                      )}
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Submissions are checked against the current form when
                    synced. Attachments require internet.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={busy} onClick={() => saveForm(true)}>
                      Queue submission
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => saveForm(false)}
                    >
                      Save draft
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setForm(undefined)}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {tab === "queue" && (
              <Card>
                <CardHeader>
                  <CardTitle>Pending changes</CardTitle>
                </CardHeader>
                <CardContent className="divide-y">
                  {workspace.outbox.length ? (
                    workspace.outbox.map((item) => (
                      <div key={item.mutationId} className="space-y-3 py-4">
                        <p className="font-medium capitalize">
                          {item.entity} ·{" "}
                          {item.status === "pending"
                            ? "Pending"
                            : "Needs review"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {item.message ?? "Saved safely on this device"}
                        </p>
                        <pre className="max-h-40 overflow-auto rounded-lg bg-muted p-3 text-xs">
                          {JSON.stringify(item.data, null, 2)}
                        </pre>
                        {item.status !== "pending" && (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              disabled={busy || expired || !online}
                              onClick={() => review(item.mutationId)}
                            >
                              Keep my changes against latest version
                            </Button>
                            <Button
                              variant="outline"
                              disabled={busy}
                              onClick={() =>
                                action(async () => {
                                  setWorkspace(
                                    await offlineVault.update((current) => ({
                                      ...current,
                                      outbox: current.outbox.filter(
                                        (change) =>
                                          change.mutationId !== item.mutationId,
                                      ),
                                    })),
                                  );
                                })
                              }
                            >
                              Discard this change
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="py-12 text-center text-muted-foreground">
                      Everything is synced. No pending changes.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </main>
  );
}
