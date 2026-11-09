"use client";

import { LoadingState } from "@/components/shared/loading-state";
import { showCheckoutLoading } from "@/lib/checkout-loading";
import { LegalNavigation } from "@/components/legal/legal-navigation";
import { PageHeader } from "@/components/paper/section";
import { Tag } from "@/components/paper/stat";
import {
  EmptyState,
  ListPaginationFooter,
  ManageHeading,
  RowActions,
} from "@/components/paper/primitives";
import { ListTable } from "@/components/shared/list-table";
import { cn } from "@/lib/utils";
import { SupportChatButton } from "@/components/support/support-chat-button";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  Check,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock3,
  ReceiptText,
  RefreshCcw,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useBillingStatus } from "@/hooks/use-billing";
import { api } from "@/lib/api";
import { subscriptionCheckoutUrl } from "@/lib/subscription-checkout";
import { paymentOutcome } from "@/lib/payment-confirmation";
import { publishPaymentHint, subscribePaymentHints } from "@/lib/payment-sync";
import { Button } from "@/components/ui/button";
import {
  SubscriptionCurrencySwitcher,
  SubscriptionPrice,
} from "@/components/billing/subscription-currency";
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
  const { isAuthenticated, isLoading } = useAuth();
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
  const [manageRequest, setManageRequest] = React.useState(0);
  const comparison = React.useRef<HTMLElement>(null);
  const manageTrigger = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (!manageRequest || !comparison.current) return;
    comparison.current.focus({ preventScroll: true });
    comparison.current.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  }, [manageRequest]);
  const [paymentPage, setPaymentPage] = React.useState(1);
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
      ["applied", "review", "closed", "revoked"].includes(
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
    !!trackedReference &&
    outcome !== "applied" &&
    outcome !== "review" &&
    outcome !== "closed" &&
    outcome !== "revoked";
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
    !pending &&
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
  const closeCheckout = useMutation({
    onMutate: async () => {
      await client.cancelQueries({
        queryKey: ["billing-verification", status.churchId],
      });
    },
    mutationFn: (paymentReference: string) =>
      api.post<BillingStatus>("/billing/checkout/close", {
        reference: paymentReference,
      }),
    onSuccess: (result) => {
      client.setQueryData(["platform-subscription", status.churchId], result);
      checkoutWindow.current?.close();
      setReference("");
      if (storageKey) {
        try {
          sessionStorage.removeItem(storageKey);
        } catch {
          /* Optional recovery storage. */
        }
      }
      setMessage(
        "Checkout closed. Choose your plan and billing period. Any payment already sent will be checked and reviewed.",
      );
      void client.invalidateQueries({ queryKey: ["platform-subscription"] });
    },
    onError: (error) => setMessage(error.message),
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
  const heading = (
    <PageHeader
      eyebrow="Settings · Subscription"
      title="Plan & Billing"
      description="A clear view of your church’s plan, allowances and payments."
      actions={
        <div className="flex flex-wrap gap-2 [&_button]:h-9 [&_button]:rounded-full [&_button]:text-xs">
          <Button
            variant="outline"
            asChild
            className="h-9 rounded-full border-line text-xs"
          >
            <Link href="/help/subscription-currencies-and-payments">
              Billing guide
            </Link>
          </Button>
          <SupportChatButton />
        </div>
      }
    />
  );
  if (isLoading)
    return (
      <div className="space-y-6">
        {heading}
        <LoadingState label="Loading your account" variant="detail" />
      </div>
    );
  if (!isAuthenticated)
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-5 py-8">
        {heading}
        <EmptyState
          icon={<CreditCard />}
          title="Sign in to manage your plan"
          description="Use your church administrator account to manage subscriptions."
          action={
            <Button asChild className="rounded-full">
              <Link href="/login?returnTo=%2Fsubscription">Sign in</Link>
            </Button>
          }
        />
      </div>
    );
  if (!status.allowed && status.accessReady)
    return (
      <div className="space-y-6">
        {heading}
        <section className="paper-card flex flex-col items-center gap-4 rounded-2xl px-6 py-12 text-center">
          <ShieldCheck className="size-8 text-brand" />
          <h2 className="font-display text-xl font-semibold">
            Contact your administrator
          </h2>
          <p className="max-w-lg text-sm leading-relaxed text-ink-soft">
            Your church administrator manages the ChurchOS subscription. Contact
            them to activate or renew your workspace.
          </p>
          <Button variant="outline" asChild className="rounded-full">
            <Link href="/home">Back to workspace</Link>
          </Button>
        </section>
      </div>
    );
  if (!status.allowed)
    return (
      <div className="space-y-6">
        {heading}
        <LoadingState label="Checking access" variant="detail" />
      </div>
    );
  const payments = data?.payments ?? [];
  const pagedPayments = payments.slice(
    (paymentPage - 1) * 10,
    paymentPage * 10,
  );
  const currentPlanName =
    launchPlans.find((item) => item.id === data?.subscription?.plan)?.name ??
    "Choose your plan";
  return (
    <div className="min-w-0 space-y-6">
      {heading}
      {status.isPending && (
        <LoadingState label="Loading subscription" variant="cards" rows={3} />
      )}
      {status.isError && (
        <EmptyState
          icon={<AlertCircle />}
          title="Billing could not be loaded"
          description={status.error.message}
          action={
            <Button variant="outline" onClick={() => void status.refetch()}>
              Try again
            </Button>
          }
        />
      )}
      {data?.accessReview && (
        <div
          role="alert"
          className="rounded-2xl border border-gold/30 bg-gold/5 p-5 text-sm text-ink"
        >
          A payment has a partial refund or an open dispute. Access funded by
          that payment is held for ChurchOS review. Other paid periods remain
          available. Contact support with the payment reference shown below.
        </div>
      )}
      {trackedReference && (
        <div
          role={outcome === "review" ? "alert" : "status"}
          className={cn(
            "flex items-start gap-3 rounded-2xl border p-5",
            outcome === "review"
              ? "border-gold/30 bg-gold-soft/30"
              : "border-brand/20 bg-brand-soft/25",
          )}
        >
          <span className="mt-0.5 text-brand">
            {outcome === "applied" ? (
              <CheckCircle2 className="size-5" />
            ) : (
              <Clock3 className="size-5" />
            )}
          </span>
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-semibold">
              {outcome === "applied"
                ? "Payment verified. Your subscription is active."
                : outcome === "review"
                  ? "Your payment requires a ChurchOS review. Contact support with your payment reference."
                  : outcome === "revoked"
                    ? "Access funded by this payment has been removed. Other paid periods remain available. Contact support with your reference."
                    : outcome === "closed"
                      ? "This checkout is closed. A payment already sent will still be checked and reviewed."
                      : "Waiting for Flutterwave to confirm your payment."}
            </p>
            {waitingForPayment && (
              <p className="text-xs leading-relaxed text-ink-soft">
                Complete payment in the separate Flutterwave window. Keep this
                page open; we’ll update it automatically when payment is
                verified.
                {verification.isError &&
                  " Connection interrupted. We’ll retry automatically when connected."}
                {outcome === "failed" &&
                  " The latest attempt was unsuccessful. You can retry checkout; we’ll keep checking for a later confirmation."}
              </p>
            )}
            <p className="break-all font-mono text-[11px] text-ink-soft">
              {trackedReference}
            </p>
          </div>
        </div>
      )}
      {message && (
        <p
          role="status"
          className="rounded-xl border border-line bg-card px-5 py-4 text-sm text-ink-soft"
        >
          {message}
        </p>
      )}
      {data && (
        <>
          <section
            aria-label="Current subscription"
            className="paper-card overflow-hidden rounded-2xl"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-muted/20 p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-xl bg-brand-soft text-brand">
                  <CreditCard className="size-5" />
                </span>
                <div>
                  <p className="rule-label">Current subscription</p>
                  <h2 className="mt-1 font-display text-2xl font-semibold">
                    {currentPlanName}
                  </h2>
                </div>
              </div>
              <Tag tone={data.active ? "moss" : "gold"} dot>
                {data.active
                  ? "Active"
                  : data.subscription?.paid_until
                    ? "Renewal required"
                    : "Not activated"}
              </Tag>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-6">
              <div>
                <p className="text-sm text-ink-soft">
                  {data.subscription?.paid_until ? (
                    <>
                      Renew by{" "}
                      <strong className="text-ink">
                        {date(data.subscription.paid_until)}
                      </strong>
                      .
                    </>
                  ) : (
                    "Choose a plan to activate your church workspace."
                  )}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-ink-faint">
                  Renewals are manual; there are no automatic charges.
                </p>
              </div>
              <Button
                className="h-9 gap-2 rounded-full text-xs"
                ref={manageTrigger}
                aria-controls="plan-comparison"
                aria-expanded={manage || !data.active || !!pending}
                onClick={() => {
                  setManage(true);
                  setManageRequest((value) => value + 1);
                }}
              >
                <SlidersHorizontal className="size-3.5" />
                {data.active ? "Manage plan" : "Choose a plan and renew"}
              </Button>
            </div>
            {data.subscription?.scheduled_plan && (
              <div className="mx-5 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gold-soft/30 p-4 sm:mx-6">
                <div>
                  <p className="text-sm font-semibold capitalize">
                    Next renewal: {data.subscription.scheduled_plan} ·{" "}
                    {data.subscription.scheduled_cycle}
                  </p>
                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-ink-soft">
                    Current access continues until expiry. Existing records will
                    be kept; lower allowances block new additions. Renew at the
                    selected plan to complete the change.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="h-8 rounded-full text-xs"
                  disabled={!status.canPay || schedule.isPending}
                  onClick={() => schedule.mutate(true)}
                >
                  Cancel scheduled change
                </Button>
              </div>
            )}
          </section>
          <div className="grid gap-3 md:grid-cols-3">
            {(["members", "staff", "locations"] as const).map((resource) => {
              const used = data.usage?.[resource] ?? 0,
                limit = data.limits?.[resource] ?? 0;
              const percent =
                limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
              const Icon =
                resource === "members"
                  ? UsersRound
                  : resource === "staff"
                    ? UserRound
                    : Building2;
              return (
                <section key={resource} className="paper-card rounded-2xl p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="rule-label">
                      {resource === "staff" ? "Staff accounts" : resource}
                    </h2>
                    <Icon className="size-4 text-brand" />
                  </div>
                  <p className="num mt-4 font-display text-2xl font-semibold">
                    {used.toLocaleString()}{" "}
                    <span className="ml-1.5 font-sans text-xs font-normal text-ink-faint">
                      / {limit > 0 ? limit.toLocaleString() : "Unlimited"}
                    </span>
                  </p>
                  <div
                    role="progressbar"
                    aria-label={`${resource} allowance`}
                    aria-valuenow={used}
                    aria-valuemin={0}
                    aria-valuemax={Math.max(limit, used, 1)}
                    aria-valuetext={`${used} used${limit > 0 ? ` of ${limit}` : ", no limit"}`}
                    className="my-3 h-1.5 overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className={cn(
                        "h-full rounded-full",
                        percent >= 90 ? "bg-gold" : "bg-brand",
                      )}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="text-xs text-ink-soft">
                    {resource === "members"
                      ? "Non-archived directory records"
                      : resource === "locations"
                        ? "Includes your headquarters"
                        : `${data.usage?.pendingInvitations ?? 0} pending invitations included`}
                  </p>
                  {limit > 0 && (used >= limit || percent >= 80) && (
                    <p className="mt-2 text-xs text-gold">
                      {used >= limit
                        ? "Allowance reached. Review your plan to add more."
                        : "Approaching your allowance."}
                    </p>
                  )}
                </section>
              );
            })}
          </div>
          {(manage || !data.active || pending) && (
            <section
              id="plan-comparison"
              ref={comparison}
              tabIndex={-1}
              aria-label="Manage plan"
              className="scroll-mt-24 space-y-5 outline-none"
            >
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="rule-label">Find your fit</p>
                  <h2 className="mt-1 font-display text-xl font-semibold">
                    Choose the space your church needs
                  </h2>
                  <p className="mt-1 text-sm text-ink-soft">
                    Compare plans and review the exact payment before
                    continuing.
                  </p>
                </div>
                {data.active && !pending && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-full"
                    onClick={() => {
                      setManage(false);
                      manageTrigger.current?.focus();
                    }}
                  >
                    Close comparison
                  </Button>
                )}
                <label className="grid gap-1.5 text-xs text-ink-soft">
                  Billing period
                  <select
                    aria-label="Billing period"
                    className="h-9 rounded-full border border-line bg-card px-3 text-xs"
                    value={cycle}
                    onChange={(event) =>
                      setCycle(event.target.value as BillingCycle)
                    }
                  >
                    <option value="monthly">Monthly</option>
                    <option value="annual">Yearly · save 10%</option>
                  </select>
                </label>
              </div>
              {pending && (
                <p
                  role="status"
                  className="rounded-xl border border-brand/20 bg-brand-soft/20 p-4 text-sm leading-relaxed text-ink-soft"
                >
                  You can compare plans and billing periods while a payment is
                  pending. Your saved checkout is for{" "}
                  <strong className="capitalize text-ink">
                    {pending.plan}
                  </strong>
                  , {pending.cycle === "annual" ? "yearly" : "monthly"}, at{" "}
                  <strong className="text-ink">
                    {subscriptionMoney(
                      pending.amount,
                      pending.currency || "NGN",
                    )}
                  </strong>
                  . Check its status or resume that checkout below.
                </p>
              )}
              <div className="paper-card rounded-2xl p-4 sm:p-5">
                <SubscriptionCurrencySwitcher />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {launchPlans.map((item) => {
                  const selected = plan === item.id,
                    current = data.subscription?.plan === item.id,
                    catalog = data.catalog?.find(
                      (entry) => entry.id === item.id,
                    );
                  return (
                    <article
                      key={item.id}
                      className={cn(
                        "paper-card flex min-w-0 flex-col rounded-2xl border p-5",
                        selected
                          ? "border-brand/40 bg-brand-soft/20"
                          : "border-line",
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-display text-lg font-semibold">
                          {item.name}
                        </h3>
                        {selected ? (
                          <Tag tone="brand">Selected</Tag>
                        ) : current ? (
                          <Tag tone="neutral">Current</Tag>
                        ) : null}
                      </div>
                      <p className="mt-2 min-h-10 text-xs leading-relaxed text-ink-soft">
                        {item.description}
                      </p>
                      <p className="mt-4 font-display text-3xl font-semibold tracking-tight">
                        {item.id === "enterprise" ? (
                          "Let’s talk"
                        ) : (
                          <SubscriptionPrice
                            pricing={pricing}
                            plan={item.id}
                            cycle={cycle}
                          />
                        )}
                      </p>
                      {item.id !== "enterprise" && (
                        <p className="mt-1 text-xs text-ink-faint">
                          per {cycle === "annual" ? "year" : "month"}
                        </p>
                      )}
                      <p className="mt-4 border-y border-line py-3 text-xs leading-relaxed text-ink-soft">
                        {catalog?.limits
                          ? `${catalog.limits.members.toLocaleString()} members · ${catalog.limits.locations} location${catalog.limits.locations === 1 ? "" : "s"} · ${catalog.limits.staff} staff accounts`
                          : item.capacity}
                      </p>
                      <ul className="mt-4 space-y-2 text-xs leading-relaxed text-ink-soft">
                        {item.features.slice(0, 4).map((feature) => (
                          <li key={feature} className="flex items-start gap-2">
                            <Check className="mt-0.5 size-3.5 shrink-0 text-brand" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      {item.features.length > 4 && (
                        <details className="mt-3 text-xs text-ink-soft">
                          <summary className="cursor-pointer text-brand">
                            All plan features
                          </summary>
                          <ul className="mt-2 space-y-2">
                            {item.features.slice(4).map((feature) => (
                              <li
                                key={feature}
                                className="flex items-start gap-2"
                              >
                                <Check className="mt-0.5 size-3.5 shrink-0 text-brand" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                      <div className="mt-auto pt-5">
                        {item.id === "enterprise" ? (
                          <>
                            <p className="mb-3 text-xs text-ink-faint">
                              Contact ChurchOS sales for an agreed quote.
                            </p>
                            <Button
                              asChild
                              variant="outline"
                              className="h-9 w-full rounded-full text-xs"
                            >
                              <Link href="/help/contact-support">
                                Talk to sales
                              </Link>
                            </Button>
                          </>
                        ) : (
                          <Button
                            className="h-9 w-full rounded-full text-xs"
                            aria-pressed={selected}
                            variant={selected ? "default" : "outline"}
                            onClick={() => setPlan(item.id as typeof plan)}
                          >
                            {current ? "Current plan" : `Choose ${item.name}`}
                          </Button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
              <section
                aria-label="Payment review"
                className="paper-card overflow-hidden rounded-2xl"
              >
                <div className="border-b border-line bg-muted/20 px-5 py-4 sm:px-6">
                  <p className="rule-label">Before you continue</p>
                  <h2 className="mt-1 font-display text-xl font-semibold">
                    {pending ? "Your pending payment" : "Review your plan"}
                  </h2>
                </div>
                <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] sm:p-6">
                  <div className="space-y-4">
                    <div>
                      <p className="rule-label">
                        {pending ? "Pending checkout plan" : "Selected plan"}
                      </p>
                      <p className="mt-2 font-display text-xl font-semibold capitalize">
                        {pending?.plan || plan}
                      </p>
                      <p className="mt-1 text-xs text-ink-soft">
                        {(pending?.cycle || cycle) === "annual"
                          ? "Annual billing"
                          : "Monthly billing"}
                      </p>
                      {pending &&
                        (plan !== pending.plan || cycle !== pending.cycle) && (
                          <p className="mt-3 text-xs leading-relaxed text-ink-soft">
                            The comparison above shows{" "}
                            <span className="capitalize">{plan}</span>,{" "}
                            {cycle === "annual" ? "yearly" : "monthly"}. This
                            pending payment keeps its original plan, period and
                            amount.
                          </p>
                        )}
                    </div>
                    {!downgrade && (
                      <>
                        <label className="grid gap-1.5 text-xs text-ink-soft">
                          Payment provider
                          <select
                            aria-label="Payment provider"
                            className="h-10 rounded-lg border border-line bg-background px-3 text-sm"
                            value={gateway}
                            disabled
                          >
                            <option value="flutterwave">Flutterwave</option>
                          </select>
                        </label>
                        <label className="grid gap-1.5 text-xs text-ink-soft">
                          Payment currency
                          <select
                            aria-label="Payment currency"
                            className="h-10 rounded-lg border border-line bg-background px-3 text-sm"
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
                            <span className="text-xs leading-relaxed">
                              Prices are displayed in {pricing.currency}. This
                              provider will charge {paymentCurrency}; review the
                              exact amount before continuing.
                            </span>
                          )}
                        </label>
                      </>
                    )}
                    <div className="flex gap-2 rounded-xl bg-brand-soft/25 p-3 text-xs leading-relaxed text-ink-soft">
                      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" />
                      <p>
                        Review the plan, currency and period here. Payment is
                        completed securely in a separate Flutterwave window.
                      </p>
                    </div>
                  </div>
                  <div className="min-w-0 space-y-4 rounded-xl bg-muted/25 p-4 sm:p-5">
                    {downgrade ? (
                      <>
                        <h3 className="font-display text-lg font-semibold">
                          Schedule for your next renewal
                        </h3>
                        <p className="text-sm leading-relaxed text-ink-soft">
                          Your current plan continues until{" "}
                          {date(data.subscription?.paid_until)}. Records will be
                          retained, and additions beyond the new allowance will
                          be blocked. No charge today.
                        </p>
                        <Button
                          className="rounded-full"
                          disabled={!status.canPay || schedule.isPending}
                          onClick={() => schedule.mutate(false)}
                        >
                          Schedule downgrade
                        </Button>
                      </>
                    ) : (
                      <>
                        <h3 className="flex items-center gap-2 text-sm font-semibold">
                          <CreditCard className="size-4 text-brand" />
                          {pending
                            ? "Pending payment"
                            : samePlan && data.active
                              ? "Renew subscription"
                              : data.active
                                ? "Upgrade now"
                                : "Activate subscription"}
                        </h3>
                        {pending ? (
                          <p className="text-sm text-ink-soft">
                            Amount due:{" "}
                            <strong className="block pt-2 font-display text-3xl font-semibold text-ink">
                              {subscriptionMoney(
                                pending.amount,
                                pending.currency || "NGN",
                              )}
                            </strong>
                          </p>
                        ) : quote.data && !quote.isError ? (
                          <>
                            <p className="font-display text-3xl font-semibold">
                              {subscriptionMoney(
                                quote.data.amount,
                                quote.data.currency || paymentCurrency,
                              )}{" "}
                              <span className="font-sans text-xs font-normal text-ink-soft">
                                due
                              </span>
                            </p>
                            <p className="text-sm leading-relaxed text-ink-soft">
                              {quote.data.intent === "upgrade"
                                ? "Prorated upgrade for the remaining paid period. Your renewal deadline stays the same."
                                : "Full subscription period. No automatic renewal charges."}{" "}
                              Renew by {date(quote.data.renewBy)}.
                            </p>
                            <p className="text-xs leading-relaxed text-ink-faint">
                              Price locked until{" "}
                              {new Date(
                                quote.data.expiresAt,
                              ).toLocaleTimeString("en-NG", {
                                timeZone: "Africa/Lagos",
                              })}
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
                          <p className="text-sm leading-relaxed text-ink-soft">
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
                        ) : !data.gateways.length ||
                          !availableCurrencies.length ? (
                          <p role="status" className="text-sm text-ink-soft">
                            Checkout is being configured. Contact ChurchOS.
                          </p>
                        ) : (
                          <LoadingState
                            label="Calculating your payment"
                            variant="inline"
                            className="h-9"
                          />
                        )}
                        <div className="space-y-2 rounded-xl border border-line bg-card/60 p-3 text-xs leading-relaxed text-ink-soft">
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
                          className="h-10 w-full gap-2 rounded-full text-sm"
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
                          <CreditCard className="size-4" />
                          {pending
                            ? "Resume secure checkout"
                            : "Continue to payment"}
                        </Button>
                        <p className="text-xs leading-relaxed text-ink-faint">
                          Flutterwave opens in a separate window. ChurchOS waits
                          here for verified payment.
                        </p>
                      </>
                    )}
                    {!status.canPay && (
                      <p className="text-xs text-ink-soft">
                        Your account can view billing. A billing administrator
                        can make payments or change renewal preferences.
                      </p>
                    )}
                    {pending && status.canPay && (
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          className="w-full rounded-full text-xs"
                          disabled={
                            closeCheckout.isPending || checkout.isPending
                          }
                          onClick={() =>
                            closeCheckout.mutate(pending.reference)
                          }
                        >
                          Close checkout and change plan
                        </Button>
                        <p className="text-xs text-ink-faint">
                          Closing checkout does not refund a payment already
                          sent. A late payment will go to ChurchOS for review.
                        </p>
                      </div>
                    )}
                    {(reference || pending) && (
                      <Button
                        variant="outline"
                        className="w-full rounded-full text-xs"
                        disabled={!status.canPay || verification.isFetching}
                        onClick={() =>
                          checkPayment(reference || pending!.reference)
                        }
                      >
                        Check my payment
                      </Button>
                    )}
                  </div>
                </div>
              </section>
            </section>
          )}
          <section
            aria-label="Subscription payment history"
            className="paper-card overflow-hidden rounded-2xl"
          >
            <div className="flex items-center gap-3 border-b border-line px-5 py-4">
              <ReceiptText className="size-5 text-brand" />
              <div>
                <h2 className="font-display text-lg font-semibold">
                  Payment history
                </h2>
                <p className="mt-1 text-xs text-ink-soft">
                  Your church’s subscription payments, with their exact amounts
                  and references.
                </p>
              </div>
            </div>
            {!payments.length ? (
              <EmptyState
                icon={<ReceiptText />}
                title="No subscription payments yet"
                description="Payments will appear here after checkout. Each record keeps its original currency and reference."
              />
            ) : (
              <>
                <ListTable
                  tableId="subscription-payments"
                  label="Subscription payments"
                  records={pagedPayments}
                  recordKey="reference"
                  recordType="subscriptionPayment"
                  className="min-w-[900px]"
                >
                  <div className="rule-label grid grid-cols-[minmax(0,1.6fr)_1fr_1.2fr_1fr_1.3fr_auto] items-center gap-3 border-b border-line px-5 py-3">
                    <span>Reference</span>
                    <span>Plan</span>
                    <span>Date</span>
                    <span>Amount</span>
                    <span>Status</span>
                    <ManageHeading />
                  </div>
                  {pagedPayments.map((payment) => (
                    <div
                      key={payment.reference}
                      className="group grid grid-cols-[minmax(0,1.6fr)_1fr_1.2fr_1fr_1.3fr_auto] items-center gap-3 border-b border-line/70 px-5 py-4 text-xs"
                    >
                      <span
                        title={payment.reference}
                        className="truncate font-mono text-[11px] text-ink-soft"
                      >
                        {payment.reference}
                      </span>
                      <span className="capitalize">{payment.plan}</span>
                      <span className="text-ink-faint">
                        {date(payment.created_at)}
                      </span>
                      <span className="num font-semibold">
                        {subscriptionMoney(
                          payment.amount,
                          payment.currency || "NGN",
                        )}
                      </span>
                      <span>
                        <Tag
                          tone={
                            payment.application_status === "review" ||
                            payment.lifecycle?.access === "review"
                              ? "gold"
                              : payment.status === "success"
                                ? "moss"
                                : payment.status === "failed"
                                  ? "rose"
                                  : "neutral"
                          }
                        >
                          {payment.application_status === "review" ||
                          payment.lifecycle?.access === "review"
                            ? "Held for review. Contact support"
                            : payment.lifecycle?.access === "revoked"
                              ? "Access removed"
                              : payment.checkout_closed_at
                                ? `Checkout ${payment.checkout_close_reason || "closed"}`
                                : payment.status}
                        </Tag>
                      </span>
                      <RowActions
                        actions={[
                          status.canPay &&
                            ["pending", "failed"].includes(payment.status) && {
                              label: "Check payment",
                              icon: <RefreshCcw />,
                              onSelect: () => checkPayment(payment.reference),
                            },
                        ]}
                      />
                    </div>
                  ))}
                </ListTable>
                <ListPaginationFooter
                  page={paymentPage}
                  perPage={10}
                  total={payments.length}
                  onPageChange={setPaymentPage}
                  itemName="payments"
                />
              </>
            )}
          </section>
          {data.active && (!trackedReference || outcome === "applied") && (
            <Link
              href="/home"
              className="inline-flex items-center gap-2 text-xs text-brand hover:underline"
            >
              <ArrowLeft className="size-3.5" />
              Back to workspace
            </Link>
          )}
        </>
      )}
    </div>
  );
}
