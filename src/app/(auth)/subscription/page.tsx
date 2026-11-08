"use client";

import { LoadingState } from "@/components/shared/loading-state";
import { showCheckoutLoading } from "@/lib/checkout-loading";
import { ExistingBillingPresentation } from "@/components/workspace/existing-billing-presentation";
import { LegalNavigation } from "@/components/legal/legal-navigation";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { SupportChatButton } from "@/components/support/support-chat-button";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CreditCard, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useBillingStatus } from "@/hooks/use-billing";
import { api } from "@/lib/api";
import { subscriptionCheckoutUrl } from "@/lib/subscription-checkout";
import { paymentOutcome } from "@/lib/payment-confirmation";
import { publishPaymentHint, subscribePaymentHints } from "@/lib/payment-sync";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SubscriptionCurrencySwitcher, SubscriptionPrice } from "@/components/billing/subscription-currency";
import {
  useSubscriptionPricing,
  subscriptionMoney,
} from "@/hooks/use-subscription-pricing";
import { launchPlans } from "@/components/marketing/plans";
import type {
  BillingStatus,
  BillingQuote,
  SubscriptionPlan,
  BillingCycle,
  SubscriptionGateway,
} from "@/types/billing";
const order = ["essentials", "community", "network", "enterprise"];
const date = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Africa/Lagos",
      })
    : "Not activated";
