import { expect, test, type BrowserContext, type Locator } from "@playwright/test";
import { workspaceFixture } from "../fixtures/workspace-redesign";

test.use({ serviceWorkers: "block", timezoneId: "Africa/Lagos" });
async function fixture(context: BrowserContext, dark: boolean) {
  const state = await workspaceFixture(context, { navigation: true });
  await context.addInitScript(value => localStorage.setItem("theme", value ? "dark" : "light"), dark);
  const profile = { profileId: "profile-a", userId: "user-a", churchId: "church-a", branchId: "branch-a", firstName: "Grace", lastName: "Admin", email: "grace@example.test", status: "active", role: ["church_admin"], isAdminHq: true, church: { name: "Grace Church" }, branch: { name: "Main Branch" }, planFeatures: ["events", "tickets", "groups", "giving", "forms", "reports", "email"], permissions: "members:all:read members:new:create members:all:update families:read attendance:services:read attendance:checkin:create attendance:records:read attendance:records:update events:list:read events:all:read events:calendar:read events:create giving:records:read church_settings:read church_settings:update branches:read roles:read".split(" ") };
  const service = { serviceId: "service-a", name: "Family worship", category: "mixed", recurrence: "weekly", dayOfWeek: 0, startTime: "09:00", endTime: "11:00", branchId: "branch-a", isActive: true, attendanceCount: 40, createdAt: "2026-11-01" };
  const event = { eventId: "event-a", title: "Community gathering", type: "conference", startDate: "2026-11-15T09:00:00Z", isFree: true, branchName: "Main Branch", registrationCount: 25 };
  const gift = { transactionId: "gift-a", memberId: "member-a", churchId: "church-a", memberName: "Grace Adeyemi", categoryName: "Offering", amount: 1000, currency: "NGN", type: "cash", status: "success", givingDate: "2026-11-05", createdAt: "2026-11-05T09:00:00Z", branchId: "branch-a" };
  const church = { churchId: "church-a", name: "Grace Church", denomination: "Pentecostal", country: "Nigeria", state: "Lagos", city: "Lagos", address: "12 Marina Road", branchCount: 1, memberCount: 50, createdAt: "2026-01-01" };
  const responses: Record<string, unknown> = { "/profiles/me": profile, "/services": { data: [service], meta: { total: 1, totalPages: 1, page: 1, limit: 15 } }, "/events": { data: [event], total: 1 }, "/giving/transactions": { data: [gift], total: 1, meta: { total: 1, totalPages: 1, page: 1, limit: 15 } }, "/church": church, "/church/config": { config: { timezone: "Africa/Lagos", currency: "NGN" } } };
  await context.route("**/api/backend/**", route => {
    const path = new URL(route.request().url()).pathname.replace("/api/backend", "");
    return path in responses ? route.fulfill({ json: { success: true, data: responses[path] } }) : route.fallback();
  });
  return state;
}
async function fontAtLeast(locator: Locator, size: number) {
  await expect(locator).toBeVisible();
  expect(await locator.evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(size);
}
for (const width of [320, 1280]) for (const dark of [false, true]) {
  test(`workspace typography is readable at ${width}px in ${dark ? "dark" : "light"} mode`, async ({ context, page }) => {
    const state = await fixture(context, dark);
    await page.setViewportSize({ width, height: 1000 });
    for (const [path, primary] of [["/people/members", "Grace Adeyemi"], ["/people/families", "Adeyemi Family"], ["/gatherings/attendance/services", "Family worship"], ["/gatherings/events/list", "Community gathering"], ["/giving/donations", "Grace Adeyemi"], ["/settings/profile", ""], ["/admin/church", ""]]) {
      await page.goto(path);
      await fontAtLeast(page.locator("#main-content h1").first(), 24);
      if (primary) await fontAtLeast(page.locator("#main-content").getByText(primary, { exact: true }).filter({ visible: true }).first(), 14);
      if (path === "/giving/donations") {
        const source = page.locator("[data-giving-source] [title='Grace Adeyemi']");
        expect(await source.evaluate(node => node.getBoundingClientRect().width)).toBeGreaterThan(100);
        expect(await page.locator("[aria-label=Pagination]").evaluate(node => node.getBoundingClientRect().width)).toBeGreaterThan(200);
      }
      if (path === "/settings/profile") {
        const field = page.getByLabel("First name", { exact: true });
        await fontAtLeast(field, width < 768 ? 16 : 14);
        expect(await field.evaluate(node => Array.from((node as HTMLInputElement).labels ?? []).every(label => parseFloat(getComputedStyle(label).fontSize) >= 14))).toBe(true);
      }
      const tiny = await page.locator("#main-content").evaluate(root => Array.from(root.querySelectorAll("*"))
        .filter(node => !node.closest("svg, [aria-hidden='true']") && Array.from(node.childNodes).some(child => child.nodeType === Node.TEXT_NODE && child.textContent?.trim()))
        .filter(node => { const style = getComputedStyle(node), rect = node.getBoundingClientRect(); return style.display !== "none" && style.visibility !== "hidden" && rect.width > 1 && rect.height > 1 && parseFloat(style.fontSize) < 12; })
        .map(node => ({ tag: node.tagName, text: node.textContent?.trim().slice(0, 50), size: getComputedStyle(node).fontSize })));
      expect(tiny, path).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
      if (path.includes("events/list")) {
        await page.getByRole("button", { name: "Date range", exact: true }).click();
        await fontAtLeast(page.getByLabel("From date", { exact: true }), width < 768 ? 16 : 14);
        await page.keyboard.press("Escape");
      }
      await page.screenshot({ path: `/tmp/typography-${path.replaceAll("/", "-")}-${width}-${dark ? "dark" : "light"}.png`, fullPage: true });
    }
    expect(state.calls.filter(call => call.method !== "GET")).toHaveLength(0);
  });
}
