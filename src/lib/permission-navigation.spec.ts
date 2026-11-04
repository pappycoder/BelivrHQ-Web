import { describe, it, expect } from "vitest";
import { filterPermissionNavigation } from "./permission-navigation";
import { activeLeafHref } from "./paper-nav";

describe("permission-driven navigation", () => {
  const menu = [
    { title: "Events", permission: "events:calendar:read", children: [
      { title: "Calendar", permission: "events:calendar:read" },
      { title: "All Events", permission: "events:all:read" },
    ] },
    { title: "Members", permission: "members:all:read" },
    { title: "Empty group", children: [{ title: "Private", permission: "private:read" }] },
  ];

  it("retains the filtered child list and removes empty groups", () => {
    const filtered = filterPermissionNavigation(menu, (name) => name === "events:calendar:read");
    expect(filtered.map((item) => item.title)).toEqual(["Events"]);
    expect(filtered[0].children?.map((item) => item.title)).toEqual(["Calendar"]);
    expect(menu[0].children).toHaveLength(2);
  });

  it("keeps a permitted child reachable without an unrelated parent grant", () => {
    const filtered = filterPermissionNavigation(menu, (name) => name === "events:all:read");
    expect(filtered.map((item) => item.title)).toEqual(["Events"]);
    expect(filtered[0].children?.map((item) => item.title)).toEqual(["All Events"]);
  });

  it("does not suppress broader grants when the user also has own-record access", () => {
    const grants = new Set(["members:own:read", "members:all:read", "events:calendar:read", "events:all:read"]);
    const filtered = filterPermissionNavigation(menu, (name) => grants.has(name));
    expect(filtered.map((item) => item.title)).toEqual(["Events", "Members"]);
    expect(filtered[0].children).toHaveLength(2);
  });
});

describe("compound navigation requirements", () => {
  it("requires the API read capability as well as the administration entry grant", () => {
    const entries = [{ title: "Users", permission: "users:read", allOf: ["profiles:read"] }];
    expect(filterPermissionNavigation(entries, (name) => name === "users:read")).toEqual([]);
    expect(filterPermissionNavigation(entries, (name) => name === "profiles:read")).toEqual([]);
    expect(filterPermissionNavigation(entries, () => true)).toEqual(entries);
  });
  it("opens reports with an individual report-read grant", () => {
    const entries = [{ title: "Reports", permission: "reports:view", anyOf: ["reports:financial:read"] }];
    expect(filterPermissionNavigation(entries, (name) => name === "reports:financial:read")).toEqual(entries);
    expect(filterPermissionNavigation(entries, () => false)).toEqual([]);
  });
});

it('recursively filters higher-plan leaves while preserving permitted sibling pages', () => {
  const menus = [{ href:'/events', children:[{href:'/events/registrations'},{href:'/events/management'}] }, {href:'/departments',children:[{href:'/departments/cell-groups'}]}];
  const result = filterPermissionNavigation(menus, () => true, path => !['/events/management','/departments/cell-groups'].includes(path));
  expect(result).toEqual([{href:'/events',children:[{href:'/events/registrations'}]}]);
});

describe("single active nav leaf", () => {
  const areas = [
    {
      id: "gatherings",
      label: "Gatherings",
      href: "/gatherings",
      children: [
        {
          title: "Attendance",
          href: "/gatherings/attendance",
          children: [
            { title: "Overview", href: "/gatherings/attendance", live: true },
            { title: "Live check-in", href: "/gatherings/attendance/check-in", live: true },
            { title: "Services", href: "/gatherings/attendance/services", live: true },
            { title: "Future", href: "/gatherings/attendance/future", live: false },
          ],
        },
      ],
    },
  ] as unknown as Parameters<typeof activeLeafHref>[0];

  it("prefers the most specific leaf so nested entries never both light up", () => {
    expect(activeLeafHref(areas, "/gatherings/attendance/check-in")).toBe("/gatherings/attendance/check-in");
  });

  it("falls back to the section index for deep routes without their own leaf", () => {
    expect(activeLeafHref(areas, "/gatherings/attendance/services/abc-123")).toBe("/gatherings/attendance/services");
  });

  it("answers nothing on unrelated paths and ignores not-yet-live leaves", () => {
    expect(activeLeafHref(areas, "/people/members")).toBeUndefined();
    expect(activeLeafHref(areas, "/gatherings/attendance/future")).toBe("/gatherings/attendance");
  });
});
