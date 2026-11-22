import type { TourStep } from "./page-tour";
import { MEMBER_IMPORT_TOUR_STEPS } from "./member-import-steps";

// Both imports use the same stage controls, but visitors require only a first name.
function visitorWording(value: string) {
  return value.replace(/\bMembers\b/g, "Visitors").replace(/\bmembers\b/g, "visitors")
    .replace(/\bMember\b/g, "Visitor").replace(/\bmember\b/g, "visitor");
}

export const VISITOR_IMPORT_TOUR_STEPS: TourStep[] = MEMBER_IMPORT_TOUR_STEPS.map((step) => {
  const result = {
    target: step.target.replaceAll("members-import", "visitors-import"),
    title: visitorWording(step.title),
    description: visitorWording(step.description),
  };
  if (step.target === ".people-import-columns") {
    result.description = "First Name is required for visitor imports; Last Name is optional. Check the supported contact fields and First Visit Date. Use an exact available branch name for Branch, and keep dates in YYYY-MM-DD format.";
  }
  if (step.target === ".people-import-map [data-import-field='firstName']") {
    result.title = "Map the required first name";
    result.description = "First Name must point to the correct spreadsheet column. Last Name is optional for visitors. A mapped column can still contain empty cells, so review row validation before importing.";
  }
  return result;
});
