import { describe, expect, it } from "vitest";
import type { EventItem } from "@/hooks/use-events";
import { nextEventOccurrence, upcomingEvents } from "./upcoming-events";

const now = new Date("2026-11-21T14:00:00");
const event = (overrides: Partial<EventItem> = {}): EventItem => ({
  eventId: "event", churchId: "church", title: "Gathering", type: "conference",
  startDate: "2026-11-01T10:00:00", recurrence: "one_time", isFree: true,
  registrationCount: 0, createdAt: "2026-11-01", updatedAt: "2026-11-01", ...overrides,
});

describe("dashboard upcoming gatherings", () => {
  it("omits completed one-time and archived gatherings", () => {
    expect(nextEventOccurrence(event(), now)).toBeNull();
    expect(nextEventOccurrence(event({ startDate: "2026-12-01T10:00:00", archivedAt: "2026-11-20" }), now)).toBeNull();
  });
  it("keeps an ongoing one-time gathering until its explicit end", () => {
    const ongoing = event({ startDate: "2026-11-21T13:00:00", endDate: "2026-11-21T16:00:00" });
    expect(nextEventOccurrence(ongoing, now)).toEqual(new Date(ongoing.startDate));
    expect(nextEventOccurrence(ongoing, new Date("2026-11-21T16:00:01"))).toBeNull();
  });
  it("projects a weekly gathering's next date instead of its past original start", () => {
    expect(nextEventOccurrence(event({ recurrence: "weekly" }), now)).toEqual(new Date("2026-11-22T10:00:00"));
  });
  it("advances an already-started weekly occurrence by one week", () => {
    expect(nextEventOccurrence(event({ recurrence: "weekly" }), new Date("2026-11-22T11:00:00"))).toEqual(new Date("2026-11-29T10:00:00"));
  });
  it("respects recurrence windows and handles a start far beyond the current week", () => {
    expect(nextEventOccurrence(event({ recurrence: "weekly", endDate: "2026-11-15T12:00:00" }), now)).toBeNull();
    expect(nextEventOccurrence(event({ recurrence: "weekly", startDate: "2027-04-04T10:00:00" }), now)).toEqual(new Date("2027-04-04T10:00:00"));
  });
  it("projects a bounded daily gathering and stops after its window", () => {
    const range = event({ recurrence: "multi_day", startDate: "2026-11-19T10:00:00", endDate: "2026-11-23T18:00:00" });
    expect(nextEventOccurrence(range, now)).toEqual(new Date("2026-11-22T10:00:00"));
    expect(nextEventOccurrence(range, new Date("2026-11-24T09:00:00"))).toBeNull();
  });
  it("omits malformed dates without breaking the dashboard", () => {
    expect(nextEventOccurrence(event({ startDate: "invalid" }), now)).toBeNull();
    expect(nextEventOccurrence(event({ endDate: "invalid" }), now)).toBeNull();
  });
  it("sorts by projected occurrence and limits without mutating the source", () => {
    const rows = [event({ eventId: "later", startDate: "2026-12-20T10:00:00" }), event({ eventId: "weekly", recurrence: "weekly" }), event({ eventId: "past" })];
    expect(upcomingEvents(rows, now, 1).map(row => row.event.eventId)).toEqual(["weekly"]);
    expect(rows.map(row => row.eventId)).toEqual(["later", "weekly", "past"]);
  });
});
