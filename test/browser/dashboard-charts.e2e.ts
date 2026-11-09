import { test, expect, type BrowserContext, type Page } from "@playwright/test";

declare global {
  interface Window {
    dashboardCalls: { path: string; method: string }[];
    failDashboardGiving: boolean;
  }
}

async function setup(
  context: BrowserContext,
  options: {
    hq?: boolean;
    analytics?: boolean;
    modules?: boolean;
    reports?: boolean;
    empty?: boolean;
    failGiving?: boolean;
    features?: string[];
  } = {},
) {
  await context.addCookies([
    {
      name: "belivrhq_token",
      value: "dashboard-fixture",
      url: "http://127.0.0.1:3107",
    },
  ]);
  await context.addInitScript(
    ({
      hq = true,
      analytics = false,
      modules = true,
      reports = true,
      empty = false,
      failGiving = false,
      features = ["giving", "events", "forms"],
    }) => {
      const native = window.fetch.bind(window);
      window.dashboardCalls = [];
      window.failDashboardGiving = failGiving;
      let read = false;
      const notification = () => ({
        id: "notice-a",
        type: "system",
        title: "Dashboard fixture notice",
        body: "Existing notification details",
        createdAt: "2026-10-28T08:00:00Z",
        ...(read ? { readAt: "2026-10-28T09:00:00Z" } : {}),
      });
      window.fetch = async (input, init) => {
        const url = new URL(
          input instanceof Request ? input.url : String(input),
          location.origin,
        );
        if (!url.pathname.startsWith("/api/")) return native(input, init);
        window.dashboardCalls.push({
          path: url.pathname + url.search,
          method: init?.method ?? "GET",
        });
        if (url.pathname === "/api/session")
          return Response.json({ hasSession: true });
        const path = url.pathname.replace("/api/backend", "");
        let data: unknown = [];
        const total = url.searchParams.get("branchId") === "branch-b" ? 7 : 42;
        const point = {
          date: "2026-10-27",
          total,
          members: total - 2,
          visitors: 2,
        };
        if (path === "/profiles/me")
          data = {
            profileId: "profile-a",
            churchId: "church-a",
            branchId: "branch-a",
            branch: { name: "Branch A" },
            church: { name: "Fixture Church" },
            firstName: "Grace",
            lastName: "Adeyemi",
            email: "grace@example.test",
            status: "active",
            role: ["church_admin"],
            isAdminHq: hq,
            planFeatures: features,
            permissions: [
              "branches:read",
              ...(modules
                ? [
                    "giving:dashboard:read",
                    "members:all:read",
                    "attendance:dashboard:read",
                    ...(reports ? ["attendance:reports:read"] : []),
                  ]
                : []),
              "events:list:read",
              "attendance:checkin:read",
              "visitors:list:read",
              "forms:read",
              ...(analytics
                ? [
                    "analytics:attendance:read",
                    "analytics:giving:read",
                    "analytics:members:read",
                  ]
                : []),
            ],
          };
        else if (path === "/branches")
          data = {
            data: [
              { branchId: "branch-a", name: "Branch A" },
              { branchId: "branch-b", name: "Branch B" },
            ],
            total: 2,
          };
        else if (path === "/members/dashboard")
          data = {
            total: empty ? 0 : total,
            byStatus: empty ? {} : { active: total - 3, inactive: 3 },
            byGender: {},
            byAgeGroup: empty
              ? {}
              : { age_18_30: 15, age_31_45: 20, age_46_60: 7 },
            growth: empty
              ? []
              : [
                  { ...point, date: "2026-07-01", total: 15 },
                  { ...point, date: "2026-08-01", total: 30 },
                  { ...point, date: "2026-09-01" },
                ],
          };
        else if (path === "/attendance/summary")
          data = {
            totalCheckIns: empty ? 0 : total,
            memberCheckIns: empty ? 0 : total - 2,
            visitorCheckIns: empty ? 0 : 2,
            bySource: {},
            byCategory: {},
            byGender: {},
          };
        else if (path === "/attendance/trends")
          data = empty
            ? []
            : [
                {
                  ...point,
                  date: "2026-10-12",
                  total: 24,
                  members: 20,
                  visitors: 4,
                },
                {
                  ...point,
                  date: "2026-10-20",
                  total: 35,
                  members: 30,
                  visitors: 5,
                },
                point,
              ];
        else if (path === "/giving/dashboard/charts") {
          if (window.failDashboardGiving)
            return Response.json(
              {
                success: false,
                error: { message: "Fixture giving unavailable" },
              },
              { status: 500 },
            );
          data = {
            total: empty ? 0 : total,
            count: 2,
            currency: url.searchParams.get("currency") ?? "NGN",
            trend: empty
              ? []
              : [
                  { ...point, date: "2026-10-12", total: 20 },
                  { ...point, date: "2026-10-20", total: 35 },
                  point,
                ],
            byCategory: empty
              ? []
              : [
                  {
                    categoryId: "cat-a",
                    categoryName: "Offering",
                    total: total - 10,
                    count: 1,
                  },
                  {
                    categoryId: "cat-b",
                    categoryName: "Tithes",
                    total: 10,
                    count: 1,
                  },
                ],
          };
        } else if (path === "/giving/dashboard")
          data = { monthTotal: 100, allTimeTotal: 500, count: 3, trend: [] };
        else if (path === "/events") data = { data: [], total: 0 };
        else if (path === "/audit") data = { data: [], total: 0 };
        else if (path === "/notifications")
          data = {
            data: [notification()],
            total: 1,
            unreadCount: read ? 0 : 1,
          };
        else if (path === "/notifications/unread-count")
          data = { count: read ? 0 : 1 };
        else if (path === "/notifications/notice-a/read") {
          read = true;
          data = notification();
        }
        return Response.json({ success: true, data });
      };
    },
    options,
  );
}

