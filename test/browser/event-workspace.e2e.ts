import { expect, test, type BrowserContext } from "@playwright/test";

const runtimeErrors = new WeakMap<BrowserContext, string[]>();
test.afterEach(async ({ context }) => {
  expect(runtimeErrors.get(context) ?? [], "Unexpected browser runtime errors").toEqual([]);
});

async function fixture(context: BrowserContext, options: { permissions?: string[]; failRegistrations?: boolean; archived?: boolean } = {}) {
  const errors: string[] = [];
  runtimeErrors.set(context, errors);
  for (const page of context.pages()) {
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => {
      if (message.type() === "error" && /TypeError|ReferenceError|hydration/i.test(message.text())) errors.push(message.text());
    });
  }
  const writes: { method: string; path: string; body: Record<string, unknown> }[] = [];
  const reads: string[] = [];
  const event = {
    eventId: "workspace-event", churchId: "church", title: "Community Gathering",
    description: "A gathering for our community.", type: "conference", isFree: true,
    branchId: "west", branchName: "West Branch", startDate: "2026-11-01T09:00:00Z",
    registrationCount: 20, capacity: 100,
    archivedAt: options.archived ? "2026-10-26T09:00:00Z" : null,
  };
  await context.addCookies([{ name: "belivrhq_token", value: "workspace-fixture", url: "http://127.0.0.1:3107" }]);
  await context.route("https://embed.tawk.to/**", route => route.fulfill({ body: "" }));
  await context.route("**/api/session", route => route.fulfill({ json: { hasSession: true } }));
  await context.route("**/api/backend/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();
    if (method !== "GET") writes.push({ method, path, body: request.postData() ? request.postDataJSON() : {} });
    else reads.push(path);
    let data: unknown = [];
    if (path.endsWith("/profiles/me")) data = {
      profileId: "profile", userId: "user", churchId: "church", branchId: "west", branch: { name: "West Branch" },
      firstName: "Church", lastName: "Staff", role: ["secretary"], status: "active", isAdminHq: false,
      planFeatures: ["events", "tickets", "reports"],
      permissions: options.permissions ?? ["events:all:read", "events:list:read", "events:create", "events:update", "events:delete", "events:registrations:read", "events:registrations:create", "events:checkin:read", "events:checkin:create", "events:tickets:read", "events:tickets:create"],
    };
    else if (path.endsWith("/registrations")) {
      if (options.failRegistrations) return route.fulfill({ status: 500, json: { success: false, error: { message: "Failed" } } });
      data = Array.from({ length: 20 }, (_, i) => ({ registrationId: `reg-${i}`, memberId: `member-${i}`, memberName: `Registered Person ${i + 1}`, quantity: 1, paymentStatus: "paid", checkedIn: false, createdAt: "2026-10-26T09:00:00Z" }));
    }
    else if (path.endsWith("/workspace-event/attendance")) data = [{ attendanceId: "attendance", memberName: "Checked-in Person", memberId: "member-1", source: "manual", checkInAt: "2026-11-01T09:00:00Z" }];
    else if (path.endsWith("/events/workspace-event")) data = event;
    else if (path.endsWith("/events")) data = method === "GET" ? { data: [event], total: 1 } : event;
    else if (path.endsWith("/members") || path.endsWith("/attendance-sessions") || path.endsWith("/tickets") || path.endsWith("/notifications") || path.endsWith("/auth/sessions")) data = { data: [], total: 0, meta: { total: 0, totalPages: 0, page: 1, limit: 20 } };
    else if (path.endsWith("/unread-count")) data = { count: 0 };
    await route.fulfill({ json: { success: true, data } });
  });
  return { writes, reads };
}

