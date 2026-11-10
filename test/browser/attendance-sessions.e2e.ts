import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import { USHER_ATTENDANCE_PERMISSIONS } from "../fixtures/usher-attendance-permissions";

test.beforeEach(async ({ context }, info) => {
  const type = info.title.startsWith("department")
    ? "department"
    : info.title.startsWith("cell")
      ? "cell_group"
      : "event";
  await context.addCookies([
    {
      name: "belivrhq_token",
      value: "session-test",
      url: "http://127.0.0.1:3107",
    },
  ]);
  await context.addInitScript(
    ({ type, readonly, unowned, usherPermissions }) => {
      const native = window.fetch.bind(window),
        owner = "owner-a",
        id = "context-a";
      const records: Record<string, unknown>[] = readonly
        ? [
            {
              id: "session-a",
              contextType: type,
              contextId: id,
              contextName: "Meeting A",
              branchId: "branch-a",
              branchName: "Branch A",
              attendanceDate: "2026-10-18",
              total: 20,
              adultCount: null,
              childrenCount: 5,
              maleCount: 0,
              femaleCount: null,
            },
          ]
        : [];
      const resources =
        type === "department"
          ? [
              "departments:read",
              "departments:own:read",
              ...(!readonly
                ? ["departments:update", "departments:own:update"]
                : []),
            ]
          : type === "cell_group"
            ? [
                "cell_groups:read",
                "cell_groups:details:read",
                "cell_groups:own:read",
                ...(!readonly
                  ? [
                      "cell_groups:create",
                      "cell_groups:update",
                      "cell_groups:own:update",
                    ]
                  : []),
              ]
            : [
                "events:all:read",
                "events:list:read",
                "events:checkin:read",
                ...(!readonly
                  ? ["events:checkin:create", "events:checkin:update"]
                  : []),
              ];
      window.fetch = async (input, options) => {
        const url = new URL(
            input instanceof Request ? input.url : String(input),
            location.origin,
          ),
          path = url.pathname;
        if (!path.startsWith("/api/")) return native(input, options);
        if (path === "/api/session")
          return new Response(JSON.stringify({ hasSession: true }));
        let data: unknown = [];
        if (path.endsWith("/profiles/me"))
          data = {
            profileId: "profile-a",
            churchId: "church-a",
            branchId: "branch-a",
            memberId: owner,
            status: "active",
            role: [usherPermissions ? "usher" : "custom"],
            isAdminHq: !usherPermissions,
            firstName: "Staff",
            lastName: "Test",
            planFeatures: ["groups", "events", "tickets", "giving"],
            permissions: usherPermissions ?? resources,
          };
        else if (path.endsWith("/auth/session")) data = { userId: "user-a" };
        else if (path.endsWith("/attendance-sessions")) {
          if (options?.method === "POST") {
            const body = JSON.parse(String(options.body));
            (window as unknown as { sessionBody: unknown }).sessionBody = body;
            data = {
              ...body,
              id: "session-a",
              contextType: type,
              contextId: id,
              contextName: "Meeting A",
              branchId: "branch-a",
              branchName: "Branch A",
            };
            records.push(data as Record<string, unknown>);
          } else
            data = {
              data: records,
              meta: {
                total: records.length,
                page: 1,
                limit: 20,
                totalPages: records.length ? 1 : 0,
              },
            };
        } else if (path.endsWith("/admin/departments/context-a"))
          data = {
            id,
            churchId: "church-a",
            branchId: "branch-a",
            name: "Meeting A",
            headMemberId: unowned ? "other-owner" : owner,
            members: [],
            memberCount: 0,
            createdAt: "2026-10-18",
            updatedAt: "2026-10-18",
          };
        else if (path.endsWith("/admin/cell-groups/context-a"))
          data = {
            id,
            churchId: "church-a",
            branchId: "branch-a",
            name: "Meeting A",
            leaderId: unowned ? "other-owner" : owner,
            memberCount: 0,
            createdAt: "2026-10-18",
            updatedAt: "2026-10-18",
          };
        else if (path.endsWith("/events/context-a"))
          data = {
            eventId: id,
            churchId: "church-a",
            branchId: "branch-a",
            title: "Meeting A",
            type: "service",
            startDate: "2026-10-18T09:00:00Z",
            isFree: true,
            registrationCount: 0,
            createdAt: "2026-10-18",
            updatedAt: "2026-10-18",
          };
        else if (path.endsWith("/events"))
          data = {
            data: [
              {
                eventId: id,
                title: "Meeting A",
                branchId: "branch-a",
                type: "service",
                startDate: "2026-10-18T09:00:00Z",
                isFree: true,
                registrationCount: 0,
              },
            ],
            meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
          };
        else if (path === "/api/backend/members")
          data = {
            data: [],
            meta: { total: 0, page: 1, limit: 50, totalPages: 0 },
          };
        else if (path.endsWith("/stats"))
          data = { registered: 0, attended: 0, noShows: 0, walkIns: 0 };
        else if (path.endsWith("/attendance/summary"))
          data = { totalMeetings: 0, averageAttendance: 0 };
        else if (path.endsWith("/branches"))
          data = { data: [{ branchId: "branch-a", name: "Branch A" }] };
        else if (path.endsWith("/unread-count")) data = { count: 0 };
        return new Response(JSON.stringify({ success: true, data }), {
          headers: { "Content-Type": "application/json" },
        });
      };
    },
    {
      type,
      usherPermissions: info.title.startsWith("usher")
        ? USHER_ATTENDANCE_PERMISSIONS
        : null,
      readonly: info.title.includes("readonly"),
      unowned: info.title.includes("unowned"),
    },
  );
});