export default function SubscriptionPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, logout } = useAuth();
  const status = useBillingStatus();
  const pricing = useSubscriptionPricing();
  const [paymentChoice, setPaymentChoice] = React.useState<{
    key: string;
    currency: string;
  } | null>(null);
  const client = useQueryClient();
  const [plan, setPlan] =
    React.useState<Exclude<SubscriptionPlan, "enterprise">>("essentials");
  const [cycle, setCycle] = React.useState<BillingCycle>("monthly");
  const gateway: SubscriptionGateway = "flutterwave";
  const [message, setMessage] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [manage, setManage] = React.useState(false);
  const initialized = React.useRef(false);
  const checkoutWindow = React.useRef<Window | null>(null);
  const preparingWindow = React.useRef(false);
  const confirmed = React.useRef("");
  const paymentWindow = React.useRef(false);
  const data = status.data;
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["platform-subscription"] }),
      client.invalidateQueries({ queryKey: ["current-profile"] }),
    ]);
  };
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    try {
      paymentWindow.current =
        params.get("payment_window") === "1" ||
        sessionStorage.getItem("churchos:subscription-payment-window") === "1";
    } catch {
      paymentWindow.current = params.get("payment_window") === "1";
    }
    const ref = params.get("reference") || params.get("tx_ref") || "";
    if (/^COSUB_[a-f0-9]{32}$/.test(ref)) setReference(ref);
    if (params.get("status") === "cancelled")
      setMessage("Payment was cancelled. Your current plan is unchanged.");
    window.history.replaceState(
      null,
      "",
      window.location.pathname +
        (paymentWindow.current ? "?payment_window=1" : ""),
    );
  }, []);
  React.useEffect(() => {
    if (!data || initialized.current) return;
    initialized.current = true;
    const selection = data.latestPayment || data.subscription;
    if (selection?.plan && selection.plan !== "enterprise")
      setPlan(
        (data.latestPayment?.plan as Exclude<SubscriptionPlan, "enterprise">) ||
          (data.subscription?.scheduled_plan as Exclude<
            SubscriptionPlan,
            "enterprise"
          >) ||
          selection.plan,
      );
    setCycle(
      data.subscription?.scheduled_cycle || selection?.cycle || "monthly",
    );
  }, [data]);
  const pending = data?.latestPayment;
  const trackedReference = reference || pending?.reference || "";
  const storageKey = status.churchId
    ? `churchos:subscription-payment:${status.churchId}`
    : "";
  React.useEffect(() => {
    if (!storageKey || reference) return;
    try {
      const saved =
        pending?.reference || sessionStorage.getItem(storageKey) || "";
      if (/^COSUB_[a-f0-9]{32}$/.test(saved))
        setReference((current) => current || saved);
    } catch {
      /* Server pending-payment recovery still works without storage. */
    }
  }, [storageKey, reference, pending?.reference]);
  React.useEffect(() => {
    if (!storageKey || !trackedReference) return;
    try {
      sessionStorage.setItem(storageKey, trackedReference);
    } catch {
      /* Optional reload recovery. */
    }
  }, [storageKey, trackedReference]);
  const verification = useQuery({
    queryKey: ["billing-verification", status.churchId, trackedReference],
    queryFn: () =>
      api.post<BillingStatus>("/billing/verify", {
        reference: trackedReference,
      }),
    enabled: status.canPay && !!trackedReference,
    retry: false,
    refetchInterval: (query) =>
      ["applied", "review"].includes(
        paymentOutcome(query.state.data, trackedReference),
      )
        ? false
        : query.state.error
          ? 15000
          : 5000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  const outcome = paymentOutcome(verification.data, trackedReference);
  const refetchVerification = verification.refetch;
  React.useEffect(() => {
    if (!status.canPay || !status.churchId || !trackedReference) return;
    return subscribePaymentHints((hint) => {
      if (
        hint.churchId === status.churchId &&
        hint.reference === trackedReference &&
        confirmed.current !== trackedReference
      )
        void refetchVerification({ cancelRefetch: false });
    });
  }, [status.canPay, status.churchId, trackedReference, refetchVerification]);
  const waitingForPayment =
    !!trackedReference && outcome !== "applied" && outcome !== "review";
  React.useEffect(() => {
    if (!verification.data) return;
    client.setQueryData(
      ["platform-subscription", status.churchId],
      verification.data,
    );
    if (outcome !== "applied" || confirmed.current === trackedReference) return;
    confirmed.current = trackedReference;
    setMessage("");
    if (status.churchId)
      publishPaymentHint({
        churchId: status.churchId,
        reference: trackedReference,
      });
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* Optional reload recovery. */
    }
    if (paymentWindow.current) {
      window.close();
      return;
    }
    // The receiving tab never trusts the hint as proof: this branch is reached
    // only after its own authenticated server verification returns applied.
    void client.invalidateQueries({ queryKey: ["current-profile"] });
    void client.invalidateQueries({ queryKey: ["notifications"] });
    router.replace("/home");
  }, [
    verification.data,
    client,
    status.churchId,
    outcome,
    trackedReference,
    storageKey,
    router,
  ]);
  const availableCurrencies = data?.gatewayCurrencies?.[gateway] ?? ["NGN"];
  const choiceKey = `${pricing.currency}:${gateway}`;
  const paymentCurrency =
    pending?.currency ||
    (paymentChoice?.key === choiceKey &&
    availableCurrencies.includes(paymentChoice.currency)
      ? paymentChoice.currency
      : availableCurrencies.includes(pricing.currency)
        ? pricing.currency
        : availableCurrencies.includes("USD")
          ? "USD"
          : availableCurrencies[0] || "USD");
  const downgrade = !!(
    data?.active &&
    data.subscription &&
    order.indexOf(plan) < order.indexOf(data.subscription.plan)
  );
  const samePlan = data?.subscription?.plan === plan;
  const quote = useQuery({
    queryKey: [
      "billing-quote",
      status.churchId,
      paymentCurrency,
      plan,
      cycle,
      gateway,
      data?.subscription?.paid_until,
    ],
    queryFn: () =>
      api.post<BillingQuote>("/billing/quote", {
        plan,
        cycle,
        gateway,
        currency: paymentCurrency,
      }),
    enabled:
      status.allowed &&
      !!data &&
      !!data.gateways.length &&
      !!availableCurrencies.length &&
      !downgrade &&
      !pending &&
      !(samePlan && data.active) &&
      (manage || !data.active),
    retry: false,
    staleTime: 30000,
  });
  const refreshQuote = quote.refetch;
  const quoteExpiresAt = quote.data?.expiresAt;
  React.useEffect(() => {
    if (!quoteExpiresAt || pending) return;
    const timer = setTimeout(
      () => void refreshQuote(),
      Math.max(1, Date.parse(quoteExpiresAt) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [quoteExpiresAt, pending, refreshQuote]);
  const checkout = useMutation({
    mutationFn: () =>
      api.post<{ authorizationUrl: string; reference: string }>(
        "/billing/checkout",
        {
          plan: pending?.plan || plan,
          cycle: pending?.cycle || cycle,
          gateway: pending?.gateway || gateway,
          currency: paymentCurrency,
          ...(!pending ? { quoteId: quote.data?.quoteId } : {}),
        },
      ),
    onSuccess: (result) => {
      const url = subscriptionCheckoutUrl(result.authorizationUrl);
      if (!url) {
        if (preparingWindow.current) checkoutWindow.current?.close();
        preparingWindow.current = false;
        setMessage("Unable to open a trusted payment page. Contact ChurchOS.");
        return;
      }
      setReference(result.reference);
      setMessage("");
      if (checkoutWindow.current && !checkoutWindow.current.closed) {
        if (preparingWindow.current)
          checkoutWindow.current.location.href = url.href;
      } else
        setMessage(
          "The payment window was closed. Reopen checkout to continue; we’ll still check for a completed payment.",
        );
      preparingWindow.current = false;
    },
    onError: (e) => {
      if (preparingWindow.current) checkoutWindow.current?.close();
      preparingWindow.current = false;
      setMessage(e.message);
    },
  });
  function openCheckout() {
    if (!checkoutWindow.current || checkoutWindow.current.closed || !pending) {
      const popup = window.open(
        "about:blank",
        "_blank",
        "popup,width=540,height=760",
      );
      if (!popup) {
        setMessage(
          "Allow pop-ups for ChurchOS, then continue to payment again.",
        );
        return;
      }
      popup.opener = null;
      showCheckoutLoading(popup);
      try {
        popup.sessionStorage.setItem(
          "churchos:subscription-payment-window",
          "1",
        );
      } catch {
        /* Optional auto-close on return. */
      }
      checkoutWindow.current = popup;
      preparingWindow.current = true;
    }
    checkoutWindow.current.focus();
    checkout.mutate();
  }
  function checkPayment(ref: string) {
    if (ref === trackedReference) void verification.refetch();
    else setReference(ref);
  }
  const schedule = useMutation({
    mutationFn: (cancel: boolean) =>
      api.post<BillingStatus>(
        "/billing/schedule",
        cancel ? {} : { plan, cycle },
      ),
    onSuccess: async () => {
      setMessage("Your renewal preference was saved. No payment was taken.");
      setManage(false);
      await refresh();
    },
    onError: (e) => setMessage(e.message),
  });
  if (isLoading)
    return (
      <LoadingState label="Loading your account" variant="detail" className="mx-auto max-w-6xl" />
    );
  if (!isAuthenticated)
    return (
      <div className="mx-auto max-w-lg space-y-4 p-8">
        <h1 className="font-display text-2xl font-semibold">Plan & Billing</h1>
        <p>
          Sign in to your church administrator account to manage subscriptions.
        </p>
        <Button asChild>
          <Link href="/login?returnTo=%2Fsubscription">Sign in</Link>
        </Button>
      </div>
    );
  if (!status.allowed && status.accessReady)
    return (
      <div className="mx-auto max-w-lg space-y-5 p-8">
        <h1 className="font-display text-2xl font-semibold">Contact your administrator</h1>
        <p>
          Your church administrator manages the ChurchOS subscription. Please
          contact them to activate or renew your workspace.
        </p>
        <Button variant="outline" onClick={() => void logout()}>
          Sign out
        </Button>
      </div>
    );
  if (!status.allowed)
    return (
      <LoadingState label="Checking access" variant="detail" className="mx-auto max-w-6xl" />
    );
  return (
    <ExistingBillingPresentation
      enabled={Boolean(data?.subscription?.paid_until)}
    >
      <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            {data?.active && (!trackedReference || outcome === "applied") && (
              <Link
                href="/home"
                className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground"
              >
                <ArrowLeft className="size-4" />
                Back to workspace
              </Link>
            )}
            <h1 className="text-3xl font-semibold tracking-tight">
              Plan & Billing
            </h1>
            <p className="mt-2 text-muted-foreground">
              Your church subscription, allowances and payments.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/help/subscription-currencies-and-payments">
                Billing guide
              </Link>
            </Button>
            <SupportChatButton />
            <Button variant="outline" onClick={() => void logout()}>
              Sign out
            </Button>
          </div>
        </header>
        <SubscriptionCurrencySwitcher />
        {status.isPending && <LoadingState label="Loading subscription" variant="cards" rows={3} />}
        {status.isError && (
          <div role="alert" className="rounded-xl border p-4">
            <p>{status.error.message}</p>
            <Button onClick={() => void status.refetch()}>Try again</Button>
          </div>
        )}
        {trackedReference && (
          <div
            role={outcome === "review" ? "alert" : "status"}
            className="space-y-2 rounded-xl border bg-muted/40 p-4"
          >
            <p className="font-medium">
              {outcome === "applied"
                ? "Payment verified. Your subscription is active."
                : outcome === "review"
                  ? "Your payment was received and requires a ChurchOS review. Contact support with your payment reference."
                  : "Waiting for Flutterwave to confirm your payment."}
            </p>
            {waitingForPayment && (
              <p className="text-sm text-muted-foreground">
                Complete payment in the separate Flutterwave window. Keep this
                page open; we’ll update it automatically when payment is
                verified.
                {verification.isError &&
                  " Connection interrupted. We’ll retry automatically when connected."}
                {outcome === "failed" &&
                  " The latest attempt was unsuccessful. You can retry checkout; we’ll keep checking for a later confirmation."}
              </p>
            )}
            <p className="break-all font-mono text-xs">{trackedReference}</p>
          </div>
        )}
        {message && (
          <p role="status" className="rounded-xl border bg-muted/40 p-4">
            {message}
          </p>
        )}
        {data && (
          <>
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      CURRENT SUBSCRIPTION
                    </p>
                    <CardTitle className="mt-2 text-2xl capitalize">
                      {data.subscription?.plan || "Choose your plan"}
                    </CardTitle>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
                    {data.active ? (
                      <CheckCircle2 className="size-4 text-primary" />
                    ) : (
                      <AlertCircle className="size-4" />
                    )}
                    {data.active ? "Active" : "Renewal required"}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <p>
                  Renew by{" "}
                  <strong>{date(data.subscription?.paid_until)}</strong>.
                  Renewals are manual; there are no automatic charges.
                </p>
                {data.subscription?.scheduled_plan && (
                  <div className="rounded-lg border p-3">
                    <p className="capitalize">
                      Next renewal: {data.subscription.scheduled_plan} ·{" "}
                      {data.subscription.scheduled_cycle}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Current access continues until expiry. Existing records
                      will be kept; lower allowances block new additions. Renew
                      at the selected plan to complete the change.
                    </p>
                    <Button
                      variant="link"
                      disabled={!status.canPay || schedule.isPending}
                      onClick={() => schedule.mutate(true)}
                    >
                      Cancel scheduled change
                    </Button>
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-3">
                  {(["members", "staff", "locations"] as const).map(
                    (resource) => {
                      const used = data.usage?.[resource] ?? 0;
                      const limit = data.limits?.[resource] ?? 0;
                      const percent = limit
                        ? Math.min(100, (used / limit) * 100)
                        : 100;
                      return (
                        <div key={resource} className="rounded-xl border p-4">
                          <div className="flex justify-between gap-2">
                            <h2 className="font-medium capitalize">
                              {resource === "staff"
                                ? "Staff accounts"
                                : resource}
                            </h2>
                            <strong>
                              {used} / {limit}
                            </strong>
                          </div>
                          <div
                            role="progressbar"
                            aria-label={`${resource} allowance`}
                            aria-valuenow={used}
                            aria-valuemin={0}
                            aria-valuemax={Math.max(limit, used, 1)}
                            className="my-3 h-2 overflow-hidden rounded-full bg-muted"
                          >
                            <div
                              className={
                                percent >= 90
                                  ? "h-full bg-amber-500"
                                  : "h-full bg-primary"
                              }
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {resource === "members"
                              ? "Non-archived directory records"
                              : resource === "locations"
                                ? "Includes your headquarters"
                                : `${data.usage?.pendingInvitations ?? 0} pending invitations included`}
                          </p>
                          {used >= limit ? (
                            <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                              Allowance reached. Review your plan to add more.
                            </p>
                          ) : percent >= 80 ? (
                            <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                              Approaching your allowance.
                            </p>
                          ) : null}
                        </div>
                      );
                    },
                  )}
                </div>
                <Button onClick={() => setManage((v) => !v)}>
                  {manage
                    ? "Close plan comparison"
                    : data.active
                      ? "Manage plan"
                      : "Choose a plan and renew"}
                </Button>
              </CardContent>
            </Card>
            {(manage || !data.active || pending) && (
              <section aria-label="Manage plan" className="space-y-5">
                <h2 className="text-xl font-semibold">
                  Choose the space your church needs
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {launchPlans.map((item) => {
                    return (
                      <Card
                        key={item.id}
                        className={plan === item.id ? "border-primary" : ""}
                      >
                        <CardHeader>
                          <CardTitle>{item.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-xl font-semibold">
                            {item.id === "enterprise"
                              ? "Negotiated"
                              : <SubscriptionPrice pricing={pricing} plan={item.id} cycle={cycle} />}
                          </p>
                          <p className="text-sm">{item.capacity}</p>
                          <ul className="space-y-1 text-xs text-muted-foreground">
                            {item.features.map((f) => (
                              <li key={f}>{f}</li>
                            ))}
                          </ul>
                          {item.id === "enterprise" ? (
                            <p className="text-sm">
                              Contact ChurchOS sales for an agreed quote.
                            </p>
                          ) : (
                            <Button
                              className="w-full"
                              variant={plan === item.id ? "default" : "outline"}
                              disabled={!!pending}
                              onClick={() => setPlan(item.id as typeof plan)}
                            >
                              {data.subscription?.plan === item.id
                                ? "Current plan"
                                : `Choose ${item.name}`}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                <div className="grid gap-5 rounded-xl border bg-card p-5 md:grid-cols-2">
                  <div className="space-y-3">
                    <label className="block text-sm">
                      Billing period
                      <select
                        aria-label="Billing period"
                        className="mt-1 block w-full rounded-md border bg-background p-3"
                        value={cycle}
                        disabled={!!pending}
                        onChange={(e) =>
                          setCycle(e.target.value as BillingCycle)
                        }
                      >
                        <option value="monthly">Monthly</option>
                        <option value="annual">Yearly · save 10%</option>
                      </select>
                    </label>
                    {!downgrade && (
                      <label className="block text-sm">
                        Payment provider
                        <select
                          aria-label="Payment provider"
                          className="mt-1 block w-full rounded-md border bg-background p-3"
                          value={gateway}
                          disabled
                        >
                          <option value="flutterwave">Flutterwave</option>
                        </select>
                      </label>
                    )}
                    {!downgrade && (
                      <label className="block text-sm">
                        Payment currency
                        <select
                          aria-label="Payment currency"
                          className="mt-1 block w-full rounded-md border bg-background p-3"
                          value={paymentCurrency}
                          disabled={!!pending}
                          onChange={(event) =>
                            setPaymentChoice({
                              key: choiceKey,
                              currency: event.target.value,
                            })
                          }
                        >
                          {(pending
                            ? [pending.currency || "NGN"]
                            : availableCurrencies
                          ).map((currency) => (
                            <option key={currency} value={currency}>
                              {currency}
                            </option>
                          ))}
                        </select>
                        {paymentCurrency !== pricing.currency && (
                          <span className="mt-2 block text-xs text-muted-foreground">
                            Prices are displayed in {pricing.currency}. This
                            provider will charge {paymentCurrency}; review the
                            exact amount before continuing.
                          </span>
                        )}
                      </label>
                    )}
                  </div>
                  <div className="space-y-3">
                    {downgrade ? (
                      <>
                        <h3 className="font-semibold">
                          Schedule for your next renewal
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Your current plan continues until{" "}
                          {date(data.subscription?.paid_until)}. Records will be
                          retained, and additions beyond the new allowance will
                          be blocked. No charge today.
                        </p>
                        <Button
                          disabled={!status.canPay || schedule.isPending}
                          onClick={() => schedule.mutate(false)}
                        >
                          Schedule downgrade
                        </Button>
                      </>
                    ) : (
                      <>
                        <h3 className="flex items-center gap-2 font-semibold">
                          <CreditCard className="size-4" />
                          {pending
                            ? "Pending payment"
                            : samePlan && data.active
                              ? "Renew subscription"
                              : data.active
                                ? "Upgrade now"
                                : "Activate subscription"}
                        </h3>
                        {pending ? (
                          <p>
                            Amount due:{" "}
                            <strong>
                              {subscriptionMoney(
                                pending.amount,
                                pending.currency || "NGN",
                              )}
                            </strong>
                          </p>
                        ) : quote.data && !quote.isError ? (
                          <>
                            <p className="font-display text-2xl font-semibold">
                              {subscriptionMoney(
                                quote.data.amount,
                                quote.data.currency || paymentCurrency,
                              )}{" "}
                              due
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {quote.data.intent === "upgrade"
                                ? "Prorated upgrade for the remaining paid period. Your renewal deadline stays the same."
                                : "Full subscription period. No automatic renewal charges."}{" "}
                              Renew by {date(quote.data.renewBy)}.
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Price locked until{" "}
                              {new Date(
                                quote.data.expiresAt,
                              ).toLocaleTimeString()}
                              .{" "}
                              {quote.data.currency !== "USD" && (
                                <>
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
                          </>
                        ) : samePlan && data.active ? (
                          <p className="text-sm text-muted-foreground">
                            Your plan is active. Choose a larger plan to upgrade
                            now, or renew after{" "}
                            {date(data.subscription?.paid_until)}.
                          </p>
                        ) : quote.isError ? (
                          <p role="alert" className="text-sm text-destructive">
                            {quote.error.message}
                            <button
                              type="button"
                              className="ml-2 underline"
                              onClick={() => void quote.refetch()}
                            >
                              Refresh quote
                            </button>
                          </p>
                        ) : (
                          <LoadingState label="Calculating your payment" variant="inline" className="h-9" />
                        )}
                        <div className="space-y-2 rounded-lg border p-3 text-xs leading-5 text-muted-foreground">
                          <p>
                            Before paying, review the exact amount, currency and
                            period. The Terms of Service include cancellation
                            and refund rules, a customer indemnity and liability
                            limits, subject to mandatory legal rights. Standard
                            renewals are manual.
                          </p>
                          <LegalNavigation label="Checkout legal information" />
                        </div>
                        <Button
                          disabled={
                            !status.canPay ||
                            checkout.isPending ||
                            (!pending &&
                              (!quote.data?.quoteId ||
                                quote.isFetching ||
                                Date.parse(quote.data.expiresAt) <=
                                  Date.now())) ||
                            !data.gateways.length
                          }
                          onClick={openCheckout}
                        >
                          {pending
                            ? "Resume secure checkout"
                            : "Continue to payment"}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Flutterwave opens in a separate window. ChurchOS waits
                          here for verified payment.
                        </p>
                        {!data.gateways.length && (
                          <p className="text-sm">
                            Checkout is being configured. Contact ChurchOS.
                          </p>
                        )}
                      </>
                    )}
                    {(reference || pending) && (
                      <Button
                        variant="outline"
                        disabled={!status.canPay || verification.isFetching}
                        onClick={() =>
                          checkPayment(reference || pending!.reference)
                        }
                      >
                        I’ve paid — check payment
                      </Button>
                    )}
                  </div>
                </div>
              </section>
            )}
            <Card>
              <CardHeader>
                <CardTitle>Payment history</CardTitle>
              </CardHeader>
              <CardContent>
                {!data.payments?.length ? (
                  <p className="text-sm text-muted-foreground">
                    No subscription payments yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table className="w-full text-left text-sm">
                      <TableHeader>
                        <TableRow className="border-b">
                          <TableHead className="p-2">Reference</TableHead>
                          <TableHead className="p-2">Plan</TableHead>
                          <TableHead className="p-2">Date</TableHead>
                          <TableHead className="p-2">Amount</TableHead>
                          <TableHead className="p-2">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.payments.map((payment) => (
                          <TableRow
                            key={payment.reference}
                            className="border-b"
                          >
                            <TableCell
                              className="p-2 font-mono text-xs"
                              title={payment.reference}
                            >
                              {payment.reference}
                            </TableCell>
                            <TableCell className="p-2 capitalize">
                              {payment.plan}
                            </TableCell>
                            <TableCell className="p-2 whitespace-nowrap">
                              {date(payment.created_at)}
                            </TableCell>
                            <TableCell className="p-2 whitespace-nowrap">
                              {subscriptionMoney(
                                payment.amount,
                                payment.currency || "NGN",
                              )}
                            </TableCell>
                            <TableCell className="p-2 capitalize">
                              {payment.application_status === "review"
                                ? "Received — contact support"
                                : payment.status}
                              {status.canPay &&
                                ["pending", "failed"].includes(
                                  payment.status,
                                ) && (
                                  <button
                                    type="button"
                                    className="ml-2 underline"
                                    onClick={() =>
                                      checkPayment(payment.reference)
                                    }
                                  >
                                    Check payment
                                  </button>
                                )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </ExistingBillingPresentation>
  );
}
