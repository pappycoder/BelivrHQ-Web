import { expect, test, type BrowserContext } from "@playwright/test";

test.use({ serviceWorkers: "block", timezoneId: "Africa/Lagos" });

async function fixture(context: BrowserContext, readOnly = false, options: { savedHeadcount?: boolean; noUpdate?: boolean; memberCount?: number; conflict?: boolean } = {}) {
  let savedHeadcount: Record<string, unknown> | null = options.savedHeadcount ? { id: "head", total: 88, adultCount: 60, childrenCount: 28, maleCount: 40, femaleCount: 48, branchId: "west", contextName: "Gathering" } : null;
  const writes: { path: string; body: Record<string, unknown> }[] = [];
  const person = { memberId: "ada", firstName: "Ada", lastName: "Rice", status: "active" };
  const service = { serviceId: "second", name: "Evening service", branchId: "west", isActive: true, category: "mixed", recurrence: "weekly", dayOfWeek: 0 };
  const event = { eventId: "second", title: "Leaders gathering", branchId: "west", isFree: true, recurrence: "weekly", startDate: "2026-11-08T09:00:00Z", registrationCount: 1 };
  const group = { id: "second", name: "Welcome team", branchId: "west", leaderId: "ada", members: [person], createdAt: "2026-01-01" };
  await context.addCookies([{ name: "belivrhq_token", value: "attendance-workspace", url: "http://127.0.0.1:3107" }]);
  await context.route("https://**", route => route.abort());
  await context.route("**/api/session", route => route.fulfill({ json: { hasSession: true } }));
  await context.route("**/api/backend/**", async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api/backend", "");
    if (request.method() !== "GET") writes.push({ path, body: request.postDataJSON() });
    let data: unknown = [];
    if (path === "/profiles/me") data = {
      profileId: "staff", churchId: "church", branchId: "west", memberId: "ada", firstName: "Staff", lastName: "Test", role: ["secretary"], status: "active", isAdminHq: false,
      church: { name: "Grace Church" }, planFeatures: ["attendance", "events", "groups"],
      permissions: ["members:all:read", "attendance:services:read", "attendance:records:read", "events:list:read", "events:checkin:read", "events:registrations:read", "departments:read", "cell_groups:read", "cell_groups:details:read", ...(!readOnly ? ["attendance:checkin:create", ...(!options.noUpdate ? ["attendance:records:update"] : []), "events:checkin:create", ...(!options.noUpdate ? ["events:checkin:update"] : []), "departments:update", "cell_groups:create", "cell_groups:update"] : [])],
    };
    else if (path === "/services") data = { data: [{ ...service, serviceId: "first", name: "Morning service" }, service], meta: { total: 2 } };
    else if (path === "/events") data = { data: [{ ...event, eventId: "first", title: "First event" }, event], total: 2 };
    else if (path === "/members" || path === "/members/search") {
      const allMembers = Array.from({ length: options.memberCount ?? 1 }, (_, index) => ({ ...person, memberId: index ? `person-${index}` : "ada", firstName: index ? `Person ${index}` : "Ada" }));
      const term = (url.searchParams.get("search") ?? "").toLowerCase();
      const members = allMembers.filter(member => `${member.firstName} ${member.lastName}`.toLowerCase().includes(term));
      const page = Number(url.searchParams.get("page") ?? 1), limit = Number(url.searchParams.get("limit") ?? 100);
      data = { data: members.slice((page - 1) * limit, page * limit), meta: { total: members.length, totalPages: Math.ceil(members.length / limit) } };
    }
    else if (path === "/attendance") data = { data: [], meta: { total: 0 } };
    else if (path.endsWith("/registrations")) data = [{ registrationId: "registration", eventId: "second", memberId: "ada", memberName: "Ada Rice", checkedIn: false, ticketCode: "TICKET-1", paymentStatus: "paid", quantity: 1 }];
    else if (path.endsWith("/attendance/bulk")) data = { recorded: (request.postDataJSON()?.records ?? request.postDataJSON()?.memberIds ?? []).length, skipped: 0 };
    else if (path.endsWith("/check-in")) data = { checkedIn: 1, skipped: 0 };
    else if (path === "/admin/departments/second" || path === "/admin/cell-groups/second") data = group;
    else if (path === "/admin/cell-groups/second/members") data = [person];
    else if (path.includes("attendance-sessions") || path.startsWith("/attendance/general")) {
      if (request.method() === "GET") data = { data: savedHeadcount ? [{ ...savedHeadcount, attendanceDate: url.searchParams.get("startDate") ?? "2026-11-11" }] : [], meta: { total: savedHeadcount ? 1 : 0 } };
      else {
        if (options.conflict && request.method() === "POST") {
          savedHeadcount = { id: "head", branchId: "west", total: 75, attendanceDate: request.postDataJSON().attendanceDate };
          return route.fulfill({ status: 409, json: { success: false, error: { message: "Already recorded" } } });
        }
        savedHeadcount = { ...savedHeadcount, id: "head", ...request.postDataJSON() };
        data = savedHeadcount;
      }
    }
    return route.fulfill({ json: { success: true, data } });
  });
  return writes;
}

