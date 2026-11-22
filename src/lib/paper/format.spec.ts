import { describe, expect, it } from "vitest";
import { ageGroupLabel, chartTick, engagementLabel, shortDate, longDate, dayMonth } from "./format";

describe("chart tick labels", () => {
  it("distinguishes neighbouring ticks in the giving overview", () => {
    expect([0, 500, 1000, 1500, 2000].map(chartTick)).toEqual(["0", "500", "1k", "1.5k", "2k"]);
  });
  it("retains half and quarter thousands instead of rounding", () => {
    expect([2500, 2750, 5000, 7500, 10000].map(chartTick)).toEqual(["2.5k", "2.75k", "5k", "7.5k", "10k"]);
  });
  it("handles signed values, large units and unscaled fractional ticks", () => {
    expect([-1500, 0.75, 1250000, 1500000000, 2500000000000].map(chartTick)).toEqual(["-1.5k", "0.75", "1.25m", "1.5b", "2.5t"]);
  });
  it("preserves category labels", () => {
    expect(chartTick("Sunday")).toBe("Sunday");
  });
});

describe("age group labels", () => {
  it("names all API age bands without exposing storage keys", () => {
    expect(["under_18", "age_18_30", "age_31_45", "age_46_60", "age_60_plus", "unspecified"].map(ageGroupLabel))
      .toEqual(["Under 18", "18–30", "31–45", "46–60", "Over 60", "Not specified"]);
  });
  it("keeps unexpected labels readable", () => {
    expect(ageGroupLabel("new_age_band")).toBe("New age band");
    expect(ageGroupLabel("18–25")).toBe("18–25");
  });
});

describe("engagement labels", () => {
  it("turns stored engagement buckets into readable chart labels", () => {
    expect(["highlyEngaged", "moderatelyEngaged", "lowEngaged", "disengaged"].map(engagementLabel))
      .toEqual(["Highly engaged", "Moderately engaged", "Low engagement", "Disengaged"]);
  });
  it("formats an unknown bucket without exposing camel case or underscores", () => {
    expect(engagementLabel("newEngagement_bucket")).toBe("New engagement bucket");
  });
});

it("keeps abbreviated and contextual dates in day-month order", () => {
  expect(shortDate("2026-11-20")).toBe("20 Nov");
  expect(dayMonth("2026-11-20")).toBe("Fri, 20 Nov");
  expect(longDate("2026-11-20")).toBe("Friday, 20 November");
});
