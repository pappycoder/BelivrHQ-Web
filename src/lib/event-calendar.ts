import type { EventItem } from "@/hooks/use-events";
import type { ChurchService } from "@/hooks/use-attendance";
import {
  eventOccursOn,
  localDayKey,
  serviceOccursOn,
  type ServiceSchedule,
} from "@/lib/schedule-occurrence";

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
