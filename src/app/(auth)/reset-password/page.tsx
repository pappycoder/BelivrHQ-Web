"use client";

import { BotProtection } from "@/components/shared/bot-protection";
import { useBotProtectionReady } from "@/hooks/use-bot-protection";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "@/lib/toast";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle } from "lucide-react";

import { AUTH_EASE, scaleIn } from "@/lib/auth-motion";
import { cn } from "@/lib/utils";
import { AuthFormWrapper } from "@/components/shared/auth-form-wrapper";
import { LoadingIndicator } from "@/components/shared/loading-indicator";
import { AuthField } from "@/components/shared/auth-field";
import { Button } from "@/components/ui/button";
import { useResetPassword } from "@/hooks/use-auth";

function getPasswordStrength(pw: string): { level: number; label: string } {
  let level = 0;
  if (pw.length >= 8) level++;
  if (/[A-Z]/.test(pw)) level++;
  if (/[0-9]/.test(pw)) level++;
  if (/[^A-Za-z0-9]/.test(pw)) level++;
  if (pw.length === 0) level = 0;
  const labels = ["", "Poor", "Weak", "Strong", "Strong"];
  return { level, label: labels[level] || "" };
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [token] = React.useState(() => searchParams.get("token_hash") || searchParams.get("token") || "");
  React.useEffect(() => {
    if (token) window.history.replaceState(null, "", window.location.pathname);
  }, [token]);
  const resetPasswordMutation = useResetPassword();
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [clientError, setClientError] = React.useState<string | null>(null);

  const strength = getPasswordStrength(password);
  const strengthColors = ["", "bg-destructive", "bg-amber-500", "bg-emerald-500", "bg-emerald-500"];

  const captchaReady = useBotProtectionReady("/auth/reset-password", "PATCH");
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setClientError(null);

    if (password !== confirmPassword) {
      setClientError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setClientError("Password must be at least 8 characters.");
      return;
    }
    if (!token) {
      setClientError("No reset token found. Please request a new reset link.");
      return;
    }

    resetPasswordMutation.mutate(
      { token, newPassword: password },
      {
        onSuccess: () => {
          toast.success("Password reset complete!", {
            description: "You can now sign in with your new password.",
          });
        },
        onError: (error) => {
          toast.error("Password reset failed", {
            description: (error as { message: string })?.message || "The token may have expired. Please request a new link.",
          });
        },
      }
    );
  };

  return (
    <AuthFormWrapper
      heading="Reset Password"
      subtitle={
        !token
          ? "Invalid or missing reset token"
          : resetPasswordMutation.isSuccess
            ? "Your password has been reset successfully"
            : "Choose a strong password to keep your church workspace secure."
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {!token ? (
          <motion.div
            key="invalid"
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            className="text-center"
          >
            <p className="mb-4 text-sm text-muted-foreground">
              The password reset link is invalid or has expired. Please request a new one.
            </p>
            <Button asChild className="w-full" size="lg">
              <Link href="/forgot-password">Request New Reset Link</Link>
            </Button>
            <div className="mt-3 text-center">
              <Link href="/login" className="text-sm font-medium text-primary hover:underline">
                Back to Sign In
              </Link>
            </div>
          </motion.div>
        ) : resetPasswordMutation.isSuccess ? (
          <motion.div
            key="success"
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            className="text-center"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">Password Reset Complete</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              You can now sign in with your new password.
            </p>
            <Button asChild className="w-full" size="lg">
              <Link href="/login">Sign In</Link>
            </Button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: AUTH_EASE }}
          >
            <BotProtection path="/auth/reset-password" method="PATCH" />
            <div className="space-y-4">
              <div className="space-y-1.5">
                <AuthField
                  label="New Password"
                  type="password"
                  placeholder="Enter a new password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <div className="flex gap-1 pt-1">
                  {[1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1 flex-1 rounded-full transition-colors",
                        strength.level >= i ? strengthColors[Math.min(strength.level, 4)] : "bg-border"
                      )}
                    />
                  ))}
                </div>
                {password.length > 0 && strength.label && (
                  <p className="text-xs text-muted-foreground">{strength.label} password</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Use 8 or more characters with a mix of letters, numbers &amp; symbols.
                </p>
              </div>

              <AuthField
                label="Confirm Password"
                type="password"
                placeholder="Confirm your new password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              {clientError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                >
                  {clientError}
                </motion.p>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={resetPasswordMutation.isPending || !captchaReady} loading={resetPasswordMutation.isPending}>
                {resetPasswordMutation.isPending ? "Resetting..." : "Save new password"}
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthFormWrapper>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <LoadingIndicator label="Loading reset password page" size="lg" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
