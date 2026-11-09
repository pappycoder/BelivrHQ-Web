import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { mockTawkWidget } from "../fixtures/tawk-widget";

async function fixture(context: BrowserContext, mode = "guides", status = "active", role = "custom_reader") {
  await context.addCookies([{ name: "belivrhq_token", value: "assistant-fixture", url: "http://127.0.0.1:3107" }]);
  await context.route("https://embed.tawk.to/**", route => route.fulfill({ contentType: "application/javascript", body: "" }));
  await context.addInitScript(({ mode, status, role }) => {
    const original = window.fetch.bind(window);
    Object.assign(window, { assistantCalls: [] as unknown[], assistantContextCalls: 0, changeAssistantScope: false });
    window.fetch = async (input, options) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.origin);
      const path = url.pathname;
      if (!path.startsWith("/api/")) return original(input, options);
      if (path === "/api/session") return Response.json({ hasSession: true });
      // Let route-level fixtures control question responses and failures.
      if (path.endsWith("/assistant/message")) {
        (window as unknown as { assistantCalls: unknown[] }).assistantCalls.push(JSON.parse(String(options?.body)));
        return original(input, options);
      }
      let data: unknown = [];
      if (path.endsWith("/audit") || path.endsWith("/notifications")) data = { data: [], total: 0 };
      if (path.endsWith("/auth/session")) data = { userId: "user-a", email: "staff@example.test" };
      if (path.endsWith("/profiles/me")) data = {
        profileId: "staff-a", userId: "user-a", churchId: "church-a",
        branchId: (window as unknown as { changeAssistantScope: boolean }).changeAssistantScope ? "branch-b" : "branch-a",
        role: [role], status, firstName: "Grace", lastName: "Staff", isAdminHq: false,
        permissions: ["forms:list:read", "forms:submissions:read", ...(role === "church_admin" ? ["billing:read", "offline:read", "emails:read"] : [])], planFeatures: ["forms"],
      };
      if (path.endsWith("/billing/subscription")) data = { active: true, subscription: { plan: "community" }, limits: { members: 300, staff: 5, locations: 1 }, usage: { members: 10, staff: 2, locations: 1, pendingInvitations: 0 }, payments: [], catalog: [], gateways: [], features: ["forms"] };
      if (path.endsWith("/assistant/context")) { (window as unknown as { assistantContextCalls: number }).assistantContextCalls++; data = { mode, knowledgeVersion: "fixture-v1", scope: { roles: ["custom_reader"], location: "Your assigned branch", plan: "community", subscriptionActive: true }, limits: { churchDailyQuestions: 50, userDailyQuestions: 30, resetTimezone: "Africa/Lagos" } }; }
      return Response.json({ success: true, data });
    };
  }, { mode, status, role });
}
const reply = (answer = "Use Table view to compact rows. Numeric widths stay unchanged.", mode = "guides") => ({
  answer, mode, knowledgeVersion: "fixture-v1", sources: [{ id: "policy:tables", title: "Table display controls" }, { id: "guide:members", title: "Member guide", path: "/help/add-and-update-members" }],
  navigation: [{ title: "Forms", path: "/forms", trail: "Forms → All Forms" }, { title: "Forbidden analytics", path: "/analytics", trail: "Analytics" }, { title: "Unsafe external", path: "//evil.example", trail: "Unsafe" }],
  access: [{ label: "forms:submissions:update", status: "missing_permission", detail: "This review grant is absent from your verified permissions." }],
});
async function open(page: Page) {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Ask BelivrHQ", exact: true }).click();
  await expect(page.getByRole("heading", { name: "What would you like to understand?" })).toBeVisible();
}
async function answerRoute(page: Page, answer = reply()) {
  await page.route("**/api/backend/assistant/message", route => route.fulfill({ json: { success: true, data: answer } }));
}

