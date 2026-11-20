import { describe, expect, it } from "vitest";
import { formatRecordDate, formatRecordDateTime } from "./record-date";

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
