"use client";

import * as React from "react";
import { Download, X } from "lucide-react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { Button } from "@/components/ui/button";
import { ActionTooltip } from "@/components/ui/tooltip";
import { toast } from "@/lib/toast";

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
const DISMISSED = "belivrhq:app-install-dismissed-at";
const SNOOZE = 7 * 24 * 60 * 60 * 1000;
interface InstallState {
  ready: boolean;
  installed: boolean;
  dismissed: boolean;
  canInstall: boolean;
  busy: boolean;
  dismiss(): void;
  install(): Promise<void>;
}
const InstallContext = React.createContext<InstallState | null>(null);
export function useAppInstall() {
  const value = React.useContext(InstallContext);
  if (!value) throw new Error("AppInstallProvider is required");
  return value;
}

export function AppInstallProvider({ children }: { children: React.ReactNode }) {
  const deferred = React.useRef<InstallPrompt | null>(null);
  const prompting = React.useRef(false);
  const [ready, setReady] = React.useState(false);
  const [installed, setInstalled] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);
  const [canInstall, setCanInstall] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const dismiss = React.useCallback(() => {
    setDismissed(true);
    try { localStorage.setItem(DISMISSED, String(Date.now())); } catch { /* This tab still remembers the dismissal. */ }
  }, []);

  React.useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const isStandalone = () => media.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(isStandalone());
    try {
      const timestamp = Number(localStorage.getItem(DISMISSED));
      setDismissed(Number.isFinite(timestamp) && timestamp > 0 && timestamp <= Date.now() && Date.now() - timestamp < SNOOZE);
    } catch { /* Restricted storage must not prevent installation. */ }
    setReady(true);
    const offer = (event: Event) => {
      if (isStandalone()) return;
      event.preventDefault();
      deferred.current = event as InstallPrompt;
      setCanInstall(true);
    };
    const complete = () => {
      deferred.current = null;
      setCanInstall(false);
      setInstalled(true);
      dismiss();
    };
    const modeChanged = () => { if (isStandalone()) complete(); };
    window.addEventListener("beforeinstallprompt", offer);
    window.addEventListener("appinstalled", complete);
    media.addEventListener("change", modeChanged);
    return () => {
      window.removeEventListener("beforeinstallprompt", offer);
      window.removeEventListener("appinstalled", complete);
      media.removeEventListener("change", modeChanged);
    };
  }, [dismiss]);

  const install = React.useCallback(async () => {
    if (prompting.current || installed) return;
    const prompt = deferred.current;
    if (!prompt) return;
    // The browser event can be used only once. Call it during this click's activation.
    deferred.current = null;
    prompting.current = true;
    setBusy(true);
    setCanInstall(false);
    try {
      await prompt.prompt();
      await prompt.userChoice;
      // Either choice ends this offer; only appinstalled confirms installation.
      dismiss();
    } catch {
      toast.error("The install prompt couldn't open. Reload the page to try again.");
    } finally {
      prompting.current = false;
      setBusy(false);
    }
  }, [dismiss, installed]);

  return <InstallContext.Provider value={{ ready, installed, dismissed, canInstall, busy, dismiss, install }}>
    {children}
  </InstallContext.Provider>;
}

/** Persistent install affordance. Stays available after the banner is dismissed. */
export function AppInstallIcon() {
  const app = useAppInstall();
  if (!app.ready || app.installed || !app.canInstall) return null;
  return (
    <ActionTooltip label="Install BelivrHQ">
      <button
        type="button"
        aria-label="Install BelivrHQ"
        disabled={app.busy}
        onClick={() => void app.install()}
        className="grid size-8 place-items-center rounded-full text-ink-faint transition-colors hover:bg-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
      >
        <Download className="size-4" aria-hidden="true" />
      </button>
    </ActionTooltip>
  );
}

