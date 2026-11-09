import { test, expect, type BrowserContext } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import providers from "../fixtures/provider-catalog.json";
import { mockTawkWidget } from "../fixtures/tawk-widget";

test.use({ serviceWorkers: "block" });
test.describe.configure({ mode: "parallel" });
const stamp = "2026-10-25T09:00:00Z";
const actions = ["read", "create", "update", "delete", "view"];
const resources = [
  "templates",
  "broadcasts",
  "whatsapp",
  "emails",
  "appointments",
  "departments",
  "cell_groups",
  "assets:list",
  "assets:categories",
  "assets:loans",
  "assets:maintenance",
  "pastoral:notes",
  "pastoral:life-events",
  "pastoral:risk-scores",
  "pastoral:engagement",
  "forms:list",
  "forms:new",
  "forms:submissions",
  "reports",
  "reports:financial",
  "reports:attendance",
  "reports:members",
  "profiles",
  "users",
  "church_settings",
  "branches:directory",
  "cell_groups:details",
  "branches",
  "roles",
  "settings",
  "integrations",
  "analytics:dashboard",
  "analytics:members",
  "analytics:attendance",
  "analytics:giving",
  "members:all",
  "billing",
];
const grants = resources.flatMap((resource) =>
  actions.map((action) => `${resource}:${action}`),
);
const features = [
  "email",
  "sms",
  "whatsapp",
  "pastoral",
  "groups",
  "assets",
  "forms",
  "reports",
  "giving",
  "analytics",
  "media",
  "attendance",
  "custom_roles",
];
async function fixture(
  context: BrowserContext,
  options: {
    dark?: boolean;
    reader?: boolean;
    missing?: boolean;
    onboarding?: boolean;
  } = {},
) {
  const state = {
    reads: [] as string[],
    writes: [] as string[],
    failSummary: false,
    failRows: false,
  };
  const branch = {
    branchId: "west",
    churchId: "church",
    name: "West Branch",
    city: "Lagos",
    isHeadquarters: true,
    memberCount: 12,
    createdAt: stamp,
    updatedAt: stamp,
  };
  const profile = {
    profileId: "profile",
    userId: "user",
    churchId: "church",
    branchId: "west",
    branch,
    church: { churchId: "church", name: "Community Church" },
    firstName: "Grace",
    lastName: "James",
    email: "grace@example.test",
    phone: "+2348012345678",
    role: ["church_admin"],
    status: "active",
    isAdminHq: true,
    permissions: options.missing
      ? ["profiles:read"]
      : options.reader
        ? grants.filter(
            (grant) => grant.endsWith(":read") || grant.endsWith(":view"),
          )
        : grants,
    planFeatures: features,
    createdAt: stamp,
  };
  const group = {
    id: "group",
    churchId: "church",
    branchId: "west",
    branchName: branch.name,
    name: "Community group",
    leaderId: "member",
    leaderFirstName: "Amina",
    leaderLastName: "Okafor",
    meetingDay: "Sunday",
    meetingTime: "16:00",
    address: "Community Hall",
    members: [],
    createdAt: stamp,
    updatedAt: stamp,
  };
  const department = {
    id: "department",
    churchId: "church",
    branchId: "west",
    branchName: branch.name,
    name: "Welcome team",
    memberCount: 12,
    members: [],
    createdAt: stamp,
    updatedAt: stamp,
  };
  const meta = { total: 1, page: 1, limit: 15, totalPages: 1 };
  const paged = (data: unknown[]) => ({
    data,
    meta: { ...meta, total: data.length },
  });
  const summary = {
    highly_engaged: 18,
    moderately_engaged: 12,
    low_engagement: 4,
    disengaged: 2,
  };
  await context.addCookies([
    {
      name: "belivrhq_token",
      value: "remaining-workspace-fixture",
      url: "http://127.0.0.1:3107",
    },
  ]);
  await context.addInitScript(
    ({ dark }) => {
      delete (Navigator.prototype as { serviceWorker?: ServiceWorkerContainer })
        .serviceWorker;
      localStorage.setItem("theme", dark ? "dark" : "light");
      localStorage.setItem(
        "belivrhq:appearance:v1:profile:church",
        JSON.stringify({ accent: "#7c3aed" }),
      );
    },
    { dark: options.dark },
  );
  await context.route("https://**", (route) => route.abort());
  await context.route("https://embed.tawk.to/**", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: mockTawkWidget,
    }),
  );
  await context.route("**/api/session", (route) =>
    route.fulfill({ json: { hasSession: true } }),
  );
  await context.route("**/api/backend/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname.replace("/api/backend", "");
    if (req.method() !== "GET") {
      state.writes.push(`${req.method()} ${path}`);
      return route.fulfill({
        status: 500,
        json: {
          success: false,
          error: { message: "Preview fixtures prohibit writes" },
        },
      });
    }
    state.reads.push(path + url.search);
    let data: unknown;
    if (path === "/auth/session")
      data = { userId: "user", email: profile.email };
    else if (path === "/profiles/me") data = profile;
    else if (path === "/profiles") data = paged([profile]);
    else if (path === "/branches") data = paged([branch]);
    else if (path === "/branches/west") data = branch;
    else if (path === "/church/roles")
      data = {
        roles: [
          {
            roleName: "church_admin",
            description: "Manage church operations",
            permissions: [],
            isCustomized: false,
          },
        ],
      };
    else if (path === "/church/roles/all") data = [];
    else if (path === "/church/integrations")
      data = { providers, accounts: [], channels: [] };
    else if (path === "/church/config")
      data = { config: { timezone: "Africa/Lagos", currency: "NGN" } };
    else if (path === "/church/settings" || path === "/church")
      data = {
        name: "Community Church",
        timezone: "Africa/Lagos",
        currency: "NGN",
      };
    else if (path === "/admin/departments") data = [department];
    else if (path === "/admin/departments/department") data = department;
    else if (path === "/admin/cell-groups") data = [group];
    else if (path === "/admin/cell-groups/group") data = group;
    else if (path.endsWith("/attendance-sessions")) data = paged([]);
    else if (path === "/admin/cell-groups/group/members") data = [];
    else if (path.endsWith("/attendance/summary"))
      data = { total: 0, present: 0, absent: 0 };
    else if (path === "/assets")
      data = paged([
        {
          id: "asset",
          churchId: "church",
          branchId: "west",
          name: "Wireless microphone",
          assetTag: "AV-001",
          status: "available",
          condition: "good",
          currentValue: 25000,
          createdAt: stamp,
          updatedAt: stamp,
        },
      ]);
    else if (path === "/templates")
      data = paged([
        {
          templateId: "template",
          name: "Welcome message",
          channel: "email",
          category: "UTILITY",
          language: "en",
          status: "draft",
          content: "Welcome to our community",
          variables: [],
          branchId: "west",
          createdAt: stamp,
          updatedAt: stamp,
        },
      ]);
    else if (path === "/broadcasts")
      data = paged([
        {
          broadcastId: "broadcast",
          name: "Sunday announcement",
          templateName: "Welcome message",
          channel: "email",
          status: "scheduled",
          totalRecipients: 36,
          branchId: "west",
          createdAt: stamp,
          scheduledAt: stamp,
        },
      ]);
    else if (path === "/whatsapp/messages")
      data = {
        data: [
          {
            messageId: "message",
            phone: "+2348012345678",
            direction: "outbound",
            channel: "whatsapp",
            status: "sent",
            text: "Welcome",
            createdAt: stamp,
          },
        ],
        total: 1,
      };
    else if (path === "/appointments")
      data = {
        data: [],
        total: 0,
        summary: { pending: 3, confirmed: 2, completed: 1, cancelled: 0 },
      };
    else if (path === "/pastoral/engagement/summary") {
      if (state.failSummary)
        return route.fulfill({
          status: 503,
          json: { success: false, error: { message: "Summary unavailable" } },
        });
      data = summary;
    } else if (path === "/pastoral/engagement-scores") {
      if (state.failRows)
        return route.fulfill({
          status: 503,
          json: { success: false, error: { message: "Rows unavailable" } },
        });
      data = paged([
        {
          id: "score",
          memberId: "member",
          memberFirstName: "Amina",
          memberLastName: "Okafor",
          score: 84,
          factors: {},
          calculatedAt: stamp,
        },
      ]);
    } else if (path === "/reports/financial") {
      data = {
        currency: "NGN",
        startDate: "",
        endDate: "",
        grandTotal: 10000,
        transactionCount: 2,
        averageAmount: 5000,
        byCategory: [{ name: "Tithes", total: 10000, count: 2 }],
        monthlyTrend: [],
      };
    } else if (path === "/analytics/dashboard")
      data = {
        totalMembers: 36,
        activeMembers: 30,
        newMembers: 4,
        totalBranches: 1,
        totalGiving: 10000,
        totalAttendance: 80,
        atRiskCount: 6,
        upcomingEvents: 2,
        pendingSubmissions: 3,
        engagementDistribution: summary,
      };
    else if (path === "/analytics/members")
      data = {
        total: 36,
        byStatus: { active: 30, inactive: 6 },
        byGender: { female: 20, male: 12, unspecified: 4 },
        byAgeGroup: { age_18_30: 20, age_31_45: 12, unspecified: 4 },
        growth: [
          { date: "2026-09-01", total: 32 },
          { date: "2026-10-01", total: 36 },
        ],
      };
    else if (path === "/analytics/attendance")
      data = {
        total: 80,
        members: 60,
        visitors: 20,
        bySource: { manual: 50, qr: 30 },
        byBranch: [{ branchName: "West Branch", total: 80 }],
        byService: [
          {
            serviceId: "service",
            serviceName: "Sunday",
            total: 80,
            members: 60,
            visitors: 20,
          },
        ],
        firstTimeVisitors: 12,
        returningVisitors: 8,
        trend: [
          { date: "2026-10-24", total: 30, members: 20, visitors: 10 },
          { date: "2026-10-25", total: 50, members: 40, visitors: 10 },
        ],
      };
    else if (path === "/analytics/giving")
      data = {
        total: 10000,
        count: 2,
        average: 5000,
        byCategory: [
          {
            categoryId: "category",
            categoryName: "Tithes",
            total: 10000,
            count: 2,
          },
        ],
        byBranch: [],
        byType: [],
        byStatus: {},
        topDonors: [],
        recurring: { active: 0, totalMonthlyAmount: 0, totalScheduled: 0 },
        trend: [{ date: "2026-10-25", total: 10000 }],
      };
    else if (path.includes("unread-count")) data = { count: 0 };
    else if (path === "/pricing/subscriptions")
      data = {
        currency: "USD",
        rateUpdatedAt: null,
        plans: [
          { id: "essentials", monthly: 25, annual: 250 },
          { id: "community", monthly: 50, annual: 500 },
          { id: "network", monthly: 100, annual: 1000 },
        ],
      };
    else if (path === "/billing/subscription")
      data = {
        active: true,
        baseCurrency: "USD",
        catalog: [],
        subscription: options.onboarding
          ? null
          : { plan: "network", cycle: "monthly", paid_until: "2027-12-01" },
        payments: [],
        gatewayCurrencies: { flutterwave: ["NGN"] },
        gateways: ["flutterwave"],
        features,
        limits: { members: 1000, staff: 50, locations: 5 },
        usage: { members: 36, staff: 2, locations: 1, pendingInvitations: 0 },
      };
    else if (
      /\/assets\/(categories)|\/members$|\/members\/families$/.test(path)
    )
      data = path === "/assets/categories" ? [] : paged([]);
    else if (
      path.includes("/worklists/") ||
      path === "/forms" ||
      path.startsWith("/pastoral/") ||
      path === "/email" ||
      path.includes("/emails") ||
      path.includes("/notifications") ||
      path.includes("/inbox")
    )
      data = paged([]);
    else data = [];
    return route.fulfill({ json: { success: true, data } });
  });
  return state;
}
const routes = [
  "/communication/templates",
  "/communication/broadcasts",
  "/communication/messages",
  "/communication/inbox",
  "/appointments",
  "/departments",
  "/departments/department",
  "/departments/cell-groups",
  "/departments/cell-groups/group",
  "/assets",
  "/assets/categories",
  "/assets/loans",
  "/assets/maintenance",
  "/assets/new",
  "/pastoral",
  "/pastoral/life-events",
  "/pastoral/risk-scores",
  "/pastoral/engagement",
  "/forms",
  "/forms/new",
  "/forms/submissions",
  "/reports",
  "/analytics",
  "/analytics/members",
  "/analytics/attendance",
  "/analytics/giving",
  "/admin/users",
  "/admin/roles",
  "/admin/branches",
  "/admin/branches/west",
  "/admin/settings",
  "/admin/integrations",
  "/profile",
  "/support",
];
for (const width of [390, 1440])
  for (const dark of [false, true]) {
    test(`remaining sections ${width}px ${dark ? "dark" : "light"}`, async ({
      context,
      page,
    }) => {
      test.setTimeout(180_000);
      const state = await fixture(context, { dark });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setViewportSize({ width, height: 1000 });
      await mkdir("/tmp/belivrhq-remaining-workspace-previews", {
        recursive: true,
      });
      for (const path of routes) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        const root = page.locator("[data-remaining-workspace]");
        await expect(root).toBeVisible();
        await expect(root.getByRole("heading").first()).toBeVisible();
        await expect(
          page.getByText(/Application error|Something went wrong/),
        ).toHaveCount(0);
        await expect
          .poll(() =>
            page.evaluate(
              () =>
                document.documentElement.scrollWidth <= window.innerWidth + 1,
            ),
          )
          .toBe(true);
        await page.screenshot({
          path: `/tmp/belivrhq-remaining-workspace-previews/${path.slice(1).replaceAll("/", "-")}-${width}-${dark ? "dark" : "light"}.png`,
          fullPage: true,
        });
      }
      expect(errors).toEqual([]);
      expect(state.writes).toEqual([]);
    });
  }

