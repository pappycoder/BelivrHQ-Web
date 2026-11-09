import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";

test.beforeEach(async ({ context }, info) => {
  await context.addCookies([
    {
      name: "belivrhq_token",
      value: "test-only",
      url: "http://127.0.0.1:3107",
    },
  ]);
  await context.addInitScript(
    ({ hq, readOnly }) => {
      const native = window.fetch.bind(window);
      const records = [
        {
          id: "row-a",
          memberId: "member-a",
          firstName: "Alice",
          lastName: "Test",
          meetingDate: "2026-10-17",
          status: "present",
          notes: "Present note",
        },
        {
          id: "row-b",
          memberId: "member-b",
          firstName: "Bob",
          lastName: "Test",
          meetingDate: "2026-10-16",
          status: "absent",
          notes: "Absent note",
        },
      ];
      const department = {
        id: "dept-a",
        churchId: "church-a",
        branchId: "branch-a",
        name: "Choir",
        headMemberId: "head-a",
        memberCount: 2,
        members: [
          {
            memberId: "member-a",
            id: "dm-a",
            firstName: "Alice",
            lastName: "Test",
            role: "member",
            joinedAt: "2026-10-01",
          },
          {
            memberId: "member-b",
            id: "dm-b",
            firstName: "Bob",
            lastName: "Test",
            role: "member",
            joinedAt: "2026-10-01",
          },
        ],
        createdAt: "2026-10-01",
        updatedAt: "2026-10-01",
      };
      window.fetch = async (input, options) => {
        const url = new URL(
          input instanceof Request ? input.url : String(input),
          location.origin,
        );
        const path = url.pathname;
        if (!path.startsWith("/api/")) return native(input, options);
        if (path === "/api/session")
          return new Response(JSON.stringify({ hasSession: true }));
        let data: unknown = [];
        if (path.endsWith("/auth/session"))
          data = { userId: "user-a", email: "fixture@example.test" };
        else if (path.endsWith("/profiles/me"))
          data = {
            profileId: "profile-a",
            churchId: "church-a",
            branchId: "branch-a",
            memberId: "head-a",
            status: "active",
            firstName: "Head",
            lastName: "Test",
            role: ["department_head"],
            isAdminHq: hq,
            planFeatures: ["groups", "reports", "events", "giving"],
            permissions: [
              "visitors:list:read",
              "reports:members:read",
              "events:calendar:read",
              "attendance:services:read",
              "departments:read",
              "departments:own:read",
              "branches:read",
              ...(readOnly
                ? []
                : ["departments:update", "departments:own:update"]),
              ...(hq && !readOnly ? ["departments:create"] : []),
            ],
          };
        else if (path.endsWith("/visitors"))
          data = {
            data: [],
            meta: { total: 0, page: 1, limit: 100, totalPages: 1 },
          };
        else if (path.endsWith("/attendance-sessions"))
          data = {
            data: [],
            meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
          };
        else if (path.endsWith("/admin/departments/dept-a/attendance/bulk")) {
          const body = JSON.parse(String(options?.body));
          for (const memberId of body.memberIds) {
            const member = department.members.find(
              (member) => member.memberId === memberId,
            )!;
            records.push({
              id: `new-${memberId}`,
              memberId,
              firstName: member.firstName,
              lastName: member.lastName,
              meetingDate: body.meetingDate,
              status: body.status,
              notes: body.notes,
            });
          }
          data = { recorded: body.memberIds.length };
        } else if (path.endsWith("/admin/departments/dept-a/attendance")) {
          if (options?.method === "POST") {
            const body = JSON.parse(String(options.body));
            records.push({
              id: "row-c",
              memberId: body.memberId,
              firstName: "Alice",
              lastName: "Test",
              meetingDate: body.meetingDate,
              status: body.status,
              notes: body.notes,
            });
            data = { id: "row-c" };
          } else
            data = records.filter(
              (row) =>
                !url.searchParams.get("meetingDate") ||
                row.meetingDate === url.searchParams.get("meetingDate"),
            );
        } else if (path.endsWith("/admin/departments/dept-a"))
          data = department;
        else if (path.endsWith("/admin/departments")) data = [department];
        else if (path.endsWith("/reports/members"))
          data = {
            startDate: "2026-01-01",
            endDate: "2026-10-17",
            totalMembers: 2,
            newMembersInPeriod: 1,
            activeMembers: 2,
            byStatus: [],
            byGender: [],
            monthlyGrowth: [],
          };
        else if (path.endsWith("/services"))
          data = {
            data: [
              {
                serviceId: "service-a",
                name: "Sunday Service",
                category: "adult",
                isActive: true,
                createdAt: "2026-10-01",
              },
            ],
            meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
          };
        else if (path.endsWith("/branches"))
          data = { data: [{ branchId: "branch-a", name: "Branch A" }] };
        else if (path.endsWith("/unread-count")) data = { count: 0 };
        else if (
          path.endsWith("/notifications") ||
          path.endsWith("/audit-logs/me")
        )
          data = { data: [], total: 0 };
        return new Response(JSON.stringify({ success: true, data }), {
          headers: { "Content-Type": "application/json" },
        });
      };
    },
    {
      hq: info.title.startsWith("hq"),
      readOnly: info.title.startsWith("readonly"),
    },
  );
});
async function openDepartment(page: import("@playwright/test").Page) {
  await page.goto("/departments");
  await page.getByRole("link", { name: "Choir", exact: true }).click();
  await expect(page).toHaveURL(/\/departments\/dept-a$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("tab", { name: "Attendance", exact: true }).click();
  await expect(
    page.getByText("Department meeting attendance (2)", { exact: true }),
  ).toBeVisible();
}
test("hq head can create departments and record their department meeting attendance", async ({
  page,
}) => {
  await page.goto("/departments");
  await expect(
    page.getByRole("button", { name: "Add Department", exact: true }),
  ).toBeVisible();
  await openDepartment(page);
  await page
    .getByRole("button", { name: "Record meeting attendance", exact: true })
    .click();
  const dialog = page.getByRole("dialog").last();
  await dialog
    .getByLabel("Department meeting date", { exact: true })
    .fill("2026-10-18");
  await dialog
    .getByRole("checkbox", { name: "Select Alice Test", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Mark attendance (1)", exact: true })
    .click();
  await expect(dialog.getByText("0 selected", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByText("Department meeting attendance (3)", { exact: true }),
  ).toBeVisible();
});
test("branch head cannot create departments but can record their department attendance", async ({
  page,
}) => {
  await page.goto("/departments");
  await expect(
    page.getByRole("button", { name: "Add Department", exact: true }),
  ).toHaveCount(0);
  await openDepartment(page);
  await expect(
    page.getByRole("button", {
      name: "Record meeting attendance",
      exact: true,
    }),
  ).toBeVisible();
});
test("readonly department attendance filters and exports without write permission", async ({
  page,
}) => {
  await openDepartment(page);
  await expect(
    page.getByRole("button", {
      name: "Record meeting attendance",
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByLabel("Department meeting attendance status", { exact: true })
    .selectOption("present");
  await page
    .getByLabel("Department meeting attendance search", { exact: true })
    .fill("Alice");
  const table = page.getByRole("table", {
    name: "Department meeting attendance",
    exact: true,
  });
  await expect(table.getByText("Alice Test", { exact: true })).toBeVisible();
  await expect(table.getByText("Bob Test", { exact: true })).toHaveCount(0);
  const section = table.locator("xpath=ancestor::section[1]");
  await expect(section.getByRole("button", { name: /^Export/ })).toHaveCount(1);
  await section.getByRole("button", { name: "Export", exact: true }).click();
  const downloadPromise = page.waitForEvent("download", { timeout: 10000 });
  await page
    .getByRole("menuitem", { name: "Export as CSV", exact: true })
    .click();
  const download = await downloadPromise;
  const content = await fs.readFile((await download.path())!, "utf8");
  expect(content).toContain("Alice Test");
  expect(content).not.toContain("Bob Test");
});
test("readonly setup directories do not offer exports", async ({ page }) => {
  for (const path of ["/departments", "/attendance/services", "/events"]) {
    await page.goto(path);
    await expect(
      page.locator("#main-content").getByRole("heading").first(),
    ).toBeVisible();
    await expect(
      page.locator("#main-content").getByRole("button", { name: /export/i }),
    ).toHaveCount(0);
  }
});
test("readonly operational export uses concise labels and stays inside its collection", async ({
  page,
}) => {
  await page.goto("/visitors/follow-up");
  const main = page.locator("#main-content");
  // Keep this collection's data inside its own export boundary.
  const exportControl = main.getByRole("button", {
    name: "Export",
    exact: true,
  });
  const root = exportControl.locator("xpath=ancestor::*[@data-collection][1]");
  await root.evaluate((element) => {
    const collection = document.createElement("section");
    collection.innerHTML =
      "<ul><li>Visible list item</li><li hidden>Hidden list item</li></ul><table><thead><tr><th>Name</th></tr></thead><tbody><tr><td>Separately exported table row</td></tr></tbody></table>";
    element.appendChild(collection);
  });
  await main.evaluate((element) => {
    const unrelated = document.createElement("section");
    unrelated.setAttribute("data-collection", "");
    unrelated.innerHTML = "<ul><li>Different collection list item</li></ul>";
    element.appendChild(unrelated);
  });
  await expect(main.getByRole("button", { name: /^Export/ })).toHaveCount(1);
  await exportControl.click();
  for (const format of ["CSV", "Excel", "PDF"])
    await expect(
      page.getByRole("menuitem", { name: `Export as ${format}`, exact: true }),
    ).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: /visible data/i }),
  ).toHaveCount(0);
  const promise = page.waitForEvent("download");
  await page
    .getByRole("menuitem", { name: "Export as CSV", exact: true })
    .click();
  const download = await promise;
  const content = await fs.readFile((await download.path())!, "utf8");
  expect(content).toContain("Visible list item");
  expect(content).not.toContain("Hidden list item");
  expect(content).not.toContain("Separately exported table row");
  expect(content).not.toContain("Different collection list item");
});
test("readonly report generator has one download action for the chosen format", async ({
  page,
}) => {
  await page.goto("/reports");
  const main = page.locator("#main-content");
  await expect(main.getByText("Total Members", { exact: true })).toBeVisible();
  await expect(main.getByRole("button", { name: /^Download / })).toHaveCount(1);
  await expect(
    main.getByRole("button", { name: "Download PDF", exact: true }),
  ).toBeEnabled();
  await main
    .getByRole("button", { name: "CSV One file per block", exact: true })
    .click();
  await expect(main.getByRole("button", { name: /^Download / })).toHaveCount(1);
  await expect(
    main.getByRole("button", { name: "Download CSV", exact: true }),
  ).toBeEnabled();
  const downloadPromise = page.waitForEvent("download");
  await main.getByRole("button", { name: "Download CSV", exact: true }).click();
  const download = await downloadPromise;
  const content = await fs.readFile((await download.path())!, "utf8");
  expect(content).toContain("Total Members,2");
  await main
    .getByRole("button", { name: "XLSX One sheet per block", exact: true })
    .click();
  await expect(main.getByRole("button", { name: /^Download / })).toHaveCount(1);
  await expect(
    main.getByRole("button", { name: "Download XLSX", exact: true }),
  ).toBeEnabled();
});

test("readonly department details open directly and retain attendance exports after refresh", async ({
  page,
}) => {
  await page.goto("/departments/dept-a");
  await expect(
    page.getByRole("heading", { name: "Choir", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Attendance", exact: true }).click();
  await expect(
    page.getByRole("table", {
      name: "Department meeting attendance",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: "Record meeting attendance",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("table", {
      name: "Department meeting attendance",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Back to departments", exact: true })
    .click();
  await expect(page).toHaveURL(/\/departments$/);
});
