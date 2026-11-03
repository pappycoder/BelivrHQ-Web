import { describe, it, expect } from "vitest";
import {
  calendarEntries,
  entriesForDay,
  projectGatherings,
} from "./event-calendar";
import type { ChurchService } from "@/hooks/use-attendance";
import type { EventItem } from "@/hooks/use-events";

const service = {
  serviceId: "sunday",
  name: "Sunday worship",
  dayOfWeek: 0,
  isActive: true,
  startTime: "09:30",
  endTime: "11:00",
} as ChurchService;
describe("loaded event calendar projection", () => {
  it("includes Sunday zero and adjacent-month occurrences within the displayed range", () => {
    const result = calendarEntries(
      [],
      [service],
      new Date(2026, 9, 25),
      new Date(2026, 10, 7),
    );
    expect(result).toHaveLength(2);
    expect(result.map((item) => item.start.getDate())).toEqual([25, 1]);
    expect(result[0].start.getHours()).toBe(9);
    expect(result[0].end?.getHours()).toBe(11);
    expect(new Set(result.map((item) => item.id)).size).toBe(2);
  });
  it("excludes inactive and unspecified weekdays without inventing occurrences", () => {
    expect(
      calendarEntries(
        [],
        [
          { ...service, isActive: false },
          { ...service, dayOfWeek: undefined },
        ],
        new Date(2026, 10, 1),
        new Date(2026, 10, 7),
      ),
    ).toEqual([]);
  });
  it("sorts agenda entries and keeps events on their existing start day", () => {
    const event = {
      eventId: "event",
      title: "Conference",
      startDate: new Date(2026, 10, 1, 8).toISOString(),
      endDate: new Date(2026, 10, 2, 15).toISOString(),
      type: "conference",
    } as EventItem;
    const entries = calendarEntries(
      [event],
      [service],
      new Date(2026, 10, 1),
      new Date(2026, 10, 2),
    );
    expect(
      entriesForDay(entries, new Date(2026, 10, 1)).map((item) => item.title),
    ).toEqual(["Conference", "Sunday worship"]);
    expect(entriesForDay(entries, new Date(2026, 10, 2))).toEqual([]);
  });
});

describe("paper calendar occurrence projection", () => {
  const week: Date[] = Array.from({ length: 7 }, (_, i) => new Date(2026, 10, 1 + i));

  const weeklyEvent = {
    eventId: "rev",
    title: "Wednesday bible study",
    // Sunday 12:00, repeating weekly through the 15th.
    startDate: new Date(2026, 10, 1, 12).toISOString(),
    endDate: new Date(2026, 10, 15, 12).toISOString(),
    recurrence: "weekly",
    type: "service",
  } as EventItem;

  it("projects weekly services onto every matching weekday", () => {
    const map = projectGatherings([], [service], week, { events: false, services: true });
    expect([...map.keys()]).toEqual(["2026-11-01"]);
    const entries = map.get("2026-11-01")!;
    expect(entries[0]).toMatchObject({ kind: "service", title: "Sunday worship" });
    expect(entries[0].at.getHours()).toBe(9);
    expect(entries[0].at.getMinutes()).toBe(30);
  });

  it("keeps one-time services on their exact date and hides inactive or archived ones", () => {
    const oneTime = {
      ...service,
      recurrence: "one_time",
      startsOn: "2026-11-03",
      dayOfWeek: undefined,
    } as ChurchService;
    const map = projectGatherings([], [
      oneTime,
      { ...oneTime, serviceId: "off", isActive: false },
      { ...oneTime, serviceId: "arch", archivedAt: "2026-11-01T00:00:00.000Z" },
    ], week, { events: false, services: true });
    expect([...map.keys()]).toEqual(["2026-11-03"]);
  });

  it("repeats weekly events across matching weekdays inside their window", () => {
    const map = projectGatherings([weeklyEvent], [], week, { events: true, services: false });
    // Only Sunday the 1st sits inside the visible 1–7 November week.
    expect([...map.keys()]).toEqual(["2026-11-01"]);
    const nextWeek = Array.from({ length: 7 }, (_, i) => new Date(2026, 10, 8 + i));
    const second = projectGatherings([weeklyEvent], [], nextWeek, { events: true, services: false });
    expect([...second.keys()]).toEqual(["2026-11-08"]);
  });

  it("sorts each day by time and honours the include flags", () => {
    const lateEvent = {
      eventId: "eve",
      title: "Evening service",
      startDate: new Date(2026, 10, 1, 18).toISOString(),
      type: "service",
    } as EventItem;
    const both = projectGatherings([lateEvent], [service], week, { events: true, services: true });
    expect(both.get("2026-11-01")?.map((entry) => entry.title)).toEqual([
      "Sunday worship",
      "Evening service",
    ]);
    const eventsOnly = projectGatherings([lateEvent], [service], week, { events: true, services: false });
    expect(eventsOnly.get("2026-11-01")?.map((entry) => entry.kind)).toEqual(["event"]);
    const servicesOnly = projectGatherings([lateEvent], [service], week, { events: false, services: true });
    expect(servicesOnly.get("2026-11-01")?.map((entry) => entry.kind)).toEqual(["service"]);
  });
});
