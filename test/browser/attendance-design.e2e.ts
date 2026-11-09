import { test, expect, type BrowserContext } from "@playwright/test";
import fs from "node:fs/promises";

test.use({ serviceWorkers: "block" });

async function fixture(
  context: BrowserContext,
  options: {
    reports?: boolean;
    summary?: boolean;
    hq?: boolean;
    fail?: "summary" | "trends";
    empty?: boolean;
    manage?: boolean;
  } = {},
) {
  const calls: URL[] = [];
  let failure = options.fail;
  let archived = false;
  await context.addCookies([
    {
      name: "belivrhq_token",
      value: "attendance-design",
      url: "http://127.0.0.1:3107",
    },
  ]);
  await context.route("https://**", (route) => route.abort());
  await context.route("https://embed.tawk.to/**", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: "Object.assign(window.Tawk_API, {showWidget(){},hideWidget(){},maximize(){},shutdown(){}}); window.Tawk_API?.onLoad?.();",
    }),
  );
  await context.route("**/api/session", (route) =>
    route.fulfill({ json: { hasSession: true } }),
  );
  await context.route("**/api/backend/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace("/api/backend", "");
    calls.push(url);
    if (path === `/attendance/${failure}`)
      return route.fulfill({
        status: 500,
        json: { message: "Temporary failure" },
      });
    const row = {
      id: "record-a",
      memberId: "member-a",
      memberName: "Grace Adeyemi",
      serviceId: "service-a",
      serviceName: "Sunday Service",
      category: "adult",
      source: "manual",
      checkInAt: "2026-10-27T10:00:00Z",
    };
    let data: unknown = [];
    if (path === "/profiles/me")
      data = {
        profileId: "profile-a",
        userId: "user-a",
        churchId: "church-a",
        branchId: "branch-a",
        branch: { name: "Main Branch" },
        church: { name: "Grace Church" },
        firstName: "Grace",
        lastName: "Admin",
        role: ["staff"],
        status: "active",
        isAdminHq: options.hq ?? true,
        planFeatures: ["attendance"],
        permissions: [
          ...(options.manage
            ? ["attendance:services:update", "attendance:services:delete"]
            : []),
          "branches:read",
          "attendance:services:read",
          "attendance:services:create",
          "attendance:records:read",
          "attendance:checkin:create",
          ...(options.summary === false ? [] : ["attendance:dashboard:read"]),
          ...(options.reports ? ["attendance:reports:read"] : []),
        ],
      };
    else if (path === "/attendance/summary")
      data = {
        totalCheckIns: options.empty ? 0 : 24,
        memberCheckIns: options.empty ? 0 : 18,
        visitorCheckIns: options.empty ? 0 : 6,
        byCategory: options.empty
          ? {}
          : { adult: 16, children: 6, unspecified: 2 },
        byGender: options.empty ? {} : { male: 9, female: 12, unknown: 3 },
        bySource: options.empty ? {} : { manual: 12, qr: 8, kiosk: 4 },
        ...(options.empty
          ? {}
          : {
              generalAttendance: {
                reportCount: 2,
                total: 100,
                adultCount: 60,
                childrenCount: null,
                maleCount: null,
                femaleCount: 0,
                unspecifiedAgeCount: 40,
                unspecifiedGenderCount: 100,
              },
            }),
      };
    else if (path === "/attendance/trends")
      data = options.empty
        ? []
        : [
            { date: "2026-10-26", total: 10, members: 8, visitors: 2 },
            { date: "2026-10-27", total: 14, members: 10, visitors: 4 },
          ];
    else if (path === "/attendance")
      data = {
        data: [row],
        meta: { total: 1, page: 1, limit: 200, totalPages: 1 },
      };
    else if (path === "/attendance/general")
      data = {
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      };
    else if (path === "/attendance/general/summary")
      data = {
        reportCount: 0,
        total: 0,
        unspecifiedAgeCount: 0,
        unspecifiedGenderCount: 0,
      };
    else if (
      path === "/services/service-a/archive" ||
      path === "/services/service-a/restore"
    ) {
      archived = path.endsWith("/archive");
      data = {
        serviceId: "service-a",
        archivedAt: archived ? "2026-10-28" : null,
      };
    } else if (path === "/services/service-a")
      data = {
        serviceId: "service-a",
        name: "Sunday Service",
        category: "mixed",
        isActive: true,
        branchId: "branch-a",
        createdAt: "2026-10-01T10:00:00Z",
        archivedAt: archived ? "2026-10-28" : null,
      };
    else if (path === "/attendance/by-service/service-a")
      data = { data: [row], total: 1 };
    else if (path === "/services")
      data = {
        data: [
          {
            serviceId: "service-a",
            name: "Sunday Service",
            category: "mixed",
            isActive: true,
            branchId: "branch-a",
          },
        ],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
    else if (path === "/branches")
      data = {
        data: [
          { branchId: "branch-a", name: "Main Branch" },
          { branchId: "branch-b", name: "West Branch" },
        ],
        total: 2,
      };
    await route.fulfill({ json: { success: true, data } });
  });
  return {
    calls,
    recover: () => {
      failure = undefined;
    },
  };
}

