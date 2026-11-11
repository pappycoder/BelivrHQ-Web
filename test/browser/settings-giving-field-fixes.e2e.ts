import { test, expect, type BrowserContext } from "@playwright/test";
import { workspaceFixture } from "../fixtures/workspace-redesign";

test.use({ serviceWorkers: "block" });

async function fixture(context: BrowserContext) {
  await workspaceFixture(context, { navigation: true });
  const writes: { path: string; body: Record<string, unknown> }[] = [];
  const queries: URL[] = [];
  let profile = {
    profileId: "profile-a", userId: "user-a", churchId: "church-a", branchId: "branch-a",
    firstName: "Grace", lastName: "Adeyemi", phone: "", email: "grace@example.test",
    role: ["church_admin"], isAdminHq: true, status: "active", createdAt: "2026-01-01T00:00:00Z",
    church: { name: "Grace Community Church" }, branch: { name: "Main Branch" },
    permissions: ["church_settings:read", "church_settings:update", "giving:records:read", "branches:read", "roles:read"],
    planFeatures: ["giving"], twoFactorEnabled: false,
  };
  let church = {
    churchId: "church-a", name: "Grace Community Church", denomination: "Pentecostal",
    country: "Nigeria", state: "Lagos", city: "Lagos", address: "12 Marina Road", phone: "", email: "grace@example.test",
    branchCount: 1, memberCount: 50, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
  };
  await context.route(/\/api\/backend\/(profiles\/me|church(?:\/config)?|giving\/(transactions|categories))(?:\?.*)?$/, async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace('/api/backend', '');
    let data: unknown;
    if (request.method() === "PATCH") {
      const body = request.postDataJSON();
      writes.push({ path, body });
      if (path === "/profiles/me") { profile = { ...profile, ...body }; data = profile; }
      else { church = { ...church, ...body }; data = church; }
    } else if (path === "/profiles/me") data = profile;
    else if (path === "/church") data = church;
    else if (path === "/church/config") data = { config: { timezone: "Africa/Lagos", currency: "NGN" } };
    else if (path === "/giving/categories") data = { data: [], total: 0 };
    else {
      queries.push(url);
      let rows = Array.from({ length: 31 }, (_, i) => ({
        transactionId: `tx-${i}`, memberId: `member-${i}`, memberName: `Giver ${i}`, categoryName: "Offering",
        amount: 1000, currency: "NGN", type: "cash", status: i % 2 ? "pending" : "success",
        givingDate: "2026-11-05", createdAt: "2026-11-05T10:00:00Z", churchId: "church-a", branchId: "branch-a",
      }));
      if (url.searchParams.has('status')) rows = rows.filter(row => row.status === url.searchParams.get('status'));
      const page = Number(url.searchParams.get('page') || 1);
      const limit = Number(url.searchParams.get('limit') || 15);
      data = { data: rows.slice((page - 1) * limit, page * limit), total: rows.length, meta: { page, limit, total: rows.length, totalPages: Math.ceil(rows.length / limit) } };
    }
    await route.fulfill({ json: { success: true, data } });
  });
  return { writes, queries };
}

