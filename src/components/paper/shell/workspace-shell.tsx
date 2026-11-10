"use client";

import { BillingNotice } from "@/components/billing/billing-notice";
import * as React from "react";
import { usePathname } from "next/navigation";
import { TableColumnsProvider } from "@/contexts/table-columns-context";
import { motion } from "motion/react";
import { NavRail } from "./nav-rail";
import { ContextBar } from "./context-bar";
import { Inspector } from "./inspector";
import { MobileNav } from "./mobile-nav";
import { SupportChatTrigger } from "@/components/support/support-chat-trigger";
import { CommandPalette } from "./command-palette";
import { InspectorProvider } from "./inspector-provider";
import { usePaperNav } from "./use-paper-nav";
import { PermissionRouteGate } from "@/components/shared/permission-route-gate";

/**
 * Abide "Dock + Stage" shell — replaces the fixed sidebar for all new
 * workspace routes. Permission and plan enforcement is unchanged: the same
 * `PermissionRouteGate` guards the stage content exactly as WorkspaceFrame
 * does for the legacy UI.
 */
export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const { areas } = usePaperNav();

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <InspectorProvider>
      <div
        data-paper-root
        className="grain-overlay min-h-dvh bg-background text-foreground"
      >
        <NavRail onOpenSearch={() => setSearchOpen(true)} areas={areas} />

        <div className="md:pl-[84px]">
          <ContextBar onOpenSearch={() => setSearchOpen(true)} />
          <main
            id="main-content"
            className="mx-auto w-full max-w-[1440px] px-4 pb-28 pt-6 md:px-8 md:pb-20 md:pt-8"
          >
            <PermissionRouteGate>
              <BillingNotice expiredOnly />
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <TableColumnsProvider key={pathname}>{children}</TableColumnsProvider>
              </motion.div>
            </PermissionRouteGate>
          </main>
        </div>

        <Inspector />
        <SupportChatTrigger />
        <MobileNav areas={areas} />
        <CommandPalette
          open={searchOpen}
          onOpenChange={setSearchOpen}
          areas={areas}
        />
      </div>
    </InspectorProvider>
  );
}
