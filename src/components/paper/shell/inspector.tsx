"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useInspector } from "./inspector-provider";
import { ActionTooltip } from "@/components/ui/tooltip";
import { overlay, spring } from "@/components/paper/motion/variants";
import { cn } from "@/lib/utils";

export function Inspector() {
  const { payload, isOpen, close } = useInspector();

  return (
    <AnimatePresence>
      {isOpen && payload ? (
        <>
          <motion.div
            key="inspector-overlay"
            variants={overlay}
            initial="hidden"
            animate="show"
            exit="exit"
            onClick={close}
            className="fixed inset-0 z-40 bg-ink/25 backdrop-blur-[2px] dark:bg-black/40"
          />
          <motion.aside
            key="inspector-panel"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={spring}
            className={cn(
              "fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-line bg-card shadow-2xl",
              payload.width === "wide" ? "sm:max-w-[560px]" : "sm:max-w-[420px]",
            )}
            role="dialog"
            aria-modal="true"
            aria-label={payload.title}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div className="min-w-0 space-y-1">
                {payload.eyebrow ? (
                  <p className="rule-label">{payload.eyebrow}</p>
                ) : null}
                <h2 className="truncate font-display text-lg font-semibold leading-tight">
                  {payload.title}
                </h2>
                {payload.subtitle ? (
                  <p className="truncate text-sm text-ink-soft">{payload.subtitle}</p>
                ) : null}
              </div>
              <ActionTooltip label="Close panel">
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close inspector"
                  className="grid size-8 shrink-0 place-items-center rounded-full text-ink-faint transition-colors hover:bg-muted hover:text-ink"
                >
                  <X className="size-4" />
                </button>
              </ActionTooltip>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">{payload.content}</div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
