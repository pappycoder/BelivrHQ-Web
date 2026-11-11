"use client";
import { LegalNavigation } from "@/components/legal/legal-navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { BrandLogo } from "@/components/shared/brand-logo";

interface AuthFormWrapperProps {
  heading: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}
export function AuthFormWrapper({
  heading,
  subtitle,
  children,
  footer,
}: AuthFormWrapperProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-7"
    >
      <Link
        href="/"
        aria-label="BelivrHQ home"
        className="mx-auto flex w-fit items-center gap-2 text-lg font-semibold lg:hidden"
      >
        <BrandLogo
          variant="mark"
          emblemClassName="size-8 dark:brightness-0 dark:invert"
        />
        BelivrHQ
      </Link>
      <div className="space-y-3">
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-[.18em] text-muted-foreground">
          <span className="h-px w-6 bg-primary/40" />
          YOUR CHURCH, CONNECTED
        </div>
        <h1 className="text-3xl font-semibold tracking-[-.04em] sm:text-4xl">
          {heading}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      </div>
      {children}
      {footer && <div className="pt-2 text-center text-sm text-muted-foreground">{footer}</div>}
      <LegalNavigation className="justify-center pt-3 text-muted-foreground" />
    </motion.div>
  );
}
