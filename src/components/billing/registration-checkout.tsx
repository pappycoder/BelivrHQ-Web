"use client";

import Link from "next/link";
import { Check, Clock3, ShieldCheck } from "lucide-react";
import { AuthFormWrapper } from "@/components/shared/auth-form-wrapper";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { launchPlans } from "@/components/marketing/plans";
import { subscriptionMoney } from "@/hooks/use-subscription-pricing";
import { paymentOutcome } from "@/lib/payment-confirmation";
import { cn } from "@/lib/utils";
import type {
  BillingCycle,
  BillingQuote,
  BillingStatus,
  SubscriptionPlan,
} from "@/types/billing";

type Plan = Exclude<SubscriptionPlan, "enterprise">;
interface Props {
  data: BillingStatus;
  plan: Plan;
  cycle: BillingCycle;
  currency: string;
  currencies: string[];
  onPlan: (plan: Plan) => void;
  onCycle: (cycle: BillingCycle) => void;
  onCurrency: (currency: string) => void;
  quote?: BillingQuote;
  quoteError?: string;
  quoteFetching: boolean;
  onQuoteRetry: () => void;
  reference: string;
  outcome: ReturnType<typeof paymentOutcome>;
  verificationError: boolean;
  verificationBusy: boolean;
  message: string;
  checkoutBusy: boolean;
  checkoutDisabled: boolean;
  closing: boolean;
  onCheckout: () => void;
  onCheck: () => void;
  onClose: () => void;
}

