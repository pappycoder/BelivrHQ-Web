"use client";

import { BotProtection } from "@/components/shared/bot-protection";
import { useBotProtectionReady } from "@/hooks/use-bot-protection";
import { LEGAL_VERSION } from "@/lib/legal/company";
import { SubscriptionCurrencySwitcher } from "@/components/billing/subscription-currency";
import {
  selectSubscriptionCurrency,
  useSubscriptionPricing,
} from "@/hooks/use-subscription-pricing";
import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";
import { AuthFormWrapper } from "@/components/shared/auth-form-wrapper";
import { AuthField } from "@/components/shared/auth-field";
import { Button } from "@/components/ui/button";
import { DenominationCombobox } from "@/components/shared/denomination-combobox";
import { useRegister } from "@/hooks/use-auth";
import { launchPlans } from "@/components/marketing/plans";
import { cn } from "@/lib/utils";
import { AUTH_EASE } from "@/lib/auth-motion";
const steps = ["Your church", "Your account", "Your plan", "Review"];
const titles = [
  "A home for your ministry.",
  "Make it yours.",
  "Room to grow.",
  "Your next chapter awaits.",
];
const subtitles = [
  "Let’s start with the community you’re bringing together.",
  "Create the administrator account for your church workspace.",
  "A simple monthly plan or a little more value with yearly billing.",
  "Check your details, then continue to secure subscription payment.",
];
const plans = launchPlans.filter((p) => p.id !== "enterprise");
export default function RegisterPage() {
  const pricing = useSubscriptionPricing();
  const register = useRegister();
  const [step, setStep] = React.useState(0);
  const captchaReady = useBotProtectionReady("/auth/register");
  const [direction, setDirection] = React.useState(1);
  const [details, setDetails] = React.useState({
    churchName: "",
    denomination: "",
    churchAddress: "",
    phone: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [plan, setPlan] = React.useState<
    "essentials" | "community" | "network"
  >("essentials");
  const [cycle, setCycle] = React.useState<"monthly" | "annual">("monthly");
  const [error, setError] = React.useState("");
  const [termsAccepted, setTermsAccepted] = React.useState(false);
  const [created, setCreated] = React.useState(false);
  const heading = React.useRef<HTMLHeadingElement>(null);
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const selected = params.get("plan");
    if (params.get("currency"))
      selectSubscriptionCurrency(params.get("currency")!);
    if (
      selected === "essentials" ||
      selected === "community" ||
      selected === "network"
    )
      setPlan(selected);
    if (params.get("cycle") === "annual") setCycle("annual");
  }, []);
  const selected = plans.find((p) => p.id === plan)!;
  const field = (key: keyof typeof details) => ({
    value: details[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setDetails((v) => ({ ...v, [key]: e.target.value })),
  });
  function move(next: number) {
    setDirection(next > step ? 1 : -1);
    setError("");
    setStep(next);
    requestAnimationFrame(() => heading.current?.focus());
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (step === 0 && !details.churchName.trim()) {
      setError("Please enter your church name.");
      return;
    }
    if (step === 1 && (!details.firstName.trim() || !details.lastName.trim())) {
      setError("Please enter your first and last name.");
      return;
    }
    if (
      step === 1 &&
      (details.password.length < 8 ||
        details.password !== details.confirmPassword)
    ) {
      setError(
        details.password.length < 8
          ? "Use at least 8 characters for your password."
          : "Passwords do not match.",
      );
      return;
    }
    if (step < 3) {
      move(step + 1);
      return;
    }
    if (!termsAccepted) {
      setError("Please read and accept the terms before creating your account.");
      return;
    }
    try {
      await register.mutateAsync({
        termsAccepted: true,
        acceptedTermsVersion: LEGAL_VERSION,
        churchName: details.churchName.trim(),
        firstName: details.firstName.trim(),
        lastName: details.lastName.trim(),
        email: details.email.trim(),
        password: details.password,
        phone: details.phone || undefined,
        denomination: details.denomination || undefined,
        churchAddress: details.churchAddress || undefined,
        plan,
        billingCycle: cycle,
      });
      setDetails((v) => ({ ...v, password: "", confirmPassword: "" }));
      setCreated(true);
    } catch (e) {
      setError(
        (e as { message?: string }).message ||
          "We couldn’t create your account. Please try again.",
      );
    }
  }
  if (created)
    return (
      <AuthFormWrapper
        heading="Your church has a home."
        subtitle="Your account is ready. Opening your subscription checkout…"
      >
        <div className="space-y-5 rounded-2xl border bg-card/70 p-6">
          <CheckCircle2 className="size-10 text-primary" />
          <p className="text-sm leading-relaxed">
            Continuing to your {selected.name} subscription as{" "}
            <strong>{details.email}</strong>.
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            No payment has been taken. Your workspace activates after payment is
            verified.
          </p>
          <Button asChild size="lg" className="w-full rounded-xl">
            <Link href="/subscription">
              Continue to secure checkout <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </AuthFormWrapper>
    );
  return (
    <AuthFormWrapper
      heading="Create your workspace"
      subtitle="One connected home for your people, teams and ministry."
      footer={
        <p>
          Already part of ChurchOS?{" "}
          <Link
            href="/login"
            className="font-semibold text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <nav aria-label="Registration progress">
        <ol className="flex gap-2">
          {steps.map((label, i) => (
            <li key={label} className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => move(i)}
                disabled={i >= step || register.isPending}
                aria-current={i === step ? "step" : undefined}
                className="group w-full text-left disabled:cursor-default"
              >
                <span
                  className={cn(
                    "mb-2 flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium transition-colors",
                    i <= step
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {i < step ? (
                    <Check className="size-3.5" />
                  ) : (
                    String(i + 1).padStart(2, "0")
                  )}
                </span>
                <span
                  className={cn(
                    "block text-[10px] sm:text-xs",
                    i === step ? "font-semibold" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
                <span
                  className={cn(
                    "mt-3 block h-0.5 rounded-full",
                    i <= step ? "bg-primary" : "bg-border",
                  )}
                />
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <form
        onSubmit={submit}
        className="space-y-5"
        aria-busy={register.isPending}
      >
        <div>
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[.16em] text-muted-foreground">
            Step {step + 1} of 4
          </p>
          <h2
            ref={heading}
            tabIndex={-1}
            className="text-xl font-semibold tracking-tight outline-none"
          >
            {titles[step]}
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {subtitles[step]}
          </p>
        </div>
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={{
              enter: (d: number) => ({ opacity: 0, x: d * 16 }),
              visible: { opacity: 1, x: 0 },
              exit: (d: number) => ({ opacity: 0, x: d * -12 }),
            }}
            initial="enter"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.2, ease: AUTH_EASE }}
            className="space-y-4"
          >
            {step === 0 && (
              <>
                <AuthField
                  label="Church Name"
                  placeholder="e.g. Grace Community Church"
                  icon={<Building2 className="size-4" />}
                  autoComplete="organization"
                  maxLength={200}
                  required
                  {...field("churchName")}
                />
                <div className="space-y-1.5">
                  <label
                    htmlFor="registration-denomination"
                    className="text-sm font-medium"
                  >
                    Denomination{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </label>
                  <DenominationCombobox
                    id="registration-denomination"
                    className="h-12 rounded-xl bg-card/60"
                    value={details.denomination}
                    onChange={(v) =>
                      setDetails((d) => ({ ...d, denomination: v }))
                    }
                  />
                </div>
                <AuthField
                  label="Church Address (optional)"
                  icon={<MapPin className="size-4" />}
                  placeholder="Your church’s address"
                  autoComplete="street-address"
                  maxLength={500}
                  {...field("churchAddress")}
                />
                <AuthField
                  label="Phone Number (optional)"
                  type="tel"
                  icon={<Phone className="size-4" />}
                  placeholder="+234 …"
                  autoComplete="tel"
                  {...field("phone")}
                />
              </>
            )}
            {step === 1 && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <AuthField
                    label="First Name"
                    icon={<User className="size-4" />}
                    required
                    maxLength={100}
                    autoComplete="given-name"
                    {...field("firstName")}
                  />
                  <AuthField
                    label="Last Name"
                    required
                    maxLength={100}
                    autoComplete="family-name"
                    {...field("lastName")}
                  />
                </div>
                <AuthField
                  label="Email Address"
                  type="email"
                  placeholder="you@yourchurch.org"
                  icon={<Mail className="size-4" />}
                  required
                  autoComplete="email"
                  {...field("email")}
                />
                <AuthField
                  label="Password"
                  type="password"
                  icon={<LockKeyhole className="size-4" />}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  {...field("password")}
                />
                <AuthField
                  label="Confirm Password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  {...field("confirmPassword")}
                />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Use a long, unique password. You can add an authenticator for
                  extra account protection.
                </p>
              </>
            )}
            {step === 2 && (
              <>
                <SubscriptionCurrencySwitcher />
                <fieldset className="flex rounded-xl border bg-card p-1">
                  <legend className="sr-only">Billing period</legend>
                  {(["monthly", "annual"] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={cycle === c}
                      onClick={() => setCycle(c)}
                      className={cn(
                        "flex-1 rounded-lg px-3 py-2 text-xs transition-colors",
                        cycle === c
                          ? "bg-primary font-medium text-primary-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {c === "monthly" ? "Monthly" : "Yearly · save 10%"}
                    </button>
                  ))}
                </fieldset>
                <fieldset className="space-y-2.5">
                  <legend className="sr-only">Subscription plan</legend>
                  {plans.map((p) => (
                    <label
                      key={p.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
                        plan === p.id
                          ? "border-primary bg-accent/35"
                          : "border-border bg-card/50 hover:bg-card",
                      )}
                    >
                      <input
                        type="radio"
                        name="plan"
                        value={p.id}
                        checked={plan === p.id}
                        onChange={() => setPlan(p.id)}
                        className="mt-1 accent-primary"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2 text-sm">
                          <strong className="font-semibold">{p.name}</strong>
                          <span className="whitespace-nowrap font-semibold">
                            {pricing.price(p.id, cycle)}
                            <span className="font-normal text-muted-foreground">
                              /{cycle === "annual" ? "yr" : "mo"}
                            </span>
                          </span>
                        </span>
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          {p.description}
                        </span>
                      </span>
                    </label>
                  ))}
                </fieldset>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Need Enterprise? Pricing, billing terms and rollout scope are
                  negotiated directly with the ChurchOS team.
                </p>
              </>
            )}
            {step === 3 && (
              <>
                <SubscriptionCurrencySwitcher />
                <div className="overflow-hidden rounded-2xl border bg-card/60">
                  <div className="flex items-center justify-between border-b p-4">
                    <span className="text-xs text-muted-foreground">
                      Your church
                    </span>
                    <button
                      type="button"
                      onClick={() => move(0)}
                      className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Edit church
                    </button>
                  </div>
                  <div className="space-y-1 p-4">
                    <p className="font-semibold">{details.churchName}</p>
                    <p className="text-xs text-muted-foreground">
                      {details.firstName} {details.lastName} · {details.email}
                    </p>
                  </div>
                  <div className="flex items-center justify-between border-t p-4">
                    <div>
                      <p className="text-sm font-semibold">
                        {selected.name} ·{" "}
                        {cycle === "annual" ? "Yearly" : "Monthly"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {cycle === "annual"
                          ? "10% yearly savings"
                          : "Billed for one month"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => move(2)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Change plan
                    </button>
                  </div>
                  <div className="flex items-end justify-between bg-accent/40 p-4">
                    <span className="text-xs text-muted-foreground">
                      Plan price · confirmed at checkout
                    </span>
                    <strong className="text-2xl tracking-tight">
                      {pricing.price(selected.id, cycle)}
                    </strong>
                  </div>
                </div>
                <p className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                  Sign in after creating your account, then pay through our
                  secure gateway. No automatic renewal or charges.
                </p>
                <div className="space-y-4 rounded-xl border bg-card/70 p-4 text-xs leading-6">
                  <p id="registration-risk-notice" className="font-medium">
                    Please read the terms before agreeing. They include payment and refund rules,
                    your church’s data responsibilities, a customer indemnity and limits on our
                    liability, subject to rights that cannot lawfully be excluded. See
                    {" "}<Link className="underline underline-offset-4" href="/terms-of-service#liability" target="_blank" rel="noopener noreferrer">sections 24–25</Link>.
                  </p>
                  <div className="flex items-start gap-3">
                    <input id="accept-legal-terms" type="checkbox" required checked={termsAccepted}
                      onChange={(event) => setTermsAccepted(event.target.checked)}
                      aria-describedby="registration-risk-notice" className="mt-1.5 size-4 shrink-0 accent-primary" />
                    <label htmlFor="accept-legal-terms">
                      I am at least 18 and authorised to act for this church. I agree to the
                      {" "}<Link className="underline underline-offset-4" href="/terms-of-service" target="_blank" rel="noopener noreferrer">Terms of Service</Link> and
                      {" "}<Link className="underline underline-offset-4" href="/terms-and-conditions" target="_blank" rel="noopener noreferrer">Website Terms and Conditions</Link>, and acknowledge the
                      {" "}<Link className="underline underline-offset-4" href="/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>.
                    </label>
                  </div>
                  <p className="text-muted-foreground">Acknowledging the Privacy Policy is not consent to optional marketing or every use of personal information.</p>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        {step === 3 && <BotProtection path="/auth/register" followUpPath="/auth/login" />}
        <div className="flex gap-3">
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="rounded-xl"
              disabled={register.isPending}
              onClick={() => move(step - 1)}
            >
              <ArrowLeft className="size-4" />
              <span className="sr-only sm:not-sr-only">Back</span>
            </Button>
          )}
          <Button
            type="submit"
            size="lg"
            className="flex-1 rounded-xl"
            loading={register.isPending}
            disabled={register.isPending || (step === 3 && !captchaReady)}
          >
            {step === 3 ? "Create account & continue" : "Continue"}
            <ArrowRight className="size-4" />
          </Button>
        </div>
        <p className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
          <ShieldCheck className="size-3.5" />
          Your account details stay private.
        </p>
      </form>
    </AuthFormWrapper>
  );
}
