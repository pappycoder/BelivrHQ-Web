import { test, expect, type BrowserContext } from "@playwright/test";
import { workspaceFixture } from "../fixtures/workspace-redesign";

test.use({ serviceWorkers: "block" });
const longBody = "An offering of NGN 15,000 was recorded for the Sunday service on 8 November 2026.\n\nReceipt 2026/OFF/011 belongs to this offering. The finance team can use this receipt number when reviewing the recorded contribution and its service context. This final sentence is part of the complete message and must remain readable in the detail view.";
const title = "Offering recorded for the Sunday service";

async function fixture(context: BrowserContext, options: { failDetail?: boolean; failRead?: boolean; delayDetail?: boolean; unsafeLink?: boolean } = {}) {
  await workspaceFixture(context, { navigation: true });
  let readAt: string | undefined;
  let failDetail = options.failDetail ?? false;
  let failRead = options.failRead ?? false;
  let detailDelay = options.delayDetail ?? false;
  let release = () => {};
  const detailGate = new Promise<void>(resolve => { release = resolve; });
  const readCalls: string[] = [];
  const detailCalls: string[] = [];
  const deleted: string[] = [];
  const item = () => ({ id: 'note-a', churchId: 'church-a', profileId: 'profile-a', type: 'giving', title,
    body: 'An offering was recorded. Open this notification for the receipt and service information.',
    createdAt: '2026-11-11T10:00:00Z', readAt,
    data: { entity: 'giving_transaction', action: 'CREATE', receiptNumber: '2026/OFF/011', serviceName: 'Sunday service', link: options.unsafeLink ? '//outside.example.test' : '/giving/donations', apiKey: 'private-provider-token', rawPayload: { secret: 'never display this' } },
  });
  await context.route(/\/api\/backend\/notifications(?:\/[^?]*)?(?:\?.*)?$/, async route => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace('/api/backend', '');
    if (path === '/notifications/unread-count') return route.fulfill({ json: { success: true, data: { count: readAt ? 0 : 1 } } });
    if (path === '/notifications/note-a/read') {
      readCalls.push('note-a');
      if (failRead) return route.fulfill({ status: 503, json: { success: false, error: { message: 'Read status unavailable.' } } });
      readAt = '2026-11-11T10:05:00Z';
      return route.fulfill({ json: { success: true, data: { ...item(), body: longBody } } });
    }
    if (path === '/notifications/note-a') {
      if (route.request().method() === 'DELETE') { deleted.push('note-a'); return route.fulfill({ json: { success: true, data: { success: true } } }); }
      detailCalls.push('note-a');
      if (detailDelay) await detailGate;
      if (failDetail) return route.fulfill({ status: 404, json: { success: false, error: { message: 'Notification not found.' } } });
      return route.fulfill({ json: { success: true, data: { ...item(), body: longBody } } });
    }
    const items = url.searchParams.get('read') === 'unread' && readAt ? [] : [item()];
    return route.fulfill({ json: { success: true, data: { data: items, total: items.length, unreadCount: readAt ? 0 : 1 } } });
  });
  return { readCalls, detailCalls, deleted, loadDetails: () => { detailDelay = false; release(); }, allowDetail: () => { failDetail = false; }, allowRead: () => { failRead = false; } };
}

