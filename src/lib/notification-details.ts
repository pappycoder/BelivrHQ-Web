import { checkRule, matchRoutePermission } from "@/lib/route-permissions";

export function notificationLabel(value: string): string {
  const text = value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Only display known recipient-facing context, never arbitrary audit/provider payloads. */
export function notificationContext(data?: Record<string, unknown>) {
  const fields = [
    ["entity", "Record type"], ["action", "Action"], ["entityId", "Record reference"],
    ["receiptNumber", "Receipt number"], ["reference", "Reference"],
    ["eventName", "Event"], ["serviceName", "Service"], ["branchName", "Branch"],
    ["categoryName", "Category"], ["memberName", "Member"],
  ] as const;
  return fields.flatMap(([key, label]) => {
    const value = data?.[key];
    if (typeof value !== "string" || !value.trim()) return [];
    return [{ label, value: key === "entity" || key === "action" ? notificationLabel(value.trim()) : value.trim() }];
  });
}

/** Stored links are navigation hints, not authorization or permission to leave the app. */
export function notificationLink(data: Record<string, unknown> | undefined, can: (permission: string) => boolean, billingAdmin: boolean): string | null {
  for (const candidate of [data?.link, data?.url]) {
    if (typeof candidate !== "string" || !candidate.startsWith("/") || candidate.startsWith("//") || /[\\\u0000-\u001f]/.test(candidate)) continue;
    const url = new URL(candidate, "https://belivrhq.invalid");
    if (url.origin !== "https://belivrhq.invalid") continue;
    if (["/subscription", "/settings/billing"].includes(url.pathname) && !billingAdmin) continue;
    if (checkRule(matchRoutePermission(url.pathname), can)) return `${url.pathname}${url.search}${url.hash}`;
  }
  return null;
}