async function chartCalls(page: Page) {
  return page.evaluate(() =>
    window.dashboardCalls.filter((c) =>
      /\/(members\/dashboard|giving\/dashboard\/charts|attendance\/(summary|trends))/.test(
        c.path,
      ),
    ),
  );
}

async function assertNoAnalytics(page: Page) {
  expect(
    await page.evaluate(() =>
      window.dashboardCalls.filter((c) => c.path.includes("/analytics/")),
    ),
  ).toEqual([]);
}

test("task-led dashboard shows scoped charts without filters, KPI tiles or bulky feeds", async ({
  page,
  context,
}) => {
  await setup(context);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/dashboard");
  await expect(page.locator(".recharts-surface")).toHaveCount(6);
  await expect(
    page.locator(".recharts-pie-sector path").first(),
  ).toHaveAttribute("d", /A/);
  await expect(
    page.getByRole("region", { name: "Dashboard filters" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Start date")).toHaveCount(0);
  await expect(
    page.getByLabel("Dashboard branch", { exact: true }),
  ).toHaveCount(0);
  for (const title of [
    "Check-ins · selected period",
    "Giving · selected period",
    "Current members",
    "Upcoming events",
    "Unread notifications",
    "Recent Activity",
    "Recent Notifications",
  ]) {
    await expect(page.getByText(title, { exact: true })).toHaveCount(0);
  }
  const cards = page.locator("[data-dashboard-chart]");
  await expect(cards).toHaveCount(6);
  const boxes = await cards.evaluateAll((nodes) =>
    nodes.map((node) => {
      const box = node.getBoundingClientRect();
      return { height: box.height, y: box.y };
    }),
  );
  expect(boxes.every((box) => box.height <= 370)).toBe(true);
  expect(boxes[0].y).toBe(boxes[1].y);
  const colors = await page
    .locator("[data-dashboard-chart] svg [fill]")
    .evaluateAll((nodes) => [
      ...new Set(
        nodes
          .map((node) => getComputedStyle(node).fill)
          .filter((fill) => fill.startsWith("rgb")),
      ),
    ]);
  expect(colors.length).toBeGreaterThanOrEqual(5);
  await expect(
    page.getByRole("link", {
      name: "View details: Member composition",
      exact: true,
    }),
  ).toHaveAttribute("href", "/members");
  await expect(
    page.getByRole("link", { name: "View details: Giving trend", exact: true }),
  ).toHaveAttribute("href", "/giving");
  await assertNoAnalytics(page);
  const calls = await chartCalls(page);
  expect(calls.find((call) => call.path.includes("/giving/"))?.path).toContain(
    "currency=NGN",
  );
  expect(calls.find((call) => call.path.includes("/giving/"))?.path).toContain(
    "T23%3A59%3A59.999Z",
  );
  expect(calls.every((call) => !call.path.includes("branchId="))).toBe(true);
  const redundant = await page.evaluate(() =>
    window.dashboardCalls.filter((call) =>
      /\/(audit|events|branches)(?:\?|$)/.test(call.path),
    ),
  );
  expect(redundant).toEqual([]);
  await page.screenshot({
    path: test.info().outputPath("compact-dashboard-desktop.png"),
    fullPage: true,
  });
});

test("branch viewers retain own scope without a branch picker", async ({
  page,
  context,
}) => {
  await setup(context, { hq: false });
  await page.goto("/dashboard");
  await expect(page.locator(".recharts-surface")).toHaveCount(6);
  await expect.poll(async () => (await chartCalls(page)).length).toBe(3);
  expect(
    (await chartCalls(page)).every((call) =>
      call.path.includes("branchId=branch-a"),
    ),
  ).toBe(true);
  await expect(page.getByText("Last 30 days", { exact: false })).toContainText(
    "Branch A",
  );
});

test("missing module grants prevent chart rendering and requests", async ({
  page,
  context,
}) => {
  await setup(context, { modules: false });
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: "Your profile" })).toBeVisible();
  await expect(page.locator("[data-dashboard-chart]")).toHaveCount(0);
  expect(await chartCalls(page)).toEqual([]);
  await assertNoAnalytics(page);
});

