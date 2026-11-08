"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { LoadingState } from "@/components/shared/loading-state";

/** Verify the session before showing entry forms; login itself owns its returnTo/billing flow. */
export function GuestOnly({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [enteredAsGuest, setEnteredAsGuest] = useState<boolean | null>(null);
  useEffect(() => {
    if (!isLoading && enteredAsGuest === null) setEnteredAsGuest(!isAuthenticated);
  }, [isLoading, isAuthenticated, enteredAsGuest]);
  useEffect(() => {
    if (enteredAsGuest === false) router.replace("/dashboard");
  }, [enteredAsGuest, router]);
  if (enteredAsGuest !== true) return <LoadingState label="Checking your session" variant="form" rows={3} />;
  return children;
}
