"use client";

import * as React from "react";
import { Check, Monitor, Moon, Palette, RotateCcw, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { PageHeader, SectionCard } from "@/components/paper/section";
import { Tag } from "@/components/paper/stat";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PAPER_BRAND_EVENT,
  PAPER_BRAND_PRESETS,
  currentPaperBrand,
  resetPaperBrand,
  setPaperBrandCustom,
  setPaperBrandPreset,
} from "@/lib/paper-brand";

const MODES = [
  { value: "light", title: "Light", note: "Warm paper, the default light theme.", icon: Sun },
  { value: "dark", title: "Dark", note: "Charcoal ink for late ledgers and bright rooms.", icon: Moon },
  { value: "system", title: "System", note: "Follows the device. The quiet, sensible choice.", icon: Monitor },
] as const;

export default function SettingsAppearancePage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [brand, setBrand] = React.useState<{ presetId: string; hex?: string }>({ presetId: "teal" });

  React.useEffect(() => {
    setMounted(true);
    setBrand(currentPaperBrand());
    const refresh = () => setBrand(currentPaperBrand());
    window.addEventListener(PAPER_BRAND_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(PAPER_BRAND_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const isDefault = brand.presetId === "teal";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings · Appearance"
        title="The light you work in, the colour you lead with."
        description="Choose a theme and accent colour. Both are saved to this device."
      />

      <SectionCard
        eyebrow="Accent colour"
        title="The primary colour of your workspace"
        actions={
          !isDefault ? (
            <Button size="sm" variant="ghost" className="h-7 gap-1.5 rounded-full text-[11px] text-ink-faint" onClick={() => { resetPaperBrand(); setBrand(currentPaperBrand()); }}>
              <RotateCcw className="size-3" /> Reset to teal
            </Button>
          ) : <Tag tone="moss">Teal (BelivrHQ default)</Tag>
        }
      >
        <div className="flex flex-wrap gap-3">
          {PAPER_BRAND_PRESETS.map((preset) => {
            const active = brand.presetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={active}
                title={preset.name}
                onClick={() => { setPaperBrandPreset(preset.id); setBrand(currentPaperBrand()); }}
                className={cn(
                  "flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 text-[11px] transition-colors",
                  active ? "border-ink/25 bg-muted font-semibold" : "border-line hover:border-ink/20",
                )}
              >
                <span className="grid size-6 place-items-center rounded-full" style={{ background: preset.light }}>
                  {active ? <Check className="size-3.5 text-white" /> : null}
                </span>
                {preset.name}
              </button>
            );
          })}

          <label
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 text-[11px] transition-colors",
              brand.presetId === "custom" ? "border-ink/25 bg-muted font-semibold" : "border-line hover:border-ink/20",
            )}
          >
            <span className="relative grid size-6 place-items-center overflow-hidden rounded-full bg-[conic-gradient(#c2542d,#a97e26,#4c5f3d,#3d6b7d,#a8495a,#c2542d)]">
              {brand.presetId === "custom" ? <Check className="absolute size-3.5 text-white drop-shadow" /> : null}
              <input
                type="color"
                aria-label="Custom accent colour"
                value={brand.hex ?? "#0f766e"}
                onChange={(event) => { setPaperBrandCustom(event.target.value); setBrand(currentPaperBrand()); }}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </span>
            Custom
          </label>
        </div>
        <p className="mt-4 text-[10px] leading-relaxed text-ink-faint">
          Teal is the default throughout. The accent you pick re-skins the dock, buttons, charts, links and
          highlights across the whole workspace, is stored on this device only, and follows you across tabs instantly.
        </p>
      </SectionCard>

      <SectionCard
        eyebrow="Colour mode"
        title={mounted ? `Currently rendering in ${resolvedTheme === "dark" ? "charcoal ink" : "warm paper"}` : "Choosing…"}
        actions={<Tag tone="brand">{mounted ? (theme ?? "system") : "system"}</Tag>}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {MODES.map((mode) => {
            const active = (theme ?? "system") === mode.value;
            return (
              <button
                key={mode.value}
                type="button"
                aria-pressed={active}
                onClick={() => setTheme(mode.value)}
                className={cn(
                  "paper-card flex flex-col items-start gap-3 rounded-2xl p-5 text-left transition-all",
                  active ? "border-brand/50 bg-brand-soft/30" : "lift hover:border-ink/20",
                )}
              >
                <span className={cn("grid size-10 place-items-center rounded-xl", active ? "bg-brand text-paper" : "bg-muted text-ink-faint")}>
                  <mode.icon className="size-4" />
                </span>
                <span>
                  <span className="block font-display text-sm font-semibold">{mode.title}</span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-faint">{mode.note}</span>
                </span>
              </button>
            );
          })}
        </div>
      </SectionCard>

      <div className="paper-card rounded-2xl p-5">
        <div className="flex items-center gap-2">
          <Palette className="size-4 text-ink-faint" />
          <p className="rule-label">The palette in the room</p>
        </div>
        <div className="mt-3 flex gap-2">
          {[
            ["var(--brand)", "brand · your accent"],
            ["var(--moss)", "moss · growth & good"],
            ["var(--gold)", "gold · attention"],
            ["var(--sky)", "sky · information"],
            ["var(--rose)", "rose · warnings"],
            ["var(--ink)", "ink · type"],
          ].map(([token, label]) => (
            <span key={token} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="h-8 w-full rounded-lg border border-line" style={{ background: token }} />
              <span className="text-center text-[8px] uppercase tracking-wider text-ink-faint">{label}</span>
            </span>
          ))}
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-ink-faint">
          The semantic colours keep their meaning in both themes. A chart read at 6am says the same thing at 11pm,
          whatever accent you choose to wear.
        </p>
      </div>
    </div>
  );
}