export function AppInstallBanner() {
  const app = useAppInstall();
  const dock = React.useRef<HTMLDivElement>(null);
  const visible = app.ready && !app.installed && !app.dismissed && app.canInstall;
  React.useLayoutEffect(() => {
    const node = dock.current;
    const root = node?.closest<HTMLElement>("[data-paper-root]");
    if (!visible || !node || !root) return;
    const watched = new Set<Element>();
    let targets: Element[] = [];
    const measure = () => {
      let base = 0;
      for (const target of targets) {
        const box = target.getBoundingClientRect();
        if (box.height > 0 && getComputedStyle(target).position === "fixed")
          base = Math.max(base, window.innerHeight - box.top);
      }
      const height = Math.ceil(node.getBoundingClientRect().height);
      const helpHeight = root.querySelector("[data-support-launcher]")?.getBoundingClientRect().height ?? 0;
      const helpSpace = height > 0 && helpHeight > 0 ? Math.ceil(helpHeight) + 24 : 0;
      root.style.setProperty("--app-install-base", Math.ceil(Math.max(0, base)) + "px");
      root.style.setProperty("--app-install-space", height + "px");
      root.style.setProperty("--app-install-help-space", helpSpace + "px");
      document.documentElement.style.setProperty("--app-install-scroll-space", height > 0 ? Math.ceil(base + height + helpSpace + 12) + "px" : "0px");
    };
    const resize = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    const sync = () => {
      targets = [
        ...root.querySelectorAll("[data-mobile-nav], [data-create-sidebar] > [data-form-actions], [data-workspace-bottom-actions]"),
        ...document.querySelectorAll("[data-support-error]"),
      ];
      const next = new Set<Element>([node, ...targets, ...root.querySelectorAll("[data-support-launcher]")]);
      for (const target of watched) if (!next.has(target)) { resize?.unobserve(target); watched.delete(target); }
      for (const target of next) if (!watched.has(target)) { resize?.observe(target); watched.add(target); }
      measure();
    };
    const mutations = new MutationObserver(records => {
      if (records.some(record => record.type === "childList" || (record.target !== root && record.target !== node))) sync();
    });
    mutations.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "hidden"] });
    window.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("resize", sync);
    sync();
    return () => {
      mutations.disconnect();
      resize?.disconnect();
      window.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("resize", sync);
      root.style.removeProperty("--app-install-base");
      root.style.removeProperty("--app-install-space");
      root.style.removeProperty("--app-install-help-space");
      document.documentElement.style.removeProperty("--app-install-scroll-space");
    };
  }, [visible]);
  if (!visible) return null;
  return <div ref={dock} data-app-install-dock className="fixed inset-x-0 z-30 bg-background px-4 py-3 md:left-[84px] md:px-8" style={{ bottom: "max(var(--app-install-base, 0px), env(safe-area-inset-bottom, 0px))" }}>
    <section aria-label="Install BelivrHQ" className="mx-auto flex w-full max-w-lg items-center gap-2 rounded-2xl border border-line bg-card p-3 shadow-xl sm:gap-3 sm:px-4">
      <span className="hidden size-9 shrink-0 place-items-center rounded-lg bg-ink dark:bg-paper dark:ring-1 dark:ring-line sm:grid"><BrandLogo variant="mark" emblemClassName="size-6 brightness-0 invert" /></span>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-ink">Install BelivrHQ</h2>
        <p className="mt-0.5 hidden text-xs text-ink-soft sm:block">Phone or desktop.</p>
      </div>
      <Button type="button" className="min-h-11 shrink-0 gap-2 px-3" disabled={app.busy} onClick={() => void app.install()}>
        <Download className="hidden size-4 sm:block" aria-hidden="true" />{app.busy ? "Opening…" : "Install App"}
      </Button>
      <button type="button" aria-label="Dismiss install banner for seven days" onClick={app.dismiss} className="grid size-11 shrink-0 place-items-center rounded-full text-ink-faint hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="size-4" aria-hidden="true" /></button>
    </section>
  </div>;
}
