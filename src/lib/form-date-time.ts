import type { DateTimeParts } from "./wheel-date-time";

/** Calendar days are local dates, including years 1–99 (which Date's constructor remaps). */
export function toCalendarDate(parts: DateTimeParts): Date {
  const date = new Date(0);
  date.setFullYear(parts.year, parts.month - 1, parts.day);
  date.setHours(12, 0, 0, 0);
  return date;
}

export function withCalendarDate(parts: DateTimeParts, date: Date): DateTimeParts {
  return { ...parts, year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
}
