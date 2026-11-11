import { expect, test, type BrowserContext } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test.use({ serviceWorkers: "block" });
const allPermissions = [
  "events:calendar:read",
  "events:list:read",
  "events:all:read",
  "events:create",
  "events:update",
  "events:delete",
  "events:registrations:read",
  "events:registrations:create",
  "events:checkin:read",
  "events:checkin:create",
  "events:tickets:read",
  "events:tickets:create",
  "events:tickets:update",
  "events:tickets:delete",
  "attendance:services:read",
  "branches:read",
];
async function fixture(
  context: BrowserContext,
  options: {
    permissions?: string[];
    eventCount?: number;
    failServices?: boolean;
    failTiers?: boolean;
    failTickets?: boolean;
    empty?: boolean;
    hq?: boolean;
    dark?: boolean;
    planFeatures?: string[];
  } = {},
) {
  const state = {
    reads: [] as string[],
    writes: [] as string[],
    failServices: !!options.failServices,
  };
  const event = {
    eventId: "gathering",
    churchId: "church",
    branchId: "west",
    branchName: "West Branch",
    title: "Community Gathering",
    description: "A welcoming community event.",
    type: "conference",
    isFree: true,
    startDate: "2026-11-01T08:00:00Z",
    capacity: 100,
    registrationCount: 5,
    createdAt: "2026-10-20T08:00:00Z",
    updatedAt: "2026-10-20T08:00:00Z",
    archivedAt: null as string | null,
  };
  const events = options.empty
    ? []
    : [
        event,
        ...Array.from({ length: (options.eventCount ?? 5) - 1 }, (_, i) => ({
          ...event,
          eventId: `event-${i}`,
          title: `Community session ${i + 1}`,
          type: i % 2 ? "training" : "lifecycle",
          startDate: new Date(Date.UTC(2026, 10, 1, 10 + i)).toISOString(),
        })),
      ];
  await context.addCookies([
    {
      name: "belivrhq_token",
      value: "events-visual",
      url: "http://127.0.0.1:3107",
    },
  ]);
  await context.addInitScript(
    ({ dark }) => {
      // Mocked API tests opt out of generated PWA registration as well as SW traffic.
      // Playwright's block mode resolves register() without a registration object.
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
      body: "Object.assign(window.Tawk_API,{showWidget(){},hideWidget(){},maximize(){},shutdown(){}});window.Tawk_API?.onLoad?.();",
    }),
  );
  await context.route("**/api/session", (route) =>
    route.fulfill({ json: { hasSession: true } }),
  );
  await context.route("**/api/backend/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (request.method() === "GET") state.reads.push(url.pathname + url.search);
    else state.writes.push(path);
    const eventMutation = path.match(/\/events\/([^/]+)\/(archive|restore)$/);
    if (request.method() !== "GET" && eventMutation) {
      const row = events.find((item) => item.eventId === eventMutation[1]);
      if (row)
        row.archivedAt =
          eventMutation[2] === "archive" ? "2026-11-08T08:00:00Z" : null;
      return route.fulfill({ json: { success: true, data: row } });
    }
    if (
      (options.failTiers && path.endsWith("/tiers")) ||
      (options.failTickets && path.endsWith("/tickets"))
    )
      return route.fulfill({
        status: 500,
        json: { success: false, error: { message: "Unavailable" } },
      });
    let data: unknown = [];
    if (path.endsWith("/auth/session"))
      data = { userId: "user", email: "events@example.test" };
    else if (path.endsWith("/profiles/me"))
      data = {
        profileId: "profile",
        userId: "user",
        churchId: "church",
        branchId: "west",
        branch: { name: "West Branch" },
        firstName: "Event",
        lastName: "Staff",
        role: ["church_admin"],
        status: "active",
        isAdminHq: !!options.hq,
        planFeatures: options.planFeatures ?? ["events", "tickets", "attendance", "reports"],
        permissions: options.permissions ?? allPermissions,
      };
    else if (path.endsWith("/services")) {
      if (state.failServices)
        return route.fulfill({
          status: 500,
          json: { success: false, error: { message: "Unavailable" } },
        });
      data = {
        data: options.empty
          ? []
          : [
              {
                serviceId: "sunday",
                name: "Sunday Worship",
                dayOfWeek: 0,
                isActive: true,
                startTime: "09:00",
                endTime: "10:30",
                churchId: "church",
                branchId: "west",
              },
            ],
        meta: { total: 1, totalPages: 1, page: 1, limit: 100 },
      };
    } else if (path.endsWith("/branches"))
      data = {
        data: [
          { branchId: "west", name: "West Branch" },
          { branchId: "east", name: "East Branch" },
        ],
        meta: { total: 2 },
      };
    else if (path.endsWith("/events/gathering/tiers"))
      data = [
        {
          id: "tier",
          name: "General Admission",
          price: 2500,
          capacity: 100,
          description: "Standard seating",
        },
      ];
    else if (path.endsWith("/events/gathering/registrations"))
      data = [
        {
          registrationId: "reg",
          memberId: "member",
          memberName: "Grace Member",
          paymentStatus: "paid",
          quantity: 1,
          checkedIn: false,
          createdAt: "2026-10-28T09:00:00Z",
        },
      ];
    else if (path.endsWith("/events/gathering")) data = event;
    else if (path.endsWith("/events")) {
      const search = url.searchParams.get("search")?.toLowerCase();
      const archived = url.searchParams.get("archived") === "true";
      const filtered = events.filter(
        (item) =>
          !!item.archivedAt === archived &&
          (!search || item.title.toLowerCase().includes(search)) &&
          (!url.searchParams.get("type") ||
            item.type === url.searchParams.get("type")) &&
          (!url.searchParams.get("branchId") ||
            item.branchId === url.searchParams.get("branchId")) &&
          (!url.searchParams.get("startDate") ||
            new Date(item.startDate) >=
              new Date(url.searchParams.get("startDate")!)) &&
          (!url.searchParams.get("endDate") ||
            new Date(item.startDate) <=
              new Date(url.searchParams.get("endDate")!)),
      );
      const page = Number(url.searchParams.get("page") ?? 1),
        limit = Number(url.searchParams.get("limit") ?? 100);
      data = {
        data: filtered.slice((page - 1) * limit, page * limit),
        total: filtered.length,
      };
    } else if (path.endsWith("/unread-count")) data = { count: 0 };
    else if (
      path.endsWith("/notifications") ||
      path.endsWith("/tickets") ||
      path.endsWith("/attendance-sessions")
    )
      data = {
        data: [],
        total: 0,
        meta: { total: 0, totalPages: 0, page: 1, limit: 20 },
      };
    await route.fulfill({ json: { success: true, data } });
  });
  return state;
}

