"use client";

import { BotProtection } from "@/components/shared/bot-protection";
import { useBotProtectionReady } from "@/hooks/use-bot-protection";

import * as React from "react";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { motion } from "motion/react";
import { Mail } from "lucide-react";

import { scaleIn } from "@/lib/auth-motion";
import { AuthFormWrapper } from "@/components/shared/auth-form-wrapper";
import { AuthField } from "@/components/shared/auth-field";
import { Button } from "@/components/ui/button";
import { useForgotPassword } from "@/hooks/use-auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const forgotPasswordMutation = useForgotPassword();

  const captchaReady = useBotProtectionReady("/auth/forgot-password");
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    forgotPasswordMutation.mutate(
      { email },
      {
        onError: (error) => {
          toast.error("Failed to send reset link", {
            description: (error as { message: string })?.message || "Please try again.",
          });
        },
      }
    );
  };

  return (
    <AuthFormWrapper
      heading="Forgot Password?"
      subtitle="A fresh start is one email away. Enter your account email and we’ll help you get back in."
    >
      {forgotPasswordMutation.isSuccess ? (
        <motion.div variants={scaleIn} initial="hidden" animate="visible" className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-foreground">Check your email</h3>
          <p className="mb-6 text-sm text-muted-foreground">
            If an account exists, a reset link will arrive at <strong className="text-foreground">{email}</strong>
          </p>
          <Button asChild variant="outline" className="w-full" size="lg">
            <Link href="/login">Back to Sign In</Link>
          </Button>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit}>
              <BotProtection path="/auth/forgot-password" />
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
            <Button type="submit" size="lg" className="w-full" disabled={forgotPasswordMutation.isPending || !captchaReady} loading={forgotPasswordMutation.isPending}>
              {forgotPasswordMutation.isPending ? "Sending..." : "Send reset link"}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Return to{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign In
              </Link>
            </div>
          </div>
        </form>
      )}
    </AuthFormWrapper>
  );
}