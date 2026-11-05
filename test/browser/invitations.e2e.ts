import { mockBotChallenges } from "../fixtures/bot-protection";
import { test, expect } from '@playwright/test';
import { mockTawkWidget } from '../fixtures/tawk-widget';

test.beforeEach(async ({ context, page }) => {
  await mockBotChallenges(context);
  await context.route('**/api/session', route => route.fulfill({ json: { hasSession: false } }));
  await context.route('https://embed.tawk.to/**', route => route.fulfill({ contentType: 'application/javascript', body: mockTawkWidget }));
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('an anonymous recipient explicitly sets a password before signing in', async ({ page }) => {
  let payload: unknown;
  await page.route('**/api/backend/auth/accept-invitation', route => {
    payload = route.request().postDataJSON();
    return route.fulfill({ json: { success: true, data: { success: true } } });
  });
  await page.goto('/accept-invitation#token_hash=invitation-fixture');
  await expect(page.getByRole('heading', { name: 'Accept your invitation' })).toBeVisible();
  await expect(page).toHaveURL(/\/accept-invitation$/);
  expect(payload).toBeUndefined();
  await page.getByLabel('Your Password', { exact: true }).fill('StrongPassword123!');
  await page.getByLabel('Confirm Password', { exact: true }).fill('DifferentPassword123!');
  await page.getByRole('button', { name: 'Accept invitation & set password' }).click();
  await expect(page.locator('p[role=alert]')).toHaveText('Passwords do not match.');
  expect(payload).toBeUndefined();
  await page.getByLabel('Confirm Password', { exact: true }).fill('StrongPassword123!');
  await page.getByRole('button', { name: 'Accept invitation & set password' }).click();
  await expect(page.getByText('Your password is set. Sign in to open your church workspace.')).toBeVisible();
  expect(payload).toEqual({ token: 'invitation-fixture', newPassword: 'StrongPassword123!', altcha: expect.any(String), website: '' });
  await expect(page.getByRole('link', { name: 'Sign In', exact: true })).toHaveAttribute('href', '/login');
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('StrongPassword123');
});

test('an expired invitation shows recovery guidance', async ({ page }) => {
  await page.route('**/api/backend/auth/accept-invitation', route => route.fulfill({ status: 400, json: { success: false, error: { message: 'This invitation is invalid or has expired.' } } }));
  await page.goto('/accept-invitation#token_hash=expired');
  await page.getByLabel('Your Password', { exact: true }).fill('StrongPassword123!');
  await page.getByLabel('Confirm Password', { exact: true }).fill('StrongPassword123!');
  await page.getByRole('button', { name: 'Accept invitation & set password' }).click();
  await expect(page.locator('p[role=alert]')).toContainText('expired');
  await expect(page.getByRole('link', { name: 'Invitation expired? Request a password link' })).toHaveAttribute('href', '/forgot-password');
});

test('missing tokens show a public recovery page', async ({ page }) => {
  await page.goto('/accept-invitation');
  await expect(page.locator('p[role=alert]')).toContainText('invitation link is missing');
  await expect(page.getByRole('link', { name: 'Request a password link', exact: true })).toHaveAttribute('href', '/forgot-password');
});