for (const width of [390, 768, 1440])
  for (const dark of [false, true]) {
    test(`Events surfaces at ${width}px in ${dark ? "dark" : "light"} mode`, async ({
      context,
      page,
    }) => {
      await fixture(context, { dark });
      await page.clock.setFixedTime(new Date("2026-11-01T08:00:00Z"));
      await page.setViewportSize({ width, height: 1000 });
      await mkdir("/tmp/belivrhq-events-previews", { recursive: true });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      for (const [path, name] of [
        ["/events", "calendar"],
        ["/events/list", "directory"],
        ["/events/gathering", "details"],
        ["/events/new", "form"],
        ["/events/registrations?eventId=gathering", "registrations"],
        ["/events/check-in?eventId=gathering", "check-in"],
        ["/events/gathering/tiers", "tiers"],
        ["/events/management", "tickets"],
      ]) {
        await page.goto(path);
        await expect(page.locator("h1"), path).toBeVisible();
        if (name === "calendar")
          await expect(
            page.getByLabel("Selected day agenda").getByText("Sunday Worship"),
          ).toBeVisible();
        if (name === "directory")
          await expect(
            page.getByRole("cell", {
              name: "Community Gathering",
              exact: true,
            }),
          ).toBeVisible();
        if (name === "details")
          await expect(
            page.getByRole("heading", {
              name: "Community Gathering",
              level: 1,
            }),
          ).toBeVisible();
        if (name === "registrations")
          await expect(
            page.getByRole("cell", { name: "Grace Member" }),
          ).toBeVisible();
        if (name === "tiers")
          await expect(
            page.getByRole("cell", { name: "General Admission", exact: true }),
          ).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          path,
        ).toBe(true);
        await page.screenshot({
          path: `/tmp/belivrhq-events-previews/${name}-${width}-${dark ? "dark" : "light"}.png`,
          fullPage: true,
        });
      }
      expect(errors).toEqual([]);
    });
  }

