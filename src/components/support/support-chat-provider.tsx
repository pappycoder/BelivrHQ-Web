"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { fetchCurrentProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import {
  closeSupportChat,
  initializeSupportWidget,
  openSupportChat,
  setSupportWidgetBubble,
  setSupportWidgetSuppressed,
  TAWK_CHAT_URL,
} from "@/lib/tawk";
import { isPublicHelpPath } from "@/lib/help/paths";
import { matchRoutePermission } from "@/lib/route-permissions";

const SupportChatContext = createContext({ openChat: () => {}, available: false, setChatSuppressed: (value: boolean) => { void value; } });

export function useSupportChat() {
  return useContext(SupportChatContext);
}

/** Automatically mount Tawk's native widget for verified active church administrators. */
export function SupportChatProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const workspaceChrome = !!matchRoutePermission(pathname);
  const workspace = workspaceChrome || isPublicHelpPath(pathname);
  const { data: profile } = useQuery({
    queryKey: ["current-profile"],
    queryFn: fetchCurrentProfile,
    enabled: isAuthenticated && workspace,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  const available =
    isAuthenticated &&
    workspace &&
    profile?.status === "active" &&
    profile.role.some((role) => role === "church_admin" || role === "super_admin");
  const scope = available ? `${profile.churchId}:${profile.profileId}` : "";
  const active = useRef("");
  const request = useRef(0);
  const [error, setError] = useState("");
  const [ended, setEnded] = useState(false);
  const [suppressed, setSuppressed] = useState(false);
  const setChatSuppressed = useCallback((value: boolean) => {
    setSuppressed(value);
    setSupportWidgetSuppressed(value);
  }, []);

  useEffect(() => {
    active.current = scope;
    setEnded(false);
    setError("");
    const current = ++request.current;
    if (scope) {
      void initializeSupportWidget().catch((err: unknown) => {
        if (current === request.current && active.current === scope) {
          setError(err instanceof Error ? err.message : "Support chat is unavailable.");
        }
      });
    }
    const stop = () => {
      active.current = "";
      setEnded(true);
      request.current++;
      setError("");
      closeSupportChat();
    };
    window.addEventListener("belivrhq-session-ended", stop);
    return () => {
      window.removeEventListener("belivrhq-session-ended", stop);
      stop();
    };
  }, [scope]);

  // Inside the workspace chrome the floating bubble covers content on small
  // screens, so hide it and let the chip trigger the chat instead. Public
  // help pages (no workspace chrome) keep Tawk's native launcher.
  useEffect(() => {
    setSupportWidgetBubble(!(available && workspaceChrome));
  }, [available, workspaceChrome]);

  async function openChat() {
    if (!available || active.current !== scope) return;
    const current = ++request.current;
    setError("");
    try {
      await openSupportChat();
    } catch (err) {
      if (current !== request.current || active.current !== scope) return;
      setError(err instanceof Error ? err.message : "Chat is unavailable. Please try again.");
    }
  }

  return (
    <SupportChatContext.Provider
      value={{
        openChat: () => {
          void openChat();
        },
        available: available && !ended,
        setChatSuppressed,
      }}
    >
      {children}
      {available && !ended && !suppressed && error && (
        <div className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 z-40 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-3 sm:right-6">
          <div className="w-80 max-w-full rounded-xl border bg-card p-4 shadow-lg">
            <div className="flex items-start gap-2">
              <p role="alert" className="flex-1 text-sm">
                {error}
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0"
                aria-label="Dismiss support error"
                onClick={() => setError("")}
              >
                <X className="size-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => void openChat()}>
              Retry support chat
            </Button>
            <a
              href={TAWK_CHAT_URL}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
              className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary underline underline-offset-4"
            >
              Open support in a new tab
              <ExternalLink className="size-4" />
            </a>
          </div>
        </div>
      )}
    </SupportChatContext.Provider>
  );
}
