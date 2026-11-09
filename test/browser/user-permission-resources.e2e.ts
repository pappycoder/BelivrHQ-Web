import { test, expect } from '@playwright/test';
import { mockTawkWidget } from '../fixtures/tawk-widget';

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: 'belivrhq_token', value: 'permissions-fixture', url: 'http://127.0.0.1:3107' }]);
  await context.route('https://embed.tawk.to/**', route => route.fulfill({ contentType: 'application/javascript', body: mockTawkWidget }));
  await context.addInitScript(() => {
    const original = window.fetch.bind(window);
    window.fetch = async (input, options) => {
      const path = new URL(input instanceof Request ? input.url : String(input), location.origin).pathname;
      if (!path.startsWith('/api/')) return original(input, options);
      if (path === '/api/session') return Response.json({ hasSession: true });
      let data: unknown = { data: [], total: 0 };
      if (path.endsWith('/auth/session')) data = { userId: 'admin', email: 'admin@example.org' };
      else if (path.endsWith('/profiles/me')) data = { profileId: 'admin', userId: 'admin', churchId: 'church', role: ['church_admin'], status: 'active', isAdminHq: true,
        firstName: 'Grace', lastName: 'Admin', permissions: ['users:read', 'profiles:read', 'roles:read'], planFeatures: ['giving', 'reports'] };
      else if (path.endsWith('/profiles/staff')) data = { profileId: 'staff', userId: 'staff', churchId: 'church', role: ['usher'], status: 'active', isAdminHq: false,
        firstName: 'Ada', lastName: 'Ola', createdAt: '2026-10-01T12:00:00Z', updatedAt: '2026-10-01T12:00:00Z',
        effectivePermissions: [
          { name: 'members:read', resource: 'members', action: 'read', grantedBy: ['usher'] },
          { name: 'attendance:read', resource: 'attendance', action: 'read', grantedBy: ['usher'] },
          { name: 'giving_categories:create', resource: 'giving_categories', action: 'create', grantedBy: ['usher'] },
          { name: 'forms:approve', resource: 'forms', action: 'approve', grantedBy: ['usher'] },
        ] };
      else if (path.endsWith('/roles')) data = [];
      else if (path.endsWith('/unread-count')) data = { count: 0 };
      return Response.json({ success: true, data });
    };
  });
});

for (const width of [375, 768, 1440]) test(`resource names remain visible beside permissions at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto('/admin/users/staff');
  await page.getByRole('tab', { name: 'Role & Permissions', exact: true }).click();
  const region = page.getByRole('region', { name: 'Effective permissions', exact: true });
  const table = region.getByRole('table');
  await expect(table.getByRole('columnheader', { name: 'Resource', exact: true })).toBeVisible();
  for (const name of ['members', 'attendance', 'giving categories', 'forms']) {
    const label = table.getByRole('rowheader', { name, exact: true });
    await expect(label).toBeVisible();
    expect(await label.evaluate(el => el.getBoundingClientRect().width)).toBeGreaterThanOrEqual(180);
    expect(await label.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  }
  const member = table.getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'members', exact: true }) });
  await expect(member.getByRole('cell').nth(0)).toHaveText('Not granted');
  await expect(member.getByRole('cell').nth(1)).toHaveText('Granted');
  await member.getByRole('cell').nth(1).getByText('Granted', { exact: true }).locator('..').hover();
  await expect(page.getByRole('tooltip')).toContainText('Granted by Usher');
  await page.mouse.move(0, 0);
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await region.evaluate(el => { el.scrollLeft = el.scrollWidth; });
  await expect(table.getByRole('rowheader', { name: 'members', exact: true })).toBeInViewport();
  await expect(table.getByRole('columnheader', { name: 'approve', exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `/tmp/belivrhq-user-permissions-${width}.png`, fullPage: true });
});