test("calendar navigation, overflow, Sunday services, date defaults and preview management", async ({
  context,
  page,
}) => {
  await fixture(context);
  await page.clock.setFixedTime(new Date("2026-11-01T08:00:00Z"));
  await page.goto("/events");
  const agenda = page.getByLabel("Selected day agenda");
  await expect(
    page.getByRole("combobox", { name: "Branch", exact: true }),
  ).toBeDisabled();
  await expect(agenda.getByText("Sunday Worship")).toBeVisible();
  await page.getByRole("button", { name: "3 more on November 1" }).click();
  await expect(agenda).toBeFocused();
  await expect(agenda.getByText("Community session 4")).toBeVisible();
  await page.getByRole("button", { name: "Next period" }).click();
  await expect(agenda.getByText("Tuesday, Dec 1")).toBeVisible();
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(agenda.getByText("Sunday, Nov 1")).toBeVisible();
  await page.getByLabel("Jump to date").fill("2026-11-08");
  await expect(agenda.getByText("Sunday Worship")).toBeVisible();
  await page
    .getByRole("button", { name: "Create event on selected day" })
    .click();
  await expect(page.getByLabel("Event Date", { exact: true })).toHaveValue(
    "2026-11-08",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByLabel("Jump to date").fill("2026-11-01");
  await agenda.getByRole("button", { name: /Community Gathering/ }).click();
  await page.getByRole("button", { name: "Event preview management" }).click();
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Event preview management" }),
  ).toBeFocused();
});

test("calendar keeps events during service failure and retries independently", async ({
  context,
  page,
}) => {
  const state = await fixture(context, { failServices: true });
  await page.clock.setFixedTime(new Date("2026-11-01T08:00:00Z"));
  await page.goto("/events");
  await expect(
    page.getByRole("heading", { name: "Unable to load calendar services" }),
  ).toBeVisible({ timeout: 20000 });
  await expect(
    page.getByLabel("Selected day agenda").getByText("Community Gathering"),
  ).toBeVisible();
  const previous = state.reads.filter((url) =>
    url.startsWith("/api/backend/events?"),
  ).length;
  state.failServices = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByLabel("Selected day agenda").getByText("Sunday Worship"),
  ).toBeVisible();
  expect(
    state.reads.filter((url) => url.startsWith("/api/backend/events?")).length,
  ).toBe(previous);
});

test("calendar-only readers do not request unavailable modules or see write shortcuts", async ({
  context,
  page,
}) => {
  const state = await fixture(context, {
    permissions: ["events:calendar:read"],
  });
  await page.goto("/events");
  await expect(
    page.getByRole("heading", { name: "Events", exact: true, level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create Event", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Tickets", exact: true }),
  ).toHaveCount(0);
  expect(state.reads.some((url) => /\/events\?|\/services\?/.test(url))).toBe(
    false,
  );
});

test("directory removes statistics reads and preserves secondary filters", async ({
  context,
  page,
}) => {
  const state = await fixture(context);
  await page.goto("/events/list");
  await expect(
    page.getByRole("cell", { name: "Community Gathering", exact: true }),
  ).toBeVisible();
  expect(
    state.reads.some(
      (url) => new URL(url, "http://test").searchParams.get("limit") === "1",
    ),
  ).toBe(false);
  await page.getByRole("button", { name: "More filters" }).click();
  await page.getByLabel("Sort events").selectOption("title");
  await expect
    .poll(() => state.reads.some((url) => url.includes("sortBy=title")))
    .toBe(true);
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(page.getByLabel("Sort events")).toHaveValue("startDate");
});

test("HQ branch selection forwards the same scope to both calendar sources", async ({
  context,
  page,
}) => {
  const state = await fixture(context, { hq: true });
  await page.goto("/events");
  await page.getByRole("combobox", { name: "Filter by branch" }).click();
  await page.getByRole("option", { name: "East Branch" }).click();
  await expect
    .poll(() =>
      state.reads.some(
        (url) => url.includes("/events?") && url.includes("branchId=east"),
      ),
    )
    .toBe(true);
  await expect
    .poll(() =>
      state.reads.some(
        (url) => url.includes("/services?") && url.includes("branchId=east"),
      ),
    )
    .toBe(true);
});

