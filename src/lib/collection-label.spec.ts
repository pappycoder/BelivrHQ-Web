import { expect, it } from "vitest";
import { collectionLabel } from "./collection-label";

it.each([
  ["records", "record"], ["templates", "template"], ["people", "person"],
  ["children", "child"], ["branches", "branch"], ["churches", "church"],
  ["families", "family"], ["categories", "category"], ["series", "series"],
  ["cell groups", "cell group"], ["maintenance jobs", "maintenance job"],
  ["tiers", "tier"], ["rows", "row"], ["columns", "column"], ["filters", "filter"], ["questions", "question"], ["gifts", "gift"], ["seats", "seat"], ["registrations", "registration"], ["invitations", "invitation"], ["staff accounts", "staff account"], ["guides", "guide"], ["destinations", "destination"], ["responses", "response"], ["periods", "period"], ["visits", "visit"],
  ["check-ins", "check-in"], ["first-timers", "first-timer"],
  ["service headcount records", "service headcount record"], ["feature surfaces", "feature surface"],
  ["statuses", "status"], ["Messages", "Message"],
])("uses the right collection label for %s", (plural, singular) => {
  expect(collectionLabel(1, plural)).toBe(singular);
  expect(collectionLabel(0, plural)).toBe(plural);
  expect(collectionLabel(2, plural)).toBe(plural);
});
it("allows an explicit singular noun for unusual collection labels", () => {
  expect(collectionLabel(1, "alumni", "alumnus")).toBe("alumnus");
});
