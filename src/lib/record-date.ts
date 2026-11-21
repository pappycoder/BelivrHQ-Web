const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
});

/** Calendar fields retain their recorded day, even when the API includes an ISO time. */
export function formatRecordDate(value?: string | Date | null, fallback = "Not available"): string {
  const calendarValue = value instanceof Date
    ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
    : value;
  const match = calendarValue?.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  if (!match) return fallback;
  const [, year, month, day] = match;
  const date = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== `${year}-${month}-${day}`) return fallback;
  return dateFormatter.format(date);
}

/** Scheduled instants use the viewer's timezone, or an explicitly supplied timezone. */
export function formatRecordDateTime(value?: string | null, timeZone?: string, fallback = "Not available"): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone,
  }).format(date);
}

/** Readable report bounds; ISO values remain unchanged in queries and controls. */
export function formatRecordDateRange(start?: string | null, end?: string | null): string {
  if (!start && !end) return "All time";
  return `${start ? formatRecordDate(start) : "…"} → ${end ? formatRecordDate(end) : "…"}`;
}
