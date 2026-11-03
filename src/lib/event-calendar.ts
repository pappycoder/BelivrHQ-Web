import { eachDayOfInterval, format, isSameDay } from "date-fns";
import type { EventItem } from "@/hooks/use-events";
import type { ChurchService } from "@/hooks/use-attendance";
import {
  eventOccursOn,
  localDayKey,
  serviceOccursOn,
  type ServiceSchedule,
} from "@/lib/schedule-occurrence";

export type CalendarEntry = {
  id: string;
  title: string;
  start: Date;
  end?: Date;
} & (
  { type: "event"; item: EventItem } | { type: "service"; item: ChurchService }
);

/** Loaded records only. Preserve event start-day and local recurring-service semantics. */
export function calendarEntries(
  events: EventItem[],
  services: ChurchService[],
  start: Date,
  end: Date,
): CalendarEntry[] {
  const items: CalendarEntry[] = events.map((item) => ({
    id: `event-${item.eventId}`,
    title: item.title,
    start: new Date(item.startDate),
    end: item.endDate ? new Date(item.endDate) : undefined,
    type: "event",
    item,
  }));
  for (const day of eachDayOfInterval({ start, end })) {
    for (const item of services) {
      if (
        item.dayOfWeek == null ||
        !item.isActive ||
        day.getDay() !== item.dayOfWeek
      )
        continue;
      const at = (time: string) => {
        const [hours, minutes] = time.split(":").map(Number);
        const date = new Date(day);
        date.setHours(hours, minutes, 0, 0);
        return date;
      };
      items.push({
        id: `svc-${item.serviceId}-${format(day, "yyyy-MM-dd")}`,
        title: item.name,
        start: at(item.startTime || "09:00"),
        end: item.endTime ? at(item.endTime) : undefined,
        type: "service",
        item,
      });
    }
  }
  return items.sort((a, b) => a.start.getTime() - b.start.getTime());
}
export function entriesForDay(entries: CalendarEntry[], day: Date) {
  return entries.filter((entry) => isSameDay(entry.start, day));
}

/** A dated row for the Paper calendar grid: an event or a projected service occurrence. */
export type GatheringEntry = { id: string; title: string; day: string; at: Date } & (
  | { kind: "event"; event: EventItem }
  | { kind: "service"; service: ChurchService }
);

/** Schedule fields of a service record, ready for the occurrence maths. */
export function serviceSchedule(s: ChurchService): ServiceSchedule {
  return {
    recurrence: s.recurrence,
    dayOfWeek: s.dayOfWeek,
    startsOn: s.startsOn,
    endsOn: s.endsOn,
  };
}

/** Place a service's clock time on a specific calendar day (default 09:00, like the legacy calendar). */
export function serviceTimeOn(day: string, startTime?: string): Date {
  const [hours, minutes] = (startTime || "09:00").split(":").map(Number);
  const d = new Date(`${day}T00:00:00`);
  d.setHours(hours || 9, minutes || 0, 0, 0);
  return d;
}

/**
 * Project events and active services onto the visible calendar days using the
 * same occurrence rules the check-in desks enforce (`eventOccursOn` /
 * `serviceOccursOn`), keyed by local `YYYY-MM-DD`. Each occurrence carries the
 * source record's clock time.
 */
export function projectGatherings(
  events: readonly EventItem[],
  services: readonly ChurchService[],
  days: readonly Date[],
  include: { events: boolean; services: boolean },
): Map<string, GatheringEntry[]> {
  const map = new Map<string, GatheringEntry[]>();
  const push = (key: string, entry: GatheringEntry) =>
    map.set(key, [...(map.get(key) ?? []), entry]);
  for (const day of days) {
    const key = localDayKey(day);
    if (include.events) {
      for (const event of events) {
        if (!eventOccursOn({ recurrence: event.recurrence, startDate: event.startDate, endDate: event.endDate }, key)) continue;
        const start = new Date(event.startDate);
        if (Number.isNaN(start.getTime())) continue;
        const at = new Date(`${key}T00:00:00`);
        at.setHours(start.getHours(), start.getMinutes(), 0, 0);
        push(key, { id: `event-${event.eventId}-${key}`, title: event.title, day: key, at, kind: "event", event });
      }
    }
    if (include.services) {
      for (const service of services) {
        if (!service.isActive || service.archivedAt) continue;
        if (!serviceOccursOn(serviceSchedule(service), key)) continue;
        push(key, { id: `service-${service.serviceId}-${key}`, title: service.name, day: key, at: serviceTimeOn(key, service.startTime), kind: "service", service });
      }
    }
  }
  for (const list of map.values()) list.sort((a, b) => a.at.getTime() - b.at.getTime());
  return map;
}
