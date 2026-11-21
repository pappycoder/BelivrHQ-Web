import type { EventItem } from "@/hooks/use-events";
import { dayKey, eventOccursOn, localDayKey, shiftDay } from "./schedule-occurrence";

type Schedule = Pick<EventItem, "startDate" | "endDate" | "recurrence" | "archivedAt">;

/** Next calendar occurrence, retaining an ongoing one-time gathering until its end. */
export function nextEventOccurrence(event: Schedule, now: Date): Date | null {
  const start = new Date(event.startDate);
  const end = event.endDate ? new Date(event.endDate) : null;
  if (event.archivedAt || !Number.isFinite(+start) || (end && !Number.isFinite(+end))) return null;
  if (!event.recurrence || event.recurrence === "one_time") {
    return +(end && +end >= +start ? end : start) >= +now ? start : null;
  }

  // Use the same day boundaries as the calendar/check-in schedule contract.
  const firstDay = [localDayKey(now), dayKey(event.startDate)].sort().at(-1)!;
  for (let offset = 0; offset < 14; offset++) {
    const day = shiftDay(firstDay, offset);
    if (!eventOccursOn(event, day)) continue;
    const at = new Date(`${day}T00:00:00`);
    at.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds());
    if (+at >= +now) return at;
  }
  return null;
}

export function upcomingEvents(events: readonly EventItem[], now: Date, limit = 4) {
  return events.flatMap(event => {
    const at = nextEventOccurrence(event, now);
    return at ? [{ event, at }] : [];
  }).sort((a, b) => +a.at - +b.at).slice(0, limit);
}
