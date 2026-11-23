"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
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
  const target = !pathname.startsWith("/support");
  const trigger = React.useRef<HTMLButtonElement>(null);
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [topic, setTopic] = React.useState("");
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
    <>
    <AnimatePresence>
      {visible ? (
        <motion.button
          key="support-chat-trigger"
          ref={trigger}
          type="button"
          aria-label="Open help and support"
          data-support-launcher
          onClick={() => setPanelOpen(true)}
          initial={reduced ? false : { opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduced ? undefined : { opacity: 0, y: 6, scale: 0.97 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          whileTap={reduced ? undefined : { scale: 0.96 }}
          className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-30 flex size-11 items-center justify-center gap-2 rounded-full md:h-auto md:w-auto border border-line bg-card/95 p-2 md:pl-2.5 md:pr-3.5 text-sm font-semibold text-ink-soft shadow-[0_12px_32px_-16px_rgb(38_32_26_/_0.35)] backdrop-blur transition-colors hover:border-ink/20 hover:text-ink md:bottom-6 md:right-5"
        >
          <span className="grid size-6 place-items-center rounded-full bg-brand-soft text-brand">
            <MessageCircle className="size-3.5" />
          </span>
          <span className="hidden md:inline">Help & support</span>
        </motion.button>
      ) : null}
    </AnimatePresence>
    <Sheet open={panelOpen} onOpenChange={setPanelOpen}><SheetContent data-paper-root onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus(); }}>
      <SheetHeader><SheetTitle>A little help, close by</SheetTitle><SheetDescription>Quick answers for the work you are doing.</SheetDescription></SheetHeader>
      <div className="space-y-4 p-5">
        {[
          ["Find a record", "Search by name or contact information. Use Filters & display to narrow the register, then save a named view to return to that combination."],
          ["Review a form", "Use Preview before saving. In the form builder, move through Details, Questions, Rules and Preview; sample respondent answers are never submitted."],
          ["Check a payment", "Open Settings → Billing to review the recorded payment status. A return from checkout does not confirm payment; wait for provider verification before paying again."],
        ].map(([title, answer]) => <div key={title} className="rounded-xl border border-line bg-card p-4"><button type="button" className="w-full text-left text-sm font-semibold" aria-expanded={topic === title} onClick={() => setTopic(topic === title ? "" : title)}>{title}</button>{topic === title && <p className="mt-3 text-sm leading-relaxed text-ink-soft">{answer}</p>}</div>)}
        <Button asChild variant="outline" className="w-full"><Link href="/help">Browse the help centre</Link></Button>
        {available && <Button className="w-full" onClick={() => { setPanelOpen(false); openChat(); }}><MessageCircle className="size-4" />Open live chat</Button>}
      </div>
    </SheetContent></Sheet>
    </>
  );
}