test("tier management dialogs return keyboard focus without changing data", async ({
  context,
  page,
}) => {
  const state = await fixture(context);
  await page.goto("/events/gathering/tiers");
  const trigger = page.getByRole("button", {
    name: "Manage General Admission",
    exact: true,
  });
  await trigger.click();
  await page.getByRole("menuitem", { name: "Edit tier", exact: true }).click();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
    "General Admission",
  );
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page
    .getByRole("menuitem", { name: "Delete tier", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  expect(state.writes).toEqual([]);
});

test("empty calendar explains loaded coverage and retains date navigation", async ({
  context,
  page,
}) => {
  await fixture(context, { empty: true });
  await page.goto("/events");
  await expect(
    page.getByText("No loaded events or services on this day."),
  ).toBeVisible();
  await expect(page.getByText(/up to 100 of each/)).toBeVisible();
  await page.getByRole("button", { name: "week", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "week", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "day", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "day", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

for (const [path, title] of [
  ["/events/gathering/tiers", "Unable to load ticket tiers"],
  ["/events/management?tab=assigned", "Unable to load tickets"],
]) {
  test(`ticket errors stay distinct from empty results: ${path}`, async ({
    context,
    page,
  }) => {
    await fixture(context, { failTiers: true, failTickets: true });
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible({ timeout: 20000 });
    await expect(
      page.getByRole("button", { name: "Try again", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("No tickets found.", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText("No ticket tiers yet.", { exact: true }),
    ).toHaveCount(0);
  });
}

for (const width of [1280, 320])
  test(`calendar month and year navigation at ${width}px`, async ({
    page,
    context,
  }) => {
    const state = await fixture(context);
    await page.clock.setFixedTime(new Date("2026-11-08T08:00:00Z"));
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/gatherings/events");
    const navigation = page.getByRole("group", {
      name: "Calendar navigation",
      exact: true,
    });
    const period = navigation.locator("[data-calendar-period]");
    await expect(period).toHaveText("November 2026");
    await navigation
      .getByRole("combobox", { name: "Calendar month", exact: true })
      .click();
    await page.getByRole("option", { name: "December", exact: true }).click();
    await navigation
      .getByRole("button", { name: "Next month", exact: true })
      .click();
    await expect(period).toHaveText("January 2027");
    await navigation
      .getByRole("button", { name: "Next year", exact: true })
      .click();
    await expect(period).toHaveText("January 2028");
    await navigation
      .getByRole("button", { name: "Previous year", exact: true })
      .click();
    await expect(period).toHaveText("January 2027");
    await navigation
      .getByRole("button", { name: "Previous month", exact: true })
      .click();
    await expect(period).toHaveText("December 2026");
    await navigation
      .getByRole("combobox", { name: "Calendar year", exact: true })
      .click();
    await page.getByRole("option", { name: "2024", exact: true }).click();
    await navigation
      .getByRole("combobox", { name: "Calendar month", exact: true })
      .click();
    await page.getByRole("option", { name: "February", exact: true }).click();
    await expect(
      page.locator('[data-calendar-day="2024-02-29"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-calendar-day="2024-02-04"]'),
    ).toContainText("Sunday Worship");
    await navigation
      .getByRole("combobox", { name: "Calendar year", exact: true })
      .click();
    await page.getByRole("option", { name: "2025", exact: true }).click();
    await expect(period).toHaveText("February 2025");
    await expect(page.locator('[data-calendar-day="2025-02-29"]')).toHaveCount(
      0,
    );
    await navigation
      .getByRole("button", { name: "Today", exact: true })
      .click();
    await expect(period).toHaveText("November 2026");
    await expect(page.locator('[data-calendar-day="2026-11-08"]')).toHaveClass(
      /bg-brand-soft/,
    );
    await expect(
      page.getByRole("listbox", { includeHidden: true }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(state.writes).toEqual([]);
    await page.screenshot({
      path: `/tmp/belivrhq-calendar-navigation-${width}.png`,
      fullPage: true,
    });
  });

test("calendar month and year navigation remains available to calendar-only readers", async ({
  page,
  context,
}) => {
  const state = await fixture(context, {
    permissions: ["events:calendar:read"],
  });
  await page.clock.setFixedTime(new Date("2026-11-08T08:00:00Z"));
  await page.goto("/gatherings/events");
  const navigation = page.getByRole("group", {
    name: "Calendar navigation",
    exact: true,
  });
  await navigation
    .getByRole("combobox", { name: "Calendar year", exact: true })
    .click();
  await page.getByRole("option", { name: "2035", exact: true }).click();
  await expect(navigation.locator("[data-calendar-period]")).toHaveText(
    "November 2035",
  );
  expect(state.writes).toEqual([]);
  expect(
    state.reads.some((path) => path.includes("/attendance/services")),
  ).toBe(false);
});

test.describe("event register", () => {
  test.use({ timezoneId: "Africa/Lagos" });
  for (const width of [1280, 320])
    test(`View events navigation, filters, native dates and extra columns at ${width}px`, async ({
      page,
      context,
    }) => {
      const state = await fixture(context, {
        hq: width === 1280,
        eventCount: 20,
      });
      await page.setViewportSize({ width, height: 960 });
      await page.goto("/gatherings/events");
      await page
        .getByRole("link", { name: "View events", exact: true })
        .click();
      await expect(page).toHaveURL(/\/gatherings\/events\/list$/);
      await expect(
        page.getByRole("heading", {
          name: "Every event, in one place.",
          exact: true,
        }),
      ).toBeVisible();
      const table = page.locator('[data-list-table="events-list"]');
      await expect(
        table.getByRole("button", { name: "Open event", exact: true }),
      ).toHaveCount(0);
      await expect(
        table.getByRole("link", { name: "Open event", exact: true }),
      ).toHaveCount(15);
      await table
        .getByRole("button", { name: "Choose visible columns", exact: true })
        .click();
      await page
        .getByRole("menuitemcheckbox", { name: "Capacity", exact: true })
        .click();
      await page.keyboard.press("Escape");
      await expect(
        table.getByRole("columnheader", { name: "Capacity", exact: true }),
      ).toBeVisible();
      await expect(
        table.getByRole("cell", { name: "100", exact: true }),
      ).toHaveCount(15);
      const filters = page.getByRole("group", {
        name: "Event list filters",
        exact: true,
      });
      await filters.getByRole("textbox", { name: "Search events…", exact: true }).fill("Community");
      await expect
        .poll(() =>
          state.reads.some((path) => path.includes("search=Community")),
        )
        .toBe(true);
      await filters
        .getByRole("combobox", { name: "Event type", exact: true })
        .click();
      await page
        .getByRole("option", { name: "Conference", exact: true })
        .click();
      await expect(
        table.getByRole("link", { name: "Open event", exact: true }),
      ).toHaveCount(1);
      if (width === 1280) {
        await filters
          .getByRole("combobox", { name: "Event branch", exact: true })
          .click();
        await page
          .getByRole("option", { name: "East Branch", exact: true })
          .click();
        await expect(
          table.getByRole("link", { name: "Open event", exact: true }),
        ).toHaveCount(0);
      }
      await filters
        .getByRole("button", { name: "Clear filters", exact: true })
        .click();
      await filters.getByRole("button", { name: "Date range", exact: true }).click();
      await page.getByLabel("From date", { exact: true }).fill("2026-12-25");
      await page.getByLabel("To date", { exact: true }).fill("2026-12-25");
      await page.getByRole("button", { name: "Apply dates", exact: true }).click();
      await expect
        .poll(() =>
          state.reads.some((path) => {
            const url = new URL(path, "http://test");
            return (
              url.searchParams.get("startDate") ===
                "2026-12-24T23:00:00.000Z" &&
              url.searchParams.get("endDate") === "2026-12-25T22:59:59.999Z"
            );
          }),
        )
        .toBe(true);
      await expect(
        page.getByRole("spinbutton", { name: "Year", exact: true }),
      ).toHaveCount(0);
      await filters
        .getByRole("button", { name: "Clear filters", exact: true })
        .click();
      await expect(
        table.getByRole("link", { name: "Open event", exact: true }),
      ).toHaveCount(15);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `/tmp/belivrhq-event-register-${width}.png`,
        fullPage: true,
      });
      expect(state.writes).toHaveLength(0);
    });

  test("event register paging and sorting use the server query", async ({
    page,
    context,
  }) => {
    const state = await fixture(context, { eventCount: 20 });
    await page.goto("/gatherings/events/list");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect
      .poll(() =>
        state.reads.some(
          (path) =>
            new URL(path, "http://test").searchParams.get("page") === "2",
        ),
      )
      .toBe(true);
    await expect(
      page
        .locator('[data-list-table="events-list"]')
        .getByRole("link", { name: "Open event", exact: true }),
    ).toHaveCount(5);
    await page
      .getByRole("combobox", { name: "Sort events", exact: true })
      .click();
    await page.getByRole("option", { name: "Title", exact: true }).click();
    await page
      .getByRole("button", { name: "Sort descending", exact: true })
      .click();
    await expect
      .poll(() =>
        state.reads.some((path) => {
          const url = new URL(path, "http://test");
          return (
            url.searchParams.get("page") === "1" &&
            url.searchParams.get("sortBy") === "title" &&
            url.searchParams.get("sortOrder") === "desc"
          );
        }),
      )
      .toBe(true);
  });

  test("event archive and restore use confirmed management actions", async ({
    page,
    context,
  }) => {
    const state = await fixture(context);
    await page.goto("/gatherings/events/list");
    const table = page.locator('[data-list-table="events-list"]');
    const row = table
      .getByRole("row")
      .filter({ hasText: "Community Gathering" });
    await row
      .getByRole("button", { name: "Archive event", exact: true })
      .click();
    const dialog = page.getByTestId("manage-confirmation");
    await expect(dialog).toContainText("Community Gathering");
    expect(state.writes).toHaveLength(0);
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    expect(state.writes).toHaveLength(0);
    await row
      .getByRole("button", { name: "Archive event", exact: true })
      .click();
    await dialog
      .getByRole("button", { name: "Confirm action", exact: true })
      .click();
    await expect(dialog).toBeHidden();
    expect(state.writes).toHaveLength(1);
    await page.getByRole("button", { name: "Archived", exact: true }).click();
    await row
      .getByRole("button", { name: "Restore event", exact: true })
      .click();
    expect(state.writes).toHaveLength(1);
    await dialog
      .getByRole("button", { name: "Confirm action", exact: true })
      .click();
    await expect(dialog).toBeHidden();
    expect(state.writes).toHaveLength(2);
  });

  test("calendar-only readers cannot access the event register", async ({
    page,
    context,
  }) => {
    const state = await fixture(context, {
      permissions: ["events:calendar:read", "events:list:read"],
    });
    await page.goto("/gatherings/events");
    await expect(
      page.getByRole("heading", {
        name: "The season, laid out gently.",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "View events", exact: true }),
    ).toHaveCount(0);
    await expect(page.locator("[data-calendar-day]")).toHaveCount(42);
    state.reads.length = 0;
    await page.goto("/gatherings/events/list");
    await expect(
      page.getByRole("heading", {
        name: "Every event, in one place.",
        exact: true,
      }),
    ).toHaveCount(0);
    expect(
      state.reads.some((path) =>
        new URL(path, "http://test").pathname.endsWith("/events"),
      ),
    ).toBe(false);
  });
});

for (const width of [320, 1280]) {
  test(`event date dropdown stages, validates and clears dates at ${width}px`, async ({ page, context }) => {
    const state = await fixture(context, { eventCount: 20 });
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/gatherings/events/list");
    const trigger = page.getByRole("button", { name: /^Date range/ });
    await expect(page.getByLabel("From date", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect.poll(() => state.reads.some(path => new URL(path, "http://test").searchParams.get("page") === "2")).toBe(true);
    await trigger.click();
    await page.getByLabel("From date", { exact: true }).fill("2026-11-20");
    await page.getByLabel("To date", { exact: true }).fill("2026-11-10");
    await expect(page.getByRole("alert").filter({ hasText: "To date must be on or after From date." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Apply dates", exact: true })).toBeDisabled();
    expect(state.reads.some(path => new URL(path, "http://test").searchParams.has("startDate"))).toBe(false);
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(page.getByLabel("From date", { exact: true })).toHaveValue("");
    await page.getByLabel("From date", { exact: true }).fill("2026-11-01");
    await page.getByRole("button", { name: "Apply dates", exact: true }).click();
    await expect.poll(() => state.reads.some(path => {
      const params = new URL(path, "http://test").searchParams;
      return params.has("startDate") && !params.has("endDate") && params.get("page") === "1";
    })).toBe(true);
    await expect(trigger).toHaveAccessibleName("Date range, 2026-11-01 to any end");
    await trigger.click();
    await expect(page.getByLabel("From date", { exact: true })).toHaveValue("2026-11-01");
    await page.screenshot({ path: `/tmp/event-date-dropdown-${width}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Clear dates", exact: true }).click();
    await expect(trigger).toHaveAccessibleName("Date range");
    await trigger.click();
    await expect(page.getByLabel("From date", { exact: true })).toHaveValue("");
    expect(state.writes).toHaveLength(0);
  });
}

for (const paid of [false, true]) {
  test(`event creation offers appropriate pricing and no service type: ${paid ? "Network" : "Community"}`, async ({ page, context }) => {
    await fixture(context, { planFeatures: paid ? ["events", "tickets"] : ["events"] });
    const writes: Record<string, unknown>[] = [];
    await context.route("**/api/backend/events", async route => {
      if (route.request().method() !== "POST") return route.fallback();
      const body = route.request().postDataJSON();
      writes.push(body);
      return route.fulfill({ json: { success: true, data: { ...body, eventId: "gathering" } } });
    });
    await page.goto("/gatherings/events/new");
    await expect(page.getByRole("button", { name: "Service", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Conference", exact: true })).toBeVisible();
    const pricing = page.getByRole("switch", { name: "Free to attend", exact: true });
    await expect(pricing).toBeChecked();
    if (paid) {
      await expect(pricing).toBeEnabled();
      await pricing.click();
      await page.locator('input[type="number"]').last().fill("2500");
    } else {
      await expect(pricing).toBeDisabled();
      await expect(page.getByText("Your plan includes free events.", { exact: false })).toBeVisible();
    }
    await page.locator('input[placeholder="Sunday Gathering"]').fill("Community gathering");
    await page.locator('input[type="datetime-local"]').first().fill("2026-11-15T09:00");
    await page.getByRole("button", { name: "Create event", exact: true }).click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0].type).toBe("conference");
    expect(writes[0].isFree).toBe(!paid);
    expect(writes[0].price).toBe(paid ? 2500 : undefined);
  });
}

test("Community editing cannot convert free events to paid", async ({ page, context }) => {
  await fixture(context, { planFeatures: ["events"] });
  await page.goto("/gatherings/events/gathering/edit");
  await expect(page.getByRole("button", { name: "Service", exact: true })).toHaveCount(0);
  const pricing = page.getByRole("switch", { name: "Free entry", exact: true });
  await expect(pricing).toBeChecked();
  await expect(pricing).toBeDisabled();
});

test("Community can amend a legacy service event without reassigning its type or pricing", async ({ page, context }) => {
  await fixture(context, { planFeatures: ["events"] });
  const writes: Record<string, unknown>[] = [];
  await context.route("**/api/backend/events/gathering", route => {
    if (route.request().method() === "PATCH") {
      writes.push(route.request().postDataJSON());
      return route.fulfill({ json: { success: true, data: { eventId: "gathering", title: "Legacy gathering" } } });
    }
    return route.fulfill({ json: { success: true, data: {
      eventId: "gathering", title: "Legacy gathering", type: "service", startDate: "2026-11-15T09:00:00Z", isFree: false, price: 2500, registrationCount: 0,
    } } });
  });
  await page.goto("/gatherings/events/gathering/edit");
  await expect(page.getByText("Service (existing record)", { exact: true })).toBeVisible();
  await expect(page.getByRole("switch", { name: "Free entry", exact: true })).toBeDisabled();
  await expect(page.locator('input[inputmode="numeric"]').last()).toBeDisabled();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0]).not.toHaveProperty("type");
  expect(writes[0]).not.toHaveProperty("isFree");
  expect(writes[0]).not.toHaveProperty("price");
});
