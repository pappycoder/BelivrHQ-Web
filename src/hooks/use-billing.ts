"use client";
import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentProfile } from "./use-profile";
import { usePermissions } from "./use-permissions";
import { api } from "@/lib/api";
import type { BillingStatus } from "@/types/billing";
export function useBillingStatus(registration = false) {
  const { data: profile } = useCurrentProfile(!registration);
  const { ready, can } = usePermissions(!registration);
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
  const queryKey = React.useMemo(
    () => [
      "platform-subscription",
      registration ? "registration" : profile?.churchId,
    ],
    [registration, profile?.churchId],
  );
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      api.get<BillingStatus>(
        registration
          ? "/billing/registration/subscription"
          : "/billing/subscription",
        { signal, skipAuth: registration },
      ),
    enabled: registration || allowed,
    staleTime: 30000,
    refetchOnWindowFocus: true,
    retry: false,
  });
  return {
    ...query,
    queryKey,
    allowed: registration ? query.isSuccess : allowed,
    churchId: registration
      ? query.data?.registrationChurchId
      : profile?.churchId,
    accessReady: registration ? !query.isPending : ready,
    canPay: registration
      ? query.isSuccess
      : allowed && can("billing", "update"),
  };
}