test("giving entitlement still gates giving charts", async ({
  page,
  context,
}) => {
  await setup(context, { features: ["events", "forms"] });
  await page.goto("/dashboard");
  await expect(page.locator(".recharts-surface")).toHaveCount(4);
  expect(
    (await chartCalls(page)).some((call) => call.path.includes("/giving/")),
  ).toBe(false);
});

test("summary readers get attendance bars without report access", async ({
  page,
  context,
}) => {
  await setup(context, { reports: false });
  await page.goto("/dashboard");
  await expect(page.locator(".recharts-surface")).toHaveCount(6);
  await expect(
    page.getByRole("heading", { name: "Attendance breakdown", exact: true }),
  ).toBeVisible();
  expect(
    (await chartCalls(page)).some((call) =>
      call.path.includes("/attendance/trends"),
    ),
  ).toBe(false);
  expect(
    (await chartCalls(page)).some((call) =>
      call.path.includes("/attendance/summary"),
    ),
  ).toBe(true);
});

test("task shortcuts, profile and notification drawer actions remain available", async ({
  page,
  context,
}) => {
  await setup(context);
  await page.goto("/dashboard");
  const nav = page.getByRole("navigation", { name: "Common tasks" });
  for (const [label, href] of [
    ["Find a member", "/members"],
    ["Check in", "/attendance/check-in"],
    ["Follow up", "/visitors"],
    ["Events", "/events/list"],
    ["Forms", "/forms"],
  ]) {
    await expect(
      nav.getByRole("link", { name: new RegExp(`^${label}`) }),
    ).toHaveAttribute("href", href);
  }
  await expect(
    page.getByRole("link", { name: "Your profile", exact: true }),
  ).toHaveAttribute("href", "/profile");
  await page
    .getByRole("button", { name: "Notifications", exact: true })
    .last()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByText("Dashboard fixture notice", { exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Existing notification details",
  );
  await expect
    .poll(async () =>
      page.evaluate(() =>
        window.dashboardCalls.some(
          (call) =>
            call.path.endsWith("/notifications/notice-a/read") &&
            call.method === "PATCH",
        ),
      ),
    )
    .toBe(true);
  await assertNoAnalytics(page);
});

test("failed giving charts recover independently in compact cards", async ({
  page,
  context,
}) => {
  await setup(context, { failGiving: true });
  await page.goto("/dashboard");
  await expect(
    page.getByText("Unable to load giving trend.", { exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await expect(
    page.getByRole("heading", { name: "Member composition", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    window.failDashboardGiving = false;
  });
  await page
    .getByRole("alert")
    .filter({ hasText: "Unable to load giving trend." })
    .getByRole("button", { name: "Retry", exact: true })
    .click();
  await expect(
    page.getByText("Unable to load giving trend.", { exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".recharts-surface")).toHaveCount(6);
});

for (const empty of [true, false])
  test(`compact charts fit mobile with empty=${empty}`, async ({
    page,
    context,
  }) => {
    await setup(context, { empty });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard");
    if (empty)
      await expect(page.getByText("No data yet.", { exact: true })).toHaveCount(
        6,
      );
    else await expect(page.locator(".recharts-surface")).toHaveCount(6);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: test.info().outputPath(`compact-dashboard-mobile-${empty}.png`),
      fullPage: true,
    });
  });

test("colorful charts remain readable in dark mode", async ({
  page,
  context,
}) => {
  await setup(context);
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.locator(".recharts-surface")).toHaveCount(6);
  await page.screenshot({
    path: test.info().outputPath("compact-dashboard-dark.png"),
    fullPage: true,
  });
});
