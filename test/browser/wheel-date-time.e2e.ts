import { test, expect, type BrowserContext } from "@playwright/test";

async function fixture(context: BrowserContext, staff = false) {
  await context.route("https://embed.tawk.to/**", (route) =>
    route.fulfill({ body: "" }),
  );
  if (staff)
    await context.addCookies([
      {
        name: "belivrhq_token",
        value: "wheel-fixture",
        url: "http://127.0.0.1:3107",
      },
    ]);
  await context.route("**/api/session", (route) =>
    route.fulfill({ json: { hasSession: staff } }),
  );
  await context.route("**/api/backend/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = {
      data: [],
      total: 0,
      meta: { total: 0, page: 1, limit: 20, totalPages: 1 },
    };
    if (path.endsWith("/profiles/me"))
      data = {
        profileId: "p",
        userId: "u",
        churchId: "c",
        branchId: "b",
        role: ["branch_pastor"],
        status: "active",
        isAdminHq: false,
        firstName: "Staff",
        lastName: "Test",
        church: { churchId: "c", name: "Grace Church" },
        planFeatures: ["attendance", "events", "giving"],
        permissions: [
          "attendance:services:read",
          "attendance:services:create",
          "events:create",
          "events:list:read",
          "attendance:checkin:create",
          "attendance:records:read",
          "members:all:read",
          "giving:records:read",
          "giving:read",
        ],
      };
    if (path.endsWith("/services"))
      data = {
        data: [
          {
            serviceId: "s",
            name: "Sunday service",
            churchId: "c",
            branchId: "b",
            recurrence: "weekly",
            dayOfWeek: 0,
            category: "mixed",
            isActive: true,
          },
        ],
        total: 1,
        meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
      };
    if (path.endsWith("/forms/public/wheel/meta"))
      data = {
        title: "Wheel registration",
        churchName: "Grace Church",
        fields: [{ key: "date", label: "Visit date", type: "date" }],
      };
    return route.fulfill({ json: { success: true, data } });
  });
}

test("calendar dates apply through the original field and restore focus", async ({ page, context }) => {
  await fixture(context);
  await page.goto("/forms/public/wheel");
  const field = page.locator('input[type="date"]');
  await field.fill("2026-12-25");
  await field.click();
  const picker = page.locator(".form-date-dialog");
  await expect(picker.locator("[data-date-time-preview]")).toContainText("Dec 25, 2026");
  await picker.getByRole("combobox", { name: "Month", exact: true }).click();
  await page.getByRole("option", { name: "February", exact: true }).click();
  await picker.getByRole("spinbutton", { name: "Year", exact: true }).fill("2028");
  await picker.locator('[role="gridcell"][data-day="2028-02-29"] button').click();
  await expect(field).toHaveValue("2026-12-25");
  await picker.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(field).toHaveValue("2028-02-29");
  await expect(field).toBeFocused();
  await field.press("Alt+ArrowDown");
  await picker.locator('[role="gridcell"][data-day="2028-02-01"] button').click();
  await picker.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(field).toHaveValue("2028-02-29");
  await field.press("Enter");
  await picker.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(field).toHaveValue("");
});

test("calendar availability respects native min, max and step", async ({ page, context }) => {
  await fixture(context);
  await page.goto("/forms/public/wheel");
  const field = page.locator('input[type="date"]');
  await field.fill("2026-11-08");
  await field.evaluate(input => {
    input.setAttribute("min", "2026-11-08");
    input.setAttribute("max", "2026-11-20");
    input.setAttribute("step", "2");
  });
  await field.click();
  const picker = page.locator(".form-date-dialog");
  await expect(picker.locator('[role="gridcell"][data-day="2026-11-09"] button')).toBeDisabled();
  await expect(picker.locator('[role="gridcell"][data-day="2026-11-21"] button')).toBeDisabled();
  await picker.locator('[role="gridcell"][data-day="2026-11-10"] button').click();
  await picker.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(field).toHaveValue("2026-11-10");
});

