import { test, expect, type BrowserContext } from "@playwright/test";
import catalog from "../fixtures/provider-catalog.json";
import { workspaceFixture } from "../fixtures/workspace-redesign";

async function fixture(context: BrowserContext, options: { readOnly?: boolean; empty?: boolean; noCatalog?: boolean; broken?: boolean; denied?: boolean } = {}) {
  await workspaceFixture(context, { navigation: true });
  const writes: { path: string; method: string; body: Record<string, unknown> }[] = [];
  const accounts = options.empty ? [] : [
    { id: "email-account", provider: "resend", label: "Church office email", verification_status: "verified", verified_at: "2026-11-01T09:00:00Z", archived_at: null as string | null },
    { id: "messaging-account", provider: "twilio", label: "Team messaging", verification_status: "limited", verified_at: null, archived_at: options.broken ? "2026-11-01T09:00:00Z" : null },
    { id: "old-account", provider: "paystack", label: "Old payments", verification_status: "failed", verified_at: null, archived_at: "2026-11-01T09:00:00Z" },
  ];
  const channels: { channel: string; mode: string; account_id: string; settings: Record<string, string>; updated_at: string }[] = options.empty ? [] : [
    { channel: "email", mode: "custom", account_id: "email-account", settings: { from: "office@example.org", senderName: "Church office", replyTo: "hello@example.org" }, updated_at: "2026-11-01T09:00:00Z" },
    { channel: "sms", mode: "custom", account_id: "messaging-account", settings: { from: "+12345678901" }, updated_at: "2026-11-01T09:00:00Z" },
  ];
  let failedCreate = false;
  await context.route("**/api/backend/profiles/me", route => route.fulfill({ json: { success: true, data: {
    profileId: "staff", userId: "staff", churchId: "church", firstName: "Grace", lastName: "Adeyemi", status: "active", role: ["church_admin"], isAdminHq: true, church: { name: "Grace Church" }, planFeatures: ["giving", "email", "sms", "whatsapp", "calls"], permissions: options.denied ? [] : ["integrations:read", ...(!options.readOnly ? ["integrations:update"] : [])],
  } } }));
  await context.route("**/api/backend/church/integrations**", route => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/api/backend", "");
    const method = request.method();
    let data: unknown = { providers: options.noCatalog ? [] : catalog, accounts, channels };
    if (method !== "GET") {
      const body = request.postDataJSON(); writes.push({ path, method, body });
      if (path.endsWith("/accounts")) {
        if (!failedCreate) { failedCreate = true; return route.fulfill({ status: 400, json: { success: false, error: { message: "Invalid provider key" } } }); }
        accounts.push({ id: "new-account", provider: String(body.provider), label: String(body.label), verification_status: "unverified", verified_at: null, archived_at: null });
        data = accounts.at(-1);
      } else if (path.endsWith("/verify")) {
        const account = accounts.find(account => path.includes(account.id));
        if (account) { account.verified_at = "2026-11-09T09:00:00Z"; account.verification_status = "verified"; }
        data = { message: "Credentials checked" };
      } else if (path.endsWith("/archive")) {
        const account = accounts.find(account => path.includes(account.id));
        if (account) account.archived_at = "2026-11-09T09:00:00Z";
        data = { message: "Account archived" };
      } else if (path.endsWith("/test")) data = { message: "Provider accepted the test" };
      else {
        const channel = path.split("/").at(-1)!;
        const value = { channel, mode: String(body.mode), account_id: body.mode === "custom" ? String(body.accountId) : "", settings: (body.settings ?? {}) as typeof channels[number]["settings"], updated_at: "2026-11-09T09:00:00Z" };
        const index = channels.findIndex(item => item.channel === channel);
        if (index < 0) channels.push(value); else channels[index] = value;
        data = value;
      }
    }
    return route.fulfill({ json: { success: true, data } });
  });
  return { writes };
}

