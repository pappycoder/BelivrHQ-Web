import { describe, expect, it } from "vitest";
import { formatRecordDate, formatRecordDateTime, formatRecordDateRange } from "./record-date";

describe("record date presentation", () => {
  it("preserves calendar days rather than shifting them with a timestamp offset", () => {
    expect(formatRecordDate("2026-11-20")).toBe("20 Nov 2026");
    expect(formatRecordDate("2026-11-20T23:30:00-08:00")).toBe("20 Nov 2026");
    expect(formatRecordDate("2024-02-29")).toBe("29 Feb 2024");
  });
  it("handles missing and invalid calendar values without misleading rollover dates", () => {
    for (const value of [null, undefined, "", "bad-date", "2026-02-29", "2026-04-31", "2026-13-01"]) {
      expect(formatRecordDate(value)).toBe("Not available");
    }
    expect(formatRecordDate(null, "—")).toBe("—");
  });
  it("formats instants in the requested timezone across a day boundary", () => {
    expect(formatRecordDateTime("2026-11-20T23:30:00Z", "Africa/Lagos")).toBe("21 Nov 2026, 00:30");
    expect(formatRecordDateTime("2026-11-20T23:30:00Z", "UTC")).toBe("20 Nov 2026, 23:30");
    expect(formatRecordDateTime("bad-date", "UTC")).toBe("Not available");
    expect(formatRecordDateTime(null, "UTC")).toBe("Not available");
  });
});

it("formats Date objects using their local calendar day", () => {
  expect(formatRecordDate(new Date(2026, 10, 20, 23, 30))).toBe("20 Nov 2026");
  expect(formatRecordDate(new Date("invalid"))).toBe("Not available");
});
it("uses the same record-date presentation for report bounds", () => {
  expect(formatRecordDateRange("2026-01-01", "2026-11-21")).toBe("1 Jan 2026 → 21 Nov 2026");
  expect(formatRecordDateRange("2024-02-29", "2024-03-01")).toBe("29 Feb 2024 → 1 Mar 2024");
  expect(formatRecordDateRange()).toBe("All time");
  expect(formatRecordDateRange("2026-11-20")).toBe("20 Nov 2026 → …");
  expect(formatRecordDateRange(undefined, "2026-11-20")).toBe("… → 20 Nov 2026");
  expect(formatRecordDateRange("invalid", "2026-11-20")).toBe("Not available → 20 Nov 2026");
});