const route = (type: string) =>
  type === "department"
    ? "/departments/context-a"
    : type === "cell"
      ? "/departments/cell-groups/context-a"
      : "/events/context-a";
for (const type of ["department", "cell", "event"])
  test(`${type} records total-only attendance using its existing permissions`, async ({
    page,
  }) => {
    await page.goto(route(type));
    await page.getByRole("tab", { name: "Attendance", exact: true }).click();
    await page
      .getByRole("button", { name: "Record general attendance", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Total attendance", { exact: true }).fill("25");
    await dialog
      .getByRole("button", { name: "Save attendance", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    await expect(
      page
        .getByRole("table", { name: "General attendance", exact: true })
        .getByRole("cell", { name: "25", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => (window as unknown as { sessionBody: unknown }).sessionBody,
      ),
    ).toMatchObject({
      total: 25,
      adultCount: null,
      childrenCount: null,
      maleCount: null,
      femaleCount: null,
    });
  });
for (const type of ["department", "cell"])
  test(`${type} unowned HQ meeting has no total-write controls`, async ({
    page,
  }) => {
    await page.goto(route(type));
    await page.getByRole("tab", { name: "Attendance", exact: true }).click();
    await expect(
      page.getByText("Meeting A", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Record general attendance",
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Edit headcount", exact: true }),
    ).toHaveCount(0);
  });
for (const type of ["department", "cell", "event"])
  test(`${type} readonly totals export without write controls`, async ({
    page,
  }) => {
    await page.goto(route(type));
    await page.getByRole("tab", { name: "Attendance", exact: true }).click();
    const table = page.getByRole("table", {
      name: "General attendance",
      exact: true,
    });
    await expect(
      table.getByRole("cell", { name: "20", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Record general attendance",
        exact: true,
      }),
    ).toHaveCount(0);
    const card = table.locator('xpath=ancestor::*[@data-slot="card"][1]');
    await card.getByRole("button", { name: "Export", exact: true }).click();
    const promise = page.waitForEvent("download");
    await page
      .getByRole("menuitem", { name: "Export as CSV", exact: true })
      .click();
    const file = await promise;
    const content = await fs.readFile((await file.path())!, "utf8");
    expect(content).toContain("Meeting A");
    expect(content).toContain("20,,5,0,");
  });

test("event check-in records total-only attendance without named details", async ({
  page,
}) => {
  await page.goto("/events/check-in");
  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: /Meeting A/ }).click();
  await page
    .getByRole("button", { name: "Record general attendance", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Total attendance", { exact: true }).fill("40");
  await dialog
    .getByRole("button", { name: "Save attendance", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page
      .getByRole("table", { name: "General attendance", exact: true })
      .getByRole("cell", { name: "40", exact: true }),
  ).toBeVisible();
});

test("usher can record general event attendance", async ({ page }) => {
  await page.goto("/events/context-a");
  await page.getByRole("tab", { name: "Attendance", exact: true }).click();
  await page
    .getByRole("button", { name: "Record general attendance", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Total attendance", { exact: true }).fill("25");
  await dialog
    .getByRole("button", { name: "Save attendance", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { sessionBody: { total: number } }).sessionBody
          .total,
    ),
  ).toBe(25);
});

test("usher can open event creation", async ({ page }) => {
  await page.goto("/events/new");
  await expect(page.getByLabel("Title", { exact: true })).toBeVisible();
});

test("usher can open event editing and lifecycle controls", async ({
  page,
}) => {
  await page.goto("/events/context-a");
  await page.getByRole("button", { name: "Event management", exact: true }).click();
  await expect(
    page.getByRole("menuitem", { name: "Archive", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: "Delete", exact: true }),
  ).toBeVisible();
  await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
  await expect(page).toHaveURL(/\/events\/context-a\/edit$/);
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    "Meeting A",
  );
  await expect(
    page.getByRole("button", { name: "Save Changes", exact: true }),
  ).toBeEnabled();
});

test("usher can manage ticket types and assigned tickets", async ({ page }) => {
  await page.goto("/events/management");
  await expect(
    page.getByRole("tab", { name: "Ticket Types", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Assigned Tickets", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create Ticket Type", exact: true }),
  ).toBeVisible();
});
