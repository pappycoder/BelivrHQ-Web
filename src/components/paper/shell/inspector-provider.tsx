"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

export interface InspectorPayload {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  content: React.ReactNode;
  width?: "default" | "wide";
}

interface InspectorContextValue {
  payload: InspectorPayload | null;
  isOpen: boolean;
  open: (payload: InspectorPayload) => void;
  close: () => void;
}

const InspectorContext = React.createContext<InspectorContextValue | null>(null);

/**
 * @file The workspace side drawer (row inspector). The provider outlives
 * route changes (it lives in the shell), so it owns the shared dismissal
 * rules every page gets for free: the drawer closes when the app navigates
 * to a new page, and when any modal (dialog or sheet) opens on top of it —
 * including buttons rendered inside the drawer's own content.
 */
export function InspectorProvider({ children }: { children: React.ReactNode }) {
  const [payload, setPayload] = React.useState<InspectorPayload | null>(null);
  const pathname = usePathname();

  const open = React.useCallback((next: InspectorPayload) => setPayload(next), []);
  const close = React.useCallback(() => setPayload(null), []);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  // A button that opens a new page must dismiss the drawer — the provider
  // survives navigation, so without this the drawer would follow you there.
  React.useEffect(() => {
    setPayload(null);
  }, [pathname]);

  // A button that opens a modal (Radix dialog/sheet portals to <body>) must
  // dismiss the drawer too, instead of stacking the modal over it.
  React.useEffect(() => {
    if (!payload) return;
    const modalUp = () =>
      !!document.querySelector('[data-slot="dialog-content"], [data-slot="sheet-content"]');
    if (modalUp()) {
      setPayload(null);
      return;
    }
    const observer = new MutationObserver(() => {
      if (modalUp()) setPayload(null);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [payload]);

  const value = React.useMemo(
    () => ({ payload, isOpen: !!payload, open, close }),
    [payload, open, close],
  );

  return (
    <InspectorContext.Provider value={value}>
      {children}
    </InspectorContext.Provider>
  );
}

export function useInspector() {
  const ctx = React.useContext(InspectorContext);
  if (!ctx)
    throw new Error("useInspector must be used inside <InspectorProvider>");
  return ctx;
}
