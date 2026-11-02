import { describe, expect, it } from "vitest";
import {
  dayKey,
  defaultEventDate,
  defaultServiceDate,
  eventOccursOn,
  localDayKey,
  nearestOccurrence,
  serviceOccursOn,
  shiftDay,
  stepOccurrence,
  weekdayOf,
} from "./schedule-occurrence";

// 2026-11-01 is a Sunday; 2026-11-02 is a Monday; 2026-08-01 is a Saturday.
const SUNDAY = "2026-11-01";
const MONDAY = "2026-11-02";
const SATURDAY = "2026-08-01";

describe("serviceOccursOn", () => {
  it("repeats weekly on the chosen weekday", () => {
    const schedule = { recurrence: "weekly", dayOfWeek: 0 };
    expect(serviceOccursOn(schedule, SUNDAY)).toBe(true);
    expect(serviceOccursOn(schedule, "2026-11-08")).toBe(true);
    expect(serviceOccursOn(schedule, MONDAY)).toBe(false);
  });

  it("defaults to weekly when recurrence is absent", () => {
    expect(serviceOccursOn({ dayOfWeek: 0 }, SUNDAY)).toBe(true);
  });

  it("treats a null weekday as any day", () => {
    expect(serviceOccursOn({ recurrence: "weekly", dayOfWeek: null }, MONDAY)).toBe(
      true,
    );
  });

  it("honours the optional weekly start/end window", () => {
    const schedule = {
      recurrence: "weekly",
      dayOfWeek: 0,
      startsOn: "2026-11-01",
      endsOn: "2026-11-15",
    };
    expect(serviceOccursOn(schedule, "2026-10-25")).toBe(false);
    expect(serviceOccursOn(schedule, SUNDAY)).toBe(true);
    expect(serviceOccursOn(schedule, "2026-11-15")).toBe(true);
    expect(serviceOccursOn(schedule, "2026-11-22")).toBe(false);
  });

  it("occurs only on the start date for one_time", () => {
    const schedule = { recurrence: "one_time", startsOn: SUNDAY };
    expect(serviceOccursOn(schedule, SUNDAY)).toBe(true);
    expect(serviceOccursOn(schedule, MONDAY)).toBe(false);
  });

  it("covers every inclusive day for multi_day", () => {
    const schedule = {
      recurrence: "multi_day",
      startsOn: "2026-11-01",
      endsOn: "2026-11-03",
    };
    expect(serviceOccursOn(schedule, "2026-10-31")).toBe(false);
    expect(serviceOccursOn(schedule, SUNDAY)).toBe(true);
    expect(serviceOccursOn(schedule, "2026-11-03")).toBe(true);
    expect(serviceOccursOn(schedule, "2026-11-04")).toBe(false);
  });

  it("never occurs when required dates are missing", () => {
    expect(serviceOccursOn({ recurrence: "one_time" }, SUNDAY)).toBe(false);
    expect(serviceOccursOn({ recurrence: "multi_day", startsOn: SUNDAY }, MONDAY)).toBe(
      false,
    );
  });
});

describe("eventOccursOn", () => {
  it("accepts every day inside the one-time window", () => {
    const schedule = {
      recurrence: "one_time",
      startDate: "2026-11-01T09:00:00.000Z",
      endDate: "2026-11-03T12:00:00.000Z",
    };
    expect(eventOccursOn(schedule, "2026-10-31")).toBe(false);
    expect(eventOccursOn(schedule, SUNDAY)).toBe(true);
    expect(eventOccursOn(schedule, "2026-11-03")).toBe(true);
    expect(eventOccursOn(schedule, "2026-11-04")).toBe(false);
  });

  it("accepts any later date for an open-ended one-time event", () => {
    const schedule = {
      recurrence: "one_time",
      startDate: "2026-11-01T09:00:00.000Z",
    };
    expect(eventOccursOn(schedule, SUNDAY)).toBe(true);
    expect(eventOccursOn(schedule, "2027-03-14")).toBe(true);
    expect(eventOccursOn(schedule, "2026-10-31")).toBe(false);
  });

  it("anchors weekly recurrence on the start date's weekday", () => {
    const schedule = {
      recurrence: "weekly",
      startDate: SATURDAY,
    };
    expect(eventOccursOn(schedule, SATURDAY)).toBe(true);
    expect(eventOccursOn(schedule, "2026-08-08")).toBe(true);
    expect(eventOccursOn(schedule, SUNDAY)).toBe(false);
  });

  it("stops weekly recurrence at the end date", () => {
    const schedule = {
      recurrence: "weekly",
      startDate: SATURDAY,
      endDate: "2026-08-15",
    };
    expect(eventOccursOn(schedule, "2026-08-15")).toBe(true);
    expect(eventOccursOn(schedule, "2026-08-22")).toBe(false);
  });
});

describe("occurrence defaults", () => {
  it("keeps today when it is valid", () => {
    expect(defaultServiceDate({ dayOfWeek: 1 }, MONDAY)).toBe(MONDAY);
    expect(
      defaultEventDate({ startDate: `${MONDAY}T09:00:00.000Z` }, MONDAY),
    ).toBe(MONDAY);
  });

  it("falls back to the most recent valid occurrence", () => {
    expect(defaultServiceDate({ dayOfWeek: 0 }, MONDAY)).toBe(SUNDAY);
  });

  it("looks forward when the only occurrence is in the future", () => {
    expect(
      defaultServiceDate({ recurrence: "one_time", startsOn: "2026-12-24" }, MONDAY),
    ).toBe("2026-12-24");
  });

  it("returns the starting day when nothing occurs", () => {
    expect(nearestOccurrence(() => false, MONDAY)).toBeNull();
    expect(defaultServiceDate({ recurrence: "one_time" }, MONDAY)).toBe(MONDAY);
  });

  it("steps to previous and next matching days", () => {
    const occurs = (date: string) => weekdayOf(date) === 0;
    expect(stepOccurrence(occurs, MONDAY, -1)).toBe(SUNDAY);
    expect(stepOccurrence(occurs, MONDAY, 1)).toBe("2026-11-08");
    expect(stepOccurrence(() => false, MONDAY, 1)).toBeNull();
  });
});

describe("day helpers", () => {
  it("formats local dates and shifts day keys", () => {
    expect(localDayKey(new Date(2026, 10, 2))).toBe(MONDAY);
    expect(shiftDay(MONDAY, -1)).toBe(SUNDAY);
    expect(shiftDay(SUNDAY, 7)).toBe("2026-11-08");
    expect(dayKey("2026-11-01T23:30:00.000Z")).toBe(SUNDAY);
  });

  it("reads weekdays from UTC day keys", () => {
    expect(weekdayOf(SUNDAY)).toBe(0);
    expect(weekdayOf(MONDAY)).toBe(1);
    expect(weekdayOf(SATURDAY)).toBe(6);
  });
});