for (const width of [320, 1440]) {
  test(`one notification feed opens full details and marks viewed messages read at ${width}px`, async ({ page, context }) => {
    const state = await fixture(context);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/settings/notifications');
    await expect(page).toHaveURL('http://127.0.0.1:3107/notifications');
    await expect(page.getByRole('heading', { name: 'Notifications', exact: true })).toBeVisible();
    await expect(page.getByText('An offering was recorded. Open this notification for the receipt and service information.', { exact: true })).toBeVisible();
    expect(state.readCalls).toHaveLength(0);
    expect(state.detailCalls).toHaveLength(0);
    await page.getByRole('button', { name: `View notification: ${title}`, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: title, exact: true });
    await expect(dialog).toContainText(longBody);
    await expect(dialog).toContainText('Giving transaction');
    await expect(dialog).toContainText('2026/OFF/011');
    await expect(dialog).toContainText('Sunday service');
    await expect(dialog).not.toContainText('private-provider-token');
    await expect(dialog).not.toContainText('never display this');
    await expect(dialog.locator('time')).toHaveAttribute('datetime', '2026-11-11T10:00:00Z');
    await expect.poll(() => state.readCalls.length).toBe(1);
    await expect(dialog.getByText('Read', { exact: true })).toBeVisible();
    await expect(dialog.getByRole('link', { name: 'Open related record', exact: true })).toHaveAttribute('href', '/giving/donations');
    await expect(page).toHaveURL(/\/notifications$/);
    const box = await dialog.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    expect(await dialog.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    await dialog.screenshot({ path: `/tmp/belivrhq-notification-detail-${width}.png` });
    await dialog.getByRole('button', { name: 'Close', exact: true }).last().click();
    await expect(page.locator('#main-content button').filter({ hasText: /^\s*Mark all read\s*$/ })).toBeDisabled();
    await page.getByRole('button', { name: `View notification: ${title}`, exact: true }).click();
    await expect(dialog).toContainText(longBody);
    expect(state.readCalls).toHaveLength(1);
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
    const confirmation = page.getByRole('dialog', { name: 'Delete this notification?', exact: true });
    await expect(confirmation).toBeVisible();
    await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect(state.deleted).toHaveLength(0);
  });
}

test('loading and failed detail requests do not mark a notification read', async ({ page, context }) => {
  const state = await fixture(context, { delayDetail: true, failDetail: true });
  await page.goto('/notifications');
  await page.getByRole('button', { name: `View notification: ${title}`, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: title, exact: true });
  await expect(dialog.getByLabel('Loading notification', { exact: true })).toBeVisible();
  expect(state.readCalls).toHaveLength(0);
  state.loadDetails();
  await expect(dialog.getByRole('alert')).toContainText('could not be loaded');
  expect(state.readCalls).toHaveLength(0);
  state.allowDetail();
  await dialog.getByRole('button', { name: 'Retry loading', exact: true }).click();
  await expect(dialog).toContainText(longBody);
  await expect.poll(() => state.readCalls.length).toBe(1);
});

test('failed read updates stay unread and support an explicit retry', async ({ page, context }) => {
  const state = await fixture(context, { failRead: true, unsafeLink: true });
  await page.goto('/notifications');
  await page.getByRole('button', { name: `View notification: ${title}`, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: title, exact: true });
  await expect(dialog.getByRole('alert')).toContainText('read status could not be saved');
  await expect(dialog.getByText('Unread', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('link')).toHaveCount(0);
  await expect(page.locator('#main-content button').filter({ hasText: /^\s*Mark all read\s*$/ })).toBeEnabled();
  state.allowRead();
  await dialog.getByRole('button', { name: 'Retry marking as read', exact: true }).click();
  await expect(dialog.getByText('Read', { exact: true })).toBeVisible();
  await expect.poll(() => state.readCalls.length).toBe(2);
  await expect(page.locator('#main-content button').filter({ hasText: /^\s*Mark all read\s*$/ })).toBeDisabled();
});

test('a viewed message stays open after it leaves the unread filter', async ({ page, context }) => {
  const state = await fixture(context);
  await page.goto('/notifications');
  await page.getByRole('button', { name: 'Unread', exact: true }).click();
  await page.getByRole('button', { name: `View notification: ${title}`, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: title, exact: true });
  await expect.poll(() => state.readCalls.length).toBe(1);
  await expect(dialog).toContainText(longBody);
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click();
  await expect(page.getByText('Nothing needs you', { exact: true })).toBeVisible();
});
