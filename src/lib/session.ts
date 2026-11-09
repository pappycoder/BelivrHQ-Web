import { LEGACY_BRAND } from "./brand/identity";
export function publishSessionEnded() {
  if (typeof window === 'undefined') return;
  for (const name of ['belivrhq-session-ended', LEGACY_BRAND.sessionEnded]) window.dispatchEvent(new Event(name));
  if (typeof BroadcastChannel !== 'undefined') for (const name of ['belivrhq-session', LEGACY_BRAND.sessionChannel]) {
    const channel = new BroadcastChannel(name); channel.postMessage('ended'); channel.close();
  }
}
/** Tokens belong to HttpOnly server cookies. The browser can only end a session. */
export async function clearTokens() {
  if (typeof window === "undefined") return;
  publishSessionEnded();
  const response = await fetch("/api/session", { method: "DELETE", headers: { "X-BelivrHQ-Client": "web" }, cache: "no-store" });
  if (!response.ok) throw new Error("Unable to clear your session. Please try again.");
  if ("caches" in window) {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => /api|pages|rsc|others/i.test(name)).map((name) => caches.delete(name)));
  }
}