for (const hq of [true, false])
  test(`summary-only dashboard renders charts without Analytics, HQ=${hq}`, async ({
    page,
    context,
  }) => {
    const { calls } = await fixture(context, { hq });
    await page.goto("/attendance");
    const main = page.locator("#main-content");
    await expect(main.locator("[data-attendance-chart]")).toHaveCount(6);
    await expect(main.locator("svg.recharts-surface")).toHaveCount(6);
    await expect(main.getByRole("combobox")).toHaveCount(0);
    await expect(
      main.getByRole("link", { name: "Reports", exact: true }),
    ).toHaveCount(0);
    await expect(main.getByText("Check-in trend", { exact: true })).toHaveCount(
      0,
    );
    const summary = calls.filter((url) =>
      url.pathname.endsWith("/attendance/summary"),
    );
    expect(summary).toHaveLength(1);
    expect(summary[0].searchParams.get("endDate")).toMatch(/T23:59:59\.999Z$/);
    const start = new Date(summary[0].searchParams.get("startDate")!);
    const end = new Date(summary[0].searchParams.get("endDate")!);
    expect(Math.round((end.getTime() - start.getTime()) / 86400000)).toBe(30);
    expect(summary[0].searchParams.get("branchId")).toBe(
      hq ? null : "branch-a",
    );
    expect(
      calls.some((url) =>
        /\/attendance\/trends|\/events$|\/attendance$/.test(url.pathname),
      ),
    ).toBe(false);
    const reported = main.getByRole("region", {
      name: "Reported service headcounts",
    });
    await expect(reported.getByText(/^Age not supp/)).toBeVisible();
    await expect(reported.getByText(/^Gender not s/)).toBeVisible();
    // Null demographics must not become a supplied zero.
    await expect(reported.getByText("Children", { exact: true })).toHaveCount(
      0,
    );
    await expect(reported.getByText("Male", { exact: true })).toHaveCount(0);
    await expect(reported.getByText("Female", { exact: true })).toBeVisible();
  });

test("trend failure leaves summary and headcounts usable and retry recovers", async ({
  page,
  context,
}) => {
  const f = await fixture(context, { reports: true, fail: "trends" });
  await page.goto("/attendance");
  await expect(page.getByText("Unable to load check-in trend.")).toBeVisible({
    timeout: 20000,
  });
  await expect(
    page.locator("[data-attendance-chart] svg.recharts-surface"),
  ).toHaveCount(6);
  f.recover();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.locator("[data-attendance-chart] svg.recharts-surface"),
  ).toHaveCount(7);
});

test("summary failure leaves permitted trend usable and never implies empty headcounts", async ({
  page,
  context,
}) => {
  await fixture(context, { reports: true, fail: "summary" });
  await page.goto("/attendance");
  await expect(
    page.getByText("Unable to load members & visitors."),
  ).toBeVisible({ timeout: 20000 });
  await expect(
    page.locator("[data-attendance-chart] svg.recharts-surface"),
  ).toHaveCount(1);
  await expect(
    page.getByText("No reported service headcounts in this period."),
  ).toHaveCount(0);
});

test("empty aggregates show honest empty states", async ({ page, context }) => {
  await fixture(context, { empty: true });
  await page.goto("/attendance");
  await expect(page.getByText("No data yet.")).toHaveCount(4);
  await expect(
    page.getByText("No reported service headcounts in this period."),
  ).toBeVisible();
});

test("missing dashboard permission prevents aggregate requests", async ({
  page,
  context,
}) => {
  const { calls } = await fixture(context, { summary: false });
  await page.goto("/attendance");
  await expect(page.locator("[data-attendance-chart]")).toHaveCount(0);
  await expect(page.getByText(/permission|access/i).first()).toBeVisible();
  expect(
    calls.some((url) => /\/attendance\/(summary|trends)$/.test(url.pathname)),
  ).toBe(false);
});

