"use client";

import { BotProtection } from "@/components/shared/bot-protection";

import * as React from "react";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";

import { AUTH_EASE } from "@/lib/auth-motion";
import { AuthFormWrapper } from "@/components/shared/auth-form-wrapper";
import { AuthField } from "@/components/shared/auth-field";
import { Button } from "@/components/ui/button";
import { RecoveryCodesPanel } from "@/components/shared/recovery-codes-panel";
import type { LoginResponse } from "@/types/auth";
import { useCompleteLogin, useLogin, useVerifyTwoFactor } from "@/hooks/use-auth";

export default function LoginPage() {
  const [registered, setRegistered] = React.useState(false);
  React.useEffect(() => {
    setRegistered(new URLSearchParams(window.location.search).get("registered") === "1");
  }, []);
  const completeLogin = useCompleteLogin();
  const [recoverySession, setRecoverySession] = React.useState<LoginResponse>();
  const [useRecovery, setUseRecovery] = React.useState(false);
  const loginMutation = useLogin();
  const verifyMutation = useVerifyTwoFactor();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [otpStep, setOtpStep] = React.useState(false);
  const [twoFactorEmail, setTwoFactorEmail] = React.useState("");
  const [challengeToken, setChallengeToken] = React.useState<string>();
  const [setup, setSetup] = React.useState<import("@/types/auth").LoginResponse["authenticatorSetup"]>();
  const [migration, setMigration] = React.useState(false);
  const [providerMigration, setProviderMigration] = React.useState(false);
  const [otpCode, setOtpCode] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUseRecovery(false);
    setOtpCode("");
    loginMutation.mutate(
      { email, password },
      {
        onSuccess: (res) => {
          if (res.requiresTwoFactor) {
            setTwoFactorEmail(res.twoFactorEmail ?? email);
            setChallengeToken(res.challengeToken);
            setMigration(res.twoFactorMethod === "migration");
            setProviderMigration(res.twoFactorMethod === "supabase-migration");
            setPassword("");
            setOtpStep(true);
            toast.info(res.twoFactorMethod === "migration" ? "Upgrade your two-factor security" : "Open your authenticator app");
          }
        },
        onError: (error) => {
          toast.error("Sign in failed", {
            description:
              (error as { message: string })?.message ||
              "Invalid email or password.",
          });
        },
      },
    );
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!(useRecovery ? /^[A-Fa-f0-9]{8}(?:-[A-Fa-f0-9]{8}){3}$/ : /^\d{6}$/).test(otpCode)) {
      toast.error("Invalid code", {
        description: useRecovery ? "Enter a saved recovery code." : "Enter the current 6-digit verification code.",
      });
      return;
    }
    verifyMutation.mutate(
      { email: migration ? email : undefined, challengeToken, code: otpCode },
      {
        onSuccess: (res) => {
          if (res.recoveryCodes?.length) { setRecoverySession(res); setSetup(undefined); setOtpCode(""); return; }
          if (res.requiresTwoFactor) {
            setChallengeToken(res.challengeToken);
            setSetup(res.authenticatorSetup);
            setMigration(false);
            setProviderMigration(false);
            setOtpCode("");
          }
        },
        onError: (error) => {
          toast.error("Verification failed", {
            description:
              (error as { message: string })?.message ||
              "Invalid or expired code.",
          });
        },
      },
    );
  };

  return (
    <AuthFormWrapper
      heading={recoverySession ? "Save Recovery Codes" : otpStep ? "Verify Your Identity" : "Sign In"}
      subtitle={
        recoverySession ? "Keep a secure backup so you can recover your account." : otpStep
          ? (migration ? "Verify your old email code once, then set up your authenticator." : useRecovery ? "Enter a saved recovery code." : "Enter the current code from your authenticator app.")
          : "Your people. Your ministry. Pick up where you left off."
      }
    >
      {registered && !otpStep && !recoverySession && (
        <p role="status" className="mb-5 rounded-lg border bg-muted/40 p-4 text-sm">
          Your account has been created. Sign in to continue to subscription
          payment. If your email needs confirmation, confirm it first.
        </p>
      )}
      {recoverySession?.recoveryCodes?.length ? <RecoveryCodesPanel codes={recoverySession.recoveryCodes} onDone={async () => {
        await completeLogin(recoverySession).catch(error => toast.error(error?.message ?? "Unable to finish sign-in"));
      }} /> : <AnimatePresence mode="wait" initial={false}>
        {otpStep ? (
          <motion.form
            key="otp"
            onSubmit={handleVerify}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.35, ease: AUTH_EASE }}
          >
            <BotProtection path="/auth/login/2fa" />
            <div className="mb-5 flex items-center gap-3 rounded-lg border bg-muted/40 p-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">
                  Two-factor authentication required
                </p>
                <p className="text-xs text-muted-foreground">
                  {migration ? `Migration code sent to ${twoFactorEmail}` : "Use Google Authenticator, Microsoft Authenticator, or another TOTP app."}
                </p>
              </div>
            </div>

            {setup && <div className="mb-5 space-y-3 rounded-xl border p-4">
              <p className="text-sm">Scan this QR code with your authenticator app, then enter its code to finish upgrading.</p>
              {/* Render the backend-generated QR as an image, never inline HTML. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="Authenticator enrollment QR code" width={200} height={200} className="mx-auto rounded-lg bg-white p-2" src={setup.qrCode.startsWith("data:") ? setup.qrCode : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(setup.qrCode)}`} />
              <p className="text-xs text-muted-foreground">Manual setup key</p>
              <code className="block break-all select-all text-sm">{setup.secret}</code>
              <p className="text-xs text-muted-foreground">Keep an encrypted backup in your password manager for device recovery.</p>
            </div>}
            <AuthField
              label={useRecovery ? "Recovery Code" : "Verification Code"}
              icon={<ShieldCheck className="h-4 w-4" />}
              inputMode={useRecovery ? "text" : "numeric"}
              autoComplete="one-time-code"
              pattern={useRecovery ? undefined : "[0-9]*"}
              maxLength={useRecovery ? 35 : 6}
              placeholder={useRecovery ? "XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX" : "6-digit code"}
              value={otpCode}
              onChange={(e) =>
                setOtpCode(useRecovery ? e.target.value.toUpperCase().replace(/[^A-F0-9-]/g, "").slice(0, 35) : e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              required
            />

            {!migration && !providerMigration && !setup && <Button type="button" variant="link" className="mt-2 px-0" onClick={() => { setUseRecovery(value => !value); setOtpCode(""); }}>
              {useRecovery ? "Use authenticator code" : "Use a recovery code"}
            </Button>}
            <div className="mt-5">
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={verifyMutation.isPending}
               loading={verifyMutation.isPending}>
                {verifyMutation.isPending ? "Verifying..." : "Verify & Sign In"}
              </Button>
            </div>

            <div className="mt-4 text-center">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => {
                  setOtpStep(false);
                  setOtpCode("");
                  setUseRecovery(false);
                  setProviderMigration(false);
                  setSetup(undefined);
                  setChallengeToken(undefined);
                  setPassword("");
                }}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </button>
            </div>
          </motion.form>
        ) : (
          <motion.form
            key="credentials"
            onSubmit={handleSubmit}
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.35, ease: AUTH_EASE }}
          >
            <BotProtection path="/auth/login" />
            <div className="space-y-4">
              <AuthField
                label="Email Address"
                type="email"
                icon={<Mail className="h-4 w-4" />}
                placeholder="Enter your email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <AuthField
                label="Password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="size-3.5" />Secure sign-in</span>
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-primary hover:underline"
              >
                Forgot Password?
              </Link>
            </div>

            <div className="mt-5">
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={loginMutation.isPending}
               loading={loginMutation.isPending}>
                {loginMutation.isPending ? "Signing in..." : "Sign In"}
              </Button>
            </div>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-medium text-primary hover:underline"
              >
                Create Account
              </Link>
            </div>
          </motion.form>
        )}
      </AnimatePresence>}
    </AuthFormWrapper>
  );
}
