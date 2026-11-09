import { LEGACY_BRAND } from "./brand/identity";
const channelName = "belivrhq:subscription-payment-sync";
const channelNames = [channelName, LEGACY_BRAND.paymentChannel];
interface PaymentHint { churchId: string; reference: string }
function hint(value: unknown): value is PaymentHint {
  if (!value || typeof value !== "object") return false;
  const data = value as PaymentHint;
  return typeof data.churchId === "string" && !!data.churchId &&
    typeof data.reference === "string" && /^(?:BHQSUB_|COSUB_)[a-f0-9]{32}$/.test(data.reference);
}
/** A wake-up hint only: receivers must verify payment on their own server session. */
export function publishPaymentHint(data: PaymentHint) {
  if (!hint(data)) return;
  const message = { ...data, nonce: crypto.randomUUID() };
  try {
    for (const name of channelNames) { const channel = new BroadcastChannel(name); channel.postMessage(message); channel.close(); }
  } catch { /* Storage events also work when BroadcastChannel is unavailable. */ }
  try {
    localStorage.setItem(channelName, JSON.stringify(message));
    localStorage.removeItem(channelName);
  } catch { /* Normal polling/focus recovery remains available. */ }
}
export function subscribePaymentHints(receive: (data: PaymentHint) => void) {
  const channels: BroadcastChannel[] = [];
  const seen = new Set<string>();
  const deliver = (value: unknown) => {
    if (!hint(value)) return;
    const nonce = (value as PaymentHint & { nonce?: string }).nonce;
    if (typeof nonce === 'string') { if (seen.has(nonce)) return; seen.add(nonce); if (seen.size > 256) seen.delete(seen.values().next().value!); }
    receive({ churchId: value.churchId, reference: value.reference });
  };
  try {
    for (const name of channelNames) { const channel = new BroadcastChannel(name); channels.push(channel); channel.onmessage = event => { deliver(event.data); }; }
  } catch { /* Use storage events instead. */ }
  const storage = (event: StorageEvent) => {
    if (!channelNames.includes(event.key ?? "") || !event.newValue) return;
    try { const data: unknown = JSON.parse(event.newValue); deliver(data); } catch { /* Ignore unrelated malformed hints. */ }
  };
  window.addEventListener("storage", storage);
  return () => { channels.forEach(channel => channel.close()); window.removeEventListener("storage", storage); };
}