test("reports retain the sample limitation and forward branch and dates to exports", async ({
  page,
  context,
}) => {
  const { calls } = await fixture(context, { reports: true });
  await page.goto("/attendance/reports");
  await expect(page.getByText(/up to 200/)).toBeVisible();
  await page.getByRole("combobox", { name: "Filter by branch" }).click();
  await page.getByRole("option", { name: "West Branch", exact: true }).click();
  await page.getByLabel("Start date", { exact: true }).fill("2026-10-01");
  await page.getByLabel("End date", { exact: true }).fill("2026-10-28");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: /CSV/ }).click();
  await download;
  expect(
    calls.filter(
      (url) =>
        url.pathname.endsWith("/attendance") &&
        url.searchParams.get("branchId") === "branch-b" &&
        url.searchParams.get("startDate") === "2026-10-01" &&
        url.searchParams.get("endDate") === "2026-10-28",
    ).length,
  ).toBeGreaterThanOrEqual(2);
  await page
    .getByRole("tab", { name: "Reported headcounts", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Export", exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Export", exact: true }),
  ).toBeDisabled();
});

test("desktop, mobile and dark previews retain compact charts and scoped presentation", async ({
  page,
  context,
}) => {
  await fixture(context, { reports: true });
  const directory = "/tmp/belivrhq-attendance-previews";
  await fs.mkdir(directory, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/attendance");
  await expect(
    page.locator("[data-attendance-chart] svg.recharts-surface"),
  ).toHaveCount(7);
  await page.screenshot({
    animations: "disabled",
    path: `${directory}/dashboard-desktop.png`,
    fullPage: true,
  });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.screenshot({
    animations: "disabled",
    path: `${directory}/dashboard-dark.png`,
    fullPage: true,
  });
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    animations: "disabled",
    path: `${directory}/dashboard-mobile.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  for (const [route, name] of [
    ["/attendance/check-in", "check-in"],
    ["/attendance/records", "records"],
    ["/attendance/services", "services"],
    ["/attendance/reports", "reports"],
    ["/attendance/services/service-a", "service-detail"],
  ]) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(route);
    await expect(page.locator("#main-content h1")).toBeVisible();
    await page.screenshot({
      animations: "disabled",
      path: `${directory}/${name}-desktop.png`,
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      animations: "disabled",
      path: `${directory}/${name}-mobile.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await page.screenshot({
      animations: "disabled",
      path: `${directory}/${name}-dark-mobile.png`,
      fullPage: true,
    });
    await page.evaluate(() =>
      document.documentElement.classList.remove("dark"),
    );
    if (name === "services") {
      await page
        .getByRole("button", { name: "Add Service", exact: true })
        .first()
        .click();
      await expect(
        page
          .getByRole("dialog")
          .getByText("Schedule & defaults", { exact: true }),
      ).toBeVisible();
      await page.screenshot({
        animations: "disabled",
        path: `${directory}/service-form-mobile.png`,
        fullPage: true,
      });
      await page.getByRole("button", { name: "Close", exact: true }).click();
    }
  }
});