test("staff get a lazy assistant, verified references and only authorized navigation", async ({ page, context }) => {
  await fixture(context); await answerRoute(page);
  await page.goto("/dashboard");
  await expect(page.getByRole("button", { name: "Ask BelivrHQ", exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { assistantContextCalls: number }).assistantContextCalls)).toBe(0);
  await page.getByRole("button", { name: "Ask BelivrHQ", exact: true }).click();
  await expect(page.getByText("Your assigned branch", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "How do table display controls work?", exact: true }).click();
  await expect(page.getByText(reply().answer, { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Forms", exact: true })).toHaveAttribute("href", "/forms");
  await expect(page.getByRole("link", { name: /Forbidden analytics|Unsafe external/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Member guide" })).toHaveAttribute("href", "/help/add-and-update-members");
  await page.getByText("Verified access checks", { exact: true }).click();
  await expect(page.getByText(/forms:submissions:update · missing permission/)).toBeVisible();
  const bodies = await page.evaluate(() => (window as unknown as { assistantCalls: Record<string, unknown>[] }).assistantCalls);
  expect(bodies).toEqual([{ question: "How do table display controls work?", page: "/dashboard", history: [] }]);
  await page.screenshot({ path: "/tmp/belivrhq-assistant-desktop.png", fullPage: true });
});

test("AI mode shows disclosure, selected citations and quota fallback", async ({ page, context }) => {
  await fixture(context, "ai");
  await answerRoute(page, { ...reply("Showing the product reference instead."), notice: "AI allowance reached. Showing BelivrHQ references instead." } as ReturnType<typeof reply>);
  await open(page);
  await expect(page.getByText(/sent to OpenAI/)).toBeVisible();
  await page.getByLabel("Your BelivrHQ question").fill("Explain table controls");
  await page.getByRole("button", { name: "Send BelivrHQ question" }).click();
  await expect(page.getByText("Showing the product reference instead.", { exact: true })).toBeVisible();
  await expect(page.getByText("AI allowance reached. Showing BelivrHQ references instead.", { exact: true })).toBeVisible();
});

test("send failures keep the question editable and allow retry", async ({ page, context }) => {
  await fixture(context);
  let calls = 0;
  await page.route("**/api/backend/assistant/message", route => {
    calls++;
    return route.fulfill({ status: calls === 1 ? 503 : 200, json: calls === 1 ? { success: false, error: { message: "Unavailable" } } : { success: true, data: reply() } });
  });
  await open(page); await page.getByLabel("Your BelivrHQ question").fill("Explain table controls");
  await page.getByRole("button", { name: "Send BelivrHQ question" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Service temporarily unavailable" })).toBeVisible();
  await expect(page.getByLabel("Your BelivrHQ question")).toHaveValue("Explain table controls");
  await page.getByRole("button", { name: "Send BelivrHQ question" }).click();
  await expect(page.getByText(reply().answer, { exact: true })).toBeVisible(); expect(calls).toBe(2);
});

test("new conversation cancels an in-flight answer and prevents duplicate sends", async ({ page, context }) => {
  await fixture(context);
  let calls = 0;
  let finish: (() => void) | undefined;
  await page.route("**/api/backend/assistant/message", async route => {
    calls++;
    await new Promise<void>(resolve => { finish = resolve; });
    await route.fulfill({ json: { success: true, data: reply("Old response must not reappear.") } }).catch(() => {});
  });
  await open(page); await page.getByLabel("Your BelivrHQ question").fill("Explain table controls");
  await page.getByRole("button", { name: "Send BelivrHQ question" }).click();
  await expect(page.getByRole("button", { name: "Send BelivrHQ question" })).toBeDisabled();
  await expect.poll(() => calls).toBe(1);
  await page.getByRole("button", { name: "New conversation" }).click(); finish?.();
  await expect(page.getByRole("heading", { name: "What would you like to understand?" })).toBeVisible();
  await expect(page.getByText("Old response must not reappear.")).toHaveCount(0);
});

test("scope changes clear prior conversations and close the panel", async ({ page, context }) => {
  await fixture(context); await answerRoute(page, reply("Previous branch answer.")); await open(page);
  await page.getByRole("button", { name: "Explain this page", exact: true }).click();
  await expect(page.getByText("Previous branch answer.", { exact: true })).toBeVisible();
  await page.clock.install();
  await page.clock.fastForward(61_000);
  await page.evaluate(() => { (window as unknown as { changeAssistantScope: boolean }).changeAssistantScope = true; window.dispatchEvent(new Event("visibilitychange")); window.dispatchEvent(new Event("focus")); });
  await expect(page.getByRole("dialog", { name: "Ask BelivrHQ" })).toHaveCount(0);
  await page.getByRole("button", { name: "Ask BelivrHQ", exact: true }).click();
  await expect(page.getByRole("heading", { name: "What would you like to understand?" })).toBeVisible();
  await expect(page.getByText("Previous branch answer.", { exact: true })).toHaveCount(0);
});

for (const width of [320, 390]) test(`assistant fits ${width}px and remains keyboard accessible`, async ({ page, context }) => {
  await fixture(context); await answerRoute(page); await page.setViewportSize({ width, height: 844 });
  await open(page);
  await page.getByLabel("Your BelivrHQ question").fill("Explain table controls");
  await page.getByLabel("Your BelivrHQ question").press("Enter");
  await expect(page.getByText(reply().answer, { exact: true })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Ask BelivrHQ" })).toBeInViewport({ ratio: 1 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const box = await page.getByRole("dialog", { name: "Ask BelivrHQ" }).boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.width).toBeLessThanOrEqual(width); expect(box!.x + box!.width).toBeLessThanOrEqual(width + 0.5);
  if (width === 390) await page.screenshot({ path: "/tmp/belivrhq-assistant-mobile.png", fullPage: true });
  await page.keyboard.press("Escape"); await expect(page.getByRole("dialog", { name: "Ask BelivrHQ" })).toHaveCount(0);
});

test("public visitors cannot see or initialize the assistant", async ({ page, context }) => {
  await context.route("**/api/session", route => route.fulfill({ json: { hasSession: false } }));
  let requests = 0; page.on("request", request => { if (request.url().includes("/assistant/")) requests++; });
  await page.goto("/help"); await expect(page.getByRole("heading", { name: "How can we help?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ask BelivrHQ", exact: true })).toHaveCount(0); expect(requests).toBe(0);
});

test("administrator header reflows its extra controls on a 320px screen", async ({ page, context }) => {
  await fixture(context, "guides", "active", "church_admin"); await answerRoute(page);
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/dashboard");
  await expect(page.getByRole("button", { name: "Ask BelivrHQ", exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Ask BelivrHQ", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Ask BelivrHQ" })).toBeInViewport({ ratio: 1 });
});

test("Tawk hides while Ask BelivrHQ is open and returns without ending the conversation", async ({ page, context }) => {
  await fixture(context, "guides", "active", "church_admin");
  await page.route("https://embed.tawk.to/**", route => route.fulfill({ contentType: "application/javascript", body: mockTawkWidget }));
  await page.goto("/dashboard");
  const bubble = page.getByRole("button", { name: "Open Tawk.to chat" });
  await expect(bubble).toBeVisible();
  const before = await page.evaluate(() => (window as unknown as { chatCalls: { name: string }[] }).chatCalls.filter(call => /^(endChat|logout|shutdown)$/.test(call.name)).length);
  await page.getByRole("button", { name: "Ask BelivrHQ", exact: true }).click();
  await expect(bubble).toBeHidden();
  await expect(page.getByRole("dialog", { name: "Ask BelivrHQ" })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { chatCalls: { name: string }[] }).chatCalls.filter(call => /^(endChat|logout|shutdown)$/.test(call.name)).length)).toBe(before);
  await page.getByRole("dialog", { name: "Ask BelivrHQ" }).getByRole("button", { name: "Close", exact: true }).click();
  await expect(bubble).toBeVisible();
});

test("Tawk finishing initialization inside an open AI drawer stays hidden until closing", async ({ page, context }) => {
  await fixture(context, "guides", "active", "church_admin");
  let release: (() => void) | undefined;
  const hold = new Promise<void>(resolve => { release = resolve; });
  await page.route("https://embed.tawk.to/**", async route => { await hold; await route.fulfill({ contentType: "application/javascript", body: mockTawkWidget }); });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Ask BelivrHQ", exact: true }).click();
  await expect(page.getByRole("heading", { name: "What would you like to understand?" })).toBeVisible();
  release?.();
  await expect.poll(() => page.evaluate(() => (window as unknown as { chatCalls?: { name: string }[] }).chatCalls?.filter(call => call.name === "hideWidget").length ?? 0)).toBeGreaterThanOrEqual(3);
  await expect(page.getByRole("button", { name: "Open Tawk.to chat" })).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open Tawk.to chat" })).toBeVisible();
});

test("closing the AI drawer cannot restore support after the session ended", async ({ page, context }) => {
  await fixture(context, "guides", "active", "church_admin");
  await page.route("https://embed.tawk.to/**", route => route.fulfill({ contentType: "application/javascript", body: mockTawkWidget }));
  await page.goto("/dashboard");
  await expect(page.getByRole("button", { name: "Open Tawk.to chat" })).toBeVisible();
  await page.getByRole("button", { name: "Ask BelivrHQ", exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event("belivrhq-session-ended")));
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open Tawk.to chat" })).toBeHidden();
});

test("stalled assistant access times out and retry restores sending without an AI key", async ({ page, context }) => {
  await fixture(context, "guides"); await answerRoute(page);
  await context.addInitScript(() => {
    const previous = window.fetch;
    let attempts = 0;
    window.fetch = async (input, options) => {
      const path = new URL(input instanceof Request ? input.url : String(input), location.origin).pathname;
      if (path.endsWith('/assistant/context') && attempts++ === 0) return new Promise<Response>(() => {});
      return previous(input, options);
    };
  });
  await page.clock.install();
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Ask BelivrHQ', exact: true }).click();
  await expect(page.getByLabel('Your BelivrHQ question')).toBeDisabled();
  await page.clock.fastForward(15001);
  await expect(page.getByRole('dialog', { name: 'Ask BelivrHQ' }).getByRole('alert')).toContainText('took too long to verify');
  await page.getByRole('button', { name: 'Retry assistant', exact: true }).click();
  await expect(page.getByLabel('Your BelivrHQ question')).toBeEnabled();
  await page.getByLabel('Your BelivrHQ question').fill('   ');
  await expect(page.getByRole('button', { name: 'Send BelivrHQ question' })).toBeDisabled();
  await expect(page.getByText('Type a question to send.', { exact: true })).toBeVisible();
  await page.getByLabel('Your BelivrHQ question').fill('How do table controls work?');
  await expect(page.getByRole('button', { name: 'Send BelivrHQ question' })).toBeEnabled();
  await page.getByRole('button', { name: 'Send BelivrHQ question' }).click();
  await expect(page.getByText(reply().answer, { exact: true })).toBeVisible();
});

test("stalled answers restore the question and Send instead of leaving the composer disabled", async ({ page, context }) => {
  await fixture(context);
  await page.clock.install();
  let release: (() => void) | undefined;
  let calls = 0;
  await page.route('**/api/backend/assistant/message', async route => {
    calls++;
    if (calls === 1) {
      await new Promise<void>(resolve => { release = resolve; });
      await route.fulfill({ json: { success: true, data: reply('Expired reply must not return.') } }).catch(() => {});
    } else await route.fulfill({ json: { success: true, data: reply() } });
  });
  await open(page);
  await page.getByLabel('Your BelivrHQ question').fill('Explain table controls');
  await page.getByRole('button', { name: 'Send BelivrHQ question' }).click();
  await expect.poll(() => calls).toBe(1);
  await page.clock.fastForward(35001);
  await expect(page.getByRole('log').getByRole('alert')).toContainText('took too long to answer');
  await expect(page.getByLabel('Your BelivrHQ question')).toHaveValue('Explain table controls');
  await expect(page.getByRole('button', { name: 'Send BelivrHQ question' })).toBeEnabled();
  release?.();
  await page.getByRole('button', { name: 'Send BelivrHQ question' }).click();
  await expect(page.getByText(reply().answer, { exact: true })).toBeVisible();
  await expect(page.getByText('Expired reply must not return.', { exact: true })).toHaveCount(0);
});

test("an empty assistant context response shows retry instead of a permanently disabled composer", async ({ page, context }) => {
  await fixture(context);
  await context.addInitScript(() => {
    const previous = window.fetch;
    let attempts = 0;
    window.fetch = async (input, options) => {
      const path = new URL(input instanceof Request ? input.url : String(input), location.origin).pathname;
      if (path.endsWith('/assistant/context') && attempts++ === 0) return Response.json({ success: true });
      return previous(input, options);
    };
  });
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Ask BelivrHQ', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Ask BelivrHQ' }).getByRole('alert')).toContainText('couldn’t load assistant access');
  await page.getByRole('button', { name: 'Retry assistant', exact: true }).click();
  await expect(page.getByLabel('Your BelivrHQ question')).toBeEnabled();
  await page.getByLabel('Your BelivrHQ question').fill('Explain this page');
  await expect(page.getByRole('button', { name: 'Send BelivrHQ question' })).toBeEnabled();
});


for (const mode of ["guides", "ai"]) test(`typing a short message enables Send in ${mode} mode`, async ({ page, context }) => {
  await fixture(context, mode); await answerRoute(page, reply("How can I help you use BelivrHQ?", mode));
  await open(page);
  const input = page.getByLabel("Your BelivrHQ question");
  const send = page.getByRole("button", { name: "Send BelivrHQ question" });
  await expect(send).toBeDisabled();
  await input.pressSequentially("Hi");
  await expect(input).toHaveValue("Hi");
  await expect(send).toBeEnabled();
  await send.click();
  await expect(page.getByText("How can I help you use BelivrHQ?", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { assistantCalls: unknown[] }).assistantCalls)).toEqual([{ question: "Hi", page: "/dashboard", history: [] }]);
});
