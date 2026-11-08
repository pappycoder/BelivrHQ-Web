import { describe, expect, it } from "vitest";
import { daysInMonth, isWheelPickerType, readDateTime, updateDateTime, writeDateTime } from "./wheel-date-time";

describe("wheel date/time values", () => {
  it("handles leap years, including century exceptions", () => {
    expect(daysInMonth(2000, 2)).toBe(29);
    expect(daysInMonth(1900, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 4)).toBe(30);
  });
  it("clamps a day when changing month or leaving a leap year", () => {
    const parts = readDateTime("date", "2028-01-31");
    const february = updateDateTime(parts, "month", 2);
    expect(writeDateTime("date", february)).toBe("2028-02-29");
    expect(writeDateTime("date", updateDateTime(february, "year", 2029))).toBe("2029-02-28");
    expect(parts.day).toBe(31);
  });
  it.each([
    ["date", "2026-01-01"], ["date", "0001-01-01"],
    ["time", "00:05"], ["time", "23:59"],
    ["datetime-local", "2026-12-31T23:59"],
  ] as const)("round trips local %s values without a timezone conversion", (type, value) => {
    expect(writeDateTime(type, readDateTime(type, value))).toBe(value);
  });
  it("retains seconds when requested and uses local components for an empty field", () => {
    expect(writeDateTime("time", readDateTime("time", "12:34:56"), true)).toBe("12:34:56");
    expect(writeDateTime("datetime-local", readDateTime("datetime-local", "", new Date(2026, 0, 1, 23, 5)))).toBe("2026-01-01T23:05");
  });
  it("limits custom picker interception to supported native date/time types", () => {
    expect(isWheelPickerType("date")).toBe(true);
    expect(isWheelPickerType("time")).toBe(true);
    expect(isWheelPickerType("datetime-local")).toBe(true);
    expect(isWheelPickerType("text")).toBe(false);
    expect(isWheelPickerType(undefined)).toBe(false);
  });
});