test("time selection works inside a service dialog and retains local seconds", async ({ page, context }) => {
  await fixture(context, true);
  await page.goto("/gatherings/attendance/services");
  await page.getByRole("button", { name: "Add service", exact: true }).first().click();
  const field = page.locator('input[type="time"]').first();
  await field.evaluate(input => input.setAttribute("step", "1"));
  await field.fill("23:58:30");
  await field.click();
  const picker = page.locator(".form-date-dialog");
  await picker.getByRole("combobox", { name: "Minute", exact: true }).click();
  await page.getByRole("option", { name: "59", exact: true }).click();
  await picker.getByRole("combobox", { name: "Second", exact: true }).click();
  await page.getByRole("option", { name: "31", exact: true }).click();
  await picker.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(field).toHaveValue("23:59:31");
  await expect(field).toBeFocused();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Add service", exact: true })).toBeVisible();
});

for (const width of [1280, 320]) {
  test(`calendar and time controls fit ${width}px`, async ({ page, context }, info) => {
    await fixture(context, true);
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: width === 320 ? "reduce" : "no-preference" });
    await page.goto("/gatherings/events/new");
    const field = page.locator('input[type="datetime-local"]').first();
    await field.fill("2026-12-31T23:59");
    await field.click();
    const picker = page.locator(".form-date-dialog");
    await expect(picker.locator("[role=gridcell]")).toHaveCount(42);
    await expect(picker.getByRole("combobox", { name: "Hour", exact: true })).toBeVisible();
    await expect(picker.getByRole("combobox", { name: "Minute", exact: true })).toBeVisible();
    expect(await picker.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await picker.locator('[role="gridcell"][data-day="2026-12-25"] button').click();
    await picker.getByRole("combobox", { name: "Hour", exact: true }).click();
    await page.getByRole("option", { name: "00", exact: true }).click();
    await picker.getByRole("combobox", { name: "Minute", exact: true }).click();
    await page.getByRole("option", { name: "30", exact: true }).click();
    await page.screenshot({ path: info.outputPath(`calendar-time-${width}.png`), fullPage: true });
    await picker.getByRole("button", { name: "Apply", exact: true }).click();
    await expect(field).toHaveValue("2026-12-25T00:30");
  });
}

test("check-in uses the calendar grid with occurrence restrictions and its date stepper", async ({
  page,
  context,
}) => {
  await fixture(context, true);
  await page.clock.setFixedTime(new Date("2026-11-08T12:00:00"));
  await page.goto("/gatherings/attendance/check-in");
  const trigger = page.getByRole("button", {
    name: "Attendance date: Sunday 8 November 2026",
    exact: true,
  });
  await trigger.click();
  const calendar = page.locator(".filter-date-popover");
  await expect(
    calendar.locator("button[data-day]").filter({ hasText: /^9$/ }),
  ).toBeDisabled();
  await expect(calendar.getByRole("spinbutton", { name: "Year", exact: true })).toBeVisible();
  await calendar
    .locator("button[data-day]")
    .filter({ hasText: /^15$/ })
    .click();
  const nextDate = page.getByRole("button", {
    name: "Attendance date: Sunday 15 November 2026",
    exact: true,
  });
  await expect(nextDate).toBeVisible();
  await page
    .getByRole("button", { name: "Previous occurrence", exact: true })
    .click();
  await expect(trigger).toBeVisible();
  await page
    .getByRole("button", { name: "Next occurrence", exact: true })
    .click();
  await nextDate.click();
  await page
    .getByRole("button", { name: "Jump to today", exact: true })
    .click();
  await expect(trigger).toBeVisible();
});

for (const path of ["/gatherings/attendance/records", "/giving/donations", "/gatherings/events/list"])
  test(`${path} uses the shared calendar inside its date filters`, async ({ page, context }) => {
    await fixture(context, true);
    await page.goto(path);
    await page.getByRole("button", { name: "Date range", exact: true }).click();
    const field = page.getByLabel("From date", { exact: true });
    await field.fill("2026-11-01");
    await field.click();
    const picker = page.locator(".filter-date-popover");
    await expect(page.locator(".form-date-dialog")).toHaveCount(0);
    await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(0);
    await expect(picker.getByRole("combobox", { name: "Month", exact: true })).toBeVisible();
    await picker.locator('[role="gridcell"][data-day="2026-11-08"] button').click();
    await expect(field).toHaveValue("2026-11-08");
    await expect(field).toBeFocused();
    await expect(page.getByRole("button", { name: "Apply dates", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Apply dates", exact: true }).click();
    await expect(page.getByRole("button", { name: "Date range, 2026-11-08 to any end", exact: true })).toBeVisible();
  });