for (const width of [1440, 320]) {
  test(`integration accounts and routing at ${width}px`, async ({ page, context }, info) => {
    const state = await fixture(context);
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1100 });
    await page.goto("/admin/channels");
    await expect(page.getByRole("heading", { name: "Provider accounts", exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("account-old-account")).toHaveCount(0);
    await page.getByPlaceholder("Search provider accounts…").fill("Resend");
    await expect(page.getByTestId("account-email-account")).toBeVisible();
    await expect(page.getByTestId("account-messaging-account")).toHaveCount(0);
    await page.getByRole("button", { name: "Clear search", exact: true }).click();
    await page.getByRole("button", { name: "Archived", exact: true }).click();
    await expect(page.getByTestId("account-old-account")).toBeVisible();
    await page.getByRole("button", { name: "Active", exact: true }).click();
    await page.screenshot({ path: info.outputPath(`integrations-accounts-${width}.png`), fullPage: true });
    await page.getByRole("tab", { name: "Service routing", exact: true }).click();
    for (const [channel, label] of [["email", "Email"], ["whatsapp", "WhatsApp"], ["sms", "SMS"], ["voice", "Live calls"], ["payment", "Payments"]]) {
      await page.getByRole("button", { name: `Configure ${label}`, exact: true }).click();
      await expect(page.locator(`#channel-${channel}`)).toBeVisible();
    }
    await page.getByRole("button", { name: "Configure Live calls", exact: true }).click();
    await expect(page.locator("#channel-voice").getByText("Disabled", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Configure Email", exact: true }).click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: info.outputPath(`integrations-routing-${width}.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
    expect(state.writes).toEqual([]);
  });
}

test("provider account modal clears failed secrets and saves without browser storage", async ({ page, context }) => {
  const state = await fixture(context);
  await page.goto("/admin/channels");
  await page.getByRole("button", { name: "Add provider account", exact: true }).click();
  const modal = page.getByRole("dialog", { name: "Add provider account", exact: true });
  await modal.getByLabel("Provider", { exact: true }).selectOption("resend");
  await modal.getByLabel("Account name", { exact: true }).fill("New office account");
  await modal.getByLabel("API key", { exact: true }).fill("fake-test-secret");
  await modal.getByRole("button", { name: "Save provider account", exact: true }).click();
  await expect(modal.getByRole("alert")).toContainText("Invalid provider key");
  await expect(modal.getByLabel("API key", { exact: true })).toHaveValue("");
  await expect(modal.getByLabel("Account name", { exact: true })).toHaveValue("New office account");
  await modal.getByLabel("API key", { exact: true }).fill("fake-new-test-secret");
  await modal.getByRole("button", { name: "Save provider account", exact: true }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.getByTestId("account-new-account")).toBeVisible();
  expect(state.writes).toHaveLength(2);
  expect(await page.evaluate(() => JSON.stringify([localStorage, sessionStorage]))).not.toContain("fake-new-test-secret");
});

test("routing drafts survive task switches and checks; save and test require confirmations", async ({ page, context }) => {
  const state = await fixture(context);
  await page.goto("/admin/channels?tab=services");
  const email = page.locator("#channel-email");
  await email.getByLabel("Sender name", { exact: true }).fill("Unsaved church office");
  await page.getByRole("button", { name: "Configure SMS", exact: true }).click();
  await page.getByRole("button", { name: "Configure Email", exact: true }).click();
  await expect(email.getByLabel("Sender name", { exact: true })).toHaveValue("Unsaved church office");
  await email.getByLabel("Test email recipient", { exact: true }).fill("test@example.org");
  await expect(email.getByRole("button", { name: "Send test message", exact: true })).toBeDisabled();
  await page.getByRole("tab", { name: "Provider accounts", exact: true }).click();
  await page.getByTestId("account-email-account").getByRole("button", { name: "Check credentials", exact: true }).click();
  expect(state.writes).toEqual([]);
  await page.getByRole("dialog").getByRole("button", { name: "Confirm action", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("tab", { name: "Service routing", exact: true }).click();
  await expect(email.getByLabel("Sender name", { exact: true })).toHaveValue("Unsaved church office");
  await email.getByRole("button", { name: "Save email settings", exact: true }).click();
  const beforeSave = state.writes.length;
  await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
  expect(state.writes).toHaveLength(beforeSave);
  await email.getByRole("button", { name: "Save email settings", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Confirm action", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(state.writes.at(-1)?.body.settings).toMatchObject({ senderName: "Unsaved church office", from: "office@example.org" });
  await email.getByRole("button", { name: "Send test message", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("test@example.org");
  expect(state.writes.some(write => write.path.endsWith("/test"))).toBe(false);
  await page.getByRole("dialog").getByRole("button", { name: "Confirm action", exact: true }).click();
  await expect.poll(() => state.writes.some(write => write.path.endsWith("/test"))).toBe(true);
});

test("unavailable accounts are flagged and archive changes require confirmation", async ({ page, context }) => {
  const state = await fixture(context, { broken: true });
  await page.goto("/admin/channels?tab=services");
  await page.getByRole("button", { name: "Configure SMS", exact: true }).click();
  const sms = page.locator("#channel-sms");
  await expect(sms.getByText("Needs attention", { exact: true })).toBeVisible();
  await expect(sms.getByRole("button", { name: "Send test message", exact: true })).toHaveCount(0);
  await page.getByRole("tab", { name: "Provider accounts", exact: true }).click();
  await page.getByTestId("account-email-account").getByRole("button", { name: "Archive account", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Email");
  expect(state.writes).toEqual([]);
  await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
  expect(state.writes).toEqual([]);
});

test("empty provider catalog and read-only settings remain usable", async ({ page, context }) => {
  await fixture(context, { empty: true, noCatalog: true, readOnly: true });
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/admin/channels");
  await expect(page.getByText("Your connections start here", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Add provider account|Save|Check credentials|Archive account/ })).toHaveCount(0);
  await page.getByRole("tab", { name: "Service routing", exact: true }).click();
  await expect(page.locator("#email-mode")).toBeDisabled();
  expect(errors).toEqual([]);
});


test("missing provider catalog disables creation without crashing", async ({ page, context }) => {
  await fixture(context, { empty: true, noCatalog: true });
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/admin/channels");
  await expect(page.getByRole("button", { name: "Add provider account", exact: true })).toBeDisabled();
  await expect(page.getByText(/No providers are available right now/)).toBeVisible();
  expect(errors).toEqual([]);
});
