"use client";

import { usePathname } from "next/navigation";
import { AuthShell } from "@/components/shared/auth-shell";
import { GuestOnly } from "@/components/shared/guest-only";
import { WorkspaceShell } from "@/components/paper/shell/workspace-shell";
import { LoadingState } from "@/components/shared/loading-state";
import { useAuth } from "@/hooks/use-auth";

export default function AuthRouteShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const entry = pathname === "/login" || pathname === "/register";

  // Billing keeps one engine and two homes: signed-in users manage their
  // subscription inside the Paper workspace (dock and all); signed-out
  // visitors complete registration in the same shell as the auth forms.
  if (pathname === "/subscription" || pathname.startsWith("/subscription/")) {
    // Resolve the session before mounting checkout: changing shells remounts
    // children, which would otherwise consume and lose the gateway callback.
    if (isLoading)
      return <LoadingState label="Loading your account" variant="detail" />;
    return user ? (
      <WorkspaceShell>{children}</WorkspaceShell>
    ) : (
      <AuthShell>{children}</AuthShell>
    );
  }

  return (
    <AuthShell>
      {entry ? <GuestOnly key={pathname}>{children}</GuestOnly> : children}
    </AuthShell>
  );
}
