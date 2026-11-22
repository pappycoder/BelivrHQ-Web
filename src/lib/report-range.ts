import { format } from "date-fns";

export const REPORT_RANGES = ["This month", "This quarter", "Year to date", "All time"] as const;

/** Preset bounds are calendar days, not UTC instants. */
export function reportRangeParams(range: (typeof REPORT_RANGES)[number], now = new Date()): { startDate?: string; endDate?: string } {
  const day = (date: Date) => format(date, "yyyy-MM-dd");
  if (range === "This month") return { startDate: day(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: day(now) };
  if (range === "This quarter") {
    const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
    return { startDate: day(new Date(now.getFullYear(), quarterMonth, 1)), endDate: day(now) };
  }
  if (range === "Year to date") return { startDate: `${now.getFullYear()}-01-01`, endDate: day(now) };
  return {};
}
