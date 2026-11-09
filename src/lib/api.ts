import { withBotProtection } from "@/lib/bot-protection";
import type { AuthError } from "@/types/auth";
import { clearTokens } from "@/lib/session";

const API_BASE = "";
const API_PREFIX = "/api/backend";
export interface RequestOptions { skipAuth?: boolean; signal?: AbortSignal }

/**
 * Registered by the auth provider. Invoked when a session cannot be
 * recovered (refresh token missing, expired, or refresh failed) so the
 * app can log the user out and redirect to /login.
 */
let authGeneration = 0;
export function advanceSessionGeneration() { authGeneration++; }

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

interface BackendErrorResponse {
  success: false;
  error: {
    code: string;
    message: string | string[];
    details?: unknown;
    timestamp: string;
    path: string;
    method: string;
  };
}

interface BackendSuccessResponse<T> {
  success: true;
  data: T;
  meta: {
    timestamp: string;
    path: string;
    requestId?: string;
  };
}

type BackendResponse<T> = BackendSuccessResponse<T> | BackendErrorResponse;

function getErrorMessage(status: number, body: BackendErrorResponse): string {
  const raw = body.error?.message;
  const msg = Array.isArray(raw) ? raw.join(". ") : raw || "";
  switch (status) {
    case 400:
      return msg || "Invalid request. Please check your input.";
    case 401:
      return msg || "Invalid email or password.";
    case 403:
      return msg || "You don't have permission to perform this action.";
    case 404:
      return "The requested resource was not found.";
    case 409:
      return msg || "An account with this email already exists.";
    case 429:
      return "Too many attempts. Please try again later.";
    case 500:
      return "Server error. Please try again later.";
    case 502:
    case 503:
      return "Service temporarily unavailable. Please try again later.";
    default:
      return msg || `Request failed (${status}). Please try again.`;
  }
}

