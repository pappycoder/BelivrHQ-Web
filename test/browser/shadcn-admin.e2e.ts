import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "allow" });
test.beforeEach(async ({ context }) => {
  await context.route("**/sw.js", route => route.fulfill({ contentType: "application/javascript", body: 'self.addEventListener("install", () => self.skipWaiting());' }));
  await context.addCookies([{ name: "belivrhq_token", value: "shadcn-ui-fixture", url: "http://127.0.0.1:3107" }]);
  await context.addInitScript(() => {
    // Keep this visual/navigation regression entirely isolated from live data.
    localStorage.setItem("layout", "horizontal");
    localStorage.setItem("color", "lavared");
    localStorage.setItem("sidebarTheme", "nightblue");
    const original = window.fetch.bind(window);
    window.fetch = async (input, options) => {
      const path = new URL(input instanceof Request ? input.url : String(input), location.origin).pathname;
      if (!path.startsWith("/api/")) return original(input, options);
      if (path === "/api/session") return Response.json({ hasSession: true });
      let data: unknown = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 1 } };
      if (path.endsWith("/auth/session")) data = { userId: "ui-test-user", email: "ui@example.com" };
      else if (path.endsWith("/profiles/me")) data = {
        profileId: "ui-profile", userId: "ui-test-user", churchId: "ui-church", branchId: "ui-branch",
        firstName: "Grace", lastName: "James", email: "ui@example.com", status: "active", role: ["custom_readonly"],
        planFeatures: ["giving"], isAdminHq: false, permissions: ["giving:dashboard:read"],
        church: { churchId: "ui-church", name: "Community Church" }, branch: { branchId: "ui-branch", name: "Lagos" },
      };
      else if (path.endsWith("/giving/dashboard/charts")) data = {
        currency: "NGN", total: 1234, count: 8, byCategory: [{categoryId: "c1", categoryName: "Offering", total: 1234, count: 8}],
        trend: [{ date: "2026-10-01", total: 800 }, { date: "2026-10-08", total: 1100 }, { date: "2026-10-15", total: 1234 }],
      };
      else if (path.endsWith("/unread-count")) data = { count: 0 };
      return Response.json({ success: true, data });
    };
  });
});

test("Shadcn shell preserves permissions, collapsed navigation, search and theme", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/giving");
  await expect(page.getByRole("heading", { name: "Giving", exact: true })).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(245, 247, 248)");
  await expect(page.locator(".workspace-area-rail")).toHaveCSS("background-color", "rgb(16, 62, 61)");
  await expect(page.locator('[data-slot="card"]').first()).toHaveCSS("background-color", "rgb(255, 255, 255)");
  const nav = page.getByRole("navigation", { name: "Workspace", exact: true });
  await expect(nav.getByRole("link", { name: "Dashboard", exact: true }).last()).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("button", { name: "Members", exact: true })).toHaveCount(0);
  await expect(page.locator('[data-slot="chart"] svg.recharts-surface').first()).toBeVisible();
  await expect.poll(() => page.locator('[data-slot="chart"]').first().evaluate((chart) => {
    const curve = chart.querySelector<SVGGraphicsElement>(".recharts-area-curve");
    return curve ? curve.getBBox().width / chart.getBoundingClientRect().width : 0;
  })).toBeGreaterThan(0.8);
  await expect.poll(() => page.locator('[data-slot="chart"]').first().evaluate((chart) =>
    Array.from(chart.querySelectorAll("clipPath rect")).every((rect) => Number(rect.getAttribute("width")) > chart.getBoundingClientRect().width * 0.8),
  )).toBe(true);
  await page.screenshot({ path: "/tmp/belivrhq-dashboard-light.png", fullPage: true });
  await expect(page.locator("body")).not.toHaveClass(/menu-horizontal|mini-sidebar/);
  await page.locator("header").getByRole("button", { name: "Toggle Sidebar", exact: true }).click();
  await expect(page.locator('[data-slot="sidebar"][data-state]')).toHaveAttribute("data-state", "collapsed");
  await page.locator(".workspace-area-rail").getByRole("link", { name: "Giving", exact: true }).click();
  await expect(nav.getByRole("link", { name: "Dashboard", exact: true })).toBeVisible();
  await page.locator("header").getByRole("button", { name: "Toggle Sidebar", exact: true }).click();
  await page.getByRole("button", { name: "Search navigation", exact: true }).click();
  await page.getByPlaceholder("Search pages...").fill("members");
  await expect(page.getByText("No accessible pages found.")).toBeVisible();
  await page.getByPlaceholder("Search pages...").fill("giving");
  await expect(page.getByRole("option", { name: /Dashboard.*giving/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Switch to dark mode", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.locator(".recharts-cartesian-axis-tick-value").first()).toHaveCSS("fill", "rgb(155, 177, 181)");
  await page.screenshot({ path: testInfo.outputPath("shadcn-desktop-dark.png"), fullPage: true });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Giving", exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.locator('[data-slot="sidebar"][data-state]')).toHaveAttribute("data-state", "collapsed");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

for (const width of [375, 768]) test(`navigation and charts fit a ${width}px viewport`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/giving");
  await expect(page.getByRole("heading", { name: "Giving", exact: true })).toBeVisible();
  await expect(page.locator('[data-slot="chart"] svg.recharts-surface').first()).toBeVisible();
  await expect.poll(() => page.locator('[data-slot="chart"]').first().evaluate((chart) => {
    const curve = chart.querySelector<SVGGraphicsElement>(".recharts-area-curve");
    return curve ? curve.getBBox().width / chart.getBoundingClientRect().width : 0;
  })).toBeGreaterThan(0.8);
  await expect.poll(() => page.locator('[data-slot="chart"]').first().evaluate((chart) =>
    Array.from(chart.querySelectorAll("clipPath rect")).every((rect) => Number(rect.getAttribute("width")) > chart.getBoundingClientRect().width * 0.8),
  )).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath(`shadcn-${width}px.png`), fullPage: true });
  if (width < 768) {
    await page.locator("header").getByRole("button", { name: "Toggle Sidebar", exact: true }).click();
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("navigation", { name: "Workspace", exact: true })).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Home", exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
    await page.locator("header").getByRole("button", { name: "Toggle Sidebar", exact: true }).click();
    await page.getByRole("dialog").getByRole("link", { name: "Help Centre" }).click();
    await expect(page).toHaveURL(/\/help$/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  }
});
