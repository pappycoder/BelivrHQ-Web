import { describe, expect, it } from "vitest";
import { monthlyGivingEstimate } from "./recurring-giving";

describe("monthly recurring-giving estimate", () => {
  it("annualizes weekly charges instead of dividing the charge by four", () => {
    expect(monthlyGivingEstimate([{ amount: 25000, frequency: "weekly", isActive: true }])).toBe(108333);
  });
  it("retains monthly amounts, averages quarterly charges and excludes paused gifts", () => {
    expect(monthlyGivingEstimate([
      { amount: 12000, frequency: "monthly", isActive: true },
      { amount: 30000, frequency: "quarterly", isActive: true },
      { amount: 900000, frequency: "weekly", isActive: false },
    ])).toBe(22000);
  });
  it("rounds the combined estimate once and handles an empty register", () => {
    expect(monthlyGivingEstimate(Array.from({ length: 3 }, () => ({ amount: 100, frequency: "quarterly" as const, isActive: true })))).toBe(100);
    expect(monthlyGivingEstimate([])).toBe(0);
  });
});
