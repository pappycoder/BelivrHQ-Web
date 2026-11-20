import { describe, expect, it } from "vitest";
import { PAPER_AREAS, flattenPaperNav } from "@/lib/paper-nav";
import { BESPOKE_TOUR_ROUTES, NAVIGATION_TOURS, resolveNavigationTour } from "./navigation-tour-definitions";

describe("workspace tour coverage", () => {
  it("covers every live navigation destination without replacing bespoke tours", () => {
    const missing = flattenPaperNav(PAPER_AREAS).map(({ leaf }) => leaf.href)
      .filter((href) => !BESPOKE_TOUR_ROUTES.has(href) && !resolveNavigationTour(href));
    expect(missing).toEqual([]);
  });

  it("keeps completed page tours out of dynamic detail matching", () => {
    for (const pathname of BESPOKE_TOUR_ROUTES) expect(resolveNavigationTour(pathname)).toBeUndefined();
  });

  it("resolves the requested details independently of nearby nav pages", () => {
    expect(resolveNavigationTour("/gatherings/events/event-1")?.page).toBe("Event details");
    expect(resolveNavigationTour("/gatherings/events/event-1/edit")?.page).toBe("Edit event");
    expect(resolveNavigationTour("/gatherings/attendance/services/service-1")?.page).toBe("Service details");
    expect(resolveNavigationTour("/gatherings/groups/dept-1")?.page).toBe("Department details");
    expect(resolveNavigationTour("/gatherings/groups/cell")?.page).toBe("Cell groups");
    expect(resolveNavigationTour("/gatherings/groups/cell/group-1")?.page).toBe("Cell group details");
    expect(resolveNavigationTour("/gatherings/groups/cell/group-1/unknown")).toBeUndefined();
  });

  it("does not mistake create or collection pages for individual records", () => {
    expect(resolveNavigationTour("/library/sermons/new")?.page).toBe("New sermon");
    expect(resolveNavigationTour("/library/sermons/series")?.page).toBe("Sermon series");
    expect(resolveNavigationTour("/library/forms/submissions")?.page).toBe("Form submissions");
    expect(resolveNavigationTour("/operations/assets/categories")?.page).toBe("Asset categories");
    expect(resolveNavigationTour("/unrelated")).toBeUndefined();
  });

  it("uses stable page-type identifiers and workspace-scoped targets", () => {
    const names = Object.values(NAVIGATION_TOURS).map((tour) => tour.page);
    expect(new Set(names).size).toBe(names.length);
    for (const tour of Object.values(NAVIGATION_TOURS)) {
      expect(tour.introduction.length).toBeGreaterThan(15);
      expect(tour.steps.length).toBeGreaterThan(0);
      for (const step of tour.steps) expect(step.target.startsWith("#main-content ")).toBe(true);
    }
  });
});
