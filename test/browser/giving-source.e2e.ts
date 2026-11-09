import { test, expect, type BrowserContext } from "@playwright/test";
import { readFile } from "node:fs/promises";

async function fixture(context: BrowserContext) {
  await context.addCookies([
    {
      name: "churchos_token",
      value: "giving-source-fixture",
      url: "http://127.0.0.1:3107",
    },
  ]);
  await context.route("https://embed.tawk.to/**", (route) =>
    route.fulfill({ body: "" }),
  );
  await context.route("**/api/session", (route) =>
    route.fulfill({ json: { hasSession: true } }),
  );
  const rows = [
    { transactionId: "general", amount: 100 },
    {
      transactionId: "service",
      amount: 200,
      serviceId: "service",
      serviceName: "Sunday Worship",
    },
    {
      transactionId: "event",
      amount: 300,
      eventId: "event",
      eventName: "Harvest event",
    },
    {
      transactionId: "group",
      amount: 400,
      givingType: "cell_group",
      cellGroupId: "group",
      cellGroupName: "West home",
      title: "West home — Meeting Giving",
      cellGroupMeetingDate: "2026-11-08",
    },
    {
      transactionId: "member",
      amount: 500,
      memberId: "ada",
      memberName: "Ada Rice",
    },
  ].map((row) => ({
    churchId: "church",
    categoryId: "offering",
    categoryName: "Offering",
    givingType: "normal",
    currency: "NGN",
    type: "cash",
    status: "success",
    paymentGateway: "manual",
    givingDate: "2026-11-08",
    createdAt: "2026-11-08T09:00:00Z",
    updatedAt: "2026-11-08T09:00:00Z",
    ...row,
  }));
  await context.route("**/api/backend/**", (route) => {
    const path = new URL(route.request().url()).pathname.replace(
      /^.*\/api\/backend/,
      "",
    );
    let data: unknown = {
      data: [],
      total: 0,
      meta: { total: 0, totalPages: 1 },
    };
    if (path === "/profiles/me")
      data = {
        profileId: "staff",
        userId: "staff",
        churchId: "church",
        branchId: "branch",
        isAdminHq: false,
        role: ["treasurer"],
        status: "active",
        firstName: "Staff",
        lastName: "Test",
        church: { churchId: "church", name: "Grace Church" },
        planFeatures: ["giving"],
        permissions: [
          "giving:read",
          "giving:records:read",
          "giving:reports:read",
          "giving:dashboard:read",
          "giving:categories:read",
        ],
      };
    if (path === "/giving/transactions")
      data = {
        data: rows,
        total: rows.length,
        meta: { total: rows.length, totalPages: 1, page: 1, limit: 100 },
      };
    if (path === "/giving/dashboard")
      data = {
        monthTotal: 1500,
        monthCount: 5,
        allTimeTotal: 1500,
        count: 5,
        trend: [],
      };
    if (path === "/giving/categories")
      data = {
        data: [{ categoryId: "offering", name: "Offering", isActive: true }],
        meta: { total: 1, totalPages: 1 },
      };
    return route.fulfill({ json: { success: true, data } });
  });
}

for (const width of [1280, 320])
  test(`ledger depicts collection sources instead of unnamed people at ${width}px`, async ({
    page,
    context,
  }) => {
    await fixture(context);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/giving/donations");
    await expect(page.getByRole("banner")).toContainText("Giving records");
    const table = page.getByRole("table", { name: "Records", exact: true });
    await expect(
      table.getByText("General giving", { exact: true }),
    ).toHaveCount(3);
    await expect(
      table.getByText("General collection", { exact: true }),
    ).toBeVisible();
    await expect(
      table.getByText("Service collection", { exact: true }),
    ).toBeVisible();
    await expect(
      table.getByText("Event collection", { exact: true }),
    ).toBeVisible();
    await table.locator('[data-giving-source="cell_group"]').scrollIntoViewIfNeeded();
    await expect(
      table
        .locator('[data-giving-source="cell_group"]')
        .getByText("West home", { exact: true }),
    ).toBeVisible();
    await table.locator('[data-giving-source="member"]').scrollIntoViewIfNeeded();
    await expect(
      table
        .locator('[data-giving-source="member"]')
        .getByText("Ada Rice", { exact: true }),
    ).toBeVisible();
    await expect(table.locator('[data-giving-source="general"]')).toHaveCount(
      3,
    );
    await expect(
      table.locator('[data-giving-source="cell_group"]'),
    ).toHaveCount(1);
    await expect(table).not.toContainText(
      /Unattributed|Anonymous|Sunday collection/i,
    );
    await page.screenshot({
      path: `/tmp/churchos-giving-source-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
  });

test("recent gifts use the same general/group/member identities", async ({
  page,
  context,
}) => {
  await fixture(context);
  await page.goto("/giving/overview");
  await expect(page.locator('[data-giving-source="general"]')).toHaveCount(3);
  await expect(page.getByText("West home", { exact: true })).toBeVisible();
  await expect(page.getByText("Ada Rice", { exact: true })).toBeVisible();
  await expect(page.locator("main")).not.toContainText(
    /Unattributed|Anonymous/i,
  );
});

for (const path of ["/giving/donations", "/giving/statements"])
  test(`${path} exports source labels and collection context`, async ({
    page,
    context,
  }) => {
    await fixture(context);
    await page.goto(path);
    await page.getByRole("button", { name: "Export", exact: true }).click();
    const downloadPromise = page.waitForEvent("download");
    await page
      .getByRole("menuitem", { name: "Export as CSV", exact: true })
      .click();
    const download = await downloadPromise;
    const csv = await readFile((await download.path())!, "utf8");
    expect(csv).toContain("Giving source");
    for (const label of [
      "General giving",
      "Sunday Worship",
      "Harvest event",
      "West home",
      "Ada Rice",
    ])
      expect(csv).toContain(label);
    expect(csv).not.toMatch(/Unattributed|Anonymous/i);
  });

test("giving categories uses the renamed navigation and page heading", async ({
  page,
  context,
}) => {
  await fixture(context);
  await page.goto("/giving/funds");
  await expect(page.getByRole("banner")).toContainText("Giving categories");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Giving categories.",
  );
  await expect(page.getByText("Offering", { exact: true })).toBeVisible();
});
