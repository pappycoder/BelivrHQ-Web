"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import type { PaperArea } from "@/lib/paper-nav";
import { activeLeafHref } from "@/lib/paper-nav";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * @file Mobile workspace navigation. The bottom bar shows the first three
 * areas; tapping one opens a bottom sheet with that area's full submenu
 * (modules → pages) — the mobile twin of the desktop dock's hover peek.
 * A second tap on the open area navigates straight to its landing page.
 * The "More" sheet carries every remaining area, also expanded to leaves.
 */

function isAreaActive(area: PaperArea, pathname: string) {
  return area.children.some((module) =>
    module.children.some(
      (leaf) => pathname === leaf.href || pathname.startsWith(leaf.href + "/"),
    ),
  );
}

function landingOf(area: PaperArea) {
  return area.children[0]?.children[0]?.href ?? area.href;
}

function AreaSubmenu({
  area,
  activeHref,
  onNavigate,
}: {
  area: PaperArea;
  /** Longest-matching leaf href for the current route — only that one lights. */
  activeHref?: string;
  onNavigate: () => void;
}) {
  return (
    <div className="space-y-5">
      {area.children.map((module) => (
        <div key={module.title} className="space-y-1.5">
          <p className="rule-label px-1">{module.title}</p>
          {module.children.map((leaf) => {
            const active = leaf.href === activeHref;
            return (
              <Link
                key={leaf.href}
                href={leaf.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-start justify-between gap-3 rounded-xl border p-3 transition-colors",
                  active
                    ? "border-brand/40 bg-brand-soft/50"
                    : "border-line bg-card hover:bg-muted",
                )}
              >
                <span className="min-w-0">
                  <span className="block text-xs font-semibold">{leaf.title}</span>
                  {leaf.description ? (
                    <span className="mt-0.5 block text-[10px] leading-relaxed text-ink-faint">
                      {leaf.description}
                    </span>
                  ) : null}
                </span>
                {active ? (
                  <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-brand" />
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function MobileNav({ areas }: { areas: PaperArea[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const activeHref = React.useMemo(() => activeLeafHref(areas, pathname), [areas, pathname]);
  const primary = areas.slice(0, 3);
  const rest = areas.slice(3);
  const [openAreaId, setOpenAreaId] = React.useState<string | null>(null);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const openArea = openAreaId
    ? primary.find((area) => area.id === openAreaId) ?? null
    : null;

  function handleArea(area: PaperArea) {
    if (openAreaId === area.id) {
      // Second tap on the open area — go straight to its landing page.
      setOpenAreaId(null);
      router.push(landingOf(area));
    } else {
      setOpenAreaId(area.id);
    }
  }

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <div className="flex items-stretch">
        {primary.map((area) => {
          const active = isAreaActive(area, pathname);
          const expanded = openAreaId === area.id;
          return (
            <button
              key={area.id}
              type="button"
              onClick={() => handleArea(area)}
              aria-label={`${area.label}: show sections`}
              aria-expanded={expanded}
              className={cn(
                "relative flex min-w-0 flex-1 flex-col items-center gap-1 py-2.5 text-[10px] transition-colors",
                active || expanded ? "text-brand" : "text-ink-faint",
              )}
            >
              {active ? (
                <span className="absolute top-0 h-0.5 w-6 rounded-full bg-brand" />
              ) : null}
              <area.icon className="size-[18px]" strokeWidth={1.8} />
              <span className="max-w-full truncate">{area.label}</span>
            </button>
          );
        })}

        {rest.length ? (
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] text-ink-faint"
                aria-label="All areas"
              >
                <LayoutGrid className="size-[18px]" strokeWidth={1.8} />
                More
              </button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="max-h-[78svh] overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
            >
              <SheetHeader>
                <SheetTitle className="text-left font-display">All areas</SheetTitle>
                <SheetDescription className="text-left">
                  Everything in your workspace.
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-6 px-4 pt-4">
                {rest.map((area) => (
                  <section key={area.id} className="space-y-2">
                    <div className="flex items-center gap-2.5 px-1">
                      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-ink-soft">
                        <area.icon className="size-3.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold">{area.label}</span>
                        <span className="block truncate text-[10px] text-ink-faint">
                          {area.blurb}
                        </span>
                      </span>
                    </div>
                    <AreaSubmenu area={area} activeHref={activeHref} onNavigate={() => setMoreOpen(false)} />
                  </section>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        ) : null}
      </div>

      {/* Per-area submenu sheet — the mobile twin of the dock's hover peek. */}
      <Sheet open={!!openArea} onOpenChange={(value) => !value && setOpenAreaId(null)}>
        <SheetContent
          side="bottom"
          className="max-h-[78svh] overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
          aria-label={openArea ? `${openArea.label} sections` : undefined}
        >
          {openArea ? (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2.5 text-left font-display">
                  <span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-brand">
                    <openArea.icon className="size-4" />
                  </span>
                  {openArea.label}
                </SheetTitle>
                <SheetDescription className="text-left">{openArea.blurb}</SheetDescription>
              </SheetHeader>
              <div className="space-y-5 px-4 pt-4">
                <AreaSubmenu area={openArea} activeHref={activeHref} onNavigate={() => setOpenAreaId(null)} />
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </nav>
  );
}
