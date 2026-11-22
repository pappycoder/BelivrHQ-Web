import { format, formatDistanceToNow, parseISO } from "date-fns";

/** Fixed "today" for deterministic preview rendering. Never call new Date()
 * during render under cache components — use DEMO_TODAY until runtime. */
export const PAPER_TODAY = "2026-10-30";

export function currency(value: number, opts?: { compact?: boolean; code?: string }): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: opts?.code ?? "USD",
    maximumFractionDigits: opts?.compact ? 1 : 0,
    notation: opts?.compact ? "compact" : "standard",
  }).format(value);
}

export function number(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

/** Keep fractional thousands visible: 1,500 and 2,000 must not both read as 2k. */
export function chartTick(value: number | string): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return String(value);
  const units = [[1e12, "t"], [1e9, "b"], [1e6, "m"], [1e3, "k"]] as const;
  const unit = units.find(([size]) => Math.abs(value) >= size);
  return unit ? `${value / unit[0]}${unit[1]}` : String(value);
}

export function ageGroupLabel(group: string): string {
  const labels: Record<string, string> = {
    under_18: "Under 18",
    age_18_30: "18–30",
    age_31_45: "31–45",
    age_46_60: "46–60",
    age_60_plus: "Over 60",
    unspecified: "Not specified",
  };
  return labels[group] ?? group.replaceAll("_", " ").replace(/^./, letter => letter.toUpperCase());
}

export function engagementLabel(group: string): string {
  const labels: Record<string, string> = {
    highlyEngaged: "Highly engaged",
    moderatelyEngaged: "Moderately engaged",
    lowEngaged: "Low engagement",
    disengaged: "Disengaged",
  };
  return labels[group] ?? group.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ").toLowerCase().replace(/^./, letter => letter.toUpperCase());
}

export function shortDate(value: string): string {
  return format(parseISO(value), "d MMM");
}

export function longDate(value: string): string {
  return format(parseISO(value), "EEEE, d MMMM");
}

export function dayMonth(value: string): string {
  return format(parseISO(value), "EEE, d MMM");
}

export function monthYear(value: string): string {
  return format(parseISO(value), "MMMM yyyy");
}

export function timeLabel(value: string): string {
  const [hours, minutes] = value.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export function percent(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

export function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export { formatDistanceToNow };
