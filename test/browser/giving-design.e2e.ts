import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import fs from "node:fs/promises";

test.use({ serviceWorkers: "block" });
const stamp = "2026-10-10T10:00:00Z";
type Options = {
  hq?: boolean;
  dashboardOnly?: boolean;
  readOnly?: boolean;
  denied?: boolean;
  noPlan?: boolean;
  empty?: boolean;
  fail?: boolean;
  reportsOnly?: boolean;
};
async function fixture(context: BrowserContext, options: Options = {}) {
  const calls: {
    url: URL;
    method: string;
    body: Record<string, unknown> | null;
  }[] = [];
  let failure = options.fail ?? false;
  let recorded = 0;
  const categories = [
    {
      categoryId: "cat-a",
      name: "Offering",
      description: "Weekly gifts",
      isActive: true,
      isRecurring: true,
      churchId: "church-a",
      createdAt: stamp,
      updatedAt: stamp,
    },
    {
      categoryId: "cat-b",
      name: "Building Fund",
      isActive: false,
      isRecurring: false,
      churchId: "church-a",
      createdAt: stamp,
      updatedAt: stamp,
    },
  ];
  const schedules = [
    {
      id: "schedule-a",
      churchId: "church-a",
      memberId: "member-a",
      memberName: "Grace Adeyemi",
      categoryId: "cat-a",
      categoryName: "Offering",
      amount: 2500,
      currency: "NGN",
      frequency: "monthly",
      isActive: true,
      failedAttemptCount: 0,
      nextChargeDate: "2026-11-01",
      createdAt: stamp,
    },
    {
      id: "schedule-b",
      churchId: "church-a",
      memberId: "member-b",
      memberName: "David Okoro",
      categoryName: "Offering",
      amount: 1000,
      currency: "NGN",
      frequency: "weekly",
      isActive: false,
      failedAttemptCount: 2,
      nextChargeDate: "2026-11-01",
      createdAt: stamp,
    },
  ];
  const successRows = Array.from({ length: 205 }, (_, i) => ({
    transactionId: `tx-${i}`,
    churchId: "church-a",
    branchId: "branch-a",
    branchName: "Main Branch",
    memberId: "member-a",
    memberName: `Giver ${i}`,
    categoryId: "cat-a",
    categoryName: i === 0 ? "" : i % 2 ? "Offering" : "Building Fund",
    amount: 100,
    currency: "NGN",
    type: i % 2 ? "cash" : "bank_transfer",
    paymentMethod: i % 2 ? "cash" : "bank_transfer",
    status: "success",
    paymentGateway: "manual",
    receiptNumber: `2026/OFF/${i}`,
    paymentReference: `PAY-${i}`,
    givingDate: i < 100 ? "2026-10-10" : "2026-10-20",
    createdAt: stamp,
    updatedAt: stamp,
  }));
  const allRows = [
    ...["pending", "failed", "reversed"].map((status, i) => ({
      ...successRows[0],
      transactionId: `state-${i}`,
      memberName: `State ${i}`,
      status,
    })),
    ...successRows,
    {
      ...successRows[0],
      transactionId: "usd-a",
      memberName: "USD giver",
      currency: "USD",
      amount: 9000,
    },
  ];
  await context.addCookies([
    {
      name: "belivrhq_token",
      value: "giving-design",
      url: "http://127.0.0.1:3107",
    },
  ]);
  await context.route("https://**", (route) => route.abort());
  await context.route("https://embed.tawk.to/**", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: "Object.assign(window.Tawk_API,{showWidget(){},hideWidget(){},maximize(){},shutdown(){}});window.Tawk_API?.onLoad?.();",
    }),
  );
  await context.route("**/api/session", (route) =>
    route.fulfill({ json: { hasSession: true } }),
  );
  await context.route("**/api/backend/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname.replace("/api/backend", "");
    const method = request.method(),
      body = request.postDataJSON();
    calls.push({ url, method, body });
    if (path === "/giving/dashboard/charts" && failure)
      return route.fulfill({
        status: 503,
        json: { message: "Temporary aggregate failure" },
      });
    if (path.endsWith("/receipt"))
      return route.fulfill({
        contentType: "application/pdf",
        body: "%PDF-1.4\nMock receipt",
      });
    let data: unknown = [];
    if (path === "/profiles/me")
      data = {
        profileId: "profile-a",
        userId: "user-a",
        churchId: "church-a",
        branchId: "branch-a",
        branch: { name: "Main Branch" },
        church: { name: "Grace Church" },
        isAdminHq: options.hq ?? false,
        status: "active",
        firstName: "Grace",
        lastName: "Admin",
        role: ["staff"],
        planFeatures: options.noPlan ? [] : ["giving", "reports", "email"],
        permissions: options.denied
          ? []
          : options.dashboardOnly
            ? ["giving:dashboard:read", "branches:read"]
            : options.reportsOnly
              ? ["giving:reports:read", "branches:read"]
              : [
                  "giving:dashboard:read",
                  "giving:records:read",
                  "giving:reports:read",
                  "giving:categories:read",
                  "giving:recurring:read",
                  "branches:read",
                  "attendance:services:read",
                  "members:all:read",
                  ...(options.readOnly
                    ? []
                    : [
                        "giving:records:create",
                        "giving:categories:create",
                        "giving:categories:update",
                        "giving:categories:delete",
                        "giving:recurring:create",
                        "giving:recurring:update",
                      ]),
                ],
      };
    else if (path === "/giving/dashboard/charts") {
      const currency = url.searchParams.get("currency") || "NGN";
      const total = options.empty
        ? 0
        : currency === "USD"
          ? 9000
          : 20500 + recorded;
      data = {
        currency,
        total,
        count: total ? 205 : 0,
        trend: total
          ? [
              { date: "2026-10-10", total: total / 2 },
              { date: "2026-10-20", total: total / 2 },
            ]
          : [],
        byCategory: total
          ? [
              {
                categoryId: "cat-a",
                categoryName: "Offering",
                total: total - 100,
                count: 204,
              },
              {
                categoryId: null,
                categoryName: "Uncategorized",
                total: 100,
                count: 1,
              },
            ]
          : [],
      };
    } else if (path === "/giving/transactions") {
      let rows = options.empty ? [] : allRows;
      const status = url.searchParams.get("status"),
        type = url.searchParams.get("type"),
        branch = url.searchParams.get("branchId");
      if (status) rows = rows.filter((row) => row.status === status);
      if (type) rows = rows.filter((row) => row.type === type);
      if (branch) rows = rows.filter((row) => row.branchId === branch);
      if (url.searchParams.get("startDate"))
        rows = rows.filter(
          (row) => row.givingDate >= url.searchParams.get("startDate")!,
        );
      if (url.searchParams.get("endDate"))
        rows = rows.filter(
          (row) => row.givingDate <= url.searchParams.get("endDate")!,
        );
      const page = Number(url.searchParams.get("page") || 1),
        limit = Number(url.searchParams.get("limit") || 15);
      data = {
        data: rows.slice((page - 1) * limit, page * limit),
        meta: {
          page,
          limit,
          total: rows.length,
          totalPages: Math.ceil(rows.length / limit),
        },
      };
    } else if (path === "/giving/cash") {
      recorded += Number(body?.amount ?? 0);
      data = {
        ...successRows[0],
        ...body,
        transactionId: "new-gift",
        currency: "NGN",
      };
    } else if (path.endsWith("/send-receipt"))
      data = { message: "Receipt sent via email" };
    else if (path === "/giving/categories") {
      if (method === "POST") {
        const row = { ...categories[0], ...body, categoryId: "cat-new" };
        categories.push(row);
        data = row;
      } else {
        const archived = url.searchParams.get("archived") === "true";
        const rows = categories.filter(
          (row) => !!(row as { archivedAt?: string }).archivedAt === archived,
        );
        data = {
          data: rows,
          meta: { page: 1, limit: 15, total: rows.length, totalPages: 1 },
        };
      }
    } else if (path.startsWith("/giving/categories/")) {
      const category = categories.find(
        (row) => row.categoryId === path.split("/")[3],
      )!;
      if (path.endsWith("/archive"))
        Object.assign(category, { archivedAt: stamp });
      else if (path.endsWith("/restore"))
        Object.assign(category, { archivedAt: undefined });
      else if (method === "PATCH") Object.assign(category, body);
      else if (method === "DELETE")
        Object.assign(category, { isActive: false });
      data = category;
    } else if (path === "/giving/payment-options")
      data = { recurringAvailable: true };
    else if (path === "/giving/recurring") {
      if (method === "POST")
        data = { ...schedules[0], ...body, id: "schedule-new" };
      else
        data = {
          data: schedules,
          meta: { page: 1, limit: 15, total: schedules.length, totalPages: 1 },
        };
    } else if (path.startsWith("/giving/recurring/")) {
      const schedule = schedules.find((row) => row.id === path.split("/")[3])!;
      if (path.endsWith("/cancel"))
        schedules.splice(schedules.indexOf(schedule), 1);
      else schedule.isActive = path.endsWith("/resume");
      data = schedule;
    } else if (path === "/branches")
      data = {
        data: [
          { branchId: "branch-a", name: "Main Branch" },
          { branchId: "branch-b", name: "East Branch" },
        ],
        total: 2,
      };
    else if (path === "/services")
      data = {
        data: [
          {
            serviceId: "service-a",
            name: "Sunday Service",
            branchId: "branch-a",
          },
        ],
        meta: { page: 1, total: 1, totalPages: 1 },
      };
    else if (path === "/members" || path === "/members/search")
      data = {
        data: [
          {
            memberId: "member-a",
            firstName: "Grace",
            lastName: "Adeyemi",
            email: "grace@example.test",
            branchId: "branch-a",
            status: "active",
          },
        ],
        total: 1,
        meta: { page: 1, total: 1, totalPages: 1 },
      };
    else if (path.includes("unread")) data = { count: 0 };
    await route.fulfill({ json: { success: true, data } });
  });
  return {
    calls,
    recover: () => {
      failure = false;
    },
  };
}
const paths = <T extends { url: URL }>(calls: T[], path: string) =>
  calls.filter((call) => call.url.pathname === `/api/backend${path}`);

