"use client";
import * as React from "react";
import Link from "next/link";
import { useCurrentProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
export function PlanLimitDialog() {
  const { data: profile } = useCurrentProfile();
  const administrator = profile?.role?.some(
    (r) => r === "church_admin" || r === "super_admin",
  );
  const [error, setError] = React.useState<{
    message: string;
    code?: string;
  } | null>(null);
  React.useEffect(() => {
    const onLimit = (event: Event) => setError((event as CustomEvent).detail);
    window.addEventListener("belivrhq:plan-limit", onLimit);
    return () => window.removeEventListener("belivrhq:plan-limit", onLimit);
  }, []);
  return (
    <Dialog
      open={!!error}
      onOpenChange={(open) => {
        if (!open) setError(null);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {error?.code === "PLAN_FEATURE_REQUIRED"
              ? "A different plan is needed"
              : "Your church allowance has been reached"}
          </DialogTitle>
          <DialogDescription>
            {administrator
              ? "Review your plan to continue. Your existing records and entered information are kept."
              : error?.message || "Contact your church administrator."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setError(null)}>
            Close
          </Button>
          {administrator && (
            <Button asChild>
              <Link href="/subscription" onClick={() => setError(null)}>
                View plans
              </Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