interface SessionStorage {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

// Deduplicate refresh-token rotation across simultaneous requests.
let refreshPromise: Promise<SessionStorage | null> | null = null;
async function tryRefreshSession(): Promise<SessionStorage | null> {
  if (!refreshPromise) {
    const refresh = async () => {
      const response = await fetch(`${API_PREFIX}/auth/refresh`, {
        method: "POST", headers: { "Content-Type": "application/json", "X-BelivrHQ-Client": "web" },
        body: "{}", cache: "no-store",
      });
      if (response.status === 401 || response.status === 403) return null;
      if (!response.ok) throw { message: "Unable to refresh your session. Please try again.", statusCode: response.status } as AuthError;
      const json = await response.json();
      if (!json.success || !json.data?.sessionEstablished) throw { message: "Invalid session response", statusCode: 502 } as AuthError;
      return json.data as SessionStorage;
    };
    refreshPromise = (async () => {
      if (typeof navigator !== "undefined" && navigator.locks) return await navigator.locks.request("belivrhq-session-refresh", () => refresh());
      return await refresh();
    })().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}
export async function refreshSession(): Promise<SessionStorage | null> { return tryRefreshSession(); }

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE}${API_PREFIX}`;
  }

  private request<T>(method: string, path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return withBotProtection(method, path, body, options?.signal,
      protectedBody => this.requestInternal<T>(method, path, protectedBody, options));
  }

  private async requestInternal<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestOptions,
    allowRefresh = true
  ): Promise<T> {
    const generation = authGeneration;
    const headers: Record<string, string> = { "X-BelivrHQ-Client": "web" };

    // FormData bodies must not carry a JSON content-type — the browser
    // sets the multipart boundary itself.
    if (!(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }


    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        cache: "no-store",
        signal: options?.signal,
        body:
          body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      });
    } catch (cause) {
      if (cause instanceof Error && cause.name === "AbortError") throw cause;
      const error: AuthError = {
        message: "Network error. Please check your connection.",
        statusCode: 0,
      };
      throw error;
    }

    // Recoverable authentication failure: try a silent refresh and retry once.
    // If the retry (allowRefresh === false) also 401s, or refresh cannot
    // recover the session, force logout + redirect.
    if (res.status === 401 && !options?.skipAuth && generation === authGeneration) {
      if (allowRefresh) {
        const refreshed = await tryRefreshSession();
        if (generation !== authGeneration) throw new DOMException("Session changed", "AbortError");
        if (refreshed) {
          return this.requestInternal<T>(method, path, body, options, false);
        }
      }
      if (unauthorizedHandler) unauthorizedHandler();
      else await clearTokens();
    }

    let json: BackendResponse<T> | undefined;
    try {
      json = (await res.json()) as BackendResponse<T>;
    } catch {
      // Empty body — e.g. 204 No Content deletes resolve to undefined.
      json = undefined;
    }

    // Handle error responses (both HTTP errors and 200-wrapped errors)
    if (!res.ok || (json && !json.success)) {
      if (res.status === 402 && generation === authGeneration && typeof window !== "undefined" && window.location.pathname !== "/subscription") window.location.assign("/subscription");
      const errorBody = json as BackendErrorResponse | undefined;
      const error: AuthError = {
        message: errorBody
          ? getErrorMessage(res.status, errorBody)
          : `Request failed (${res.status}). Please try again.`,
        statusCode: res.status,
        code: errorBody?.error.code,
        retryAfterSeconds: Number(res.headers.get("retry-after")) || undefined,
        details: errorBody?.error.details,
      };
      if (typeof window !== "undefined" && generation === authGeneration && ["PLAN_LIMIT_REACHED","PLAN_FEATURE_REQUIRED"].includes(error.code || "")) window.dispatchEvent(new CustomEvent("belivrhq:plan-limit",{detail:error}));
      throw error;
    }

    if (!json) return undefined as T;

    // Unwrap the data envelope: { success: true, data: T, meta: ... } → T
    const successBody = json as BackendSuccessResponse<T>;
    if (method !== "GET" && !["/assistant/message", "/billing/quote", "/billing/verify"].includes(path) && typeof window !== "undefined") window.dispatchEvent(new CustomEvent("belivrhq:usage-changed"));
    return successBody.data;
  }

  get<T>(path: string, options?: RequestOptions) {
    return this.request<T>("GET", path, undefined, options);
  }

  post<T>(path: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>("POST", path, body, options);
  }

  patch<T>(path: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>("PATCH", path, body, options);
  }

  put<T>(path: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>("PUT", path, body, options);
  }

  delete<T>(path: string, options?: RequestOptions) {
    return this.request<T>("DELETE", path, undefined, options);
  }

  /**
   * GETs a raw binary response (e.g. PDF receipts). Returns the parsed
   * body as JSON when the server replies with an error envelope.
   */
  async getBlob(path: string): Promise<Blob> {
    const generation = authGeneration;
    const doFetch = async (): Promise<Response> => {
      const headers: Record<string, string> = { "X-BelivrHQ-Client": "web" };
      return fetch(`${this.baseUrl}${path}`, { headers, cache: "no-store" });
    };

    let res = await doFetch();
    let sessionUnrecoverable = false;

    if (res.status === 401 && generation === authGeneration) {
      const refreshed = await tryRefreshSession();
        if (generation !== authGeneration) throw new DOMException("Session changed", "AbortError");
      if (refreshed) {
        const retry = await doFetch();
        if (retry.ok) return retry.blob();
        res = retry;
      } else {
        sessionUnrecoverable = true;
      }
    }

    if ((sessionUnrecoverable || res.status === 401) && generation === authGeneration) {
      // Refresh failed, or retry still 401 → logout.
      if (unauthorizedHandler) unauthorizedHandler();
      else await clearTokens();
    }

    if (!res.ok) {
      let message = `Request failed (${res.status}). Please try again.`;
      try {
        const json = (await res.json()) as BackendErrorResponse;
        message = getErrorMessage(res.status, json);
      } catch {
        // Non-JSON error body — keep the generic message.
      }
      throw { message, statusCode: res.status } as AuthError;
    }
    return res.blob();
  }

  /**
   * POSTs a JSON body expecting a binary response (none currently — kept
   * symmetric with getBlob for future exports).
   */
  async postForBlob(path: string, body: unknown): Promise<Blob> {
    const generation = authGeneration;
    const doFetch = async (): Promise<Response> => {
      return fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "X-BelivrHQ-Client": "web",
        },
        body: JSON.stringify(body),
      });
    };

    let res = await doFetch();
    let sessionUnrecoverable = false;

    if (res.status === 401 && generation === authGeneration) {
      const refreshed = await tryRefreshSession();
        if (generation !== authGeneration) throw new DOMException("Session changed", "AbortError");
      if (refreshed) {
        const retry = await doFetch();
        if (retry.ok) return retry.blob();
        res = retry;
      } else {
        sessionUnrecoverable = true;
      }
    }

    if ((sessionUnrecoverable || res.status === 401) && generation === authGeneration) {
      // Refresh failed, or retry still 401 → logout.
      if (unauthorizedHandler) unauthorizedHandler();
      else await clearTokens();
    }

    if (!res.ok) {
      throw new Error(`Request failed (${res.status})`);
    }
    return res.blob();
  }
}

export const api = new ApiClient();
