import { describe, expect, it } from "vitest";
import { TARGET_FIELDS } from "@/lib/member-import-template";
import { VISITOR_IMPORT_FIELDS } from "@/lib/visitor-import-template";
import { MEMBER_IMPORT_TOUR_STEPS } from "./member-import-steps";
import { VISITOR_IMPORT_TOUR_STEPS } from "./visitor-import-steps";

describe("people import guidance", () => {
  it("keeps required-name guidance aligned with the actual import fields", () => {
    expect(TARGET_FIELDS.filter((field) => field.required).map((field) => field.key)).toEqual(["firstName", "lastName"]);
    expect(VISITOR_IMPORT_FIELDS.filter((field) => field.required).map((field) => field.key)).toEqual(["firstName"]);
    const visitorFields = VISITOR_IMPORT_TOUR_STEPS.find((step) => step.target === ".people-import-columns")!;
    expect(visitorFields.description).toContain("First Name is required");
    expect(visitorFields.description).toContain("Last Name is optional");
  });

  it("uses the correct confirmation and return labels for each import", () => {
    expect(MEMBER_IMPORT_TOUR_STEPS.find((step) => step.target === ".people-import-review-actions")?.description).toContain("Import Members");
    expect(VISITOR_IMPORT_TOUR_STEPS.find((step) => step.target === ".people-import-review-actions")?.description).toContain("Import Visitors");
    expect(VISITOR_IMPORT_TOUR_STEPS.find((step) => step.target === ".people-import-back")?.description).toContain("Back to Visitors");
  });

  it("uses visitor page anchors while retaining the shared stage controls", () => {
    expect(VISITOR_IMPORT_TOUR_STEPS.some((step) => step.target === ".visitors-import-heading")).toBe(true);
    expect(VISITOR_IMPORT_TOUR_STEPS.some((step) => step.target.includes("members-import"))).toBe(false);
    expect(VISITOR_IMPORT_TOUR_STEPS.some((step) => step.target === ".people-import-map-actions")).toBe(true);
  });
});