for (const width of [320, 1440]) {
  test(`giving date dropdown applies, validates and clears ranges at ${width}px`, async ({ page, context }) => {
    const { queries } = await fixture(context);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/giving/donations');
    await expect(page.getByRole('heading', { name: 'Every gift, one feed.' })).toBeVisible();
    await expect(page.getByLabel('From date', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect.poll(() => queries.at(-1)?.searchParams.get('page')).toBe('2');
    const trigger = page.getByRole('button', { name: /^Date range/ });
    await trigger.click();
    const dropdown = page.getByRole('dialog', { name: 'Filter giving dates' });
    await dropdown.getByLabel('From date', { exact: true }).fill('2026-11-01');
    await dropdown.getByLabel('To date', { exact: true }).fill('2026-11-10');
    expect(queries.at(-1)?.searchParams.has('startDate')).toBe(false);
    await dropdown.getByRole('button', { name: 'Apply dates' }).click();
    await expect.poll(() => queries.at(-1)?.searchParams.get('startDate')).toBe('2026-11-01');
    expect(queries.at(-1)?.searchParams.get('endDate')).toBe('2026-11-10');
    expect(queries.at(-1)?.searchParams.get('page')).toBe('1');
    await trigger.click();
    await dropdown.getByLabel('To date', { exact: true }).fill('2026-10-01');
    await expect(dropdown.getByRole('button', { name: 'Apply dates' })).toBeDisabled();
    await expect(dropdown.getByRole('alert')).toContainText('on or after');
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(dropdown.getByLabel('To date', { exact: true })).toHaveValue('2026-11-10');
    await dropdown.screenshot({ path: `/tmp/belivrhq-giving-date-dropdown-${width}.png` });
    await dropdown.getByRole('button', { name: 'Clear dates' }).click();
    await expect(trigger).toHaveAccessibleName('Date range');
    await trigger.click();
    await expect(dropdown.getByLabel('From date', { exact: true })).toHaveValue('');
    await expect(dropdown.getByLabel('To date', { exact: true })).toHaveValue('');
    await page.keyboard.press('Escape');
    // Clearing can restore a cached query; changing status confirms future requests omit dates.
    await page.getByRole('button', { name: 'pending', exact: true }).click();
    await expect.poll(() => queries.at(-1)?.searchParams.get('status')).toBe('pending');
    expect(queries.at(-1)?.searchParams.has('startDate')).toBe(false);
    expect(queries.at(-1)?.searchParams.has('endDate')).toBe(false);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });

  test(`church location fields stack above their controls on a settings card at ${width}px`, async ({ page, context }) => {
    const { writes } = await fixture(context);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/admin/church');
    const main = page.locator('#main-content');
    const section = main.locator('#church');
    await expect(section.getByRole('combobox', { name: 'Country', exact: true })).toContainText('Nigeria');
    for (const name of ['State', 'Country']) {
      const label = section.locator('label').filter({ hasText: new RegExp(`^${name}$`) });
      const control = section.getByRole('combobox', { name, exact: true });
      const labelBox = await label.boundingBox();
      const controlBox = await control.boundingBox();
      expect(controlBox!.y).toBeGreaterThanOrEqual(labelBox!.y + labelBox!.height);
      expect(Math.abs(controlBox!.x - labelBox!.x)).toBeLessThan(2);
    }
    const card = main.locator('.paper-card').filter({ has: page.getByRole('heading', { name: 'General Settings', exact: true }) });
    expect(await card.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await main.screenshot({ path: `/tmp/belivrhq-church-settings-${width}.png` });
    if (width === 1440) {
      await section.getByRole('combobox', { name: 'Country', exact: true }).click();
      await page.getByRole('option', { name: 'Ghana', exact: true }).click();
      await expect(section.getByRole('combobox', { name: 'State', exact: true })).toContainText('Select state');
      await section.getByRole('button', { name: 'Save Changes', exact: true }).click();
      await expect.poll(() => writes.find(call => call.path === '/church')?.body).toEqual({ state: '', country: 'Ghana' });
    }
  });

  test(`profile fields have clear labels, placeholders and aligned rows at ${width}px`, async ({ page, context }) => {
    const { writes } = await fixture(context);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/settings/profile');
    const first = page.getByLabel('First name', { exact: true });
    const last = page.getByLabel('Last name', { exact: true });
    const phone = page.getByLabel('Phone', { exact: true });
    const email = page.getByLabel('Email (admin-managed)', { exact: true });
    await expect(first).toHaveValue('Grace');
    await expect(first).toHaveAttribute('placeholder', 'Enter your first name');
    await expect(last).toHaveAttribute('placeholder', 'Enter your last name');
    await expect(phone).toHaveAttribute('placeholder', 'Enter your phone number');
    await expect(phone).toHaveAttribute('type', 'tel');
    await expect(email).toBeDisabled();
    await expect(page.locator('#main-content input[placeholder="Enter your answer"]')).toHaveCount(0);
    if (width === 1440) expect(Math.abs((await first.boundingBox())!.y - (await last.boundingBox())!.y)).toBeLessThan(1);
    await first.fill('Ada');
    await phone.fill('+2348012345678');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect.poll(() => writes.find(call => call.path === '/profiles/me')?.body).toEqual({ firstName: 'Ada', phone: '+2348012345678' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.locator('#main-content').screenshot({ path: `/tmp/belivrhq-profile-fields-${width}.png` });
  });
}