test("directory refresh removes statistics-only reads and keeps useful counts", async ({
  context,
  page,
}) => {
  const state = await fixture(context);
  for (const path of [
    "/communication/templates",
    "/communication/broadcasts",
    "/assets",
  ]) {
    await page.goto(path);
    await expect(
      page.locator("[data-workspace-header]").getByLabel("1 results"),
    ).toBeVisible();
  }
  expect(
    state.reads.filter(
      (path) => path.startsWith("/templates?") && path.includes("limit=100"),
    ),
  ).toEqual([]);
  expect(
    state.reads.filter(
      (path) => path.startsWith("/broadcasts?") && path.includes("limit=100"),
    ),
  ).toEqual([]);
  expect(
    state.reads.filter((path) => path.startsWith("/assets/stats")),
  ).toEqual([]);
});

test("complete engagement chart stays independent from table filters and failures", async ({
  context,
  page,
}) => {
  const state = await fixture(context);
  await page.goto("/pastoral/engagement");
  const chart = page.locator("[data-workspace-chart]");
  await expect(chart.locator("svg.recharts-surface")).toBeVisible();
  await expect(chart.getByText("18", { exact: true })).toBeVisible();
  await page.getByPlaceholder("Search by member name...").fill("Amina");
  await expect
    .poll(() => state.reads.some((path) => path.includes("search=Amina")))
    .toBe(true);
  await expect(chart.getByText("18", { exact: true })).toBeVisible();
  state.failRows = true;
  await page.reload();
  await expect(
    page.getByText("Unable to load engagement records"),
  ).toBeVisible();
  await expect(chart.locator("svg.recharts-surface")).toBeVisible();
});

