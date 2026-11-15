"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { BillingStatus } from "@/types/billing";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Payment = BillingStatus["payments"][number];
export function UnappliedPaymentReview({
  payment,
  onClose,
  onResolved,
}: {
  payment: Payment | null;
  onClose: () => void;
  onResolved: (result: BillingStatus) => void;
}) {
  // A new payment gets a fresh decision and reason, even when the dialog stays mounted.
  return payment ? (
    <ReviewForm
      key={payment.reference}
      payment={payment}
      onClose={onClose}
      onResolved={onResolved}
    />
  ) : null;
}
function ReviewForm({
  payment,
  onClose,
  onResolved,
}: {
  payment: Payment;
  onClose: () => void;
  onResolved: (result: BillingStatus) => void;
}) {
  const [decision, setDecision] = useState<"apply" | "revoke">(
    payment.intent === "renewal" ? "apply" : "revoke",
  );
  const [reason, setReason] = useState("");
  const resolution = useMutation({
    mutationFn: () =>
      api.post<BillingStatus>("/billing/payment-application-review", {
        reference: payment.reference,
        decision,
        reason: reason.trim(),
      }),
    onSuccess: (result) => {
      onResolved(result);
      onClose();
    },
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !resolution.isPending) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve unapplied payment</DialogTitle>
          <DialogDescription>
            This payment was verified but did not activate a subscription.
            Applying a renewal adds its full period after existing paid
            coverage. Revoking application grants no access and does not refund
            money.
          </DialogDescription>
        </DialogHeader>
        <p className="break-all font-mono text-xs">{payment.reference}</p>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (reason.trim().length >= 10 && !resolution.isPending)
              resolution.mutate();
          }}
        >
          <label className="block text-sm">
            Resolution
            <select
              className="mt-1 w-full rounded border p-2"
              value={decision}
              disabled={resolution.isPending}
              onChange={(event) =>
                setDecision(event.target.value as "apply" | "revoke")
              }
            >
              {payment.intent === "renewal" && (
                <option value="apply">Apply as a renewal</option>
              )}
              <option value="revoke">Revoke application</option>
            </select>
          </label>
          {payment.intent !== "renewal" && (
            <p className="text-sm">
              A stale prorated upgrade needs a fresh checkout or a separately
              arranged provider refund.
            </p>
          )}
          <label className="block text-sm">
            Review reason
            <textarea
              className="mt-1 w-full rounded border p-2"
              value={reason}
              minLength={10}
              maxLength={500}
              required
              disabled={resolution.isPending}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          {resolution.isError && (
            <p role="alert" className="text-sm text-destructive">
              {resolution.error.message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={resolution.isPending}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={reason.trim().length < 10 || resolution.isPending}
            >
              {resolution.isPending ? "Saving…" : "Confirm resolution"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
