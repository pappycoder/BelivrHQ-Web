import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import { USHER_ATTENDANCE_PERMISSIONS } from "../fixtures/usher-attendance-permissions";

test.beforeEach(async ({ context }, info) => {
  await context.addCookies([
    {
      name: "belivrhq_token",
      value: "test-only",
      url: "http://127.0.0.1:3107",
    },
  ]);
  await context.addInitScript(
    ({ readOnly, createOnly, summaryAccess, usherPermissions }) => {
      const native = window.fetch.bind(window);
      const service = {
        serviceId: "service-a",
        churchId: "church-a",
        branchId: "branch-a",
        name: "Family Service",
        category: "mixed",
        isActive: true,
        createdAt: "2026-10-18",
        updatedAt: "2026-10-18",
      };
      const records = [
        {
          id: "headcount-a",
          serviceId: "service-a",
          serviceName: "Family Service",
          branchId: "branch-a",
          branchName: "Branch A",
          attendanceDate: "2026-10-18",
          total: 100,
          adultCount: 60,
          childrenCount: null,
          maleCount: null,
          femaleCount: 0,
        },
      ];
      const generalSummary = {
        reportCount: 1,
        total: 100,
        adultCount: 60,
        childrenCount: 0,
        maleCount: 0,
        femaleCount: 0,
        unspecifiedAgeCount: 40,
        unspecifiedGenderCount: 100,
      };
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
            status: "active",
            firstName: "Staff",
            lastName: "Test",
            role: [usherPermissions ? "usher" : "staff"],
            isAdminHq: false,
            planFeatures: ["giving", "reports"],
            permissions: usherPermissions ?? [
              "attendance:services:read",
              ...(summaryAccess
                ? [
                    "attendance:dashboard:read",
                    "attendance:reports:read",
                    "reports:attendance:read",
                  ]
                : []),
              ...(!readOnly
                ? ["attendance:checkin:create", "attendance:services:create"]
                : []),
              ...(!createOnly ? ["attendance:records:read"] : []),
              ...(!readOnly && !createOnly
                ? ["attendance:records:update"]
                : []),
            ],
          };
        else if (path.endsWith("/auth/session")) data = { userId: "user-a" };
        else if (path.endsWith("/attendance/general/summary"))
          data = generalSummary;
        else if (path.endsWith("/attendance/summary"))
          data = {
            totalCheckIns: 3,
            memberCheckIns: 2,
            visitorCheckIns: 1,
            bySource: {},
            byCategory: {},
            byGender: {},
            generalAttendance: generalSummary,
          };
        else if (path.endsWith("/reports/attendance"))
          data = {
            startDate: "2026-10-01",
            endDate: "2026-10-18",
            totalAttendance: 3,
            serviceCount: 1,
            averagePerService: 3,
            byService: [],
            monthlyTrend: [],
            generalAttendance: generalSummary,
          };
        else if (path.endsWith("/attendance/general")) {
          if (options?.method === "POST") {
            const body = JSON.parse(String(options.body));
            if (body.total === 123)
              data = { ...records[0], ...body, id: "headcount-b" };
            else data = { ...records[0], ...body };
            records.push(data as (typeof records)[number]);
            (window as unknown as { lastHeadcount: unknown }).lastHeadcount =
              body;
          } else
            data = {
              data: records.filter(
                (row) =>
                  !url.searchParams.get("startDate") ||
                  row.attendanceDate >= url.searchParams.get("startDate")!,
              ),
              meta: {
                total: records.length,
                page: 1,
                limit: 20,
                totalPages: 1,
              },
            };
        } else if (path.endsWith("/attendance/general/headcount-a")) {
          const body = JSON.parse(String(options?.body));
          Object.assign(records[0], body);
          data = records[0];
        } else if (path.endsWith("/services/service-a")) data = service;
        else if (path.endsWith("/services"))
          data = {
            data: [service],
            meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
          };
        else if (path.endsWith("/attendance/by-service/service-a"))
          data = { data: [], total: 0 };
        else if (path.endsWith("/attendance"))
          data = {
            data: [],
            meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
          };
        else if (path.endsWith("/members"))
          data = {
            data: [],
            meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
          };
        else if (path.endsWith("/branches"))
          data = { data: [{ branchId: "branch-a", name: "Branch A" }] };
        else if (path.endsWith("/unread-count")) data = { count: 0 };
        return new Response(JSON.stringify({ success: true, data }), {
          headers: { "Content-Type": "application/json" },
        });
      };
    },
    {
      usherPermissions: info.title.startsWith("usher")
        ? USHER_ATTENDANCE_PERMISSIONS
        : null,
      readOnly: info.title.startsWith("readonly"),
      createOnly: info.title.startsWith("createonly"),
      summaryAccess: info.title.startsWith("summary"),
    },
  );
});

