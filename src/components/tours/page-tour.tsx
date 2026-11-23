"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { CircleHelp, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type TourStep = { target: string; title: string; description: string };
const seenThisSession = new Set<string>();

/** Tabs may keep hidden panels mounted; choose an actually rendered match. */
function visibleTarget(selector: string) {
  return Array.from(document.querySelectorAll<HTMLElement>(selector)).find(
    (element) => element.getClientRects().length > 0,
  );
}

/** Clickable help also works on touch screens and with the keyboard. */
export function SectionHelp({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`About ${title}`} title={`About ${title}`} className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-muted focus-visible:outline-2 focus-visible:outline-brand">
          <CircleHelp className="size-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="text-sm leading-relaxed" side="bottom">
        <p className="mb-1 font-semibold">{title}</p>
        <p>{children}</p>
      </PopoverContent>
    </Popover>
  );
}

/** Modal spotlight shared by page-specific, permission-filtered tours. */
export function PageTour({ page, account, ready, steps }: {
  page: string;
  account?: string;
  ready: boolean;
  steps: TourStep[];
}) {
  const key = account ? `belivrhq:tour:${page}:v1:${account}` : undefined;
  const [active, setActive] = React.useState(false);
  const [index, setIndex] = React.useState(0);
  const [available, setAvailable] = React.useState<TourStep[]>([]);
  const [rect, setRect] = React.useState<DOMRect | null>(null);
  const [viewport, setViewport] = React.useState({ width: 0, height: 0 });
  const dialog = React.useRef<HTMLDialogElement>(null);
  const card = React.useRef<HTMLDivElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const [cardHeight, setCardHeight] = React.useState(260);
  const maskId = React.useId().replace(/:/g, "");

  const start = React.useCallback(() => {
    const visible = steps.filter((step) => visibleTarget(step.target));
    const enhancements: TourStep[] = [
      {target: ".list-filter-trigger",title: "Focus the register",description: "After the tour, open Filters & display to choose this page’s filters, scope, sorting and view. Results update as you choose. Show results returns you to the register."},
      {target: "[data-saved-list-views]",title: "Keep a useful view",description: "Save a named combination of filters and display choices, then select it to reuse those settings. Saved views stay private to your account on this browser and never change your access."},
      {target: "[data-mobile-preview]",title: "Review before saving",description: "On a phone, Preview opens your current draft while Save and Cancel stay above the navigation. Opening a preview does not save the record."},
    ];
    visible.splice(Math.min(1,visible.length),0,...enhancements.filter(step => visibleTarget(step.target) && !visible.some(existing => existing.target === step.target)));
    if (!visible.length) return;
    setAvailable(visible);
    setIndex(0);
    setActive(true);
  }, [steps]);

  React.useEffect(() => {
    if (!ready || !key || active) return;
    let seen = seenThisSession.has(key);
    try { seen ||= localStorage.getItem(key) === "seen"; } catch { /* Storage is optional. */ }
    if (seen) return;
    const timer = window.setTimeout(start, 800);
    return () => window.clearTimeout(timer);
  }, [ready, key, start, active]);

  function finish() {
    if (key) {
      seenThisSession.add(key);
      try { localStorage.setItem(key, "seen"); } catch { /* Replay still works without storage. */ }
    }
    setActive(false);
  }

  React.useEffect(() => {
    if (!active) return;
    const node = dialog.current;
    const returnFocus = trigger.current;
    node?.showModal();
    node?.querySelector<HTMLButtonElement>("[data-tour-next]")?.focus({ preventScroll: true });
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      node?.close();
      document.documentElement.style.overflow = previousOverflow;
      returnFocus?.focus({ preventScroll: true });
    };
  }, [active]);

  React.useEffect(() => {
    if (!active) return;
    const target = visibleTarget(available[index]?.target ?? "body");
    const mobile = window.innerWidth < 640;
    target?.scrollIntoView({ block: mobile ? "start" : "center", behavior: "instant" });
    if (target && mobile) window.scrollBy({ top: -76, behavior: "instant" });
    function measure() {
      setRect(target?.getBoundingClientRect() ?? null);
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      if (card.current) setCardHeight(card.current.getBoundingClientRect().height);
    }
    measure();
    const observer = new ResizeObserver(measure);
    if (target) observer.observe(target);
    if (card.current) observer.observe(card.current);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, available, index]);

  const width = Math.min(360, viewport.width - 24);
  const left = Math.max(12, Math.min(rect?.left ?? 12, viewport.width - width - 12));
  const below = (rect?.bottom ?? 0) + 16;
  const top = Math.max(12, Math.min(
    below + cardHeight <= viewport.height - 12 ? below : (rect?.top ?? 0) - cardHeight - 16,
    viewport.height - cardHeight - 12,
  ));
  const step = available[index];

  return (
    <>
      <Button type="button" data-tour-trigger ref={trigger} variant="outline" className="h-9 gap-1.5 rounded-full border-line bg-card text-sm" onClick={start} disabled={!ready || !account}>
        <Route className="size-4" aria-hidden="true" /> Take a tour
      </Button>
      {active && step ? createPortal(
        <dialog data-page-tour-dialog ref={dialog} aria-labelledby={`${maskId}-title`} aria-describedby={`${maskId}-description`} onCancel={(event) => { event.preventDefault(); finish(); }} className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-transparent p-0 text-foreground backdrop:bg-transparent">
          <svg className="absolute inset-0 size-full" aria-hidden="true">
            <defs><mask id={maskId}>
              <rect width="100%" height="100%" fill="white" />
              {rect ? <rect x={rect.left - 6} y={rect.top - 6} width={rect.width + 12} height={rect.height + 12} rx="18" fill="black" /> : null}
            </mask></defs>
            <rect width="100%" height="100%" fill="rgb(12 20 18 / 65%)" mask={`url(#${maskId})`} />
            {rect ? <rect x={rect.left - 6} y={rect.top - 6} width={rect.width + 12} height={rect.height + 12} rx="18" fill="none" stroke="var(--brand)" strokeWidth="3" /> : null}
          </svg>
          <div ref={card} className="absolute max-h-[calc(100dvh-24px)] overflow-y-auto rounded-2xl border border-line bg-card p-5 shadow-2xl" style={{ width, left, top }}>
            <div aria-live="polite" aria-atomic="true">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand">{page} tour · {index + 1} of {available.length}</p>
              <h2 id={`${maskId}-title`} className="font-display text-xl font-semibold">{step.title}</h2>
              <p id={`${maskId}-description`} className="mt-2 text-sm leading-relaxed text-ink-soft">{step.description}</p>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
              <Button variant="ghost" size="sm" onClick={finish}>Skip tour</Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={index === 0} onClick={() => setIndex(index - 1)}>Previous</Button>
                <Button size="sm" data-tour-next onClick={() => index === available.length - 1 ? finish() : setIndex(index + 1)}>{index === available.length - 1 ? "Finish" : "Next"}</Button>
              </div>
            </div>
            <p className="mt-3 text-xs text-ink-faint">Press Escape to close. Replay anytime with Take a tour.</p>
          </div>
        </dialog>, document.body,
      ) : null}
    </>
  );
}
