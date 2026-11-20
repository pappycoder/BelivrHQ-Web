import { api, advanceSessionGeneration, refreshSession } from "@/lib/api";
import { clearTokens } from "@/lib/session";
import { isPublicContentPath } from "@/lib/public-content-path";

/** Retry is a full reload; only a confirmed expired session clears authentication. */
export async function retryPage() {
  const path = window.location.pathname;
  const publicPage = isPublicContentPath(path) || ["/", "/login", "/register", "/forgot-password", "/reset-password", "/subscription"].includes(path);
  if (!publicPage) {
    try {
      try {
        await api.get("/auth/session", { skipAuth: true });
      } catch (error) {
        if ((error as { statusCode?: number })?.statusCode !== 401) throw error;
        const recovered = await refreshSession();
        if (!recovered) throw error;
        await api.get("/auth/session", { skipAuth: true });
      }
    } catch (error) {
      if ((error as { statusCode?: number })?.statusCode === 401) {
        advanceSessionGeneration();
        try { await clearTokens(); } catch { /* Navigation still discards the stale page. */ }
        finally { window.location.replace("/login"); }
        return;
      }
      // A network/server failure is not evidence of expiry. Retry the page normally.
    }
  }
  window.location.reload();
}
