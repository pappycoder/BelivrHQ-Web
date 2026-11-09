"use client";

import { LEGACY_BRAND } from "@/lib/brand/identity";
import * as React from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { SettingsProvider } from "@/contexts/settings-context";
import { SupportChatProvider } from "@/components/support/support-chat-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    const ended = () => window.dispatchEvent(new Event('belivrhq-session-ended'));
    window.addEventListener(LEGACY_BRAND.sessionEnded, ended);
    let channel: BroadcastChannel | undefined;
    try { channel = new BroadcastChannel(LEGACY_BRAND.sessionChannel); channel.onmessage = ended; } catch { /* Older browsers keep normal session checks. */ }
    return () => { window.removeEventListener(LEGACY_BRAND.sessionEnded, ended); channel?.close(); };
  }, []);
  return (
    <SettingsProvider>
        <AuthProvider>
          <TooltipProvider delayDuration={0}><SupportChatProvider>{children}</SupportChatProvider></TooltipProvider>
        </AuthProvider>
    </SettingsProvider>
  );
}
