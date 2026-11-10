"use client";
import Link from "next/link";
import { useCurrentProfile } from "@/hooks/use-profile";
import { useBillingStatus } from "@/hooks/use-billing";
import { Button } from "@/components/ui/button";
export function BillingNotice({
  expiredOnly = false,
}: { expiredOnly?: boolean } = {}) {
  const { data, allowed } = useBillingStatus();
  const { data: profile } = useCurrentProfile();
  if (profile?.subscriptionReadOnly)
    return (
      <aside
        role="status"
        className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
      >
        <p>
          Your subscription has ended. You can view and export existing records.
          Renew through billing to make changes.
        </p>
        {allowed && (
          <Button asChild size="sm" variant="outline">
            <Link href="/subscription">Renew subscription</Link>
          </Button>
        )}
      </aside>
    );
  if (expiredOnly || !allowed || !data) return null;
  const resources = (["members", "staff", "locations"] as const).filter(
    (r) =>
      data.limits?.[r] !== undefined &&
      (data.limits[r] === 0 || data.usage[r] >= data.limits[r] * 0.8),
  );
  const days = data.subscription?.paid_until
    ? Math.ceil(
        (new Date(data.subscription.paid_until).getTime() - Date.now()) /
          86400000,
      )
    : 0;
  if (!resources.length && days > 7) return null;
  return (
    <aside
      role="status"
      className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
    >
      <div>
        <p className="font-medium">
          {days <= 7
            ? days <= 0
              ? "Your subscription needs renewal"
              : `Renew your subscription within ${days} days`
            : "Review your plan allowances"}
        </p>
        {resources.map((r) => (
          <p key={r} className="capitalize">
            {r}: {data.usage[r]} / {data.limits[r]} used
            {r === "staff" && data.usage.pendingInvitations
              ? ` (${data.usage.pendingInvitations} pending invitation)`
              : ""}
          </p>
        ))}
      </div>
      <Button asChild size="sm" variant="outline">
        <Link href="/subscription">Plan & Billing</Link>
      </Button>
    </aside>
  );
}
