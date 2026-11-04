import { describe, it, expect } from "vitest";
import { projectGatherings } from "./event-calendar";
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
    // A one-time event sits on its exact day only — not the whole visible week.
    expect(both.has("2026-11-02")).toBe(false);
    const eventsOnly = projectGatherings([lateEvent], [service], week, { events: true, services: false });
    expect(eventsOnly.get("2026-11-01")?.map((entry) => entry.kind)).toEqual(["event"]);
    const servicesOnly = projectGatherings([lateEvent], [service], week, { events: false, services: true });
    expect(servicesOnly.get("2026-11-01")?.map((entry) => entry.kind)).toEqual(["service"]);
  });
});
