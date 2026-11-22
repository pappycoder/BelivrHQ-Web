import { afterEach, expect, it, vi } from "vitest";
import { reportRangeParams } from "./report-range";

afterEach(() => vi.unstubAllEnvs());

it.each(["Africa/Lagos", "America/Los_Angeles", "Europe/London"])("preserves month, quarter and current calendar days in %s", zone => {
  vi.stubEnv("TZ", zone);
  const now = new Date(2026, 10, 21, 0, 30);
  expect(reportRangeParams("This month", now)).toEqual({ startDate: "2026-11-01", endDate: "2026-11-21" });
  expect(reportRangeParams("This quarter", now)).toEqual({ startDate: "2026-10-01", endDate: "2026-11-21" });
  expect(reportRangeParams("Year to date", now)).toEqual({ startDate: "2026-01-01", endDate: "2026-11-21" });
  expect(reportRangeParams("All time", now)).toEqual({});
});
it("handles the first day of the year and leap-day month bounds", () => {
  vi.stubEnv("TZ", "Africa/Lagos");
  expect(reportRangeParams("This quarter", new Date(2026, 0, 1))).toEqual({ startDate: "2026-01-01", endDate: "2026-01-01" });
  expect(reportRangeParams("This month", new Date(2024, 1, 29))).toEqual({ startDate: "2024-02-01", endDate: "2024-02-29" });
});