for (const hq of [false, true])
  test(`chart-only dashboard uses complete scoped aggregates without Analytics, HQ=${hq}`, async ({
    page,
    context,
  }) => {
    const { calls } = await fixture(context, { dashboardOnly: true, hq });
    await page.goto("/giving");
    const main = page.locator("#main-content");
    await expect(main.locator("[data-giving-chart]")).toHaveCount(2);
    await expect(main.locator("svg.recharts-surface")).toHaveCount(2);
    await expect(
      main.getByText("Uncategorized", { exact: true }),
    ).toBeVisible();
    await expect(
      main.getByText(
        /Recent Gifts|All-Time Total|Gifts This Month|Successful Gifts/,
      ),
    ).toHaveCount(0);
    await expect(
      main.getByRole("button", { name: "Record Giving", exact: true }),
    ).toHaveCount(0);
    const requests = paths(calls, "/giving/dashboard/charts");
    expect(requests).toHaveLength(1);
    expect(requests[0].url.searchParams.get("branchId")).toBe(
      hq ? null : "branch-a",
    );
    expect(requests[0].url.searchParams.get("currency")).toBe("NGN");
    expect(requests[0].url.searchParams.get("endDate")).toMatch(
      /T23:59:59\.999Z$/,
    );
    const start = new Date(requests[0].url.searchParams.get("startDate")!),
      end = new Date(requests[0].url.searchParams.get("endDate")!);
    expect(Math.round((end.getTime() - start.getTime()) / 86400000)).toBe(30);
    expect(paths(calls, "/giving/dashboard")).toHaveLength(0);
    expect(paths(calls, "/giving/transactions")).toHaveLength(0);
    await main
      .getByRole("combobox", { name: "Giving dashboard currency" })
      .click();
    await page.getByRole("option", { name: "USD", exact: true }).click();
    await expect(
      main.getByText("Daily successful giving · USD", { exact: true }),
    ).toBeVisible();
    await expect
      .poll(() =>
        paths(calls, "/giving/dashboard/charts").some(
          (call) => call.url.searchParams.get("currency") === "USD",
        ),
      )
      .toBe(true);
    if (hq) {
      await main.getByRole("combobox", { name: "Filter by branch" }).click();
      await page
        .getByRole("option", { name: "East Branch", exact: true })
        .click();
      await expect
        .poll(() =>
          paths(calls, "/giving/dashboard/charts").some(
            (call) => call.url.searchParams.get("branchId") === "branch-b",
          ),
        )
        .toBe(true);
    } else
      await expect(
        main.getByRole("combobox", { name: "Branch", exact: true }),
      ).toBeDisabled();
  });

