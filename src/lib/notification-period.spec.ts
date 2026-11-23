import { describe, expect, it } from "vitest";
import { notificationPeriod } from "./notification-period";
describe("notification periods", () => {
  const now = new Date(2026, 0, 1, 12);
  it("groups by local calendar day across the year boundary", () => {
    expect(notificationPeriod(new Date(2026, 0, 1, 0).toISOString(), now)).toBe("Today");
    expect(notificationPeriod(new Date(2025, 11, 31, 23, 59).toISOString(), now)).toBe("Yesterday");
    expect(notificationPeriod(new Date(2025, 11, 30, 23, 59).toISOString(), now)).toBe("Earlier");
  });
  it("handles invalid dates without throwing", () => expect(notificationPeriod("invalid", now)).toBe("Earlier"));
});
