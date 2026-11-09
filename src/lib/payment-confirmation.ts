import type { BillingStatus } from "@/types/billing";

export function paymentOutcome(
  data: BillingStatus | undefined,
  reference: string,
) {
  const history = data?.payments?.find(
    (payment) => payment.reference === reference,
  );
  const payment =
    data?.verification?.reference === reference
      ? { ...history, ...data.verification }
      : history;
  if (payment?.application_status === "revoked") return "revoked";
  if (payment?.application_status === "review") return "review";
  if (
    payment?.status === "success" &&
    payment.application_status === "applied" &&
    data?.active
  )
    return "applied";
  if (
    payment &&
    "checkout_closed_at" in payment &&
    payment.checkout_closed_at &&
    payment.status === "pending"
  )
    return "closed";
  if (payment?.status === "failed" || payment?.status === "reversed")
    return "failed";
  return "pending";
}
