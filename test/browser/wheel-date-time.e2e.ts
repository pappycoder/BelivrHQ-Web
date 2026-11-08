import { test, expect, type BrowserContext } from "@playwright/test";

async function fixture(context: BrowserContext, staff = false) {
  await context.route("https://embed.tawk.to/**", (route) =>
    route.fulfill({ body: "" }),
  );
  if (staff)
    await context.addCookies([
      {
        name: "churchos_token",
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

test("date wheels clamp leap days, commit through the original field and restore focus", async ({
  page,
  context,
}) => {
  await fixture(context);
  await page.goto("/forms/public/wheel");
  const field = page.locator('input[type="date"]');
  await field.fill("2026-12-25");
  await field.click();
  await expect(page.locator("[data-wheel-preview]")).toHaveText("Dec 25, 2026");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await field.fill("2028-01-31");
  await field.click();
  const picker = page.getByRole("dialog");
  await picker
    .getByRole("spinbutton", { name: "Month", exact: true })
    .press("ArrowUp");
  await expect(picker.locator("[data-wheel-preview]")).toHaveText(
    "Feb 29, 2028",
  );
  await picker
    .getByRole("spinbutton", { name: "Year", exact: true })
    .press("ArrowUp");
  await expect(picker.locator("[data-wheel-preview]")).toHaveText(
    "Feb 28, 2029",
  );
  await expect(field).toHaveValue("2028-01-31");
  await picker.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(field).toHaveValue("2029-02-28");
  await expect(field).toBeFocused();
  await field.press("Alt+ArrowDown");
  await page
    .getByRole("spinbutton", { name: "Day", exact: true })
    .press("Home");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(field).toHaveValue("2029-02-28");
  await field.press("Enter");
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(field).toHaveValue("");
});

test("native limits and step still gate Apply, and mouse scrolling moves the measuring ruler", async ({
  page,
  context,
}) => {
  await fixture(context);
  await page.goto("/forms/public/wheel");
  const field = page.locator('input[type="date"]');
  await field.fill("2026-11-08");
  await field.evaluate((input) => {
    input.setAttribute("min", "2026-11-08");
    input.setAttribute("max", "2026-11-20");
    input.setAttribute("step", "2");
  });
  await field.click();
  const day = page.getByRole("spinbutton", { name: "Day", exact: true });
  await day.press("ArrowUp");
  await expect(
    page.getByRole("button", { name: "Apply", exact: true }),
  ).toBeDisabled();
  await day.press("ArrowUp");
  await expect(
    page.getByRole("button", { name: "Apply", exact: true }),
  ).toBeEnabled();
  await day.hover();
  await page.mouse.wheel(0, 80);
  await expect(day).toHaveAttribute("aria-valuenow", "12");
  await expect(day).toHaveAttribute("data-scrolling", "false");
  await expect(day).toHaveAttribute("aria-valuenow", "12");
  expect(
    await day.evaluate((node) => getComputedStyle(node).maskImage),
  ).toContain("linear-gradient");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(field).toHaveValue("2026-11-12");
  await field.click();
  await page.getByRole("spinbutton", { name: "Day", exact: true }).press("End");
  await expect(
    page.getByRole("button", { name: "Apply", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(field).toHaveValue("2026-11-12");
});

test("time wheels work inside a service dialog and retain local seconds", async ({
  page,
  context,
}) => {
  await fixture(context, true);
  await page.goto("/gatherings/attendance/services");
  await page
    .getByRole("button", { name: "Add service", exact: true })
    .first()
    .click();
  const field = page.locator('input[type="time"]').first();
  await field.evaluate((input) => input.setAttribute("step", "1"));
  await field.fill("23:58:30");
  await field.click();
  const picker = page.locator('[data-slot="dialog-content"]').last();
  await picker
    .getByRole("spinbutton", { name: "Minute", exact: true })
    .press("ArrowUp");
  await picker
    .getByRole("spinbutton", { name: "Second", exact: true })
    .press("ArrowUp");
  await picker.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(field).toHaveValue("23:59:31");
  await expect(field).toBeFocused();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Add service", exact: true }),
  ).toBeVisible();
});

for (const width of [1280, 320])
  test(`date-time wheels fit ${width}px and respect reduced motion`, async ({
    page,
    context,
  }) => {
    await fixture(context, true);
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({
      reducedMotion: width === 320 ? "reduce" : "no-preference",
    });
    await page.goto("/gatherings/events/new");
    const field = page.locator('input[type="datetime-local"]').first();
    await field.fill("2026-12-31T23:59");
    await field.click();
    const picker = page.getByRole("dialog");
    await expect(picker.getByRole("spinbutton")).toHaveCount(5);
    await expect(picker.locator(".wheel-selection-rail")).toHaveCount(0);
    for (const ruler of await picker.locator(".wheel-ruler").all()) {
      const style = await ruler.evaluate((node) => ({
        radius: getComputedStyle(node).borderRadius,
        border: getComputedStyle(node).borderTopWidth,
        outline: getComputedStyle(node).outlineStyle,
      }));
      expect(style).toEqual({ radius: "0px", border: "0px", outline: "none" });
    }
    expect(
      await picker.evaluate((node) => getComputedStyle(node).borderTopWidth),
    ).toBe("0px");
    const preview = picker.locator("[data-wheel-preview]");
    const appearance = await preview.evaluate((node) => ({
      fontSize: parseFloat(getComputedStyle(node).fontSize),
      background: getComputedStyle(node).backgroundColor,
      beforeWheels: !!(
        node.compareDocumentPosition(
          node.parentElement!.querySelector(".wheel-columns")!,
        ) & Node.DOCUMENT_POSITION_FOLLOWING
      ),
    }));
    expect(appearance.fontSize).toBeGreaterThanOrEqual(28);
    expect(appearance.background).toBe("rgba(0, 0, 0, 0)");
    expect(appearance.beforeWheels).toBe(true);
    expect(
      await picker.evaluate((node) => node.getBoundingClientRect().width),
    ).toBeLessThanOrEqual(320);
    await picker
      .getByRole("spinbutton", { name: "Year", exact: true })
      .press("ArrowUp");
    await expect(picker.locator("[data-wheel-preview]")).toHaveText(
      "Dec 31, 2027 23:59 · 24h",
    );
    if (width === 320) {
      expect(
        await picker
          .locator(".wheel-tick-label")
          .first()
          .evaluate((node) =>
            parseFloat(getComputedStyle(node).transitionDuration),
          ),
      ).toBeLessThanOrEqual(0.001);
    } else {
      expect(
        await picker
          .locator(".wheel-tick-label")
          .first()
          .evaluate((node) => getComputedStyle(node).transform),
      ).not.toBe("none");
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      picker.getByRole("spinbutton", { name: "Year", exact: true }),
    ).toHaveAttribute("data-scrolling", "false");
    const year = picker.getByRole("spinbutton", { name: "Year", exact: true });
    expect(
      await year.evaluate((node) => {
        const selected = node
          .querySelector('[data-selected="true"]')!
          .getBoundingClientRect();
        const ruler = node.getBoundingClientRect();
        return Math.abs(
          selected.top + selected.height / 2 - (ruler.top + ruler.height / 2),
        );
      }),
    ).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: `/tmp/churchos-wheel-${width}.png`,
      fullPage: true,
    });
    await expect(picker.locator("[data-wheel-preview]")).toHaveText(
      "Dec 31, 2027 23:59 · 24h",
    );
    await picker.getByRole("button", { name: "Apply", exact: true }).click();
    await expect(field).toHaveValue("2027-12-31T23:59");
  });

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
  const calendar = page.locator('[data-slot="popover-content"]');
  await expect(
    calendar.locator("button[data-day]").filter({ hasText: /^9$/ }),
  ).toBeDisabled();
  await expect(calendar.getByRole("spinbutton")).toHaveCount(0);
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

for (const path of ["/gatherings/attendance/records", "/giving/donations"])
  test(`${path} keeps native date filters`, async ({ page, context }) => {
    await fixture(context, true);
    await page.goto(path);
    const field = page
      .getByRole("textbox", { name: "From date", exact: true })
      .or(page.locator('input[type="date"][aria-label="From date"]'));
    await expect(field).toBeVisible();
    await field.fill("2026-11-01");
    await field.click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("spinbutton", { name: "Year", exact: true }),
    ).toHaveCount(0);
    await expect(field).toHaveValue("2026-11-01");
    await field.press("Escape");
  });
