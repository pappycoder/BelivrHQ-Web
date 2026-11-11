import { expect, test, type BrowserContext } from "@playwright/test";

test.use({ serviceWorkers: "block", timezoneId: "Africa/Lagos" });

async function fixture(context: BrowserContext, manage = false) {
  const reads: URL[] = [];
  const writes: { path: string; method: string }[] = [];
  const services = Array.from({ length: 35 }, (_, index) => ({
    serviceId: `service-${index}`, churchId: "church", name: `Service ${String(index).padStart(2, "0")}`,
    branchId: index % 2 ? "east" : "west", category: index % 2 ? "children" : "mixed",
    recurrence: "weekly", dayOfWeek: index % 7, startTime: "09:00", endTime: "11:00",
    isActive: index % 3 !== 0, attendanceCount: index * 2, createdAt: "2026-10-01T09:00:00Z", updatedAt: "2026-11-01T09:00:00Z", archivedAt: null as string | null,
  }));
  await context.addCookies([{ name: "belivrhq_token", value: "service-register", url: "http://127.0.0.1:3107" }]);
  await context.route("https://**", route => route.abort());
  await context.route("**/api/session", route => route.fulfill({ json: { hasSession: true } }));
  await context.route("**/api/backend/**", route => {
    const request = route.request(), url = new URL(request.url());
    const path = url.pathname.replace("/api/backend", "");
    if (request.method() === "GET") reads.push(url);
    else writes.push({ path, method: request.method() });
    let data: unknown = { data: [], meta: { total: 0 }, total: 0 };
    if (path === "/profiles/me") data = {
      profileId: "staff", churchId: "church", branchId: "west", firstName: "Staff", lastName: "Test", role: ["secretary"], status: "active", isAdminHq: true,
      church: { name: "Grace Church" }, planFeatures: ["attendance"], permissions: ["attendance:services:read", "branches:read", ...(manage ? ["attendance:services:create", "attendance:services:update", "attendance:services:delete"] : [])],
    };
    else if (path === "/branches") data = { data: [{ branchId: "west", name: "West Branch" }, { branchId: "east", name: "East Branch" }], meta: { total: 2 } };
    else if (path === "/services") {
      const params = url.searchParams;
      const filtered = services.filter(service =>
        !!service.archivedAt === (params.get("archived") === "true") &&
        (!params.get("search") || service.name.toLowerCase().includes(params.get("search")!.toLowerCase())) &&
        (!params.get("category") || service.category === params.get("category")) &&
        (!params.get("branchId") || service.branchId === params.get("branchId")) &&
        (!params.has("isActive") || service.isActive === (params.get("isActive") === "true")) &&
        (!params.has("dayOfWeek") || service.dayOfWeek === Number(params.get("dayOfWeek"))),
      );
      const page = Number(params.get("page") ?? 1), limit = Number(params.get("limit") ?? 15);
      filtered.sort((a, b) => params.get("sortBy") === "name" ? a.name.localeCompare(b.name) : a.dayOfWeek - b.dayOfWeek);
      if (params.get("sortOrder") === "desc") filtered.reverse();
      data = { data: filtered.slice((page - 1) * limit, page * limit), meta: { total: filtered.length, totalPages: Math.ceil(filtered.length / limit), page, limit } };
    } else {
      const action = path.match(/^\/services\/(service-\d+)(?:\/(archive|restore))?$/);
      if (action) {
        const row = services.find(service => service.serviceId === action[1]);
        if (row && action[2]) row.archivedAt = action[2] === "archive" ? "2026-11-11T09:00:00Z" : null;
        data = row;
      }
    }
    return route.fulfill({ json: { success: true, data } });
  });
  return { reads, writes };
}

for (const width of [320, 1280]) {
  test(`services have event-style columns, selection and responsive layout at ${width}px`, async ({ page, context }) => {
    const state = await fixture(context);
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/gatherings/attendance/services");
    const table = page.getByRole("table", { name: "Service register", exact: true });
    for (const name of ["Service", "Category", "Schedule", "Branch", "Status", "Check-ins", "Manage"]) await expect(table.getByRole("columnheader", { name, exact: true })).toBeVisible();
    await expect(table.getByRole("row")).toHaveCount(16);
    await page.screenshot({ path: `/tmp/services-register-${width}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Choose visible columns", exact: true }).click();
    await page.getByRole("menuitemcheckbox", { name: "Start Time", exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(table.getByRole("columnheader", { name: "Start Time", exact: true })).toBeVisible();
    await page.getByRole("checkbox", { name: "Select all visible records", exact: true }).check();
    await expect(page.getByText("15 selected on this page", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Archive selected services", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Delete selected services permanently", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Clear selection", exact: true }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect.poll(() => state.reads.some(url => url.pathname.endsWith("/services") && url.searchParams.get("page") === "2")).toBe(true);
    expect(state.writes).toHaveLength(0);
  });
}

test("service filters and sorting compose on the server and reset paging", async ({ page, context }) => {
  const state = await fixture(context);
  await page.goto("/gatherings/attendance/services");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  const filters = page.getByRole("group", { name: "Service list filters", exact: true });
  await filters.getByRole("button", { name: "Paused", exact: true }).click();
  await expect.poll(() => state.reads.some(url => url.searchParams.get("isActive") === "false" && url.searchParams.get("page") === "1")).toBe(true);
  const table = page.getByRole("table", { name: "Service register", exact: true });
  await expect(table.getByRole("cell", { name: "Active", exact: true })).toHaveCount(0);
  await filters.getByRole("combobox", { name: "Service weekday", exact: true }).click();
  await page.getByRole("option", { name: "Sunday", exact: true }).click();
  await filters.getByRole("combobox", { name: "Sort services", exact: true }).click();
  await page.getByRole("option", { name: "Name", exact: true }).click();
  await filters.getByRole("button", { name: "Sort descending", exact: true }).click();
  await expect.poll(() => state.reads.some(url => url.searchParams.get("isActive") === "false" && url.searchParams.get("dayOfWeek") === "0" && url.searchParams.get("sortBy") === "name" && url.searchParams.get("sortOrder") === "desc")).toBe(true);
  await filters.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(filters.getByRole("combobox", { name: "Service weekday", exact: true })).toHaveText("All weekdays");
  expect(state.writes).toHaveLength(0);
});

test("service bulk management retains named confirmations and write permissions", async ({ page, context }) => {
  const state = await fixture(context, true);
  await page.goto("/gatherings/attendance/services");
  const table = page.getByRole("table", { name: "Service register", exact: true });
  await table.getByRole("checkbox", { name: "Select Service 00", exact: true }).check();
  await table.getByRole("checkbox", { name: "Select Service 07", exact: true }).check();
  await page.getByRole("button", { name: "Archive selected services", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Service 00");
  await expect(dialog).toContainText("Service 07");
  expect(state.writes).toHaveLength(0);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(state.writes).toHaveLength(0);
  await page.getByRole("button", { name: "Archive selected services", exact: true }).click();
  await dialog.getByRole("button", { name: "Confirm action", exact: true }).click();
  await expect.poll(() => state.writes.length).toBe(2);
  expect(state.writes.map(write => write.path).sort()).toEqual(["/services/service-0/archive", "/services/service-7/archive"]);
});
