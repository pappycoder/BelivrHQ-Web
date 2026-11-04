/**
 * Client mirror of the backend's service/event occurrence maths.
 *
 * The API is authoritative — every check-in rejects dates the schedule does
 * not meet on — but the picker needs the same arithmetic to restrict the
 * calendar, default to the nearest valid day and step through occurrences.
 */

import { addDays, format } from "date-fns";

/** Recurrence modes a service schedule can use. */
export const SCHEDULE_RECURRENCES = ["weekly", "one_time", "multi_day"] as const;
export type ScheduleRecurrence = (typeof SCHEDULE_RECURRENCES)[number];

/** Events happen once, repeat weekly, or run across a bounded multi-day window. */
export const EVENT_RECURRENCES = ["one_time", "weekly", "multi_day"] as const;
export type EventRecurrence = (typeof EVENT_RECURRENCES)[number];

export const SCHEDULE_RECURRENCE_LABELS: Record<ScheduleRecurrence, string> = {
  weekly: "Every week",
  one_time: "One-time",
  multi_day: "Date range",
};

export const EVENT_RECURRENCE_LABELS: Record<EventRecurrence, string> = {
  one_time: "One-time",
  weekly: "Every week",
  multi_day: "Date range",
};

export interface ServiceSchedule {
  recurrence?: string | null;
  dayOfWeek?: number | null;
  startsOn?: string | null;
  endsOn?: string | null;
}

export interface EventSchedule {
  recurrence?: string | null;
  startDate: string;
  endDate?: string | null;
}

/** Normalises a Date or ISO/date string to a UTC day key (`YYYY-MM-DD`). */
export function dayKey(value: Date | string): string {
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    return new Date(value).toISOString().slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}

/** The calendar day a local Date sits on (for DayPicker cells). */
export function localDayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Today's local calendar day. */
export function todayKey(now: Date = new Date()): string {
  return localDayKey(now);
}

/** Weekday (0 = Sunday) for a UTC day key. */
export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00.000Z`).getUTCDay();
}

/** Adds (or subtracts) calendar days from a day key. */
export function shiftDay(date: string, days: number): string {
  return format(addDays(new Date(`${date}T00:00:00`), days), "yyyy-MM-dd");
}

/**
 * Whether a service meets on the supplied calendar day.
 *
 * - weekly: every matching `dayOfWeek` inside the optional `[startsOn, endsOn]`
 *   window. A null weekday means any day.
 * - one_time: exactly `startsOn`.
 * - multi_day: every day from `startsOn` through `endsOn` inclusive.
 */
export function serviceOccursOn(schedule: ServiceSchedule, date: string): boolean {
  const recurrence = (schedule.recurrence || "weekly") as ScheduleRecurrence;
  const start = schedule.startsOn ? dayKey(schedule.startsOn) : null;
  const end = schedule.endsOn ? dayKey(schedule.endsOn) : null;

  if (start && date < start) return false;
  if (end && date > end) return false;

  if (recurrence === "one_time") return start !== null && date === start;
  if (recurrence === "multi_day")
    return start !== null && end !== null && date >= start && date <= end;

  if (schedule.dayOfWeek == null) return true;
  return weekdayOf(date) === schedule.dayOfWeek;
}

/**
 * Whether an event occurs on the supplied calendar day.
 *
 * - one_time: exactly the day of `startDate` (a same-day `endDate` only
 *   carries the end time — multi-day windows are `multi_day`).
 * - multi_day: every day from `startDate` through `endDate` inclusive.
 * - weekly: the same weekday as `startDate`, from `startDate` through
 *   `endDate` when present, otherwise indefinitely.
 */
export function eventOccursOn(schedule: EventSchedule, date: string): boolean {
  const start = dayKey(schedule.startDate);
  const end = schedule.endDate ? dayKey(schedule.endDate) : null;

  if (date < start) return false;
  if (end && date > end) return false;

  const recurrence = (schedule.recurrence || "one_time") as EventRecurrence;
  if (recurrence === "weekly") return weekdayOf(date) === weekdayOf(start);
  if (recurrence === "multi_day") return end !== null && date >= start && date <= end;

  return date === start;
}

/**
 * The closest valid day to `from`, preferring the past so backfill is the
 * default. Returns `null` when no occurrence exists within the search window.
 */
export function nearestOccurrence(
  occursOn: (date: string) => boolean,
  from: string,
  lookaround = 730,
): string | null {
  if (occursOn(from)) return from;
  for (let i = 1; i <= lookaround; i += 1) {
    const past = shiftDay(from, -i);
    if (occursOn(past)) return past;
  }
  for (let i = 1; i <= lookaround; i += 1) {
    const future = shiftDay(from, i);
    if (occursOn(future)) return future;
  }
  return null;
}

/** Steps to the next (`1`) or previous (`-1`) valid day. */
export function stepOccurrence(
  occursOn: (date: string) => boolean,
  from: string,
  direction: -1 | 1,
  lookaround = 730,
): string | null {
  for (let i = 1; i <= lookaround; i += 1) {
    const candidate = shiftDay(from, direction * i);
    if (occursOn(candidate)) return candidate;
  }
  return null;
}

/** Date the service check-in should open on: today if valid, else the nearest. */
export function defaultServiceDate(
  schedule: ServiceSchedule,
  from: string = todayKey(),
): string {
  return (
    nearestOccurrence((date) => serviceOccursOn(schedule, date), from) ?? from
  );
}

/** Date the event check-in should open on: today if valid, else the nearest. */
export function defaultEventDate(
  schedule: EventSchedule,
  from: string = todayKey(),
): string {
  return nearestOccurrence((date) => eventOccursOn(schedule, date), from) ?? from;
}
