"use client";

import * as React from "react";
import { isPublicContentPath } from "@/lib/public-content-path";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import {
  api,
  refreshSession,
  setUnauthorizedHandler,
  advanceSessionGeneration,
} from "@/lib/api";
import { fetchCurrentProfile, type CurrentProfile } from "@/hooks/use-profile";
import { permissionReturnTo } from "@/lib/route-permissions";
import { clearTokens, publishSessionEnded } from "@/lib/session";
import type {
  LoginInput,
  LoginResponse,
  RegisterInput,
  RegisterResponse,
  ForgotPasswordInput,
  ResetPasswordInput,
  AuthUser,
} from "@/types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<LoginResponse>;
  verifyTwoFactor: (input: {
    email?: string;
    code: string;
    challengeToken?: string;
  }) => Promise<LoginResponse>;
  completeLogin: (response: LoginResponse) => Promise<void>;
  register: (input: RegisterInput) => Promise<RegisterResponse>;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [token, setTokenState] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const loggingOutRef = React.useRef(false);
  const sessionGeneration = React.useRef(0);

  const clearRefreshTimer = React.useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Shared teardown for both explicit logout and forced session expiry.
  const handleSessionEnd = React.useCallback(
    async (opts?: { showToast: boolean; message?: string }) => {
      if (loggingOutRef.current) return;
      loggingOutRef.current = true;
      sessionGeneration.current++;
      advanceSessionGeneration();
      publishSessionEnded();
      clearRefreshTimer();
      await queryClient.cancelQueries();
      try {
        await clearTokens();
      } catch {
        toast.error("Unable to clear the session. Please reload.");
      }
      setIsLoading(false);
      setTokenState(null);
      setUser(null);
      queryClient.clear();
      if (opts?.showToast) {
        toast.error(
          opts.message || "Your session has expired. Please sign in again.",
        );
      }
      if (!isPublicContentPath(window.location.pathname))
        router.replace("/login");
      // Latched: prevents duplicate toasts/redirects from stale in-flight 401s
      // firing after a session ends. Reset on the next successful sign-in.
    },
    [clearRefreshTimer, router, queryClient],
  );

  React.useEffect(() => {
    // When any API request returns 401 and a silent refresh cannot recover the
    // session, log the user out and redirect.
    setUnauthorizedHandler(() => handleSessionEnd({ showToast: true }));
    return () => setUnauthorizedHandler(null);
  }, [handleSessionEnd]);

  // Restore through the verified backend; an expired access cookie can refresh.
  React.useEffect(() => {
    let active = true;
    const generation = sessionGeneration.current;
    async function restore() {
      try {
        const presence = await fetch("/api/session", {
          headers: { "X-BelivrHQ-Client": "web" },
          cache: "no-store",
        });
        if (!presence.ok) throw new Error("Unable to check session");
        if (!(await presence.json()).hasSession) {
          if (
            active &&
            generation === sessionGeneration.current &&
            !isPublicContentPath(window.location.pathname) &&
            ![
              "/",
              "/login",
              "/register",
              "/forgot-password",
              "/reset-password",
              "/subscription",
              "/offline",
            ].includes(window.location.pathname)
          )
            router.replace("/login");
          return;
        }
        let session;
        try {
          session = await api.get<{ userId: string; email: string }>(
            "/auth/session",
            { skipAuth: true },
          );
        } catch (error) {
          if ((error as { statusCode?: number }).statusCode !== 401)
            throw error;
          const refreshed = await refreshSession();
          if (!refreshed) {
            if (
              active &&
              generation === sessionGeneration.current &&
              !isPublicContentPath(window.location.pathname) &&
              ![
                "/",
                "/login",
                "/register",
                "/forgot-password",
                "/reset-password",
                "/subscription",
                "/offline",
              ].includes(window.location.pathname)
            )
              router.replace("/login");
            return;
          }
          session = await api.get<{ userId: string; email: string }>(
            "/auth/session",
            { skipAuth: true },
          );
        }
        if (active && generation === sessionGeneration.current) {
          setUser(session);
          setTokenState("server-session");
        }
      } catch (error) {
        if (
          active &&
          generation === sessionGeneration.current &&
          !isPublicContentPath(window.location.pathname) &&
          (error as { statusCode?: number }).statusCode !== 401
        ) {
          toast.error(
            "Unable to restore your session. Check your connection and reload.",
          );
        }
      } finally {
        if (active && generation === sessionGeneration.current)
          setIsLoading(false);
      }
    }
    void restore();
    return () => {
      active = false;
      clearRefreshTimer();
    };
  }, [clearRefreshTimer, router]);

  const finalizeLogin = React.useCallback(
    async (res: LoginResponse) => {
      if (!res.sessionEstablished) return;
      sessionGeneration.current++;
      advanceSessionGeneration();
      loggingOutRef.current = false;
      await queryClient.cancelQueries();
      queryClient.clear();
      setIsLoading(false);
      setTokenState("server-session");
      setUser({
        userId: res.userId,
        email: res.email ?? "",
        profile: res.profile,
      });
      toast.success("Welcome back!", {
        description: `Signed in as ${res.email ?? ""}`,
      });
      // Prime the session cache (profile + permissions) before navigating so
      // permission gates render instantly instead of flashing skeletons.
      try {
        await queryClient.ensureQueryData({
          queryKey: ["current-profile"],
          queryFn: fetchCurrentProfile,
        });
      } catch {
        // Non-fatal: the dashboard will fetch on mount if priming fails.
      }
      const destination = new URLSearchParams(window.location.search).get(
        "returnTo",
      );
      const profile = queryClient.getQueryData<CurrentProfile>([
        "current-profile",
      ]);
      const grants = new Set(
        profile?.status === "active" ? profile.permissions : [],
      );
      router.push(permissionReturnTo(destination, (name) => grants.has(name)));
    },
    [router, queryClient],
  );

  const login = React.useCallback(
    async (input: LoginInput) => {
      const res = await api.post<LoginResponse>("/auth/login", input, {
        skipAuth: true,
      });
      if (res.requiresTwoFactor) {
        // Keep the password session withheld until authenticator verification.
        return res;
      }
      await finalizeLogin(res);
      return res;
    },
    [finalizeLogin],
  );

  const verifyTwoFactor = React.useCallback(
    async ({
      email,
      code,
      challengeToken,
    }: {
      email?: string;
      code: string;
      challengeToken?: string;
    }) => {
      const res = await api.post<LoginResponse>(
        "/auth/login/2fa",
        { email, code, challengeToken },
        {
          skipAuth: true,
        },
      );
      if (!res.requiresTwoFactor && !res.recoveryCodes?.length)
        await finalizeLogin(res);
      return res;
    },
    [finalizeLogin],
  );

  const register = React.useCallback(
    async (input: RegisterInput) => {
      const res = await api.post<RegisterResponse>("/auth/register", input, {
        skipAuth: true,
      });
      sessionGeneration.current++;
      advanceSessionGeneration();
      clearRefreshTimer();
      await queryClient.cancelQueries();
      queryClient.clear();
      setUser(null);
      setTokenState(null);
      setIsLoading(false);
      router.replace("/subscription");
      return res;
    },
    [clearRefreshTimer, queryClient, router],
  );

  const logout = React.useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Logout even if the API call fails
    }
    await handleSessionEnd({ showToast: false });
    toast.success("Logged out successfully");
  }, [handleSessionEnd]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        verifyTwoFactor,
        completeLogin: finalizeLogin,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

export function useLogin() {
  const { login } = useAuth();
  return useMutation({
    mutationFn: login,
  });
}

export function useCompleteLogin() {
  return useAuth().completeLogin;
}

export function useVerifyTwoFactor() {
  const { verifyTwoFactor } = useAuth();
  return useMutation({
    mutationFn: verifyTwoFactor,
  });
}

export function useRegister() {
  const { register } = useAuth();
  return useMutation({
    mutationFn: register,
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (input: ForgotPasswordInput) => {
      return api.post<{ success: boolean }>("/auth/forgot-password", input, {
        skipAuth: true,
      });
    },
  });
}

export function useAcceptInvitation() {
  return useMutation({
    mutationFn: (input: { token: string; newPassword: string }) =>
      api.post<{ success: boolean }>("/auth/accept-invitation", input, {
        skipAuth: true,
      }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (input: ResetPasswordInput) => {
      return api.patch<{ success: boolean }>("/auth/reset-password", input, {
        skipAuth: true,
      });
    },
  });
}

export function useLogout() {
  const { logout } = useAuth();
  return useMutation({
    mutationFn: logout,
  });
}
