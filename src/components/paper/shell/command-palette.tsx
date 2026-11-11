"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { flattenPaperNav, type PaperArea } from "@/lib/paper-nav";

export function CommandPalette({
  open,
  onOpenChange,
  areas,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  areas: PaperArea[];
}) {
  const router = useRouter();

  const rows = flattenPaperNav(areas);

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search Abide"
      description="Jump to a page you have access to"
      className="sm:max-w-[560px]"
    >
      <CommandInput placeholder="Jump to…" />
      <CommandList className="max-h-[420px]">
        <CommandEmpty className="py-8 text-center text-sm text-ink-faint">
          Nothing here. The dock shows everything you can reach.
        </CommandEmpty>
        {areas.map((area) => {
          const moduleRows = rows.filter((row) => row.area.id === area.id);
          if (!moduleRows.length) return null;
          return (
            <CommandGroup key={area.id} heading={area.label}>
              {moduleRows.map(({ leaf, module }) => (
                <CommandItem
                  key={leaf.href}
                  value={`${area.label} ${module.title} ${leaf.title} ${leaf.description ?? ""}`}
                  onSelect={() => go(leaf.href)}
                  className="gap-2"
                >
                  <area.icon className="size-3.5 text-ink-faint" />
                  <span className="flex-1">{leaf.title}</span>
                  <span className="text-xs text-ink-faint">{module.title}</span>
                  <CornerDownLeft className="size-3 opacity-0 group-data-[selected=true]:opacity-50" />
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
      </CommandList>
      <div className="flex items-center justify-between border-t border-line px-3 py-2 text-xs text-ink-faint">
        <span className="flex items-center gap-2">
          <kbd className="rounded border border-line bg-muted px-1 font-mono">↑↓</kbd>
          to navigate
        </span>
        <span className="flex items-center gap-2">
          <kbd className="rounded border border-line bg-muted px-1 font-mono">↵</kbd>
          to open · {rows.length} destinations
        </span>
      </div>
    </CommandDialog>
  );
}