for (const kind of ["service", "event"] as const) {
  test(`${kind}: independent methods, draft protection and correct gathering writes`, async ({ page, context }) => {
    const writes = await fixture(context);
    const path = kind === "service" ? "/gatherings/attendance/check-in?service=second" : "/gatherings/events/check-in?event=second";
    await page.goto(path);
    await expect(page.getByRole("combobox", { name: `Choose ${kind}` })).toHaveValue("second");
    const methods = page.getByRole("tablist", { name: "Attendance method", exact: true });
    await methods.getByRole("tab", { name: /^Record headcount/ }).click();
    const form = page.getByRole("form", { name: "Reported headcount", exact: true });
    await form.getByLabel("Total attendance", { exact: true }).fill("42");
    await methods.getByRole("tab", { name: /^Check in people/ }).click();
    await expect(page.getByRole("checkbox", { name: "Select Ada Rice", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Edit attendance", exact: true }).click();
    await page.getByRole("button", { name: "Select all shown", exact: true }).click();
    await expect(page.getByRole("columnheader", { name: "Person", exact: true })).toBeVisible();
    await expect(page.getByText("Selection has not been saved yet.", { exact: true })).toBeVisible();
    await methods.getByRole("tab", { name: /^Record headcount/ }).click();
    await expect(form.getByLabel("Total attendance", { exact: true })).toHaveValue("42");
    page.once("dialog", dialog => dialog.dismiss());
    await page.getByRole("combobox", { name: `Choose ${kind}` }).selectOption("first");
    await expect(page.getByRole("combobox", { name: `Choose ${kind}` })).toHaveValue("second");
    expect(writes).toHaveLength(0);
    await form.getByRole("button", { name: "Save headcount", exact: true }).click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0].body.total).toBe(42);
    expect(writes[0].path).toBe(kind === "service" ? "/attendance/general" : "/events/second/attendance-sessions");
    await methods.getByRole("tab", { name: /^Check in people/ }).click();
    let failOnce = true;
    await context.route(kind === "service" ? "**/api/backend/attendance/bulk" : "**/api/backend/events/second/check-in", route => {
      if (failOnce) {
        failOnce = false;
        return route.fulfill({ status: 500, json: { success: false, error: { message: "Try again" } } });
      }
      return route.fallback();
    });
    await page.getByRole("button", { name: "Check in (1)", exact: true }).click();
    await expect(page.getByRole("button", { name: "Check in (1)", exact: true })).toBeEnabled();
    await expect(page.getByText("Selection has not been saved yet.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Check in (1)", exact: true }).click();
    await expect.poll(() => writes.length).toBe(2);
    expect(writes[1].path).toBe(kind === "service" ? "/attendance/bulk" : "/events/second/check-in");
    if (kind === "service") expect(writes[1].body.serviceId).toBe("second");
    expect(writes[1].body.attendanceDate).toBe(writes[0].body.attendanceDate);
    await expect(page.getByRole("button", { name: "Check in (0)", exact: true })).toBeDisabled();
    await page.setViewportSize({ width: 390, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect.poll(() => methods.evaluate(node => {
      const bounds = node.getBoundingClientRect();
      return Array.from(node.querySelectorAll('[role="tab"]')).every(tab => {
        const rect = tab.getBoundingClientRect();
        return rect.top >= bounds.top && rect.bottom <= bounds.bottom + 1;
      });
    })).toBe(true);
    const saveButton = page.getByRole("button", { name: "Check in (0)", exact: true });
    await saveButton.evaluate(node => node.scrollIntoView({ block: "center", behavior: "instant" }));
    await page.screenshot({ path: `/tmp/attendance-${kind}-mobile.png`, fullPage: true });
    await expect.poll(async () => {
      const saveBounds = await saveButton.boundingBox();
      const navBounds = await page.getByRole("navigation", { name: "Primary", exact: true }).boundingBox();
      return !!(saveBounds && navBounds && saveBounds.y + saveBounds.height <= navBounds.y);
    }).toBe(true);
  });
}

for (const cell of [false, true]) {
  for (const width of [390, 1280]) {
    test(`${cell ? "cell group" : "department"}: shared methods and legacy links at ${width}px`, async ({ page, context }) => {
      await fixture(context);
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${cell ? "/gatherings/groups/cell/second" : "/gatherings/groups/second"}?tab=reported`);
      const methods = page.getByRole("tablist", { name: "Attendance method", exact: true });
      await expect(methods.getByRole("tab", { name: /^Record headcount/ })).toHaveAttribute("data-state", "active");
      await expect(page.getByRole("tab", { name: "Reported totals", exact: true })).toHaveCount(0);
      await page.getByRole("button", { name: "Record headcount", exact: true }).click();
      const headcountDialog = page.getByRole("dialog");
      await expect(headcountDialog.getByRole("form", { name: "Headcount entry", exact: true })).toBeVisible();
      await expect(headcountDialog.getByRole("button", { name: "Save headcount", exact: true })).toBeVisible();
      await page.screenshot({ path: `/tmp/headcount-${cell ? "cell" : "department"}-dialog-${width}.png`, fullPage: true });
      await headcountDialog.getByRole("button", { name: "Close", exact: true }).click();
      await methods.getByRole("tab", { name: /^Check in people/ }).click();
      await page.locator('input[type="date"]:visible').fill("2026-11-08");
      await page.screenshot({ path: `/tmp/attendance-${cell ? "cell" : "department"}-methods-${width}.png`, fullPage: true });
      await page.getByRole("button", { name: /Record (meeting )?attendance/i }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog.locator('input[type="date"]')).toHaveValue("2026-11-08");
      await expect(dialog.getByRole("checkbox", { name: "Select Ada Rice", exact: true })).toBeDisabled();
      await dialog.getByRole("button", { name: "Edit attendance", exact: true }).click();
      await dialog.getByRole("button", { name: "Select all shown", exact: true }).click();
      await expect(dialog.getByRole("columnheader", { name: "Person", exact: true })).toBeVisible();
      await expect(dialog.getByText("Selection has not been saved yet.", { exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: `/tmp/attendance-${cell ? "cell" : "department"}-${width}.png`, fullPage: true });
    });
  }
  test(`${cell ? "cell group" : "department"}: read-only access offers no attendance writes`, async ({ page, context }) => {
    const writes = await fixture(context, true);
    await page.goto(`${cell ? "/gatherings/groups/cell/second" : "/gatherings/groups/second"}?tab=attendance`);
    await expect(page.getByRole("tablist", { name: "Attendance method", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Record (meeting )?attendance/i })).toHaveCount(0);
    await page.getByRole("tab", { name: /^Record headcount/ }).click();
    await expect(page.getByRole("button", { name: "Record headcount", exact: true })).toHaveCount(0);
    expect(writes).toHaveLength(0);
  });
}

for (const kind of ["service", "event"] as const) {
  for (const width of [320, 1280]) {
    test(`${kind}: saved headcount requires explicit editing and locks again at ${width}px`, async ({ page, context }) => {
      const writes = await fixture(context, false, { savedHeadcount: true });
      await page.setViewportSize({ width, height: 960 });
      await page.goto(kind === "service" ? "/gatherings/attendance/check-in?service=second" : "/gatherings/events/check-in?event=second");
      await page.getByRole("tab", { name: /^Record headcount/ }).click();
      const form = page.getByRole("form", { name: "Reported headcount", exact: true });
      const total = form.getByLabel("Total attendance", { exact: true });
      await expect(total).toHaveValue("88");
      await expect(total).toHaveAttribute("readonly", "");
      await expect(form.getByRole("button", { name: "Save changes", exact: true })).toHaveCount(0);
      expect(writes).toHaveLength(0);
      await form.getByRole("button", { name: "Edit attendance", exact: true }).click();
      await total.fill("100");
      await form.getByRole("button", { name: "Cancel editing", exact: true }).click();
      await expect(total).toHaveValue("88");
      expect(writes).toHaveLength(0);
      await form.getByRole("button", { name: "Edit attendance", exact: true }).click();
      await total.fill("100");
      await form.getByRole("button", { name: "Save changes", exact: true }).click();
      await expect.poll(() => writes.length).toBe(1);
      expect(writes[0].path).toBe(kind === "service" ? "/attendance/general/head" : "/events/second/attendance-sessions/head");
      expect(writes[0].body.total).toBe(100);
      await expect(total).toHaveValue("100");
      await expect(total).toHaveAttribute("readonly", "");
      await expect(form.getByRole("button", { name: "Edit attendance", exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `/tmp/headcount-${kind}-${width}.png`, fullPage: true });
    });
  }
  test(`${kind}: creation rights alone do not unlock an existing headcount`, async ({ page, context }) => {
    const writes = await fixture(context, false, { savedHeadcount: true, noUpdate: true });
    await page.goto(kind === "service" ? "/gatherings/attendance/check-in?service=second" : "/gatherings/events/check-in?event=second");
    await page.getByRole("tab", { name: /^Record headcount/ }).click();
    const form = page.getByRole("form", { name: "Reported headcount", exact: true });
    await expect(form.getByLabel("Total attendance", { exact: true })).toHaveValue("88");
    await expect(form.getByRole("button", { name: "Edit attendance", exact: true })).toHaveCount(0);
    expect(writes).toHaveLength(0);
  });
}

test("a concurrent headcount is never silently overwritten", async ({ page, context }) => {
  const writes = await fixture(context, false, { conflict: true });
  await page.goto("/gatherings/attendance/check-in?service=second");
  await page.getByRole("tab", { name: /^Record headcount/ }).click();
  const form = page.getByRole("form", { name: "Reported headcount", exact: true });
  await expect(form.getByRole("button", { name: "Save headcount", exact: true })).toBeVisible();
  await form.getByLabel("Total attendance", { exact: true }).fill("50");
  await form.getByRole("button", { name: "Save headcount", exact: true }).click();
  await expect(form.getByRole("button", { name: "Review saved headcount", exact: true })).toBeVisible();
  expect(writes).toHaveLength(1);
  await expect(form.getByLabel("Total attendance", { exact: true })).toHaveValue("50");
  await form.getByRole("button", { name: "Review saved headcount", exact: true }).click();
  await expect(form.getByLabel("Total attendance", { exact: true })).toHaveValue("75");
  await expect(form.getByLabel("Total attendance", { exact: true })).toHaveAttribute("readonly", "");
  expect(writes).toHaveLength(1);
});

test("Select all shown pages through the service roster and saves bounded batches", async ({ page, context }) => {
  const writes = await fixture(context, false, { memberCount: 210 });
  await page.goto("/gatherings/attendance/check-in?service=second");
  await page.getByRole("button", { name: "Edit attendance", exact: true }).click();
  await page.getByRole("button", { name: "Load more members", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: /^Select Person/ })).toHaveCount(199);
  await page.getByRole("button", { name: "Load more members", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: /^Select Person/ })).toHaveCount(209);
  await page.getByRole("button", { name: "Select all shown", exact: true }).click();
  await page.getByRole("button", { name: "Check in (210)", exact: true }).click();
  await expect.poll(() => writes.length).toBe(2);
  expect((writes[0].body.records as unknown[]).length).toBe(200);
  expect((writes[1].body.records as unknown[]).length).toBe(10);
  await expect(page.getByRole("button", { name: "Edit attendance", exact: true })).toBeVisible();
});

test("headcount validation preserves the draft and saving locks valid counts", async ({ page, context }) => {
  const writes = await fixture(context);
  await page.goto("/gatherings/attendance/check-in?service=second");
  await page.getByRole("tab", { name: /^Record headcount/ }).click();
  const form = page.getByRole("form", { name: "Reported headcount", exact: true });
  await expect(form.getByRole("button", { name: "Save headcount", exact: true })).toBeVisible();
  await form.getByLabel("Total attendance", { exact: true }).fill("10");
  await form.getByLabel("Adults", { exact: true }).fill("11");
  await form.getByRole("button", { name: "Save headcount", exact: true }).click();
  await expect(form.getByRole("alert")).toContainText("subtotals");
  expect(writes).toHaveLength(0);
  await form.getByLabel("Adults", { exact: true }).fill("5");
  await form.getByLabel("Male", { exact: true }).fill("6");
  await form.getByLabel("Female", { exact: true }).fill("5");
  await form.getByRole("button", { name: "Save headcount", exact: true }).click();
  expect(writes).toHaveLength(0);
  await form.getByLabel("Female", { exact: true }).fill("4");
  await form.getByRole("button", { name: "Save headcount", exact: true }).click();
  await expect.poll(() => writes.length).toBe(1);
  await expect(form.getByLabel("Total attendance", { exact: true })).toHaveAttribute("readonly", "");
  expect(writes[0].body.childrenCount).toBeNull();
});

test("service roster searches from the first character across the full roster and scrolls independently", async ({ page, context }) => {
  const writes = await fixture(context, false, { memberCount: 210 });
  await page.goto("/gatherings/attendance/check-in?service=second");
  const region = page.getByRole("region", { name: "Scrollable attendance roster", exact: true });
  await expect(region.getByRole("checkbox", { name: "Select Ada Rice", exact: true })).toBeVisible();
  expect(await region.evaluate(node => node.scrollHeight > node.clientHeight)).toBe(true);
  const header = region.getByRole("columnheader", { name: "Person", exact: true });
  await region.evaluate(node => { node.scrollTop = 300; });
  await expect.poll(async () => {
    const row = await header.boundingBox(), bounds = await region.boundingBox();
    return !!(row && bounds && Math.abs(row.y - bounds.y) < 2);
  }).toBe(true);
  const search = page.getByRole("textbox", { name: "Search people…", exact: true });
  const request = page.waitForRequest(request => {
    const url = new URL(request.url());
    return url.pathname.endsWith("/api/backend/members") && url.searchParams.get("search") === "2";
  });
  await search.fill("2");
  await request;
  await expect(region.getByRole("checkbox", { name: "Select Person 209 Rice", exact: true })).toHaveCount(1);
  await expect(region.getByRole("checkbox", { name: "Select Ada Rice", exact: true })).toHaveCount(0);
  await search.fill("209");
  await expect(region.getByRole("row")).toHaveCount(2);
  await search.fill("");
  await expect(region.getByRole("checkbox", { name: "Select Ada Rice", exact: true })).toHaveCount(1);
  expect(writes).toHaveLength(0);
});

test("event roster filters immediately on a single character", async ({ page, context }) => {
  const writes = await fixture(context);
  await page.goto("/gatherings/events/check-in?event=second");
  const search = page.getByRole("textbox", { name: "Search a name or ticket code…", exact: true });
  await expect(page.getByRole("checkbox", { name: "Select Ada Rice", exact: true })).toHaveCount(1);
  await search.fill("z");
  await expect(page.getByRole("checkbox", { name: "Select Ada Rice", exact: true })).toHaveCount(0);
  await search.fill("a");
  await expect(page.getByRole("checkbox", { name: "Select Ada Rice", exact: true })).toHaveCount(1);
  expect(writes).toHaveLength(0);
});

for (const cell of [false, true]) {
  test(`${cell ? "cell" : "department"} roster filters on each character without unlocking saved attendance`, async ({ page, context }) => {
    const writes = await fixture(context);
    await page.goto(`${cell ? "/gatherings/groups/cell/second" : "/gatherings/groups/second"}?tab=attendance`);
    await page.getByRole("button", { name: /Record (meeting )?attendance/i }).click();
    const dialog = page.getByRole("dialog");
    const search = dialog.getByRole("textbox", { name: "Search roster", exact: true });
    await search.fill("z");
    await expect(dialog.getByRole("checkbox", { name: "Select Ada Rice", exact: true })).toHaveCount(0);
    await search.fill("A");
    await expect(dialog.getByRole("checkbox", { name: "Select Ada Rice", exact: true })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "Edit attendance", exact: true })).toBeVisible();
    expect(writes).toHaveLength(0);
  });
}

for (const cell of [false, true]) {
  for (const width of [320, 1280]) {
    test(`${cell ? "cell group" : "department"} headcount date dropdown stages, validates and clears filters at ${width}px`, async ({ page, context }) => {
      const writes = await fixture(context, true);
      const reads: URL[] = [];
      const resource = cell ? "cell-groups" : "departments";
      await context.route(`**/api/backend/admin/${resource}/second/attendance-sessions**`, route => {
        const url = new URL(route.request().url());
        reads.push(url);
        const pageNumber = Number(url.searchParams.get("page") ?? 1);
        const limit = Number(url.searchParams.get("limit") ?? 20);
        const rows = Array.from({ length: 35 }, (_, index) => ({
          id: `head-${index}`, contextType: cell ? "cell_group" : "department", contextId: "second", contextName: "Welcome team", branchId: "west", attendanceDate: "2026-11-08", total: 50 + index,
        }));
        return route.fulfill({ json: { success: true, data: { data: rows.slice((pageNumber - 1) * limit, pageNumber * limit), meta: { total: 35, totalPages: 2, page: pageNumber, limit } } } });
      });
      await page.setViewportSize({ width, height: 960 });
      await page.goto(`${cell ? "/gatherings/groups/cell/second" : "/gatherings/groups/second"}?tab=reported`);
      const filters = page.getByRole("group", { name: "Headcount record filters", exact: true });
      const trigger = filters.getByRole("button", { name: /^Date range/ });
      await expect(page.getByLabel("From date", { exact: true })).toHaveCount(0);
      await page.getByRole("button", { name: "Next", exact: true }).click();
      await expect.poll(() => reads.some(url => url.searchParams.get("page") === "2")).toBe(true);
      await trigger.click();
      await page.getByLabel("From date", { exact: true }).fill("2026-11-20");
      await page.getByLabel("To date", { exact: true }).fill("2026-11-10");
      await expect(page.getByRole("alert").filter({ hasText: "To date must be on or after From date." })).toBeVisible();
      await expect(page.getByRole("button", { name: "Apply dates", exact: true })).toBeDisabled();
      expect(reads.some(url => url.searchParams.has("startDate"))).toBe(false);
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
      await trigger.click();
      await expect(page.getByLabel("From date", { exact: true })).toHaveValue("");
      await page.getByLabel("From date", { exact: true }).fill("2026-11-01");
      await page.getByLabel("To date", { exact: true }).fill("2026-11-30");
      await page.getByRole("button", { name: "Apply dates", exact: true }).click();
      await expect.poll(() => reads.some(url => url.searchParams.get("startDate") === "2026-11-01" && url.searchParams.get("endDate") === "2026-11-30" && url.searchParams.get("page") === "1")).toBe(true);
      await expect(trigger).toHaveAccessibleName("Date range, 2026-11-01 to 2026-11-30");
      await trigger.click();
      await expect(page.getByLabel("From date", { exact: true })).toHaveValue("2026-11-01");
      await page.screenshot({ path: `/tmp/headcount-dates-${cell ? "cell" : "department"}-${width}.png`, fullPage: true });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole("button", { name: "Clear dates", exact: true }).click();
      await expect(trigger).toHaveAccessibleName("Date range");
      await trigger.click();
      await page.getByLabel("To date", { exact: true }).fill("2026-11-30");
      await page.getByRole("button", { name: "Apply dates", exact: true }).click();
      await expect.poll(() => reads.some(url => !url.searchParams.has("startDate") && url.searchParams.get("endDate") === "2026-11-30")).toBe(true);
      expect(writes).toHaveLength(0);
    });
  }
}
