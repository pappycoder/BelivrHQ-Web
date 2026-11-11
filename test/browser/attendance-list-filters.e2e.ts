import { test, expect, type Page, type BrowserContext } from "@playwright/test";

test.use({ timezoneId: "Africa/Lagos" });

async function fixture(context: BrowserContext, hq = true) {
  const requests: URL[] = [];
  await context.addCookies([
    {
      name: "belivrhq_token",
      value: "filters-fixture",
      url: "http://127.0.0.1:3107",
    },
  ]);
  await context.route("https://embed.tawk.to/**", (route) =>
    route.fulfill({ body: "" }),
  );
  await context.route("**/api/session", (route) =>
    route.fulfill({ json: { hasSession: true } }),
  );
  await context.route("**/api/backend/**", (route) => {
    const url = new URL(route.request().url());
    requests.push(url);
    const path = url.pathname.replace(/^.*\/api\/backend/, "");
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
        branchId: "home",
        firstName: "Staff",
        lastName: "Test",
        role: ["branch_pastor"],
        status: "active",
        isAdminHq: hq,
        church: { churchId: "church", name: "Grace Church" },
        planFeatures: ["attendance"],
        permissions: [
          "attendance:services:read",
          "attendance:records:read",
          "branches:read",
        ],
      };
    if (path === "/branches")
      data = { data: [{ branchId: "west", name: "West Branch" }], total: 1 };
    if (path === "/services")
      data = {
        data: [
          {
            serviceId: "sunday",
            name: "Sunday Worship",
            churchId: "church",
            branchId: "west",
            dayOfWeek: 0,
            category: "mixed",
            isActive: true,
          },
        ],
        meta: { total: 30, totalPages: 2 },
      };
    if (path === "/attendance")
      data = {
        data: [
          {
            attendanceId: "arrival",
            memberId: "member",
            memberName: "Ada Rice",
            serviceName: "Sunday Worship",
            category: "adult",
            checkInAt: "2026-11-08T09:00:00Z",
            createdAt: "2026-11-08T09:00:00Z",
          },
        ],
        meta: { total: 40, totalPages: 2 },
      };
    return route.fulfill({ json: { success: true, data } });
  });
  return requests;
}

async function settleScreenshot(page: Page, label: string, count: string) {
  await page.getByRole("heading", { level: 1 }).click();
  await expect(page.locator('[data-slot="select-content"]')).toHaveCount(0);
  await expect(page.locator("[data-field-motion]")).toHaveCount(0);
  await expect(
    page
      .locator(".paper-card")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator(".font-display"),
  ).toHaveText(count);
  await page.evaluate(() => window.scrollTo(0, 0));
}