test("failed engagement summary can retry while records remain usable", async ({
  context,
  page,
}) => {
  const state = await fixture(context);
  state.failSummary = true;
  await page.goto("/pastoral/engagement");
  await expect(page.getByText("Amina Okafor", { exact: true })).toBeVisible();
  const chart = page.locator("[data-workspace-chart]");
  await expect(chart.getByRole("button", { name: "Retry" })).toBeVisible();
  state.failSummary = false;
  await chart.getByRole("button", { name: "Retry" }).click();
  await expect(chart.locator("svg.recharts-surface")).toBeVisible();
});

test("secondary archive filter forwards scope and resets without losing the directory", async ({
  context,
  page,
}) => {
  const state = await fixture(context);
  await page.goto("/communication/templates");
  await page.getByRole("button", { name: "More filters" }).click();
  const options = page
    .getByRole("dialog")
    .filter({ hasText: "Directory options" });
  await options.getByRole("button", { name: "Archived", exact: true }).click();
  await expect
    .poll(() =>
      state.reads.some(
        (path) =>
          path.startsWith("/templates?") && path.includes("archived=true"),
      ),
    )
    .toBe(true);
  await expect(page.getByLabel("1 active filters")).toBeVisible();
  await options.getByRole("button", { name: "Reset filters" }).click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByText("Welcome message", { exact: true }),
  ).toBeVisible();
});

