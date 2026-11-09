import { test, expect } from '@playwright/test';
import { mockTawkWidget } from '../fixtures/tawk-widget';

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: 'belivrhq_token', value: 'admin-fixture', url: 'http://127.0.0.1:3107' }]);
  await context.route('https://embed.tawk.to/**', route => route.fulfill({ contentType: 'application/javascript', body: mockTawkWidget }));
  await context.addInitScript(() => {
    const original = window.fetch.bind(window);
    window.fetch = async (input, options) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.origin);
      if (!url.pathname.startsWith('/api/')) return original(input, options);
      const path = url.pathname;
      if (path === '/api/session') return Response.json({ hasSession: true });
      let data: unknown = { data: [], total: 0, meta: { total: 0, page: 1, limit: 15, totalPages: 1 } };
      if (path.endsWith('/auth/session')) data = { userId: 'admin-user', email: 'admin@example.org' };
      else if (path.endsWith('/profiles/me')) data = {
        profileId: 'admin-profile', userId: 'admin-user', churchId: 'church', role: ['church_admin'], status: 'active', firstName: 'Grace', lastName: 'Admin',
        isAdminHq: true, permissions: ['users:read','profiles:read','profiles:directory:read','profiles:delete','profiles:update','roles:read','branches:read','branches:directory:read','branches:update'],
        planFeatures: ['giving', 'reports'], church: { churchId: 'church', name: 'Grace Church' },
      };
      else if (path.endsWith('/branches')) data = { data: [{ branchId: 'branch', churchId: 'church', name: 'Grace Community Church International Headquarters', isHeadquarters: true,
        city: 'Victoria Island', state: 'Lagos', country: 'Nigeria', phone: '+234 801 234 5678', email: 'headquarters@gracecommunitychurch.example.org', memberCount: 120,
        createdAt: '2026-10-01T12:00:00Z', updatedAt: '2026-10-01T12:00:00Z' }], total: 1 };
      else if (path.endsWith('/profiles')) data = { data: [
        { profileId: 'staff-profile', userId: 'staff-user', firstName: 'Ada', lastName: 'Ola', email: 'ada@example.org', role: ['usher'], status: 'active', createdAt: '2026-10-01T12:00:00Z' },
        { profileId: 'admin-profile', userId: 'admin-user', firstName: 'Grace', lastName: 'Admin', role: ['church_admin'], status: 'active', createdAt: '2026-10-01T12:00:00Z' },
      ], meta: { total: 2, page: 1, limit: 15, totalPages: 1 } };
      else if (path.endsWith('/roles')) data = [];
      else if (path.endsWith('/unread-count')) data = { count: 0 };
      return Response.json({ success: true, data });
    };
  });
});

for (const width of [375, 768, 1280]) test(`branches remain aligned when compacted at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/admin/branches');
  const table = page.locator('table').filter({ hasText: 'Grace Community Church International Headquarters' });
  await expect(table).toBeVisible();
  await page.setViewportSize({ width, height: 900 });
  await expect.poll(() => table.locator('tbody tr').first().evaluate(el => el.getBoundingClientRect().height)).toBeLessThan(100);
  await page.screenshot({ path: `/tmp/belivrhq-branches-expanded-${width}.png`, fullPage: true });
  await page.getByRole('button', { name: 'Table view', exact: true }).click();
  await page.getByRole('button', { name: 'Compact rows', exact: true }).click();
  await page.getByRole('button', { name: 'Compact columns', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByText('Table size', { exact: true })).toBeHidden();
  await page.screenshot({ path: `/tmp/belivrhq-branches-compact-${width}.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const row = table.locator('tbody tr').first();
  expect(await row.evaluate(el => el.getBoundingClientRect().height)).toBeLessThan(100);
  const avatar = row.locator('[data-slot=avatar]');
  if (width >= 640) {
    expect(await avatar.evaluate(el => el.getBoundingClientRect().width)).toBeGreaterThanOrEqual(32);
    expect(await avatar.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(32);
  } else await expect(avatar).toBeHidden();
  const scroll = table.locator('..');
  await scroll.evaluate(el => { el.scrollLeft = el.scrollWidth; });
  await expect(row.getByRole('button', { name: 'More actions' })).toBeInViewport();
});

test('delete user requires confirmation and uses the account deletion endpoint', async ({ page }) => {
  await page.addInitScript(() => {
    const previous = window.fetch;
    (window as unknown as { deletions: string[] }).deletions = [];
    window.fetch = async (input, options) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.origin);
      if (url.pathname.endsWith('/profiles/staff-profile/account')) {
        (window as unknown as { deletions: string[] }).deletions.push(options?.method || 'GET');
        return Response.json({ success: true, data: { success: true } });
      }
      return previous(input, options);
    };
  });
  await page.goto('/admin/users');
  const row = page.locator('tbody tr').filter({ hasText: 'ada@example.org' });
  await row.hover();
  await row.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: 'Delete User', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Member records, giving, attendance and church history will be preserved');
  expect(await page.evaluate(() => (window as unknown as { deletions: string[] }).deletions)).toEqual([]);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await row.hover();
  await row.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: 'Delete User', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(await page.evaluate(() => (window as unknown as { deletions: string[] }).deletions)).toEqual(['DELETE']);
  const self = page.locator('tbody tr').filter({ hasText: 'Grace Admin' });
  await self.hover();
  await self.getByRole('button', { name: 'More actions' }).click();
  await expect(page.getByRole('menuitem', { name: 'Delete User', exact: true })).toHaveCount(0);
});

test('failed account deletion stays open with an error for retry', async ({ page }) => {
  await page.addInitScript(() => {
    const previous = window.fetch;
    window.fetch = async (input, options) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.origin);
      if (url.pathname.endsWith('/profiles/staff-profile/account')) return Response.json({ success: false, error: { message: 'Login provider unavailable; retry deletion.' } }, { status: 400 });
      return previous(input, options);
    };
  });
  await page.goto('/admin/users');
  const row = page.locator('tbody tr').filter({ hasText: 'ada@example.org' });
  await row.hover();
  await row.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: 'Delete User', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('dialog').locator('p[role=alert]')).toHaveText('Login provider unavailable; retry deletion.');
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true })).toBeEnabled();
});

test('read-only viewers cannot delete users', async ({ page }) => {
  await page.addInitScript(() => {
    const previous = window.fetch;
    window.fetch = async (input, options) => {
      const response = await previous(input, options);
      const url = new URL(input instanceof Request ? input.url : String(input), location.origin);
      if (!url.pathname.endsWith('/profiles/me')) return response;
      const body = await response.json();
      body.data.permissions = ['users:read', 'profiles:read', 'roles:read'];
      return Response.json(body);
    };
  });
  await page.goto('/admin/users');
  await expect(page.locator('tbody tr').filter({ hasText: 'ada@example.org' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'More actions' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Delete Selected' })).toHaveCount(0);
});
