"use client";
import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentProfile } from "./use-profile";
import { usePermissions } from "./use-permissions";
import { api } from "@/lib/api";
import type { BillingStatus } from "@/types/billing";
export function useBillingStatus() {
  const { data: profile } = useCurrentProfile();
  const { ready, can } = usePermissions();
  const client = useQueryClient();
  const administrator = !!profile?.role?.some(
    (r) => r === "church_admin" || r === "super_admin",
  );
  const allowed = ready && administrator && can("billing", "read");
  React.useEffect(() => {
    if (!allowed) return;
    const refresh = () => {
      void client.invalidateQueries({ queryKey: ["platform-subscription"] });
      void client.invalidateQueries({ queryKey: ["notifications"] });
      void client.invalidateQueries({ queryKey: ["notifications-unread"] });
    };
    window.addEventListener("belivrhq:usage-changed", refresh);
    return () => window.removeEventListener("belivrhq:usage-changed", refresh);
  }, [allowed, client]);
  return {
    allowed,
    churchId: profile?.churchId,
    accessReady: ready,
    canPay: allowed && can("billing", "update"),
    ...useQuery({
      queryKey: ["platform-subscription", profile?.churchId],
      queryFn: ({ signal }) =>
        api.get<BillingStatus>("/billing/subscription", { signal }),
      enabled: allowed,
      staleTime: 30000,
      refetchOnWindowFocus: true,
      retry: false,
    }),
  };
}
