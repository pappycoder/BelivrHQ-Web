import { expect, test, type BrowserContext } from "@playwright/test";
import { mkdir } from "node:fs/promises";
test.use({ serviceWorkers: "block" });
async function fixture(
  context: BrowserContext,
  options: {
    createOnly?: boolean;
    readOnly?: boolean;
    failAttendance?: boolean;
    empty?: boolean;
    dark?: boolean;
  } = {},
) {
  const state = {
    reads: [] as string[],
    writes: [] as { method: string; body: Record<string, unknown> }[],
    failSave: false,
    failAttendance: !!options.failAttendance,
  };
  const service = {
    serviceId: "service-a",
    churchId: "church",
    branchId: "west",
    name: "Family Service",
    category: "mixed",
    dayOfWeek: 0,
    startTime: "09:00",
    endTime: "11:00",
    isActive: true,
  };
  const records = Array.from({ length: 30 }, (_, i) => ({
    id: `head-${i}`,
    serviceId: "service-a",
    serviceName: "Family Service",
    branchId: "west",
    branchName: "West Branch",
    attendanceDate: "2026-10-29",
    total: 100 + i,
    adultCount: 60,
    childrenCount: null,
    maleCount: null,
    femaleCount: null,
  }));
  await context.addCookies([
    {
      name: "belivrhq_token",
      value: "attendance-compact",
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
      body: "Object.assign(window.Tawk_API,{showWidget(){},hideWidget(){},maximize(){},shutdown(){}});window.Tawk_API?.onLoad?.();",
    }),
  );
  await context.route("**/api/session", (route) =>
    route.fulfill({ json: { hasSession: true } }),
  );
  await context.route("**/api/backend/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname.replace("/api/backend", "");
    if (req.method() === "GET") state.reads.push(path + url.search);
    else state.writes.push({ method: req.method(), body: req.postDataJSON() });
    let data: unknown = [];
    if (path === "/profiles/me")
      data = {
        profileId: "profile",
        userId: "user",
        churchId: "church",
        branchId: "west",
        branch: { name: "West Branch" },
        firstName: "Attendance",
        lastName: "Staff",
        role: ["church_admin"],
        status: "active",
        isAdminHq: false,
        planFeatures: ["attendance"],
        permissions: [
          "attendance:services:read",
          ...(!options.readOnly ? ["attendance:checkin:create"] : []),
          ...(!options.createOnly
            ? [
                "attendance:records:read",
                ...(!options.readOnly ? ["attendance:records:update"] : []),
              ]
            : []),
        ],
      };
    else if (path === "/auth/session")
      data = { userId: "user", email: "attendance@example.test" };
    else if (path === "/services/service-a") data = service;
    else if (path === "/services")
      data = {
        data: [
          service,
          { ...service, serviceId: "service-b", name: "Evening Service" },
        ],
        meta: { total: 2, page: 1, limit: 100, totalPages: 1 },
      };
    else if (path === "/attendance/by-service/service-a") {
      if (state.failAttendance)
        return route.fulfill({
          status: 500,
          json: { success: false, error: { message: "Unavailable" } },
        });
      data = {
        data: options.empty
          ? []
          : Array.from({ length: 25 }, (_, i) => ({
              attendanceId: `a-${i}`,
              churchId: "church",
              memberId: i < 20 ? `m-${i}` : undefined,
              visitorId: i >= 20 && i < 24 ? `v-${i}` : undefined,
              category: i < 20 ? "adult" : i < 24 ? "children" : "unspecified",
              source: "manual",
              checkInAt: "2026-10-29T09:00:00Z",
              createdAt: "2026-10-29T09:00:00Z",
            })),
        total: options.empty ? 0 : 25,
      };
    } else if (path === "/attendance/general" && req.method() === "POST") {
      if (state.failSave)
        return route.fulfill({
          status: 500,
          json: { success: false, error: { message: "Save failed" } },
        });
      data = { ...req.postDataJSON(), id: "created" };
    } else if (path === "/attendance/general") {
      const page = Number(url.searchParams.get("page") || 1),
        limit = Number(url.searchParams.get("limit") || 20);
      data = {
        data: records.slice((page - 1) * limit, page * limit),
        meta: { page, limit, total: 30, totalPages: Math.ceil(30 / limit) },
      };
    } else if (
      path.startsWith("/attendance/general/head-") &&
      req.method() === "PATCH"
    )
      data = { ...records[0], ...req.postDataJSON() };
    else if (path === "/unread-count" || path.endsWith("/unread-count"))
      data = { count: 0 };
    else if (
      path === "/attendance" ||
      path === "/members" ||
      path === "/notifications"
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
async function selectService(page: import("@playwright/test").Page) {
  await page.getByRole("combobox").first().click();
  await page
    .getByRole("option", { name: "Family Service", exact: true })
    .click();
}
for (const width of [390, 1440])
  for (const dark of [false, true])
    test(`compact attendance previews ${width}px ${dark ? "dark" : "light"}`, async ({
      context,
      page,
    }) => {
      await fixture(context, { dark });
      await page.setViewportSize({ width, height: 1000 });
      await mkdir("/tmp/belivrhq-attendance-compact-previews", {
        recursive: true,
      });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("/attendance/services/service-a");
      const charts = page.getByRole("region", {
        name: "Service named check-in charts",
      });
      await expect(charts.locator("svg.recharts-surface")).toHaveCount(2);
      await expect(
        charts.getByText("Members20", { exact: true }),
      ).toBeVisible();
      await expect(
        charts.getByText("Not supplied1", { exact: true }),
      ).toBeVisible();
      await expect(
        charts.getByText("Unlinked1", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("Showing 1–20 of 30 records", { exact: true }),
      ).toBeVisible();
      expect(
        await page
          .getByText("Showing 1–20 of 30 records", { exact: true })
          .evaluate((el) => getComputedStyle(el).fontSize),
      ).toBe("12px");
      expect(
        await page
          .getByRole("table", { name: "General attendance", exact: true })
          .locator("tbody td")
          .nth(1)
          .evaluate((element) => getComputedStyle(element).paddingTop),
      ).toBe("6px");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `/tmp/belivrhq-attendance-compact-previews/service-${width}-${dark ? "dark" : "light"}.png`,
        fullPage: true,
      });
      await page.getByRole("button", { name: "Next", exact: true }).click();
      await expect(
        page.getByText("Showing 21–30 of 30 records", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Next", exact: true }),
      ).toBeDisabled();
      await page.goto("/attendance/check-in");
      await selectService(page);
      await expect(
        page.getByRole("form", { name: "Reported headcount", exact: true }),
      ).toBeVisible();
      await expect(page.locator("details")).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `/tmp/belivrhq-attendance-compact-previews/check-in-${width}-${dark ? "dark" : "light"}.png`,
        fullPage: true,
      });
      expect(errors).toEqual([]);
    });
test("inline entry preserves failed values, validates subtotals and clears counts after saving", async ({
  context,
  page,
}) => {
  const state = await fixture(context);
  await page.goto("/attendance/check-in");
  await selectService(page);
  const form = page.getByRole("form", {
    name: "Reported headcount",
    exact: true,
  });
  await form.getByLabel("Attendance date", { exact: true }).fill("2026-10-20");
  await form.getByLabel("Total attendance *", { exact: true }).fill("100");
  await form.getByLabel("Adults (optional)", { exact: true }).fill("101");
  await form
    .getByRole("button", { name: "Save attendance", exact: true })
    .click();
  await expect(form.getByRole("alert")).toContainText(
    "must each be no greater",
  );
  expect(state.writes).toHaveLength(0);
  await form.getByLabel("Adults (optional)", { exact: true }).fill("60");
  state.failSave = true;
  await form
    .getByRole("button", { name: "Save attendance", exact: true })
    .click();
  await expect(form.getByRole("alert")).toBeVisible();
  await expect(
    form.getByLabel("Total attendance *", { exact: true }),
  ).toHaveValue("100");
  state.failSave = false;
  await form
    .getByRole("button", { name: "Save attendance", exact: true })
    .click();
  await expect(
    form.getByLabel("Total attendance *", { exact: true }),
  ).toHaveValue("");
  await expect(form.getByLabel("Attendance date", { exact: true })).toHaveValue(
    "2026-10-20",
  );
  expect(state.writes[1].body).toMatchObject({
    serviceId: "service-a",
    branchId: "west",
    attendanceDate: "2026-10-20",
    total: 100,
    adultCount: 60,
    childrenCount: null,
    maleCount: null,
    femaleCount: null,
  });
});
test("changing service confirms and discards only after approval", async ({
  context,
  page,
}) => {
  await fixture(context);
  await page.goto("/attendance/check-in");
  await selectService(page);
  const form = page.getByRole("form", {
    name: "Reported headcount",
    exact: true,
  });
  await form.getByLabel("Total attendance *", { exact: true }).fill("75");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("combobox").first().click();
  await page
    .getByRole("option", { name: "Evening Service", exact: true })
    .click();
  await expect(
    form.getByLabel("Total attendance *", { exact: true }),
  ).toHaveValue("75");
  await expect(page.getByRole("combobox").first()).toContainText(
    "Family Service",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("combobox").first().click();
  await page
    .getByRole("option", { name: "Evening Service", exact: true })
    .click();
  await expect(
    form.getByLabel("Total attendance *", { exact: true }),
  ).toHaveValue("");
});
test("create-only headcount entry makes no records request", async ({
  context,
  page,
}) => {
  const state = await fixture(context, { createOnly: true });
  await page.goto("/attendance/check-in");
  await selectService(page);
  await expect(
    page.getByRole("form", { name: "Reported headcount", exact: true }),
  ).toBeVisible();
  expect(state.reads.some((url) => url.startsWith("/attendance/general"))).toBe(
    false,
  );
  await expect(
    page.getByRole("table", { name: "General attendance", exact: true }),
  ).toHaveCount(0);
});
test("service charts retry independently without hiding the header or headcount records", async ({
  context,
  page,
}) => {
  const state = await fixture(context, {
    failAttendance: true,
    readOnly: true,
  });
  await page.goto("/attendance/services/service-a");
  await expect(
    page.getByRole("heading", { name: "Family Service", level: 1 }),
  ).toBeVisible();
  const charts = page.getByRole("region", {
    name: "Service named check-in charts",
  });
  await expect(charts.getByRole("button", { name: "Retry" })).toHaveCount(2);
  await expect(
    page.getByRole("table", { name: "General attendance", exact: true }),
  ).toBeVisible();
  state.failAttendance = false;
  await charts.getByRole("button", { name: "Retry" }).first().click();
  await expect(charts.locator("svg.recharts-surface")).toHaveCount(2);
  await expect(
    page.getByRole("button", {
      name: "Record general attendance",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Edit headcount", exact: true }),
  ).toHaveCount(0);
  expect(state.reads.some((url) => /summary|trends|analytics/.test(url))).toBe(
    false,
  );
});
test("empty service charts show empty states and keep the service context", async ({
  context,
  page,
}) => {
  await fixture(context, { empty: true });
  await page.goto("/attendance/services/service-a");
  await expect(
    page.getByRole("heading", { name: "Family Service", level: 1 }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Service named check-in charts" })
      .getByText("No data yet.", { exact: true }),
  ).toHaveCount(2);
});
