"use client";

/**
 * @file Security tab content — personal account security modeled on the
 * SmartHR security-settings.html grammar: each setting is a bordered
 * action row (title + description left, status/action right) and doubles
 * as an anchored section tracked by the settings side-nav.
 */

import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { KeyRound, MailCheck, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChangePasswordDialog } from "@/components/settings/change-password-dialog";
import { useCurrentProfile } from "@/hooks/use-profile";

function SecurityRow({
  id,
  icon: Icon,
  title,
  badge,
  description,
  action,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  badge?: React.ReactNode;
  description: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section
      id={id}
      data-settings-section=""
      className="scroll-mt-28 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5 [&:not(:first-child)]:pt-5"
    >
      <div className="min-w-0">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-medium">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
          {badge}
        </h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </section>
  );
}

export function SecuritySettingsTab() {
  const profileQuery = useCurrentProfile();
  const [passwordOpen, setPasswordOpen] = React.useState(false);

  const profile = profileQuery.data;

  return (
    <>
      <div className="border-b border-border pb-3">
        <h2 className="text-base font-semibold">Security Settings</h2>
      </div>

      {profileQuery.isLoading ? (
        <div className="pt-6">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="mt-4 h-16 w-full rounded-lg" />
          <Skeleton className="mt-4 h-16 w-full rounded-lg" />
        </div>
      ) : (
        <div className="[&>*:first-child]:pt-5">
          <SecurityRow
            id="password"
            icon={KeyRound}
            title="Password"
            description="Set a unique password to protect the account."
            action={
              <Button variant="outline" size="sm" onClick={() => setPasswordOpen(true)}>
                Change
              </Button>
            }
          />

          <SecurityRow
            id="two-factor"
            icon={ShieldCheck}
            title="Two-Factor Authentication"
            description="Enabling and disabling 2FA is self-service on your own profile page."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/profile">Manage on Profile</Link>
              </Button>
            }
          />

          <SecurityRow
            id="email-verification"
            icon={MailCheck}
            title="Email Verification"
            badge={<Badge variant="secondary">Verified</Badge>}
            description={
              <>
                The email address associated with the account:{" "}
                <span className="font-medium break-all text-foreground">
                  {profile?.email || "Not available"}
                </span>
                . Changes are managed by your church admin under General Settings → Email.
              </>
            }
          />
        </div>
      )}

      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </>
  );
}
