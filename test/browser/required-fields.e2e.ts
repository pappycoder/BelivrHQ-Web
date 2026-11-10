import { expect, test, type BrowserContext } from "@playwright/test";

test.use({ serviceWorkers: "block" });

async function fixture(context: BrowserContext) {
  await context.addCookies([{ name: "belivrhq_token", value: "required-fields-fixture", url: "http://127.0.0.1:3107" }]);
  await context.route("https://**", route => route.abort());
  await context.addInitScript(() => {
    const original = window.fetch.bind(window);
    const writes: { path: string; body: Record<string, unknown> }[] = [];
    Object.assign(window, { requiredWrites: writes });
    window.fetch = async (input, options) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.origin);
      if (!url.pathname.startsWith("/api/")) return original(input, options);
      if (url.pathname === "/api/session") return Response.json({ hasSession: true });
      let data: unknown = { data: [], total: 0, meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
      if (url.pathname.endsWith("/profiles/me")) data = {
        profileId: "p", userId: "u", churchId: "c", role: ["church_admin"], status: "active", isAdminHq: true,
        firstName: "Admin", lastName: "Test", church: { churchId: "c", name: "Grace Church" },
        planFeatures: ["visitors", "members", "events"],
        permissions: ["members:new:create", "members:all:read", "visitors:list:read", "visitors:list:update", "visitors:new:create", "branches:read", "profiles:read", "events:create", "events:list:read"],
      };
      else if (url.pathname.endsWith("/branches")) data = { data: [{ branchId: "west", name: "West Branch" }, { branchId: "east", name: "East Branch" }], total: 2 };
      else if (url.pathname.endsWith("/visitors/legacy")) data = { id: "legacy", churchId: "c", firstName: "Ada", lastName: "Okafor", followUpStatus: "new", firstVisitDate: "2026-10-23", createdAt: "2026-10-23T10:00:00Z", updatedAt: "2026-10-23T10:00:00Z" };
      if (["POST", "PATCH", "PUT"].includes(options?.method ?? "") && !url.pathname.includes("activity")) {
        const body = JSON.parse(String(options?.body ?? "{}"));
        writes.push({ path: url.pathname, body });
        data = { ...body, memberId: "saved-member", id: "legacy", eventId: "saved-event" };
      }
      return Response.json({ success: true, data });
    };
  });
}

async function writes(context: import("@playwright/test").Page) {
  return context.evaluate(() => (window as unknown as { requiredWrites: { path: string; body: Record<string, unknown> }[] }).requiredWrites.filter(call => /\/(members|visitors|events)(\/|$)/.test(call.path)));
}

test("member creation requires names and a branch and then saves the selected branch", async ({ page, context }) => {
  await fixture(context);
  await page.goto("/people/members/new");
  const save = page.getByRole("button", { name: "Create member", exact: true });
  await save.click();
  await expect(page.getByText("Fields marked with an asterisk are required.", { exact: true })).toBeVisible();
  await expect(page.getByText("First name is required", { exact: true })).toBeVisible();
  await page.getByLabel(/First name/i).fill("   ");
  await page.getByLabel(/Last name/i).fill("Okafor");
  await save.click();
  expect(await writes(page)).toEqual([]);
  await page.getByLabel(/First name/i).fill("Ada");
  await save.click();
  await expect(page.getByText("Select a branch", { exact: true })).toBeVisible();
  expect(await writes(page)).toEqual([]);
  await page.screenshot({ path: "/tmp/belivr-required-member.png", fullPage: true });
  const branch = page.getByRole("combobox", { name: "Branch", exact: true });
  await expect(branch).toHaveAttribute("aria-required", "true");
  await expect(page.locator('label').filter({ hasText: /^Branch/ }).locator('span[aria-hidden="true"]')).toHaveClass(/text-red-600/);
  await branch.click();
  await page.getByRole("option", { name: "West Branch", exact: true }).click();
  await save.click();
  await expect.poll(() => writes(page)).toEqual([expect.objectContaining({ body: expect.objectContaining({ firstName: "Ada", branchId: "west" }) })]);
});

test("editing a branchless visitor cannot save until a branch is assigned", async ({ page, context }) => {
  await fixture(context);
  await page.goto("/people/visitors/legacy");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(dialog.locator("[data-slot=form-message]").filter({ hasText: "Select a branch" })).toBeVisible();
  expect(await writes(page)).toEqual([]);
  await dialog.getByRole("combobox", { name: "Branch", exact: true }).click();
  await page.getByRole("option", { name: "East Branch", exact: true }).click();
  await dialog.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect.poll(() => writes(page)).toEqual([expect.objectContaining({ body: expect.objectContaining({ branchId: "east" }) })]);
});

test("native event forms mark required controls and block blank branch submissions", async ({ page, context }) => {
  await fixture(context);
  await page.goto("/gatherings/events/new");
  await page.locator('form input').first().fill("Community Gathering");
  await page.locator('input[type="datetime-local"]').first().fill("2026-11-15T10:00");
  await page.getByRole("button", { name: /Create event/i }).click();
  await expect(page.locator('form [role="alert"]').filter({ hasText: "Please fill in all fields marked" })).toBeVisible();
  expect(await writes(page)).toEqual([]);
  await page.screenshot({ path: "/tmp/belivr-required-event.png", fullPage: true });
  await expect(page.locator('select[required]')).toHaveAttribute("aria-invalid", "true");
});

test("generated text, dropdown and checkbox questions must all be answered", async ({ page, context }) => {
  const { mockBotChallenges, verifyBotForm } = await import("../fixtures/bot-protection");
  let submissions = 0;
  await context.route("https://**", route => route.abort());
  await context.route("**/api/session", route => route.fulfill({ json: { hasSession: false } }));
  await context.route("**/api/backend/**", route => route.fulfill({ json: { success: true, data: {} } }));
  await context.route("**/api/backend/forms/public/required-test/meta", route => route.fulfill({ json: { success: true, data: {
    title: "Required questions", churchName: "Grace Church", fields: [
      { key: "name", label: "Full name", type: "text", required: true },
      { key: "day", label: "Favourite day", type: "dropdown", required: true, options: ["Monday", "Sunday"] },
      { key: "channels", label: "Follow-up channels", type: "checkbox", required: true, options: ["SMS", "Email"] },
    ],
  } } }));
  await context.route("**/api/backend/forms/public/required-test/submit", route => {
    submissions++;
    return route.fulfill({ json: { success: true, data: {} } });
  });
  await mockBotChallenges(context);
  await page.goto("/forms/public/required-test");
  await verifyBotForm(page);
  const submit = page.getByRole("button", { name: "Send response", exact: true });
  await submit.click();
  expect(submissions).toBe(0);
  await expect(page.getByLabel("Full name", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await page.getByLabel("Full name", { exact: true }).fill("Ada Okafor");
  await submit.click();
  const day = page.getByRole("combobox", { name: "Favourite day", exact: true });
  await expect(day).toHaveAttribute("aria-invalid", "true");
  await day.click();
  await page.getByRole("option", { name: "Sunday", exact: true }).click();
  await submit.click();
  expect(submissions).toBe(0);
  await expect(page.getByRole("group", { name: "Follow-up channels", exact: true })).toHaveAttribute("aria-invalid", "true");
  await page.getByRole("checkbox", { name: "SMS", exact: true }).check();
  await submit.click();
  await expect.poll(() => submissions).toBe(1);
  await expect(page.getByText("Successfully submitted", { exact: true })).toBeVisible();
});
