"use client";

import * as React from "react";
import { Download, Share, Smartphone, Monitor, X } from "lucide-react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const [busy, setBusy] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [guide, setGuide] = React.useState("desktop");
  const helpTitle = React.useRef<HTMLHeadingElement>(null);
  const helpOpener = React.useRef<HTMLElement | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const dismiss = React.useCallback(() => {
    setDismissed(true);
    try { localStorage.setItem(DISMISSED, String(Date.now())); } catch { /* This tab still remembers the dismissal. */ }
  }, []);

  React.useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const isStandalone = () => media.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(isStandalone());
    const appleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setGuide(appleMobile ? "ios" : /Android/.test(navigator.userAgent) ? "android" : "desktop");
    try {
      const timestamp = Number(localStorage.getItem(DISMISSED));
      setDismissed(Number.isFinite(timestamp) && timestamp > 0 && timestamp <= Date.now() && Date.now() - timestamp < SNOOZE);
    } catch { /* Restricted storage must not prevent installation. */ }
    setReady(true);
    const offer = (event: Event) => {
      if (isStandalone()) return;
      event.preventDefault();
      deferred.current = event as InstallPrompt;
      setError(null);
    };
    const complete = () => {
      deferred.current = null;
      setInstalled(true);
      setHelpOpen(false);
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
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const triggerId = focused?.closest('[role="menu"]')?.getAttribute("aria-labelledby");
    helpOpener.current = (triggerId ? document.getElementById(triggerId) : null) ?? focused;
    const prompt = deferred.current;
    if (!prompt) { setHelpOpen(true); return; }
    // The browser event can be used only once. Call it during this click's activation.
    deferred.current = null;
    prompting.current = true;
    setBusy(true);
    setError(null);
    try {
      await prompt.prompt();
      await prompt.userChoice;
      // Either choice ends this offer; only appinstalled confirms installation.
      dismiss();
    } catch {
      setError("The install prompt could not open. Use the installation steps below, or try again when your browser offers installation.");
      setHelpOpen(true);
    } finally {
      prompting.current = false;
      setBusy(false);
    }
  }, [dismiss, installed]);

  return <InstallContext.Provider value={{ ready, installed, dismissed, busy, dismiss, install }}>
    {children}
    <Dialog open={helpOpen && !installed} onOpenChange={setHelpOpen}>
      <DialogContent className="sm:max-w-lg" onOpenAutoFocus={event => { event.preventDefault(); helpTitle.current?.focus(); }} onCloseAutoFocus={event => { if (helpOpener.current?.isConnected) { event.preventDefault(); helpOpener.current.focus(); } }}>
        <DialogHeader>
          <DialogTitle ref={helpTitle} tabIndex={-1} className="outline-none">Install BelivrHQ</DialogTitle>
          <DialogDescription>Add BelivrHQ to this device. Internet connection required.</DialogDescription>
        </DialogHeader>
        {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
        <Tabs value={guide} onValueChange={setGuide}>
          <TabsList aria-label="Installation device" className="grid h-auto w-full grid-cols-3 group-data-[orientation=horizontal]/tabs:h-auto">
            <TabsTrigger value="ios" className="min-h-11 min-w-0 whitespace-normal px-1 text-xs">iPhone / iPad</TabsTrigger>
            <TabsTrigger value="android" className="min-h-11 min-w-0 px-1 text-xs">Android</TabsTrigger>
            <TabsTrigger value="desktop" className="min-h-11 min-w-0 px-1 text-xs">Desktop</TabsTrigger>
          </TabsList>
          <TabsContent value="ios" className="mt-4 text-sm leading-relaxed"><section className="rounded-xl border bg-background p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Share className="size-4 shrink-0" aria-hidden="true" />iPhone or iPad</h3>
            <ol className="list-decimal space-y-1 pl-5"><li>Open BelivrHQ in Safari.</li><li>Open the browser’s Share menu and choose <strong>Add to Home Screen</strong>.</li><li>Turn on <strong>Open as Web App</strong> if shown, then tap <strong>Add</strong>.</li></ol>
          </section></TabsContent>
          <TabsContent value="android" className="mt-4 text-sm leading-relaxed"><section className="rounded-xl border bg-background p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Smartphone className="size-4 shrink-0" aria-hidden="true" />Android</h3>
            <p>In Chrome, open the browser menu, choose <strong>Install app</strong> or <strong>Add to Home screen</strong>, then follow the browser’s confirmation.</p>
          </section></TabsContent>
          <TabsContent value="desktop" className="mt-4 text-sm leading-relaxed"><section className="rounded-xl border bg-background p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Monitor className="size-4 shrink-0" aria-hidden="true" />Desktop</h3>
            <p>In Chrome or Edge, use the install icon in the address bar or the browser menu’s app installation option. In Safari on Mac, choose <strong>File → Add to Dock</strong> when available.</p>
          </section></TabsContent>
        </Tabs>
        <p className="text-sm leading-relaxed text-muted-foreground">If installation is unavailable, you can keep using BelivrHQ in your browser.</p>
        <div className="flex justify-end"><Button type="button" className="min-h-11 w-full sm:w-auto" onClick={() => setHelpOpen(false)}>Got it</Button></div>
      </DialogContent>
    </Dialog>
  </InstallContext.Provider>;
}

export function AppInstallBanner() {
  const app = useAppInstall();
  const dock = React.useRef<HTMLDivElement>(null);
  const visible = app.ready && !app.installed && !app.dismissed;
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
