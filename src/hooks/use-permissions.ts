"use client";

/**
 * @file Client-side permission gating derived from the current profile.
 *
 * Permissions are a flat list of `resource:action` strings (e.g. `members:read`)
 * resolved server-side across all held roles and returned on GET /profiles/me.
 * They are collected at login (the login flow primes the ["current-profile"]
 * cache before navigating) and live for the whole tab session; the query
 * refetches on window focus / reconnect so role changes made mid-session are
 * picked up. All checks are fail-closed: until the profile loads, nothing is
 * shown. The backend guards remain the real enforcement layer.
 */

import { planAllowsPermission } from "@/lib/plan-features";
import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getPermissionSet } from "@/lib/permission-set";
import { useCurrentProfile } from "@/hooks/use-profile";

export type PermissionAction = "create" | "read" | "update" | "delete" | "view";

/** `resource:action` permission name, e.g. "branches:create". */
export type PermissionName = string;

interface PermissionsState {
  /** True once the profile (and therefore permissions/roles) has loaded. */
  ready: boolean;
  permissions: ReadonlySet<PermissionName>;
}

function usePermissionsState(enabled = true): PermissionsState {
  const { data: profile, isLoading, isError } = useCurrentProfile(enabled);

  const permissions = React.useMemo(
    () =>
      getPermissionSet(
        profile?.permissions?.filter(
          (permission) =>
            planAllowsPermission(profile?.planFeatures, permission) &&
            (!profile?.subscriptionReadOnly ||
              permission.startsWith("billing:") ||
              /:(?:read|view|export|download)$/.test(permission)),
        ),
      ),
    [
      profile?.permissions,
      profile?.planFeatures,
      profile?.subscriptionReadOnly,
    ],
  );
  return {
    ready:
      enabled &&
      !isLoading &&
      !isError &&
      !!profile &&
      profile.status === "active",
    permissions,
  };
}

export interface PermissionChecker {
  ready: boolean;
  /** True when the user holds `resource:action`. Fail-closed while loading. */
  can: (resource: string, action: PermissionAction) => boolean;
  /** True when the user holds any of the given permission names. */
  canAny: (...names: PermissionName[]) => boolean;
}

export function usePermissions(enabled = true): PermissionChecker {
  const { ready, permissions } = usePermissionsState(enabled);

  const can = React.useCallback(
    (resource: string, action: PermissionAction) =>
      ready && permissions.has(`${resource}:${action}`),
    [ready, permissions],
  );

  const canAny = React.useCallback(
    (...names: PermissionName[]) =>
      ready && names.some((n) => permissions.has(n)),
    [ready, permissions],
  );

  return { ready, can, canAny };
}

/** Convenience single-check hook: `const allowed = useCan("branches", "update")`. */
export function useCan(
  resource: string,
  action: PermissionAction,
): { allowed: boolean; ready: boolean } {
  const { can, ready } = usePermissions();
  return { allowed: can(resource, action), ready };
}

/** Invalidates the profile cache so fresh permissions are fetched immediately. */
export function useRefreshPermissions(): () => void {
  const queryClient = useQueryClient();
  return React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["current-profile"] });
  }, [queryClient]);
}