for (const width of [1280, 320]) {
  test(`services toolbar uses shared controls and server search at ${width}px`, async ({
    page,
    context,
  }) => {
    const requests = await fixture(context);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/gatherings/attendance/services");
    const filters = page.getByRole("group", { name: "Service list filters" });
    await filters
      .getByRole("textbox", { name: "Search services…", exact: true })
      .fill("Sunday");
    await expect
      .poll(() =>
        requests.some(
          (url) =>
            url.pathname.endsWith("/services") &&
            url.searchParams.get("search") === "Sunday",
        ),
      )
      .toBe(true);
    await filters
      .getByRole("combobox", { name: "Service category", exact: true })
      .click();
    await page.getByRole("option", { name: "Children", exact: true }).click();
    await filters
      .getByRole("combobox", { name: "Sort services", exact: true })
      .click();
    await page.getByRole("option", { name: "Name", exact: true }).click();
    await filters
      .getByRole("button", { name: "Sort descending", exact: true })
      .click();
    await filters
      .getByRole("combobox", { name: "Service branch", exact: true })
      .click();
    await page
      .getByRole("option", { name: "West Branch", exact: true })
      .click();
    await expect
      .poll(() =>
        requests.some(
          (url) =>
            url.searchParams.get("search") === "Sunday" &&
            url.searchParams.get("category") === "children" &&
            url.searchParams.get("sortBy") === "name" &&
            url.searchParams.get("sortOrder") === "desc" &&
            url.searchParams.get("branchId") === "west",
        ),
      )
      .toBe(true);
    await settleScreenshot(page, "Services", "30");
    await page.screenshot({
      path: `/tmp/belivrhq-services-toolbar-${width}.png`,
      fullPage: true,
    });
    expect(
      await filters.evaluate((node) => node.getBoundingClientRect().right),
    ).toBeLessThanOrEqual(width);
    await filters
      .getByRole("button", { name: "Clear filters", exact: true })
      .click();
    await expect(
      filters.getByRole("textbox", { name: "Search services…", exact: true }),
    ).toHaveValue("");
    await expect(
      filters.getByRole("combobox", { name: "Service category", exact: true }),
    ).toHaveText("All categories");
  });

  test(`records toolbar supports search, sorting and an inclusive date dropdown at ${width}px`, async ({
    page,
    context,
  }) => {
    const requests = await fixture(context);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/gatherings/attendance/records");
    const filters = page.getByRole("group", {
      name: "Attendance record filters",
    });
    await filters
      .getByRole("textbox", { name: "Search by name…", exact: true })
      .fill("Ada Rice");
    await filters
      .getByRole("combobox", { name: "Sort attendance records", exact: true })
      .click();
    await page.getByRole("option", { name: "Date added", exact: true }).click();
    await filters
      .getByRole("button", { name: "Sort ascending", exact: true })
      .click();
    await filters
      .getByRole("combobox", { name: "Gathering", exact: true })
      .click();
    await page
      .getByRole("option", { name: "Sunday Worship", exact: true })
      .click();
    await expect(page.getByLabel("From date", { exact: true })).toHaveCount(0);
    await expect.poll(() => requests.some(url => url.pathname.endsWith("/attendance") && url.searchParams.get("search") === "Ada Rice" && url.searchParams.get("serviceId") === "sunday")).toBe(true);
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect.poll(() => requests.filter(url => url.pathname.endsWith("/attendance")).at(-1)?.searchParams.get("page")).toBe("2");
    const dateTrigger = filters.getByRole("button", { name: /^Date range/ });
    await dateTrigger.click();
    const dropdown = page.getByRole("dialog", { name: "Filter attendance dates", exact: true });
    await dropdown.getByLabel("From date", { exact: true }).fill("2026-12-25");
    await dropdown.getByLabel("To date", { exact: true }).fill("2026-12-25");
    await expect(dropdown.getByRole("spinbutton")).toHaveCount(0);
    expect(requests.filter(url => url.pathname.endsWith("/attendance")).at(-1)?.searchParams.has("startDate")).toBe(false);
    await dropdown.getByRole("button", { name: "Apply dates", exact: true }).click();
    await expect
      .poll(() =>
        requests.some(
          (url) =>
            url.pathname.endsWith("/attendance") &&
            url.searchParams.get("search") === "Ada Rice" &&
            url.searchParams.get("sortBy") === "createdAt" &&
            url.searchParams.get("sortOrder") === "asc" &&
            url.searchParams.get("serviceId") === "sunday" &&
            url.searchParams.get("startDate") === "2026-12-24T23:00:00.000Z" &&
            url.searchParams.get("endDate") === "2026-12-25T22:59:59.999Z" &&
            url.searchParams.get("page") === "1",
        ),
      )
      .toBe(true);
    await dateTrigger.click();
    await dropdown.getByLabel("To date", { exact: true }).fill("2026-12-24");
    await expect(dropdown.getByRole("button", { name: "Apply dates", exact: true })).toBeDisabled();
    await expect(dropdown.getByRole("alert")).toContainText("on or after");
    await page.keyboard.press("Escape");
    await expect(dateTrigger).toBeFocused();
    await dateTrigger.click();
    await expect(dropdown.getByLabel("To date", { exact: true })).toHaveValue("2026-12-25");
    await dropdown.screenshot({ path: `/tmp/belivrhq-attendance-date-dropdown-${width}.png` });
    await dropdown.getByRole("button", { name: "Clear dates", exact: true }).click();
    await expect(dateTrigger).toHaveAccessibleName("Date range");
    await expect(filters.getByRole("combobox", { name: "Gathering", exact: true })).toHaveText("Sunday Worship");
    await dateTrigger.click();
    await expect(dropdown.getByLabel("From date", { exact: true })).toHaveValue("");
    await expect(dropdown.getByLabel("To date", { exact: true })).toHaveValue("");
    await page.keyboard.press("Escape");
    await settleScreenshot(page, "Matching records", "40");
    await page.screenshot({
      path: `/tmp/belivrhq-records-toolbar-${width}.png`,
      fullPage: true,
    });
    expect(
      await filters.evaluate((node) => node.getBoundingClientRect().right),
    ).toBeLessThanOrEqual(width);
    await filters
      .getByRole("button", { name: "Clear filters", exact: true })
      .click();
    await expect(dateTrigger).toHaveAccessibleName("Date range");
    await expect(page.getByLabel("From date", { exact: true })).toHaveCount(0);
    await expect(
      filters.getByRole("combobox", { name: "Gathering", exact: true }),
    ).toHaveText("All gatherings");
  });
}

test("branch staff do not receive HQ branch controls", async ({
  page,
  context,
}) => {
  await fixture(context, false);
  for (const route of ["services", "records"]) {
    await page.goto(`/gatherings/attendance/${route}`);
    await expect(
      page.getByRole("textbox", {
        name: route === "services" ? "Search services…" : "Search by name…",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: /^(Service|Attendance) branch$/ }),
    ).toHaveCount(0);
  }
});
