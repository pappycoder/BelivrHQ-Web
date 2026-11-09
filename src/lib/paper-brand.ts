/**
 * @file Switchable Paper accent ("brand") colour.
 *
 * The Paper design ships with BelivrHQ teal as the default workspace accent.
 * A user-chosen accent is persisted per-device in localStorage and applied as
 * inline custom properties on <html>, where it overrides the token defaults in
 * paper-tokens.css (--brand / --brand-soft, and --primary/--chart-1 follow via
 * var()). The stored payload carries fully-resolved light + dark values so the
 * pre-paint script in the root layout needs no preset knowledge (no flash).
 */

export type PaperBrandPreset = {
  id: string;
  name: string;
  light: string;
  dark: string;
  softLight: string;
  softDark: string;
};

export const PAPER_BRAND_PRESETS: PaperBrandPreset[] = [
  { id: "teal", name: "Teal", light: "#0f766e", dark: "#5ed5be", softLight: "#d8eae7", softDark: "#163a37" },
  { id: "terracotta", name: "Terracotta", light: "#c2542d", dark: "#e07a52", softLight: "#f0dcd2", softDark: "#3a241b" },
  { id: "moss", name: "Moss", light: "#4c5f3d", dark: "#8ba173", softLight: "#dfe6d5", softDark: "#26301d" },
  { id: "gold", name: "Gold", light: "#a97e26", dark: "#d8b26a", softLight: "#f2e6c8", softDark: "#342a17" },
  { id: "sky", name: "Sky", light: "#3d6b7d", dark: "#7fb0c2", softLight: "#d9e6ea", softDark: "#1d2c31" },
  { id: "rose", name: "Rose", light: "#a8495a", dark: "#d98a97", softLight: "#f2dade", softDark: "#33202a" },
];

export const PAPER_BRAND_STORAGE_KEY = "belivrhq:paper-brand";
export const PAPER_BRAND_EVENT = "belivrhq:paper-brand-changed";

/** The default (teal) is represented by an *absent* entry: the CSS default. */
type StoredBrand = { brand: string; brandDark: string; soft: string; softDark: string };

function presetToStored(preset: PaperBrandPreset): StoredBrand {
  return { brand: preset.light, brandDark: preset.dark, soft: preset.softLight, softDark: preset.softDark };
}

/**
 * Custom hex: light value is the raw pick; dark mode lifts it toward white so
 * it stays readable as text/ink on charcoal; soft tints derive via color-mix
 * (resolved by the browser at paint time, so it works inside setProperty).
 */
function customToStored(hex: string): StoredBrand {
  return {
    brand: hex,
    brandDark: `color-mix(in oklab, ${hex} 62%, white)`,
    soft: `color-mix(in oklab, ${hex} 13%, white)`,
    softDark: `color-mix(in oklab, ${hex} 22%, black)`,
  };
}

function readStored(): StoredBrand | null {
  try {
    const raw = localStorage.getItem(PAPER_BRAND_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredBrand;
    return typeof parsed?.brand === "string" && typeof parsed.brandDark === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function writeStored(value: StoredBrand | null) {
  try {
    if (value) localStorage.setItem(PAPER_BRAND_STORAGE_KEY, JSON.stringify(value));
    else localStorage.removeItem(PAPER_BRAND_STORAGE_KEY);
  } catch {
    // Storage is an enhancement, never a gate — the default teal still applies.
  }
  window.dispatchEvent(new Event(PAPER_BRAND_EVENT));
}

/** Push the stored brand (or clear back to the CSS teal default) onto <html>. */
export function applyPaperBrand() {
  if (typeof document === "undefined") return;
  const style = document.documentElement.style;
  const stored = readStored();
  if (!stored) {
    style.removeProperty("--brand");
    style.removeProperty("--brand-soft");
    style.removeProperty("--ring");
    return;
  }
  const dark = document.documentElement.classList.contains("dark");
  style.setProperty("--brand", dark ? stored.brandDark : stored.brand);
  style.setProperty("--brand-soft", dark ? stored.softDark : stored.soft);
  style.setProperty("--ring", `color-mix(in oklab, ${dark ? stored.brandDark : stored.brand} 40%, transparent)`);
}

export function setPaperBrandPreset(id: string) {
  const preset = PAPER_BRAND_PRESETS.find((p) => p.id === id);
  if (!preset || preset.id === "teal") writeStored(null);
  else writeStored(presetToStored(preset));
  applyPaperBrand();
}

export function setPaperBrandCustom(hex: string) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
  writeStored(customToStored(hex));
  applyPaperBrand();
}

export function resetPaperBrand() {
  writeStored(null);
  applyPaperBrand();
}

/** Which control should read as active right now ("" = default teal). */
export function currentPaperBrand(): { presetId: string; hex?: string } {
  const stored = readStored();
  if (!stored) return { presetId: "teal" };
  const preset = PAPER_BRAND_PRESETS.find((p) => p.light === stored.brand);
  return preset ? { presetId: preset.id } : { presetId: "custom", hex: stored.brand };
}

/** Re-apply on cross-tab storage changes, manual events, and theme flips. */
export function subscribePaperBrand(): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onChange = () => applyPaperBrand();
  window.addEventListener("storage", onChange);
  window.addEventListener(PAPER_BRAND_EVENT, onChange);
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(PAPER_BRAND_EVENT, onChange);
    observer.disconnect();
  };
}