test("record filters and exports share branch, dates and secondary category", async ({
  page,
  context,
}) => {
  const { calls } = await fixture(context);
  await page.goto("/attendance/records");
  await page.getByRole("combobox", { name: "Filter by branch" }).click();
  await page.getByRole("option", { name: "West Branch", exact: true }).click();
  await page.getByLabel("From date", { exact: true }).fill("2026-10-01");
  await page.getByLabel("To date", { exact: true }).fill("2026-10-28");
  await page.getByRole("button", { name: "More filters", exact: true }).click();
  const options = page.getByRole("dialog");
  await options.getByRole("combobox").click();
  await page.getByRole("option", { name: "Children", exact: true }).click();
  await expect(page.getByLabel("1 active filters")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("menuitem", { name: "Export as CSV", exact: true })
    .click();
  await download;
  const exports = calls.filter(
    (url) =>
      url.pathname.endsWith("/attendance") &&
      url.searchParams.get("branchId") === "branch-b" &&
      url.searchParams.get("category") === "children" &&
      url.searchParams.get("startDate") === "2026-10-01",
  );
  expect(exports.length).toBeGreaterThanOrEqual(2);
  await page.getByRole("button", { name: /More filters/ }).click();
  await page
    .getByRole("button", { name: "Reset filters", exact: true })
    .click();
  await expect(page.getByLabel("From date", { exact: true })).toHaveValue("");
  await expect(
    page.getByRole("combobox", { name: "Filter by branch" }),
  ).toContainText("All branches");
});

test("service administration stays behind its management menu and confirms archive and restore", async ({
  page,
  context,
}) => {
  const { calls } = await fixture(context, { manage: true });
  await page.goto("/attendance/services/service-a");
  await expect(
    page.getByRole("button", { name: "Archive", exact: true }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Giving", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Service management", exact: true }).click();
  await page.getByRole("menuitem", { name: "Archive", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", {
      name: "Archive Sunday Service",
      exact: true,
    }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Archive", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("Archived", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Service management", exact: true }).click();
  await page.getByRole("menuitem", { name: "Restore", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Restore", exact: true })
    .click();
  await expect(page.getByText("Archived", { exact: true })).toHaveCount(0);
  expect(
    calls.some((url) => url.pathname.endsWith("/services/service-a/archive")),
  ).toBe(true);
  expect(
    calls.some((url) => url.pathname.endsWith("/services/service-a/restore")),
  ).toBe(true);
  expect(calls.some((url) => url.pathname.includes("/giving/"))).toBe(false);
});

for (const failedCheckIn of [false, true])
  test(`visitor registration preserves its existing check-in outcome, failure=${failedCheckIn}`, async ({
    page,
    context,
  }) => {
    await fixture(context);
    const writes: { path: string; body: Record<string, unknown> }[] = [];
    await context.route("**/api/backend/members?**", (route) =>
      route.fulfill({
        json: {
          success: true,
          data: { data: [], meta: { page: 1, totalPages: 0, total: 0 } },
        },
      }),
    );
    await context.route("**/api/backend/visitors", async (route) => {
      writes.push({ path: "visitors", body: route.request().postDataJSON() });
      await route.fulfill({
        json: {
          success: true,
          data: { id: "visitor-new", firstName: "Amina", lastName: "Okafor" },
        },
      });
    });
    await context.route("**/api/backend/attendance", async (route) => {
      writes.push({ path: "attendance", body: route.request().postDataJSON() });
      await route.fulfill(
        failedCheckIn
          ? { status: 409, json: { message: "Already checked in" } }
          : { json: { success: true, data: { id: "check-in-new" } } },
      );
    });
    await page.goto("/attendance/check-in");
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: /Sunday Service/ }).click();
    await page.getByRole("button", { name: "Visitor", exact: true }).click();
    await page.getByLabel("First Name *", { exact: true }).fill("Amina");
    await page.getByLabel("Last Name", { exact: true }).fill("Okafor");
    await page
      .getByRole("button", { name: "Register & Check In", exact: true })
      .click();
    await expect(
      page.getByText(
        failedCheckIn
          ? "Visitor registered, but the check-in failed."
          : "Amina Okafor checked in",
        { exact: true },
      ),
    ).toBeVisible();
    expect(writes).toEqual([
      {
        path: "visitors",
        body: expect.objectContaining({
          firstName: "Amina",
          lastName: "Okafor",
        }),
      },
      {
        path: "attendance",
        body: expect.objectContaining({
          serviceId: "service-a",
          visitorId: "visitor-new",
          category: "unspecified",
          source: "manual",
        }),
      },
    ]);
    await expect(page).toHaveURL(/\/visitors\/visitor-new$/);
  });

test("duplicate member check-ins remain skipped and selections clear after the response", async ({
  page,
  context,
}) => {
  await fixture(context);
  await context.route("**/api/backend/members?**", (route) =>
    route.fulfill({
      json: {
        success: true,
        data: {
          data: [
            {
              memberId: "member-a",
              firstName: "Grace",
              lastName: "Adeyemi",
              status: "active",
            },
          ],
          meta: { page: 1, totalPages: 1, total: 1 },
        },
      },
    }),
  );
  const writes: Record<string, unknown>[] = [];
  await context.route("**/api/backend/attendance/bulk", async (route) => {
    writes.push(route.request().postDataJSON());
    await route.fulfill({
      json: { success: true, data: { recorded: 0, skipped: 1 } },
    });
  });
  await page.goto("/attendance/check-in");
  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: /Sunday Service/ }).click();
  const roster = page.getByLabel("Attendance roster", { exact: true });
  await roster
    .getByRole("checkbox", { name: "Select Grace Adeyemi", exact: true })
    .click();
  await roster
    .getByRole("button", { name: "Mark attendance (1)", exact: true })
    .click();
  await expect(
    page.getByText("1 already recorded and skipped.", { exact: true }),
  ).toBeVisible();
  await expect(roster.getByText("0 selected", { exact: true })).toBeVisible();
  expect(writes).toEqual([
    expect.objectContaining({
      serviceId: "service-a",
      category: "unspecified",
      records: [{ memberId: "member-a" }],
    }),
  ]);
});