/** Registration presentation only; the subscription page owns payment state. */
export function RegistrationCheckout(props: Props) {
  const { data, plan, cycle, currency, quote, reference, outcome } = props;
  const pending = data.latestPayment;
  const reviewing =
    outcome === "review" || outcome === "revoked" || data.accessReview;
  const busy = props.checkoutBusy || props.closing;
  const total = pending
    ? { amount: pending.amount, currency: pending.currency }
    : quote;
  const selected = launchPlans.find(
    (item) => item.id === (pending?.plan || plan),
  );
  const field =
    "h-12 w-full rounded-xl border border-input bg-card/60 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <AuthFormWrapper
      heading="Activate your workspace"
      subtitle="Your account is ready. Complete payment, then sign in to bring your church together."
      footer={
        <p>
          Need a hand?{" "}
          <Link
            href="/help/subscription-currencies-and-payments"
            className="font-semibold text-primary hover:underline"
          >
            Visit the billing guide
          </Link>
        </p>
      }
    >
      <div className="space-y-5" data-registration-checkout>
        <ol
          aria-label="Workspace setup progress"
          className="flex items-center gap-3 text-xs text-muted-foreground"
        >
          <li className="flex items-center gap-1.5">
            <Check className="size-3.5 text-primary" /> Account created
          </li>
          <li
            aria-current="step"
            className="flex items-center gap-1.5 font-semibold text-primary"
          >
            <span className="size-1.5 rounded-full bg-primary" /> Payment
          </li>
          <li>Sign in</li>
        </ol>

        {reference && (
          <div
            role={reviewing ? "alert" : "status"}
            className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm"
          >
            <p className="flex items-start gap-2 font-medium">
              <Clock3 className="mt-0.5 size-4 shrink-0 text-primary" />
              {outcome === "applied"
                ? "Payment verified. Taking you to sign in."
                : reviewing
                  ? "Your payment needs a BelivrHQ review. Contact support with your reference."
                  : outcome === "closed"
                    ? "This checkout is closed. Any payment already sent will still be reviewed."
                    : "Waiting for Flutterwave to confirm your payment."}
            </p>
            {!reviewing && outcome !== "applied" && outcome !== "closed" && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                Complete payment in the separate window and keep this page open.
                Once confirmed, you’ll return here to sign in.
                {props.verificationError &&
                  " Connection interrupted. We’ll retry automatically when connected."}
                {outcome === "failed" &&
                  " The latest attempt was unsuccessful. You can retry checkout."}
              </p>
            )}
            <p className="break-all font-mono text-[11px] text-muted-foreground">
              {reference}
            </p>
          </div>
        )}
        {reviewing && !reference && (
          <p
            role="alert"
            className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-relaxed"
          >
            Your payment needs a BelivrHQ review. Please{" "}
            <Link
              href="/help/contact-support"
              className="font-medium text-primary underline"
            >
              contact support
            </Link>{" "}
            before making another payment.
          </p>
        )}
        {props.message && (
          <p
            role="status"
            className="rounded-xl border bg-card/60 p-3 text-sm leading-relaxed text-muted-foreground"
          >
            {props.message}
          </p>
        )}

        <fieldset disabled={busy} className="space-y-2">
          <legend className="mb-2 text-sm font-medium">Choose your plan</legend>
          {launchPlans
            .filter((item) => item.id !== "enterprise")
            .map((item) => {
              const limits = data.catalog?.find(
                (entry) => entry.id === item.id,
              )?.limits;
              return (
                <label
                  key={item.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border bg-card/40 px-4 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                    plan === item.id
                      ? "border-primary bg-primary/5"
                      : "border-input hover:border-primary/40",
                  )}
                >
                  <input
                    type="radio"
                    name="registration-plan"
                    value={item.id}
                    checked={plan === item.id}
                    onChange={() => props.onPlan(item.id as Plan)}
                    className="sr-only"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">
                      {item.name}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                      {limits
                        ? `${limits.members.toLocaleString()} members · ${limits.locations} ${limits.locations === 1 ? "location" : "locations"} · ${limits.staff} staff`
                        : item.capacity}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full border",
                      plan === item.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input",
                    )}
                  >
                    {plan === item.id && <Check className="size-3.5" />}
                  </span>
                </label>
              );
            })}
        </fieldset>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-medium">
            Billing period
            <select
              aria-label="Billing period"
              className={field}
              value={cycle}
              disabled={busy}
              onChange={(event) =>
                props.onCycle(event.target.value as BillingCycle)
              }
            >
              <option value="monthly">Monthly</option>
              <option value="annual">Yearly · save 10%</option>
            </select>
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Payment currency
            <select
              aria-label="Payment currency"
              className={field}
              value={currency}
              disabled={!!pending || busy}
              onChange={(event) => props.onCurrency(event.target.value)}
            >
              {(pending ? [pending.currency] : props.currencies).map(
                (value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>

        <section
          aria-label="Payment review"
          className="space-y-3 rounded-xl border bg-card/60 p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">
                {pending ? "Your pending payment" : "Your subscription"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {selected?.name} ·{" "}
                {(pending?.cycle || cycle) === "annual" ? "Yearly" : "Monthly"}
              </p>
            </div>
            <div className="w-full min-w-0 text-left sm:w-auto sm:text-right">
              {total && (pending || !props.quoteError) ? (
                <>
                  <p className="font-display text-2xl font-semibold tracking-tight">
                    {subscriptionMoney(total.amount, total.currency)}
                  </p>
                  <p className="text-xs text-muted-foreground">due today</p>
                </>
              ) : !props.currencies.length || !data.gateways.length ? (
                <p role="status" className="text-xs text-muted-foreground">
                  Checkout is being configured. Contact BelivrHQ.
                </p>
              ) : props.quoteError ? (
                <p role="alert" className="text-xs text-destructive">
                  {props.quoteError}{" "}
                  <button
                    type="button"
                    onClick={props.onQuoteRetry}
                    className="underline"
                  >
                    Refresh quote
                  </button>
                </p>
              ) : (
                <LoadingState
                  label="Calculating your payment"
                  variant="inline"
                />
              )}
            </div>
          </div>
          {pending && (pending.plan !== plan || pending.cycle !== cycle) && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              This pending payment keeps its original plan, period and amount.
              Close checkout below to pay for a different selection.
            </p>
          )}
          {quote && !pending && !props.quoteError && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Price locked until{" "}
              {new Date(quote.expiresAt).toLocaleTimeString("en-NG", {
                timeZone: "Africa/Lagos",
              })}
              .
              {quote.currency !== "USD" && (
                <>
                  {" "}
                  <a
                    href="https://www.exchangerate-api.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Rates by ExchangeRate-API
                  </a>
                  . Converted total rounded up.
                </>
              )}
            </p>
          )}
          <p className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            Secure checkout with Flutterwave. No automatic renewal charges.
          </p>
        </section>

        <div className="space-y-3">
          <Button
            type="button"
            className="h-12 w-full rounded-xl"
            onClick={props.onCheckout}
            disabled={
              props.checkoutDisabled ||
              !!reviewing ||
              busy ||
              (props.quoteFetching && !pending)
            }
          >
            {props.checkoutBusy
              ? "Opening secure checkout…"
              : pending
                ? "Resume secure checkout"
                : "Continue to payment"}
          </Button>
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            Payment opens in a separate window. After confirmation, you’ll be
            taken to sign in.
          </p>
          {reference && (
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full rounded-xl"
              disabled={props.verificationBusy || busy}
              onClick={props.onCheck}
            >
              Check my payment
            </Button>
          )}
          {pending && (
            <div className="space-y-2">
              <button
                type="button"
                className="w-full text-center text-xs font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
                onClick={props.onClose}
                disabled={busy}
              >
                Close checkout and change plan
              </button>
              <p className="text-center text-xs leading-relaxed text-muted-foreground">
                Closing does not refund a payment already sent. Late payments go
                to BelivrHQ for review.
              </p>
            </div>
          )}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Need more capacity?{" "}
          <Link
            href="/help/contact-support"
            className="font-medium text-primary hover:underline"
          >
            Talk to us about Enterprise
          </Link>
        </p>
        <details className="text-xs leading-relaxed text-muted-foreground">
          <summary className="cursor-pointer">Payment and refund terms</summary>
          <p className="pt-2">
            Before paying, review the exact amount, currency and period. The
            Terms of Service include cancellation and refund rules, a customer
            indemnity and liability limits, subject to mandatory legal rights.
            Standard renewals are manual.
          </p>
        </details>
      </div>
    </AuthFormWrapper>
  );
}
