"use client";

/**
 * @file Hooks for the current user's own profile — view, edit, avatar and
 * password management via /profiles/me and /auth/password.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface CurrentProfile {
  profileId: string;
  userId: string;
  churchId: string;
  branchId?: string;
  /** All roles held by the user, ordered by rank descending (first = primary) */
  role: string[];
  /** Flat permission names (resource:action) granted across all roles */
  permissions?: string[];
  planFeatures?: string[];
  subscriptionReadOnly?: boolean;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  /** Linked member id — present when the profile is linked to a member record. */
  memberId?: string;
  mfaEnabled: boolean;
  twoFactorEnabled: boolean;
  /** Admin HQ flag — grants cross-branch access within the user's permission scope. */
  isAdminHq: boolean;
  status: string;
  createdAt: string;
  updatedAt?: string;
  church?: {
    churchId: string;
    name: string;
    denomination?: string;
    logoUrl?: string;
  };
  branch?: {
    branchId: string;
    name: string;
    isHeadquarters: boolean;
  };
}

/** Fields the self-service PATCH endpoint accepts (email is admin-managed). */
export interface UpdateCurrentProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

/** Shared fetcher so the login flow can prime the same cache entry. */
export function fetchCurrentProfile(context?: {
  signal?: AbortSignal;
}): Promise<CurrentProfile> {
  return api.get<CurrentProfile>("/profiles/me", { signal: context?.signal });
}

export function useCurrentProfile(enabled = true) {
  return useQuery({
    queryKey: ["current-profile"],
    queryFn: fetchCurrentProfile,
    enabled,
    staleTime: 60 * 1000,
    // Override the global defaults for authorization state only.
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useUpdateCurrentProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCurrentProfileInput) =>
      api.patch<CurrentProfile>("/profiles/me", input),
    onSuccess: (updated) => {
      queryClient.setQueryData(["current-profile"], updated);
    },
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.post<CurrentProfile>("/profiles/me/photo", formData);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["current-profile"], updated);
    },
  });
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) =>
      api.put<unknown>("/auth/password", input),
  });
}

export interface AuthenticatorSetup {
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
}
export interface AuthenticatorFactor {
  id: string;
  name?: string;
  status: string;
  recoveryCodesRemaining?: number;
}

export function useAuthenticatorFactors() {
  return useQuery({
    queryKey: ["authenticator-factors"],
    queryFn: ({ signal }) =>
      api.get<AuthenticatorFactor[]>("/profiles/me/2fa/factors", { signal }),
  });
}

export function useSetupAuthenticator() {
  return useMutation({
    mutationFn: () =>
      api.post<AuthenticatorSetup>("/profiles/me/2fa/setup", {}),
  });
}

export function useToggleTwoFactor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      purpose,
      code,
      factorId,
    }: {
      purpose: "enable" | "disable";
      code: string;
      factorId: string;
    }) =>
      api.post<{ recoveryCodes?: string[] }>(`/profiles/me/2fa/${purpose}`, {
        code,
        factorId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["current-profile"] });
      await queryClient.invalidateQueries({
        queryKey: ["authenticator-factors"],
      });
    },
  });
}

export function useRegenerateRecoveryCodes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, factorId }: { code: string; factorId: string }) =>
      api.post<{ recoveryCodes: string[] }>("/profiles/me/2fa/recovery-codes", {
        code,
        factorId,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["authenticator-factors"] }),
  });
}
