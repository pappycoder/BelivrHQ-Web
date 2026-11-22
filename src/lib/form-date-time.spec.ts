import { expect, it } from "vitest";
import { toCalendarDate, withCalendarDate } from "./form-date-time";
import { readDateTime, writeDateTime } from "./wheel-date-time";

it.each(["0001-01-01", "0099-12-31", "1900-02-28", "2000-02-29", "2028-02-29"])("keeps calendar date %s local, including early years and leap days", value => {
  const parts = readDateTime("date", value);
  const date = toCalendarDate(parts);
  expect(date.getFullYear()).toBe(parts.year);
  expect(date.getMonth() + 1).toBe(parts.month);
  expect(date.getDate()).toBe(parts.day);
  expect(writeDateTime("date", withCalendarDate(parts, date))).toBe(value);
});
it("changes the selected calendar day without shifting its local time or seconds", () => {
  const initial = readDateTime("datetime-local", "2026-12-31T23:59:31");
  const day = toCalendarDate(readDateTime("date", "2028-02-29"));
  expect(writeDateTime("datetime-local", withCalendarDate(initial, day), true)).toBe("2028-02-29T23:59:31");
  expect(writeDateTime("datetime-local", initial, true)).toBe("2026-12-31T23:59:31");
});
