"use client";
import { CheckCircle2, Clock3, AlertCircle, Copy, ShieldCheck, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import type { paymentOutcome } from "@/lib/payment-confirmation";
import { toast } from "@/lib/toast";

type Outcome = ReturnType<typeof paymentOutcome> | "missing";
const presentation: Record<Outcome, { title: string; description: string }> = {
  applied: { title: "Your payment is confirmed", description: "Payment verified. Your subscription is active. Your workspace will update automatically." },
  pending: { title: "We are confirming your payment", description: "Waiting for Flutterwave to confirm your payment. Keep this page open; it updates after provider verification. Check your billing history before paying again." },
  failed: { title: "This payment was not completed", description: "The latest provider verification reports an unsuccessful payment. Review your payment history before starting another checkout. We will still check for a later confirmation." },
  missing: { title: "We could not identify this payment", description: "There is no valid transaction reference in this return. Review your billing history or contact support before making another payment." },
  review: { title: "Your payment needs a review", description: "Your payment requires a BelivrHQ review. Contact support with your payment reference before paying again." },
  revoked: { title: "This payment no longer funds access", description: "Access funded by this payment has been removed. Other paid periods remain available. Contact support with your reference." },
  closed: { title: "This checkout is closed", description: "A payment already sent will still be checked and reviewed. Closing checkout does not cancel a provider charge or confirm a refund." },
};
/** Presentation only: callers supply the existing server-verified outcome, never a URL status. */
export function PaymentStateCard({ outcome, reference, amount, currency, plan, connectionError = false }: { outcome: Outcome; reference?: string; amount?: number; currency?: string; plan?: string; connectionError?: boolean }) {
  const content = presentation[outcome];
  const Icon = outcome === "applied" ? CheckCircle2 : outcome === "pending" ? Clock3 : AlertCircle;
  return <section data-payment-state={outcome} role={outcome === "pending" || outcome === "applied" ? "status" : "alert"} className="mx-auto w-full max-w-xl rounded-2xl border border-line bg-card p-5 text-center sm:p-7">
    <header className="mb-6 flex items-center justify-between gap-3 border-b border-line pb-4 text-left"><span className="rule-label">Payment confirmation</span><ShieldCheck className="size-4 shrink-0 text-ink-faint" /></header>
    <span className={`mb-4 inline-flex size-14 items-center justify-center rounded-2xl ${outcome === "applied" ? "bg-moss-soft text-moss" : outcome === "pending" ? "bg-gold-soft text-gold" : "bg-rose-soft text-rose"}`}><Icon className="size-7" /></span>
    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-faint">{outcome === "applied" ? "Confirmed" : outcome === "pending" ? "Confirmation pending" : outcome === "failed" ? "Not completed" : "Needs attention"}</p>
    <h2 className="font-display text-2xl font-semibold tracking-tight">{content.title}</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{content.description}</p>
    {connectionError && <p className="mt-3 text-sm text-muted-foreground">Connection interrupted. We’ll retry automatically when connected. This is not confirmation of a failed charge.</p>}
    {(reference || amount !== undefined || plan) && <dl className="mt-5 divide-y divide-border rounded-xl border border-border px-4 text-left text-sm">
      {amount !== undefined && <div className="flex flex-wrap justify-between gap-2 py-3"><dt className="text-muted-foreground">Amount</dt><dd className="font-semibold">{formatMoney(amount,currency)}</dd></div>}
      {plan && <div className="flex flex-wrap justify-between gap-2 py-3"><dt className="text-muted-foreground">Plan</dt><dd className="capitalize">{plan.replaceAll("_"," ")}</dd></div>}
      {reference && <div className="flex min-w-0 items-start gap-2 py-3"><dt className="text-muted-foreground">Reference</dt><dd className="ml-auto min-w-0 break-all text-right font-mono text-xs">{reference}</dd><Button type="button" variant="ghost" size="icon" className="size-7 shrink-0" aria-label="Copy payment reference" onClick={async () => { try { await navigator.clipboard.writeText(reference); toast.success("Reference copied."); } catch { toast.error("Select and copy the reference manually."); } }}><Copy className="size-3.5" /></Button></div>}
    </dl>}
    {(outcome === "pending" || outcome === "applied") && <ol className="mx-auto my-5 grid max-w-sm gap-3 text-left text-xs" aria-label="Payment verification progress"><li className="flex items-center gap-2 text-brand"><CheckCircle2 className="size-4 shrink-0" />{reference ? "Payment reference received" : "Confirmation requested"}</li><li className="flex items-center gap-2 text-ink-soft">{outcome === "applied" ? <CheckCircle2 className="size-4 shrink-0 text-brand" /> : <Clock3 className="size-4 shrink-0 text-gold" />}{outcome === "applied" ? "Provider verification complete" : "Awaiting provider verification"}</li><li className="flex items-center gap-2 text-ink-faint">{outcome === "applied" ? <CheckCircle2 className="size-4 shrink-0 text-brand" /> : <Circle className="size-4 shrink-0" />}{outcome === "applied" ? "Subscription active" : "Subscription ready after verification"}</li></ol>}
    <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0" />Returning from checkout alone never confirms payment or grants access.</p>
  </section>;
}
