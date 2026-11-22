"use client";

import * as React from "react";
import { useIsFetching } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { usePermissions } from "@/hooks/use-permissions";
import { useCurrentProfile } from "@/hooks/use-profile";
import { PageTour, type TourStep } from "./page-tour";
import { resolveNavigationTour, type NavigationTourDefinition } from "./navigation-tour-definitions";

/** Mounted by both shared headers and the few record pages with bespoke headings. */
export function NavigationPageTour() {
  const pathname = usePathname();
  const definition = resolveNavigationTour(pathname);
  return definition ? <ResolvedNavigationTour key={pathname} definition={definition} /> : null;
}

function ResolvedNavigationTour({ definition }: { definition: NavigationTourDefinition }) {
  const { ready } = usePermissions();
  const fetching = useIsFetching();
  const { data: profile } = useCurrentProfile();
  const [contentReady, setContentReady] = React.useState(false);
  const [owner, setOwner] = React.useState(false);
  const mount = React.useRef<HTMLSpanElement>(null);
  const steps = React.useMemo<TourStep[]>(() => [
    { target: "#main-content h1", title: definition.page, description: definition.introduction },
    ...definition.steps,
  ], [definition]);

  React.useEffect(() => {
    const main = document.getElementById("main-content");
    if (!main) return;
    let timer: ReturnType<typeof setTimeout>;
    function inspect() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setOwner(main?.querySelector("[data-navigation-tour-mount]") === mount.current);
        const blocked = document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], dialog[open]:not([data-page-tour-dialog])');
        setContentReady(!!main?.querySelector("h1") && !Array.from(main.querySelectorAll('.animate-pulse, [aria-busy="true"]')).some((element) => element.getClientRects().length > 0) && !blocked);
      }, 200);
    }
    inspect();
    // Forms and confirmation dialogs may live in portals outside the workspace.
    const observer = new MutationObserver(inspect);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-state", "aria-busy", "hidden", "open"] });
    return () => { clearTimeout(timer); observer.disconnect(); };
  }, []);

  return <span ref={mount} data-navigation-tour-mount className="contents">{owner ? <PageTour page={definition.page} account={profile ? `${profile.churchId}:${profile.profileId}` : undefined} ready={ready && contentReady && fetching === 0} steps={steps} /> : null}</span>;
}
