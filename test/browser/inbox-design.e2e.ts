import { test, expect, type BrowserContext } from "@playwright/test";
import { workspaceFixture } from "../fixtures/workspace-redesign";

async function mailbox(context: BrowserContext, options: { populated?: boolean; readOnly?: boolean; fail?: boolean } = {}) {
  await workspaceFixture(context, { navigation: true });
  await context.route("**/api/backend/profiles/me", route => route.fulfill({ json: { success: true, data: {
    profileId: "staff", userId: "staff", churchId: "church", firstName: "Grace", lastName: "Adeyemi",
    status: "active", role: ["secretary"], church: { name: "Grace Church" }, planFeatures: ["email"],
    permissions: ["emails:read", ...(options.readOnly ? [] : ["emails:create"])],
  } } }));
  const message = { id: "message-a", subject: "Sunday welcome team", preview: "Thank you for being there.", body: "Thank you for being there.", senderId: "sender", senderName: "David Okoro", recipientName: "Grace Adeyemi", recipientIds: ["staff"], createdAt: "2026-11-09T08:00:00Z" };
  await context.route("**/api/backend/email**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/unread-count")) return route.fulfill({ json: { success: true, data: { count: 0 } } });
    if (path.endsWith("/contacts")) return route.fulfill({ json: { success: true, data: { data: [], total: 0 } } });
    if (path.endsWith("/message-a")) return route.fulfill({ json: { success: true, data: message } });
    if (options.fail) return route.fulfill({ status: 503, json: { success: false, error: { message: "Unavailable" } } });
    return route.fulfill({ json: { success: true, data: { data: options.populated ? [message] : [], total: options.populated ? 1 : 0, unreadCount: 0 } } });
  });
}

for (const width of [1440, 320]) {
  test(`empty inbox and sent mailbox at ${width}px`, async ({ page, context }, info) => {
    await mailbox(context);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/connect/inbox");
    await expect(page.getByRole("heading", { name: "A quiet inbox. A connected team." })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Pick a thread from the left.")).toHaveCount(0);
    await page.screenshot({ path: info.outputPath(`inbox-empty-${width}.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Start a conversation", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Sent", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Good conversations start with hello." })).toBeVisible();
  });
}

test("populated inbox opens a message and returns to the list on mobile", async ({ page, context }, info) => {
  await mailbox(context, { populated: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/connect/inbox");
  await expect(page.getByRole("heading", { name: "Your next conversation is here." })).toBeVisible();
  await page.screenshot({ path: info.outputPath("inbox-populated.png"), fullPage: true });
  await page.setViewportSize({ width: 320, height: 900 });
  await page.getByRole("button", { name: /David Okoro/ }).click();
  await expect(page.getByRole("heading", { name: "Sunday welcome team" })).toBeVisible();
  await page.getByRole("button", { name: /back to the list/ }).click();
  await expect(page.getByRole("button", { name: /David Okoro/ })).toBeVisible();
});

test("read-only empty inbox has no compose actions", async ({ page, context }) => {
  await mailbox(context, { readOnly: true });
  await page.goto("/connect/inbox");
  await expect(page.getByRole("heading", { name: "A quiet inbox. A connected team." })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("button", { name: /Compose message|Start a conversation/ })).toHaveCount(0);
});

test("mailbox failure offers recovery instead of an empty state", async ({ page, context }) => {
  await mailbox(context, { fail: true });
  await page.goto("/connect/inbox");
  await expect(page.getByRole("heading", { name: "Your messages couldn’t be loaded" })).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole("button", { name: "Try again", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "A quiet inbox. A connected team." })).toHaveCount(0);
});