test("staff records total with optional fields and rejects invalid subtotals", async ({
  page,
}) => {
  await page.goto("/attendance/services/service-a");
  await expect(
    page.getByText("Mixed (Adults & Children)", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Record general attendance", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Total attendance *", { exact: true }).fill("123");
  await dialog.getByLabel("Adults (optional)", { exact: true }).fill("124");
  await dialog
    .getByRole("button", { name: "Save attendance", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "no greater than the total",
  );
  await dialog.getByLabel("Adults (optional)", { exact: true }).fill("");
  await dialog.getByLabel("Children (optional)", { exact: true }).fill("0");
  await dialog
    .getByRole("button", { name: "Save attendance", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  const body = await page.evaluate(
    () => (window as unknown as { lastHeadcount: unknown }).lastHeadcount,
  );
  expect(body).toMatchObject({
    total: 123,
    adultCount: null,
    childrenCount: 0,
    maleCount: null,
    femaleCount: null,
    branchId: "branch-a",
  });
});

test("staff edits headcounts with update permission", async ({ page }) => {
  await page.goto("/attendance/services/service-a");
  await page
    .getByRole("button", { name: "Edit headcount", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByLabel("Attendance date", { exact: true }),
  ).toBeDisabled();
  await dialog.getByLabel("Total attendance *", { exact: true }).fill("120");
  await dialog
    .getByRole("button", { name: "Save attendance", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page
      .getByRole("table", { name: "General attendance", exact: true })
      .getByRole("cell", { name: "120", exact: true }),
  ).toBeVisible();
});

test("readonly headcounts filter and export without creating or editing", async ({
  page,
}) => {
  const writes: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/attendance/general") && r.method() !== "GET")
      writes.push(r.url());
  });
  await page.goto("/attendance/services/service-a");
  const table = page.getByRole("table", {
    name: "General attendance",
    exact: true,
  });
  await expect(
    table.getByRole("cell", { name: "100", exact: true }),
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
  await page.getByLabel("From", { exact: true }).fill("2026-10-19");
  await expect(table).toContainText("No general attendance");
  await page.getByLabel("From", { exact: true }).fill("2026-10-18");
  await expect(
    table.getByRole("cell", { name: "100", exact: true }),
  ).toBeVisible();
  const card = table.locator('xpath=ancestor::*[@data-slot="card"][1]');
  await card.getByRole("button", { name: "Export", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("menuitem", { name: "Export as CSV", exact: true })
    .click();
  const file = await pending;
  const content = await fs.readFile((await file.path())!, "utf8");
  expect(content).toContain("Family Service");
  expect(content).toContain("100,60,,,0");
  expect(writes).toEqual([]);
});

test("createonly user records headcount without requesting general attendance records", async ({
  page,
}) => {
  const reads: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "GET" && /\/attendance\/general/.test(r.url()))
      reads.push(r.url());
  });
  await page.goto("/attendance/services/service-a");
  await expect(
    page.getByRole("button", {
      name: "Record general attendance",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("table", { name: "General attendance", exact: true }),
  ).toHaveCount(0);
  expect(reads).toEqual([]);
});

test("staff can choose mixed when creating a service", async ({ page }) => {
  await page.goto("/attendance/services");
  await page.getByRole("button", { name: "Add Service", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox").first().click();
  await expect(
    page.getByRole("option", {
      name: "Mixed (Adults & Children)",
      exact: true,
    }),
  ).toBeVisible();
});

test("staff mixed service individual check-ins default to unspecified", async ({
  page,
}) => {
  await page.goto("/attendance/check-in");
  await page.getByRole("combobox").first().click();
  await page
    .getByRole("option", { name: "Family Service", exact: true })
    .click();
  await expect(page.getByRole("combobox").nth(1)).toContainText("Unspecified");
  await expect(page.getByRole("form", { name: "Reported headcount", exact: true }).getByLabel("Total attendance *", { exact: true })).toBeVisible();
});

test("summary dashboard separates headcounts from individual check-ins", async ({
  page,
}) => {
  await page.goto("/attendance");
  const named = page.getByRole("region", { name: "Named check-ins", exact: true });
  const reported = page.getByRole("region", { name: "Reported service headcounts", exact: true });
  await expect(named.getByText("Members & visitors", { exact: true })).toBeVisible();
  await expect(named.locator("svg.recharts-surface").first()).toBeVisible();
  await expect(reported.getByText("Reported age breakdown", { exact: true })).toBeVisible();
  await expect(reported.getByText(/^Age not supp/)).toBeVisible();
  await expect(reported.getByText(/^Gender not s/)).toBeVisible();
  await expect(page.getByText("Total Check-Ins", { exact: true })).toHaveCount(0);
});

test("summary report generator exports headcounts separately with one download action", async ({
  page,
}) => {
  await page.goto("/reports");
  await expect(
    page.getByText("Individual Check-Ins", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("General attendance summary", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator("#main-content")
      .getByRole("button", { name: "Export", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "CSV One file per block", exact: true })
    .click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download CSV", exact: true }).click();
  const file = await pending;
  const content = await fs.readFile((await file.path())!, "utf8");
  expect(content).toContain("Individual check-ins,3");
  expect(content).toContain("General headcount: Total,100");
  expect(content).toContain("General headcount: Age not supplied,40");
});

test("usher can open general attendance from service check-in", async ({
  page,
}) => {
  await page.goto("/attendance/check-in");
  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: /Family Service/ }).click();
  await expect(page.getByRole("form", { name: "Reported headcount", exact: true }).getByLabel("Total attendance *", { exact: true })).toBeVisible();
});

test("usher can open service creation", async ({ page }) => {
  await page.goto("/attendance/services");
  await page.getByRole("button", { name: "Add Service", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