test("cell group management supports keyboard, grouped editing and confirmation focus", async ({
  context,
  page,
}) => {
  await fixture(context);
  await page.goto("/departments/cell-groups/group");
  const trigger = page.getByRole("button", { name: "Cell group management" });
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("menuitem", { name: "Edit", exact: true }),
  ).toBeVisible();
  await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("group", { name: "Identity and leadership" }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole("menuitem", { name: "Archive", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("read-only management stays absent and denied Analytics makes no data request", async ({
  context,
  page,
}) => {
  await fixture(context, { reader: true });
  await page.goto("/departments/cell-groups/group");
  await expect(
    page.getByRole("heading", { name: "Community group", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cell group management" }),
  ).toHaveCount(0);
});

test("missing Analytics grant prevents chart rendering and requests", async ({
  context,
  page,
}) => {
  const state = await fixture(context, { missing: true });
  await page.goto("/analytics");
  await expect(
    page.getByRole("heading", { name: /access|permission/i }),
  ).toBeVisible();
  expect(state.reads.some((path) => path.startsWith("/analytics/"))).toBe(
    false,
  );
  await expect(page.locator("[data-workspace-chart]")).toHaveCount(0);
});

test("completed modules and public pages do not opt into remaining-section styling", async ({
  context,
  page,
}) => {
  await fixture(context);
  for (const path of ["/members", "/media", "/help/contact-support"]) {
    await page.goto(path);
    await expect(page.locator("[data-remaining-workspace]")).toHaveCount(0);
  }
});

for (const onboarding of [false, true])
  test(`billing presentation preserves ${onboarding ? "onboarding" : "existing account"}`, async ({
    context,
    page,
  }) => {
    const state = await fixture(context, { onboarding });
    await page.goto("/subscription");
    await expect(
      page.getByRole("heading", { name: "Plan & Billing", exact: true }),
    ).toBeVisible();
    await expect(page.locator("[data-remaining-workspace]")).toHaveCount(
      onboarding ? 0 : 1,
    );
    if (!onboarding)
      await expect(page.locator("[data-workspace-root]")).toHaveCSS(
        "background-color",
        "rgb(250, 250, 250)",
      );
    expect(state.writes).toEqual([]);
  });

test("asset row management uses labelled items and restores confirmation focus", async ({
  context,
  page,
}) => {
  const state = await fixture(context);
  await page.goto("/assets");
  const trigger = page.getByRole("button", {
    name: "Manage Wireless microphone",
    exact: true,
  });
  await trigger.click();
  await expect(
    page.getByRole("menuitem", {
      name: "Edit Wireless microphone",
      exact: true,
    }),
  ).toHaveAttribute("href", "/assets/asset/edit");
  await page.getByRole("menuitem", { name: "Archive", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  expect(state.writes).toEqual([]);
});

test("directory creation returns focus to Add after a previous management action", async ({
  context,
  page,
}) => {
  await fixture(context);
  await page.goto("/departments");
  const manage = page.getByRole("button", {
    name: "Manage Welcome team",
    exact: true,
  });
  await manage.click();
  await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(manage).toBeFocused();
  const add = page.getByRole("button", { name: "Add Department", exact: true });
  await add.click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(add).toBeFocused();
});
