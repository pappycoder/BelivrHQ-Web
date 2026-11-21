import { describe, expect, it } from "vitest";
import { formatStatusLabel } from "./status-label";

describe("status display labels", () => {
  it.each([
    ["active", "Active"], ["SUCCESS", "Success"], ["pending_verification", "Pending verification"],
    ["needsReview", "Needs review"], ["partially-refunded", "Partially refunded"],
    ["  in_progress  ", "In progress"], ["follow_up_scheduled", "Follow up scheduled"],
    ["used", "Used"], ["open", "Open"], ["failed", "Failed"],
  ])("makes %s readable without exposing enum separators", (value, label) => {
    expect(formatStatusLabel(value)).toBe(label);
  });
  it("handles unavailable values consistently", () => {
    for (const value of [undefined, null, "", "  ", "___"]) expect(formatStatusLabel(value)).toBe("Not available");
    expect(formatStatusLabel(null, "Unknown")).toBe("Unknown");
  });
});
