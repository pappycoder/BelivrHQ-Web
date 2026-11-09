import { test, expect } from '@playwright/test';
import { mockTawkWidget } from '../fixtures/tawk-widget';

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: 'belivrhq_token', value: 'offline-hidden-fixture', url: 'http://127.0.0.1:3107' }]);
  await context.route('https://embed.tawk.to/**', route => route.fulfill({ contentType: 'application/javascript', body: mockTawkWidget }));
  await context.addInitScript(() => {
    const original = window.fetch.bind(window);
    window.fetch = async (input, options) => {
      const path = new URL(input instanceof Request ? input.url : String(input), location.origin).pathname;
      if (!path.startsWith('/api/')) return original(input, options);
      if (path === '/api/session') return Response.json({ hasSession: true });
      let data: unknown = { data: [], total: 0 };
      if (path.endsWith('/auth/session')) data = { userId: 'staff', email: 'staff@example.org' };
      else if (path.endsWith('/profiles/me')) data = { profileId: 'staff', userId: 'staff', churchId: 'church', role: ['church_admin'], status: 'active',
        firstName: 'Grace', lastName: 'Admin', isAdminHq: true, permissions: ['offline:read'], planFeatures: ['giving', 'reports'] };
      else if (path.endsWith('/unread-count')) data = { count: 0 };
      else if (path.endsWith('/roles')) data = [];
      return Response.json({ success: true, data });
    };
  });
});

for (const width of [375, 1440]) test(`offline entry points stay hidden even with permission at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  await expect(page.locator('a[href="/offline"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Dismiss offline banner' })).toHaveCount(0);
  await expect(page.getByText('Prepare this device to work offline.')).toHaveCount(0);
});

test('direct offline links show a reconnect notice without mounting the workspace', async ({ page }) => {
  await page.goto('/offline');
  await expect(page.getByRole('heading', { name: 'Offline access is temporarily unavailable' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Load available branches' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Enable on this device' })).toHaveCount(0);
  await expect(page.getByLabel('Offline passphrase')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Return to BelivrHQ' })).toHaveAttribute('href', '/');
});
