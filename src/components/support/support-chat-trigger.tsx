"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { MessageCircle } from "lucide-react";
import { useSupportChat } from "./support-chat-provider";

/**
 * @file The workspace's compact chat trigger — replaces Tawk's native bubble
 * (which covered text on phones). Stays hidden for the first three seconds of
 * every page visit, then fades in above the mobile bottom nav (bottom-right on
 * desktop) and opens the same live-chat window on tap. Hidden on /support,
 * where the full console is already embedded.
 */
export function SupportChatTrigger() {
  const { available, openChat } = useSupportChat();
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const target = available && !pathname.startsWith("/support");
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (!target) {
      setVisible(false);
      return;
    }
    setVisible(false);
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, [target, pathname]);

  if (!target) return null;
  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          key="support-chat-trigger"
          type="button"
          aria-label="Open support chat"
          onClick={openChat}
          initial={reduced ? false : { opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduced ? undefined : { opacity: 0, y: 6, scale: 0.97 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          whileTap={reduced ? undefined : { scale: 0.96 }}
          className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-30 flex items-center gap-2 rounded-full border border-line bg-card/95 py-2 pl-2.5 pr-3.5 text-sm font-semibold text-ink-soft shadow-[0_12px_32px_-16px_rgb(38_32_26_/_0.35)] backdrop-blur transition-colors hover:border-ink/20 hover:text-ink md:bottom-6 md:right-5"
        >
          <span className="grid size-6 place-items-center rounded-full bg-brand-soft text-brand">
            <MessageCircle className="size-3.5" />
          </span>
          Chat with support
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