test("event tabs preserve pagination, query parameters, reload and browser history", async ({ context, page }) => {
  await fixture(context);
  await page.goto("/events/workspace-event?source=calendar");
  await expect(page.getByRole("heading", { name: "Community Gathering", level: 1 })).toBeVisible();
  await expect(page.getByText("A gathering for our community.")).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("cell", { name: "Registered Person 16", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Attendance", exact: true }).click();
  await expect(page).toHaveURL(/source=calendar&tab=attendance$/);
  await expect(page.getByRole("cell", { name: "Checked-in Person", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Register Attendee", exact: true })).toBeHidden();
  await page.goBack();
  await expect(page.getByRole("cell", { name: "Registered Person 16", exact: true })).toBeVisible();
  await page.goForward();
  await page.reload();
  await expect(page.getByRole("tab", { name: "Attendance", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Check In Attendees", exact: true }).click();
  await expect(page).toHaveURL(/events\/check-in\?eventId=workspace-event$/);
  await expect(page.getByLabel("Attendance roster", { exact: true })).toBeVisible();
});

for (const width of [390, 768, 1440]) {
  test(`event workspace is usable at ${width}px with keyboard tabs and a focused delete dialog`, async ({ context, page }) => {
    await fixture(context);
    await page.setViewportSize({ width, height: 950 });
    await page.goto("/events/workspace-event");
    const registrationTab = page.getByRole("tab", { name: "Registrations", exact: true });
    await registrationTab.focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Attendance", exact: true })).toHaveAttribute("aria-selected", "true");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `test-results/event-workspace-${width}.png`, fullPage: true });
    await page.getByRole("button", { name: "Event management" }).click();
    await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Delete Event" })).toBeVisible();
    expect(await page.getByRole("dialog").evaluate(el => el.contains(document.activeElement))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Event management" })).toBeFocused();
    await page.getByRole("button", { name: "Event management" }).click();
    await page.getByRole("menuitem", { name: "Archive", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Archive Community Gathering" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Event management" })).toBeFocused();
    await page.goto("/events/new");
    await expect(page.getByRole("group", { name: "Registration and pricing", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/event-form-${width}.png`, fullPage: true });
  });
}

test("readers see only their permitted workspace and unavailable data is not an empty roster", async ({ context, page }) => {
  const state = await fixture(context, { permissions: ["events:all:read", "events:registrations:read"] });
  await page.goto("/events/workspace-event?tab=attendance");
  await expect(page.getByRole("tab", { name: "Registrations", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tab", { name: "Attendance", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Event management" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Register Attendee", exact: true })).toHaveCount(0);
  expect(state.reads.some(path => path.endsWith("/attendance") || path.endsWith("/attendance-sessions"))).toBe(false);
});

test("registration errors keep event context and retry visible", async ({ context, page }) => {
  await fixture(context, { failRegistrations: true });
  await page.goto("/events/workspace-event");
  await expect(page.getByRole("heading", { name: "Community Gathering", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Unable to load registrations" })).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(page.getByText("No registrations for this event yet.")).toHaveCount(0);
});

test("ticket tabs support direct links, preserved query parameters and Back", async ({ context, page }) => {
  await fixture(context);
  await page.goto("/events/management?source=events&tab=assigned");
  await expect(page.getByRole("tab", { name: "Assigned Tickets", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Ticket Types", exact: true }).click();
  await expect(page).toHaveURL(/source=events&tab=types$/);
  await page.goBack();
  await expect(page.getByRole("tab", { name: "Assigned Tickets", exact: true })).toHaveAttribute("aria-selected", "true");
});

test("create form keeps visible validation, conditional pricing and the existing payload", async ({ context, page }) => {
  const state = await fixture(context);
  await page.goto("/events/new");
  await expect(page.getByRole("group", { name: "Event details", exact: true })).toBeVisible();
  await expect(page.getByRole("group", { name: "Schedule and location", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Create Event", exact: true }).click();
  await expect(page.getByText("Title must be at least 2 characters")).toBeVisible();
  await page.getByLabel("Title *", { exact: true }).fill("Community Gathering");
  await page.getByRole("combobox", { name: "Type *", exact: true }).click();
  await page.getByRole("option", { name: "Conference", exact: true }).click();
  await page.getByLabel("Start Date *", { exact: true }).fill("2026-11-01T09:00");
  await page.getByLabel("Description (optional)", { exact: true }).fill("Community event");
  await page.getByRole("switch", { name: "Free Event", exact: true }).click();
  await expect(page.getByLabel("Price *", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Create Event", exact: true }).click();
  await expect(page.getByText("Price is required for paid events")).toBeVisible();
  await page.getByLabel("Price *", { exact: true }).fill("5000");
  await page.getByRole("button", { name: "Create Event", exact: true }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  expect(state.writes[0]).toEqual({ method: "POST", path: "/api/backend/events", body: { branchId: "west", title: "Community Gathering", description: "Community event", type: "conference", startDate: "2026-11-01T09:00", isFree: false, price: 5000 } });
});

test("edit form retains saved values and clearing optional fields sends null", async ({ context, page }) => {
  const state = await fixture(context);
  await page.goto("/events/workspace-event/edit");
  await expect(page.getByLabel("Title *", { exact: true })).toHaveValue("Community Gathering");
  await expect(page.getByLabel("Description (optional)", { exact: true })).toHaveValue("A gathering for our community.");
  await page.getByLabel("Description (optional)", { exact: true }).fill("");
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  expect(state.writes[0].method).toBe("PATCH");
  expect(state.writes[0].body).toMatchObject({ title: "Community Gathering", type: "conference", description: null, capacity: 100, isFree: true, price: null });
  expect(state.writes[0].body).not.toHaveProperty("branchId");
});


test("create-only registration staff keep the action without reading either roster", async ({ context, page }) => {
  const state = await fixture(context, { permissions: ["events:all:read", "events:registrations:create"] });
  await page.goto("/events/workspace-event");
  await expect(page.getByRole("button", { name: "Register Attendee", exact: true })).toBeVisible();
  await expect(page.getByText("You can register attendees, but your role cannot view the registration roster.")).toBeVisible();
  expect(state.reads.some(path => path.endsWith("/registrations") || path.endsWith("/attendance"))).toBe(false);
});

test("attendance-only readers land in Attendance and cannot register attendees", async ({ context, page }) => {
  await fixture(context, { permissions: ["events:all:read", "events:checkin:read"] });
  await page.goto("/events/workspace-event?tab=registrations");
  await expect(page.getByRole("tab", { name: "Attendance", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("cell", { name: "Checked-in Person", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Registrations", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Register Attendee", exact: true })).toHaveCount(0);
});

test("archived events retain restore and permanent deletion without operational write actions", async ({ context, page }) => {
  await fixture(context, { archived: true });
  await page.goto("/events/workspace-event?tab=attendance");
  await expect(page.getByRole("button", { name: "Check In Attendees", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Record general attendance", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Event management" }).click();
  await expect(page.getByRole("menuitem", { name: "Restore", exact: true })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Delete Forever", exact: true })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Edit", exact: true })).toHaveCount(0);
});