for (const noPlan of [false, true])
  test(`missing dashboard access prevents aggregate requests, entitlement missing=${noPlan}`, async ({
    page,
    context,
  }) => {
    const { calls } = await fixture(context, { denied: !noPlan, noPlan });
    await page.goto("/giving");
    await expect(
      page.getByRole("heading", {
        name: noPlan
          ? "This feature is available on a different plan"
          : "Access denied",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator("[data-giving-chart]")).toHaveCount(0);
    expect(paths(calls, "/giving/dashboard/charts")).toHaveLength(0);
  });

test("aggregate errors retry without hiding controls and empty data stays honest", async ({
  page,
  context,
}) => {
  const state = await fixture(context, { dashboardOnly: true, fail: true });
  await page.goto("/giving");
  await expect(page.getByText("Unable to load giving trend.")).toBeVisible({
    timeout: 20000,
  });
  await expect(
    page.getByRole("combobox", { name: "Giving dashboard currency" }),
  ).toBeEnabled();
  state.recover();
  await page
    .getByRole("button", { name: "Retry", exact: true })
    .first()
    .click();
  await expect(
    page.locator("[data-giving-chart] svg.recharts-surface"),
  ).toHaveCount(2);
});

test("empty giving charts do not invent totals", async ({ page, context }) => {
  await fixture(context, { dashboardOnly: true, empty: true });
  await page.goto("/giving");
  await expect(page.getByText("No data yet.", { exact: true })).toHaveCount(2);
});

test("reports use all successful pages, separate currencies and export the displayed branch/date scope", async ({
  page,
  context,
}) => {
  const { calls } = await fixture(context, { hq: true });
  await page.goto("/giving/reports");
  await expect(
    page.getByText(/NGN 20,500\.00 · 205 successful gifts/),
  ).toBeVisible();
  await expect(
    page.locator("[data-giving-chart] svg.recharts-surface"),
  ).toHaveCount(3);
  await expect(page.getByText("Uncategorized", { exact: true })).toBeVisible();
  expect(
    paths(calls, "/giving/transactions").some(
      (call) =>
        call.url.searchParams.get("page") === "2" &&
        call.url.searchParams.get("status") === "success",
    ),
  ).toBe(true);
  await page.getByRole("combobox", { name: "Giving report currency" }).click();
  await page.getByRole("option", { name: "USD", exact: true }).click();
  await expect(
    page.getByText(/USD 9,000\.00 · 1 successful gifts/),
  ).toBeVisible();
  await page.getByRole("combobox", { name: "Giving report currency" }).click();
  await page.getByRole("option", { name: "NGN", exact: true }).click();
  await page.getByRole("combobox", { name: "Filter by branch" }).click();
  await page.getByRole("option", { name: "Main Branch", exact: true }).click();
  await page.getByLabel("Start date", { exact: true }).fill("2026-10-01");
  await page.getByLabel("End date", { exact: true }).fill("2026-10-31");
  await expect(
    page.getByText(/NGN 20,500\.00 · 205 successful gifts/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("menuitem", { name: "Export as CSV", exact: true })
    .click();
  const csv = await fs.readFile((await (await downloading).path())!, "utf8");
  expect(csv.trim().split("\n")).toHaveLength(206);
  expect(csv).not.toContain("USD giver");
  expect(csv).not.toContain("State 0");
  expect(csv).toContain("Giver 204");
  expect(
    paths(calls, "/giving/transactions").some(
      (call) =>
        call.url.searchParams.get("branchId") === "branch-a" &&
        call.url.searchParams.get("endDate") === "2026-10-31" &&
        call.url.searchParams.get("page") === "2",
    ),
  ).toBe(true);
});

test("report access does not grant transaction reads", async ({
  page,
  context,
}) => {
  const { calls } = await fixture(context, { reportsOnly: true });
  await page.goto("/giving/reports");
  await expect(
    page.getByText("Giving records access is required to load this report.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(paths(calls, "/giving/transactions")).toHaveLength(0);
});

test("record filters retain essential controls and apply secondary choices to full exports", async ({
  page,
  context,
}) => {
  const { calls } = await fixture(context);
  await page.goto("/giving/records");
  for (const status of ["Success", "Pending", "Failed", "Reversed"])
    await expect(page.getByText(status, { exact: true }).first()).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Giving status filter" }),
  ).toBeVisible();
  await page.getByRole("combobox", { name: "Giving status filter" }).click();
  await page.getByRole("option", { name: "Success", exact: true }).click();
  await page.getByRole("button", { name: "More filters", exact: true }).click();
  await page.getByRole("combobox", { name: "Giving method filter" }).click();
  await page.getByRole("option", { name: "Cash", exact: true }).click();
  await expect(page.getByLabel("1 active filters")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByLabel("From date", { exact: true }).fill("2026-10-01");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("menuitem", { name: "Export as CSV", exact: true })
    .click();
  await downloading;
  expect(
    paths(calls, "/giving/transactions").some(
      (call) =>
        call.url.searchParams.get("limit") === "100" &&
        call.url.searchParams.get("type") === "cash" &&
        call.url.searchParams.get("status") === "success" &&
        call.url.searchParams.get("branchId") === "branch-a",
    ),
  ).toBe(true);
  await page.getByRole("button", { name: /More filters/ }).click();
  await page
    .getByRole("button", { name: "Reset filters", exact: true })
    .click();
  await expect(page.getByLabel("From date", { exact: true })).toHaveValue("");
});

async function recordGift(page: Page, method: "Cash" | "Bank transfer") {
  await page
    .getByRole("button", { name: "Record Giving", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText("Amount (NGN) *", { exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Record Giving", exact: true })
    .click();
  await expect(
    page.getByText("Enter a valid amount", { exact: true }),
  ).toBeVisible();
  await dialog.getByLabel("Giving amount", { exact: true }).fill("2500");
  await dialog.getByRole("combobox", { name: "Giving method" }).click();
  await page.getByRole("option", { name: method, exact: true }).click();
  await dialog.getByRole("combobox", { name: "Giving category" }).click();
  await page.getByRole("option", { name: "Offering", exact: true }).click();
  await dialog.getByRole("button", { name: "Service", exact: true }).click();
  await dialog
    .getByRole("combobox")
    .filter({ hasText: "Select service" })
    .click();
  await page
    .getByRole("option", { name: "Sunday Service", exact: true })
    .click();
  await dialog
    .getByLabel("Giving notes", { exact: true })
    .fill("Existing service workflow");
  await dialog
    .getByRole("button", { name: "Record Giving", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
}
for (const method of ["Cash", "Bank transfer"] as const)
  test(`record ${method} keeps validation, linking and refreshes dashboard charts`, async ({
    page,
    context,
  }) => {
    const { calls } = await fixture(context);
    await page.goto("/giving");
    await expect(
      page.locator("[data-giving-chart] svg.recharts-surface"),
    ).toHaveCount(2);
    if (method === "Cash") {
      await page
        .getByRole("combobox", { name: "Giving dashboard currency" })
        .click();
      await page.getByRole("option", { name: "USD", exact: true }).click();
    }
    const beforeRecording = paths(calls, "/giving/dashboard/charts").length;
    await recordGift(page, method);
    expect(paths(calls, "/giving/cash").map((call) => call.body)).toEqual([
      expect.objectContaining({
        branchId: "branch-a",
        amount: 2500,
        type: method === "Cash" ? "cash" : "bank_transfer",
        categoryId: "cat-a",
        serviceId: "service-a",
        notes: "Existing service workflow",
      }),
    ]);
    await expect
      .poll(() => paths(calls, "/giving/dashboard/charts").length)
      .toBeGreaterThan(beforeRecording);
    expect(paths(calls, "/giving/cash")[0].body).not.toHaveProperty(
      "currency",
      "USD",
    );
  });

test("receipt actions retain downloads and supported email delivery", async ({
  page,
  context,
}) => {
  const { calls } = await fixture(context);
  await page.goto("/giving/records");
  await page
    .getByRole("button", { name: "Receipt actions", exact: true })
    .first()
    .click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: /Download/ }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^receipt-.*\.pdf$/);
  expect(download.suggestedFilename()).not.toContain("/");
  await page
    .getByRole("button", { name: "Receipt actions", exact: true })
    .first()
    .click();
  await page.getByRole("menuitem", { name: /Send/ }).click();
  await expect(page.getByRole("button", { name: /WhatsApp/ })).toHaveCount(0);
  await page.getByRole("button", { name: /Email/i }).click();
  await expect(
    page.getByText("Receipt sent via email", { exact: true }),
  ).toBeVisible();
  expect(
    calls.some(
      (call) =>
        call.url.pathname.endsWith("/send-receipt") &&
        call.body?.channel === "email",
    ),
  ).toBe(true);
});

test("categories retain create/edit and archive/restore confirmations in quiet menus", async ({
  page,
  context,
}) => {
  const { calls } = await fixture(context);
  await page.goto("/giving/categories");
  await page
    .getByRole("button", { name: "Add Category", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name", { exact: false }).fill("Mission Fund");
  await dialog
    .getByRole("button", { name: /Create Category|Add Category/ })
    .click();
  await expect(dialog).toHaveCount(0);
  expect(
    calls.some(
      (call) =>
        call.method === "POST" &&
        call.url.pathname.endsWith("/giving/categories") &&
        call.body?.name === "Mission Fund",
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "More actions", exact: true })
    .first()
    .click();
  await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
  await dialog.getByLabel("Name", { exact: false }).fill("Weekly Offering");
  await dialog
    .getByRole("button", { name: "Save Changes", exact: true })
    .click();
  await expect(
    page.getByText("Weekly Offering", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "More actions", exact: true })
    .first()
    .click();
  await page.getByRole("menuitem", { name: "Archive", exact: true }).click();
  expect(calls.some((call) => call.url.pathname.endsWith("/archive"))).toBe(
    false,
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Archive", exact: true })
    .click();
  await page.getByRole("button", { name: "More filters", exact: true }).click();
  await page.getByRole("button", { name: "Archived", exact: true }).click();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", {
      name: "Manage category Weekly Offering",
      exact: true,
    })
    .click();
  await page.getByRole("menuitem", { name: "Restore", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Restore", exact: true })
    .click();
  await expect
    .poll(() => calls.some((call) => call.url.pathname.endsWith("/restore")))
    .toBe(true);
});

test("recurring menus preserve pause, resume and cancel confirmations", async ({
  page,
  context,
}) => {
  const { calls } = await fixture(context);
  await page.goto("/giving/recurring");
  const trigger = page.getByRole("button", {
    name: "Manage schedule for Grace Adeyemi",
    exact: true,
  });
  await trigger.click();
  await page.getByRole("menuitem", { name: "Pause", exact: true }).click();
  expect(calls.some((call) => call.url.pathname.endsWith("/pause"))).toBe(
    false,
  );
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(trigger).toBeFocused();
  for (const action of ["Pause", "Resume", "Cancel"]) {
    await trigger.click();
    await page.getByRole("menuitem", { name: action, exact: true }).click();
    await page.getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect
      .poll(() =>
        calls.some(
          (call) =>
            call.url.pathname.endsWith(`/${action.toLowerCase()}`) &&
            call.method === "PATCH",
        ),
      )
      .toBe(true);
  }
});

test("recurring creation retains authorization and member/category payloads", async ({
  page,
  context,
}) => {
  const { calls } = await fixture(context);
  await page.goto("/giving/recurring");
  await page
    .getByRole("button", { name: "Create Recurring Giving", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText(/complete payment authorization/),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Select member...", exact: true })
    .click();
  await page.getByRole("option", { name: /Grace Adeyemi/ }).click();
  await dialog
    .getByRole("combobox", { name: "Recurring giving category" })
    .click();
  await page.getByRole("option", { name: "Offering", exact: true }).click();
  await dialog.getByLabel("Amount (NGN)", { exact: true }).fill("2500");
  await dialog
    .getByRole("button", { name: "Create Schedule", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  expect(
    paths(calls, "/giving/recurring")
      .filter((call) => call.method === "POST")
      .map((call) => call.body),
  ).toEqual([
    expect.objectContaining({
      branchId: "branch-a",
      memberId: "member-a",
      categoryId: "cat-a",
      email: "grace@example.test",
      amount: 2500,
      frequency: "monthly",
    }),
  ]);
});

test("read-only staff keep receipts and tables but no mutation controls", async ({
  page,
  context,
}) => {
  const { calls } = await fixture(context, { readOnly: true });
  for (const route of [
    "/giving",
    "/giving/records",
    "/giving/categories",
    "/giving/recurring",
  ]) {
    await page.goto(route);
    await expect(page.locator("#main-content h1")).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: /^(Record Giving|Add Category|Create Recurring Giving|More actions|Manage schedule for .*)$/,
      }),
    ).toHaveCount(0);
  }
  expect(calls.some((call) => call.method !== "GET")).toBe(false);
});

test("desktop/mobile and light/dark previews retain fixed teal branding", async ({
  page,
  context,
}) => {
  await fixture(context);
  await context.addInitScript(() =>
    localStorage.setItem(
      "belivrhq:appearance:v1:profile-a:church-a",
      JSON.stringify({ accent: "#7c3aed" }),
    ),
  );
  const directory = "/tmp/belivrhq-giving-previews";
  await fs.mkdir(directory, { recursive: true });
  for (const [route, name] of [
    ["/giving", "dashboard"],
    ["/giving/records", "records"],
    ["/giving/reports", "reports"],
    ["/giving/categories", "categories"],
    ["/giving/recurring", "recurring"],
  ]) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(route);
    await expect(page.locator("#main-content h1")).toBeVisible();
    if (name === "dashboard")
      await expect(
        page.locator("[data-giving-chart] svg.recharts-surface"),
      ).toHaveCount(2);
    if (name === "reports")
      await expect(
        page.locator("[data-giving-chart] svg.recharts-surface"),
      ).toHaveCount(3);
    await page.screenshot({
      path: `${directory}/${name}-desktop.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: `${directory}/${name}-mobile.png`,
      fullPage: true,
      animations: "disabled",
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("button", { name: /dark mode/ })
      .click();
    await page.screenshot({
      path: `${directory}/${name}-dark-mobile.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({
      path: `${directory}/${name}-dark-desktop.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page
      .getByRole("button", { name: /light mode/ })
      .click();
    if (name === "records") {
      await page
        .getByRole("button", { name: "Record Giving", exact: true })
        .first()
        .click();
      await expect(
        page.getByRole("dialog").getByText("Gift details", { exact: true }),
      ).toBeVisible();
      await page.screenshot({
        path: `${directory}/record-form.png`,
        fullPage: true,
        animations: "disabled",
      });
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Cancel", exact: true })
        .click();
    }
  }
});

test("recording retains entered values after validation failure and preserves cancel-and-reopen reset behavior", async ({
  page,
  context,
}) => {
  const { calls } = await fixture(context);
  await page.goto("/giving/records");
  await page
    .getByRole("button", { name: "Record Giving", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Giving amount", { exact: true }).fill("1234");
  await dialog
    .getByLabel("Giving notes", { exact: true })
    .fill("Unsaved giving context");
  await dialog
    .getByRole("button", { name: "Record Giving", exact: true })
    .click();
  await expect(
    page.getByText("Failed to record giving", { exact: true }),
  ).toBeVisible();
  await expect(dialog.getByLabel("Giving amount", { exact: true })).toHaveValue(
    "1234",
  );
  await expect(dialog.getByLabel("Giving notes", { exact: true })).toHaveValue(
    "Unsaved giving context",
  );
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("button", { name: "Record Giving", exact: true })
    .first()
    .click();
  await expect(dialog.getByLabel("Giving amount", { exact: true })).toHaveValue(
    "",
  );
  await expect(dialog.getByLabel("Giving notes", { exact: true })).toHaveValue(
    "",
  );
  expect(paths(calls, "/giving/cash")).toHaveLength(0);
});
