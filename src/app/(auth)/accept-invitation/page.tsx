"use client";

import { BotProtection } from "@/components/shared/bot-protection";
import { useBotProtectionReady } from "@/hooks/use-bot-protection";

import * as React from "react";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { AuthFormWrapper } from "@/components/shared/auth-form-wrapper";
import { AuthField } from "@/components/shared/auth-field";
import { Button } from "@/components/ui/button";
import { LoadingIndicator } from "@/components/shared/loading-indicator";
import { useAcceptInvitation } from "@/hooks/use-auth";

export default function AcceptInvitationPage() {
  const [token, setToken] = React.useState("");
  const [ready, setReady] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [confirmation, setConfirmation] = React.useState("");
  const [error, setError] = React.useState("");
  const accept = useAcceptInvitation();
  const extracted = React.useRef(false);
  React.useEffect(() => {
    if (extracted.current) return;
    extracted.current = true;
    // Keep the bearer token out of HTTP requests/referrers and remove it from browser history.
    const hash = new URLSearchParams(window.location.hash.slice(1));
    setToken(hash.get("token_hash") || "");
    window.history.replaceState(null, "", window.location.pathname);
    setReady(true);
  }, []);
  const captchaReady = useBotProtectionReady("/auth/accept-invitation");
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    accept.mutate(
      { token, newPassword: password },
      {
        onError: (failure) =>
          setError(
            (failure as { message?: string }).message ||
              "Unable to accept this invitation. Please request a new password link.",
          ),
      },
    );
  };
  return (
    <AuthFormWrapper
      heading={
        accept.isSuccess
          ? "You’re ready to join your team"
          : "Accept your invitation"
      }
      subtitle="Create your password, then sign in with the email address that received this invitation."
    >
      {!ready ? (
        <LoadingIndicator label="Loading invitation" />
      ) : accept.isSuccess ? (
        <div className="space-y-5 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-primary" />
          <p>Your password is set. Sign in to open your church workspace.</p>
          <Button asChild className="w-full">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      ) : !token ? (
        <div className="space-y-4">
          <p role="alert">
            This invitation link is missing or no longer available. Open the
            link from your invitation email, or request a new password link.
          </p>
          <Button asChild className="w-full">
            <Link href="/forgot-password">Request a password link</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <BotProtection path="/auth/accept-invitation" />
          <AuthField
            label="Your Password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={accept.isPending}
          />
          <AuthField
            label="Confirm Password"
            type="password"
            autoComplete="new-password"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            required
            disabled={accept.isPending}
          />
          <p className="text-xs text-muted-foreground">
            Use at least 8 characters. A mix of letters, numbers and symbols
            helps keep your account secure.
          </p>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={accept.isPending || !captchaReady}>
            {accept.isPending
              ? "Setting up your account..."
              : "Accept invitation & set password"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link
              href="/forgot-password"
              className="text-primary hover:underline"
            >
              Invitation expired? Request a password link
            </Link>
          </p>
        </form>
      )}
    </AuthFormWrapper>
  );
}
