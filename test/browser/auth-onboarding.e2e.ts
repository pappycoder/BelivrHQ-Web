import { mockBotChallenges, verifyBotForm } from "../fixtures/bot-protection";
import { mockTawkWidget } from "../fixtures/tawk-widget";
import { test, expect, type BrowserContext, type Page } from "@playwright/test";
const reference = "BHQSUB_" + "a".repeat(32);
async function publicSession(context: BrowserContext) {
  await context.route("**/api/session", (r) =>
    r.fulfill({ json: { hasSession: false } }),
  );
}
async function churchStep(page: Page) {
  await page
    .getByLabel("Church Name", { exact: true })
    .fill("Grace Community Church");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
}
async function accountStep(page: Page) {
  await page.getByLabel("First Name", { exact: true }).fill("Grace");
  await page.getByLabel("Last Name", { exact: true }).fill("Admin");
  await page
    .getByLabel("Email Address", { exact: true })
    .fill("grace@example.org");
  await page
    .getByLabel("Password", { exact: true })
    .fill("LongUniquePassword!27");
  await page
    .getByLabel("Confirm Password", { exact: true })
    .fill("LongUniquePassword!27");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
}
test.beforeEach(async ({ page, context }) => {
  await mockBotChallenges(context);
  await context.route("https://embed.tawk.to/**", route => route.fulfill({ contentType: "application/javascript", body: mockTawkWidget }));
  await page.emulateMedia({ reducedMotion: "reduce" });
});
for (const entry of ["/login", "/register"]) {
  test(`restored session at ${entry} opens the workspace home`, async ({ page, context }) => {
    await context.route("**/api/session", route => route.fulfill({ json: { hasSession: true } }));
    await context.route("**/api/backend/auth/session", route => route.fulfill({
      json: { success: true, data: { userId: "restored-user", email: "restored@example.org" } },
    }));
    // Isolate entry routing from workspace data and permission loading.
    await context.route("**/home", route => route.fulfill({
      contentType: "text/html", body: "<html><body>Workspace home</body></html>",
    }));
    const dashboardRequests: string[] = [];
    page.on("request", request => {
      if (new URL(request.url()).pathname === "/dashboard") dashboardRequests.push(request.url());
    });
    await page.goto(entry);
    await expect(page).toHaveURL(/\/home$/);
    expect(dashboardRequests).toEqual([]);
  });
}
test("registration preserves edits and redirects to sign-in when email confirmation is required", async ({
  page,
  context,
}) => {
  await publicSession(context);
  await page.route("**/api/backend/auth/login", (r) => r.fulfill({
    status: 401,
    json: { success: false, error: { message: "Email not confirmed" } },
  }));
  let payload: Record<string, unknown> | undefined;
  await page.route("**/api/backend/auth/register", (r) => {
    payload = r.request().postDataJSON();
    return r.fulfill({
      json: {
        success: true,
        data: { userId: "u", churchId: "c", email: "grace@example.org" },
      },
    });
  });
  await page.goto("/register?plan=network&cycle=annual");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel("Church Name", { exact: true })).toBeFocused();
  await churchStep(page);
  await accountStep(page);
  await expect(page.getByRole("radio", { name: /Network/ })).toBeChecked();
  await expect(
    page.getByRole("button", { name: "Yearly · save 10%", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByText("USD 432", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit church", exact: true }).click();
  await expect(page.getByLabel("Church Name", { exact: true })).toHaveValue(
    "Grace Community Church",
  );
  await page
    .getByLabel("Church Name", { exact: true })
    .fill("Grace Church Updated");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel("Email Address", { exact: true })).toHaveValue(
    "grace@example.org",
  );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("checkbox", { name: /I am at least 18/ }).check();
  await verifyBotForm(page);
  await page
    .getByRole("button", { name: "Create account & continue", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fsubscription&registered=1$/);
  await expect(page.getByRole("status").filter({ hasText: "Your account has been created" })).toContainText("Your account has been created");
  expect(payload).toMatchObject({
    termsAccepted: true,
    acceptedTermsVersion: "2026-10-24",
    churchName: "Grace Church Updated",
    plan: "network",
    billingCycle: "annual",
    email: "grace@example.org",
  });
  expect(payload).not.toHaveProperty("amount");
  expect(
    await page.evaluate(() =>
      JSON.stringify({ ...localStorage, ...sessionStorage }),
    ),
  ).not.toContain("LongUniquePassword");
});
test("mismatched passwords block account progress", async ({
  page,
  context,
}) => {
  await publicSession(context);
  await page.goto("/register");
  await churchStep(page);
  await page.getByLabel("First Name", { exact: true }).fill("A");
  await page.getByLabel("Last Name", { exact: true }).fill("B");
  await page.getByLabel("Email Address", { exact: true }).fill("a@example.org");
  await page.getByLabel("Password", { exact: true }).fill("LongPassword1!");
  await page
    .getByLabel("Confirm Password", { exact: true })
    .fill("DifferentPassword2!");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Passwords do not match." }),
  ).toHaveText("Passwords do not match.");
  await expect(page.getByLabel("Email Address", { exact: true })).toBeVisible();
  const confirmation = page.getByLabel("Confirm Password", { exact: true });
  await expect(confirmation).toHaveAttribute("aria-invalid", "true");
  await confirmation.fill("LongPassword1!");
  await expect(confirmation).not.toHaveAttribute("aria-invalid", "true");
});
test("registration failure retains data for a safe retry", async ({
  page,
  context,
}) => {
  await publicSession(context);
  await page.route("**/api/backend/auth/register", (r) =>
    r.fulfill({
      status: 503,
      json: { success: false, error: { message: "Unavailable" } },
    }),
  );
  await page.goto("/register");
  await churchStep(page);
  await accountStep(page);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("checkbox", { name: /I am at least 18/ }).check();
  await verifyBotForm(page);
  await page
    .getByRole("button", { name: "Create account & continue", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "unavailable" }),
  ).toContainText("unavailable");
  await expect(
    page.getByText("Grace Community Church", { exact: true }),
  ).toBeVisible();
});
async function billingSession(
  context: BrowserContext,
  options: {
    active?: boolean;
    grants?: string[];
    gateways?: string[];
    pending?: boolean;
    registration?: boolean;
    checkoutUrl?: string;
    verificationSequence?: ("pending" | "error" | "success" | "review" | "failed")[];
    sharedPaymentState?: boolean;
  } = {},
) {
  let sharedPaid = false;
  if (options.sharedPaymentState) await context.exposeBinding("readPaymentOutcome", () => sharedPaid ? "success" : "pending");
  await context.addCookies([{ name: "belivrhq_token", value: "billing-fixture", url: "http://127.0.0.1:3107" }]);
  await context.addInitScript(
    ({ reference, options }) => {
      const original = window.fetch;
      let active = options.active ?? false;
      let authenticated = !options.registration;
      let plan = "essentials";
      let cycle = "monthly";
      let verificationCount = 0;
      let paymentCompleted = false;
      const calls: { path: string; body: unknown }[] = [];
      Object.assign(window, { billingCalls: calls });
      window.fetch = async (input, init) => {
        const path = new URL(
          input instanceof Request ? input.url : String(input),
          location.origin,
        ).pathname;
        if (!path.startsWith("/api/") || path.startsWith("/api/backend/bot-protection/")) return original(input, init);
        if (path === "/api/session")
          return new Response(JSON.stringify({ hasSession: authenticated }));
        const body = init?.body ? JSON.parse(String(init.body)) : undefined;
        calls.push({ path, body });
        let data: unknown = {};
        const status = () => ({
          active,
          subscription: {
            plan,
            cycle,
            paid_until: active ? "2027-01-18T00:00:00Z" : null,
          },
          gateways: options.gateways ?? ["flutterwave"],
          latestPayment:
            options.pending && !paymentCompleted
              ? {
                  reference,
                  gateway: "flutterwave",
                  plan: "essentials",
                  cycle: "monthly",
                  amount: 10000,
                  currency: "NGN",
                }
              : null,
        });
        if (path.endsWith("/auth/register")) {
          plan = body.plan;
          cycle = body.billingCycle;
          authenticated = true;
          data = { sessionEstablished: true, userId: "u", churchId: "c", email: "grace@example.org" };
        } else if (path.endsWith("/auth/login")) {
          authenticated = true;
          data = { sessionEstablished: true, userId: "u", email: "grace@example.org" };
        } else if (path.endsWith("/auth/session"))
          data = { userId: "u", email: "admin@example.org" };
        else if (path.endsWith("/profiles/me"))
          data = {
            profileId: "p",
            userId: "u",
            churchId: "c",
            firstName: "Admin",
            lastName: "User",
            status: "active",
            role: ["church_admin"],
            isAdminHq: true,
            permissions: options.grants ?? ["billing:read", "billing:update"],
          };
        else if (path.endsWith("/billing/subscription")) data = status();
        else if (path.endsWith("/billing/quote")) data = {
          quoteId: 'BHQQUOTE_' + 'b'.repeat(32), currency: body.currency,
          amount: ({ essentials: 10, community: 20, network: 40 }[body.plan as 'essentials' | 'community' | 'network'] || 10) * (body.cycle === 'annual' ? 10.8 : 1) * 1000,
          expiresAt: new Date(Date.now() + 900000).toISOString(), intent: 'renewal', renewBy: '2027-01-18T00:00:00Z',
        };
        else if (path.endsWith("/billing/verify")) {
          const sequence = options.verificationSequence || ["success"];
          const next = options.sharedPaymentState
            ? await (window as unknown as { readPaymentOutcome: () => Promise<string> }).readPaymentOutcome()
            : sequence[Math.min(verificationCount++, sequence.length - 1)];
          if (next === "error") return Response.json({ success: false, error: { message: "Verification temporarily unavailable" } }, { status: 503 });
          if (next === "success") { active = true; paymentCompleted = true; }
          data = { ...status(), verification: { reference: body.reference, status: ["success", "review"].includes(next) ? "success" : next,
            application_status: next === "review" ? "review" : next === "success" ? "applied" : "pending" } };
        } else if (path.endsWith("/billing/checkout") && options.checkoutUrl)
          data = { authorizationUrl: options.checkoutUrl, reference };
        else if (path.endsWith("/billing/checkout"))
          return new Response(
            JSON.stringify({
              success: false,
              error: { message: "Provider temporarily unavailable" },
            }),
            { status: 503, headers: { "Content-Type": "application/json" } },
          );
        return new Response(JSON.stringify({ success: true, data }), {
          headers: { "Content-Type": "application/json" },
        });
      };
    },
    { reference, options },
  );
  return { completePayment: () => { sharedPaid = true; } };
}
test("registration signs in and opens the selected subscription for Flutterwave payment", async ({ page, context }) => {
  await billingSession(context, {
    registration: true,
    gateways: ["flutterwave"],
    checkoutUrl: "https://checkout-v2.dev-flutterwave.com/v3/hosted/pay/test-subscription",
    verificationSequence: ["pending"],
  });
  await context.route("https://checkout-v2.dev-flutterwave.com/**", (route) => route.fulfill({
    contentType: "text/html", body: "<h1>Secure Flutterwave checkout</h1>",
  }));
  await page.goto("/register?plan=network&cycle=annual");
  await churchStep(page);
  await accountStep(page);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("checkbox", { name: /I am at least 18/ }).check();
  await verifyBotForm(page);
  await page.getByRole("button", { name: "Create account & continue", exact: true }).click();
  await expect(page).toHaveURL(/\/subscription$/);
  await expect(page.getByLabel("Billing period")).toHaveValue("annual");
  await expect(page.getByLabel("Payment provider")).toHaveValue("flutterwave");
  await expect(page.getByRole("button", { name: "Continue to payment", exact: true })).toBeEnabled();
  const calls = await page.evaluate(() => (window as unknown as { billingCalls: { path: string; body: Record<string, unknown> }[] }).billingCalls);
  expect(calls.filter(c => c.path.endsWith("/auth/login"))).toHaveLength(0);
  await expect(page.getByLabel("Payment provider").getByRole("option")).toHaveCount(1);
  expect(calls.filter(c => c.path.endsWith("/billing/quote")).at(-1)?.body).toMatchObject({
    plan: "network", cycle: "annual", gateway: "flutterwave", currency: "NGN",
  });
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain("LongUniquePassword");
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Continue to payment", exact: true }).click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL("https://checkout-v2.dev-flutterwave.com/v3/hosted/pay/test-subscription");
  await expect(page).toHaveURL(/\/subscription$/);
  await expect(page.getByText("Waiting for Flutterwave to confirm your payment.", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to workspace", exact: true })).toHaveCount(0);
  expect(await popup.evaluate(() => window.opener === null)).toBe(true);
});

test("an unpaid administrator can reopen subscription checkout after a reload", async ({ page, context }) => {
  await billingSession(context, { gateways: ["flutterwave"] });
  await page.goto("/subscription");
  await expect(page.getByRole("button", { name: "Continue to payment", exact: true })).toBeEnabled();
  await page.reload();
  await expect(page.getByLabel("Payment provider")).toHaveValue("flutterwave");
  await expect(page.getByRole("button", { name: "Continue to payment", exact: true })).toBeEnabled();
});

test("an existing unpaid administrator is returned to billing after signing in", async ({ page, context }) => {
  await billingSession(context, { registration: true, gateways: ["flutterwave"] });
  await page.goto("/login");
  await page.getByLabel("Email Address", { exact: true }).fill("grace@example.org");
  await page.getByLabel("Password", { exact: true }).fill("LongUniquePassword!27");
  await verifyBotForm(page);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page).toHaveURL(/\/subscription$/);
  await expect(page.getByLabel("Payment provider")).toHaveValue("flutterwave");
  await expect(page.getByRole("button", { name: "Continue to payment", exact: true })).toBeEnabled();
});

test("an interrupted pending checkout retries verification and recovers without another payment", async ({ page, context }) => {
  await billingSession(context, {
    checkoutUrl: "https://checkout.flutterwave.com/recovery-fixture",
    verificationSequence: ["pending", "error", "success"],
  });
  await context.route("https://checkout.flutterwave.com/**", route => route.fulfill({ body: "Pending payment" }));
  await page.goto("/subscription");
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Continue to payment", exact: true }).click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL("https://checkout.flutterwave.com/recovery-fixture");
  await expect(page.getByText("Waiting for Flutterwave to confirm your payment.", { exact: true })).toBeVisible();
  await popup.close();
  await page.bringToFront();
  await expect(page.getByText(/Connection interrupted/)).toBeVisible({ timeout: 12000 });
  await expect(page.getByRole("link", { name: "Back to workspace", exact: true })).toHaveCount(0);
  await expect(page).toHaveURL(/\/home$/, { timeout: 25000 });
  const calls = await page.evaluate(() => (window as unknown as { billingCalls: { path: string }[] }).billingCalls);
  expect(calls.filter(c => c.path.endsWith("/billing/checkout"))).toHaveLength(1);
  expect(calls.filter(c => c.path.endsWith("/billing/verify")).length).toBeGreaterThanOrEqual(3);
});

test("the verified return closes the second tab and wakes the original tab into home", async ({ page, context }) => {
  const state = await billingSession(context, {
    checkoutUrl: "https://checkout.flutterwave.com/success-fixture", sharedPaymentState: true,
  });
  await context.route("https://checkout.flutterwave.com/**", route => route.fulfill({ body: "Pending payment" }));
  await page.goto("/subscription");
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Continue to payment", exact: true }).click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL("https://checkout.flutterwave.com/success-fixture");
  await expect(page.getByText("Waiting for Flutterwave to confirm your payment.", { exact: true })).toBeVisible();
  state.completePayment();
  await popup.goto(`http://127.0.0.1:3107/subscription?tx_ref=${reference}&payment_window=1&status=successful`);
  await expect(page).toHaveURL(/\/home$/, { timeout: 4000 });
  await expect.poll(() => popup.isClosed()).toBe(true);
});

test("a pending return survives reload and keeps checking without another callback", async ({ page, context }) => {
  await billingSession(context, { verificationSequence: ["pending", "success"] });
  await page.goto(`/subscription?tx_ref=${reference}&status=pending`);
  await expect(page.getByText("Waiting for Flutterwave to confirm your payment.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/home$/, { timeout: 15000 });
  const calls = await page.evaluate(() => (window as unknown as { billingCalls: { path: string }[] }).billingCalls);
  expect(calls.filter(c => c.path.endsWith("/billing/checkout"))).toHaveLength(0);
});

test("resuming an open pending checkout reuses its window without navigating it from the parent", async ({ page, context }) => {
  await billingSession(context, {
    pending: true, checkoutUrl: "https://checkout.flutterwave.com/resume-fixture", verificationSequence: ["pending"],
  });
  const errors: string[] = [];
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await context.route("https://checkout.flutterwave.com/**", route => route.fulfill({ body: "Pending payment" }));
  await page.goto("/subscription");
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Resume secure checkout", exact: true }).click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL("https://checkout.flutterwave.com/resume-fixture");
  await page.bringToFront();
  await page.getByRole("button", { name: "Resume secure checkout", exact: true }).click();
  await expect(page.getByRole("button", { name: "Resume secure checkout", exact: true })).toBeEnabled();
  expect(context.pages()).toHaveLength(2);
  expect(popup.isClosed()).toBe(false);
  expect(errors.some(message => message.includes("Unsafe attempt"))).toBe(false);
});

test("an existing active plan and a success query parameter cannot confirm a pending upgrade", async ({ page, context }) => {
  await billingSession(context, { active: true, verificationSequence: ["pending"] });
  await page.goto(`/subscription?reference=${reference}&status=successful`);
  await expect(page.getByText("Waiting for Flutterwave to confirm your payment.", { exact: true })).toBeVisible();
  await page.evaluate(reference => {
    localStorage.setItem("belivrhq:subscription-payment-sync", JSON.stringify({ churchId: "c", reference, status: "success", active: true }));
    window.dispatchEvent(new StorageEvent("storage", { key: "belivrhq:subscription-payment-sync", newValue: JSON.stringify({ churchId: "c", reference, status: "success", active: true }) }));
  }, reference);
  await expect(page).toHaveURL(/\/subscription$/);
  await expect(page.getByRole("link", { name: "Back to workspace", exact: true })).toHaveCount(0);
  await expect(page.getByText("Payment verified. Your subscription is active.", { exact: true })).toHaveCount(0);
});

test("blocked pop-ups do not create a payment attempt", async ({ page, context }) => {
  await billingSession(context);
  await context.addInitScript(() => { window.open = () => null; });
  await page.goto("/subscription");
  await page.getByRole("button", { name: "Continue to payment", exact: true }).click();
  await expect(page.getByText(/Allow pop-ups for BelivrHQ/)).toBeVisible();
  const calls = await page.evaluate(() => (window as unknown as { billingCalls: { path: string }[] }).billingCalls);
  expect(calls.filter(c => c.path.endsWith("/billing/checkout"))).toHaveLength(0);
});

test("gateway return is verified server-side before entering the dashboard", async ({
  page,
  context,
}) => {
  await billingSession(context);
  await page.goto(`/subscription?reference=${reference}&status=success`);
  await expect(page).toHaveURL(/\/home$/);
  const calls = await page.evaluate(
    () =>
      (window as unknown as { billingCalls: { path: string; body: unknown }[] })
        .billingCalls,
  );
  expect(calls.filter((c) => c.path.endsWith("/billing/verify"))).toEqual([
    { path: "/api/backend/billing/verify", body: { reference } },
  ]);
});
test("checkout shows a recoverable error without losing the account", async ({
  page,
  context,
}) => {
  await billingSession(context);
  await page.goto("/subscription");
  await page.getByRole("button", { name: "Choose Network", exact: true }).click();
  await page.getByLabel("Billing period").selectOption("annual");
  await expect(page.getByText("USD 432", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Continue to payment", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("unavailable");
  await expect(
    page.getByRole("button", { name: "Continue to payment", exact: true }),
  ).toBeEnabled();
});
test("pending checkout is automatically checked after returning without a callback", async ({
  page,
  context,
}) => {
  await billingSession(context, { pending: true });
  await page.goto("/subscription");
  await expect(page).toHaveURL(/\/home$/);
});
test("unconfigured platform gateway never offers payment", async ({
  page,
  context,
}) => {
  await billingSession(context, { gateways: [] });
  await page.goto("/subscription");
  await expect(page.getByText(/Checkout is being configured/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue to payment", exact: true }),
  ).toBeDisabled();
});
test("non-billing roles cannot initialize checkout", async ({
  page,
  context,
}) => {
  await billingSession(context, { grants: [] });
  await page.goto("/subscription");
  await expect(
    page.getByText(/Your church administrator manages the BelivrHQ subscription/),
  ).toContainText("church administrator manages");
  await expect(
    page.getByRole("button", { name: "Continue to payment", exact: true }),
  ).toHaveCount(0);
});
for (const route of [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
])
  test(`mobile ${route} has no overflow and retains navigation`, async ({
    page,
    context,
  }) => {
    await publicSession(context);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("link", { name: "← Back to BelivrHQ", exact: true }),
    ).toHaveAttribute("href", "/");
    if (route === "/login")
      await expect(
        page.getByText("Quick sign-in (seeded accounts)", { exact: true }),
      ).toHaveCount(0);
  });
test("auth desktop design preview", async ({ page, context }) => {
  await publicSession(context);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/register");
  await expect(page.getByLabel("Church Name", { exact: true })).toBeVisible();
  await expect(
    page.locator('[aria-label="Illustration of a connected church workspace"]'),
  ).toHaveCSS("opacity", "1");
  await expect(
    page.getByRole("heading", { level: 1 }).locator("../.."),
  ).toHaveCSS("opacity", "1");
  await page.screenshot({
    path: "/tmp/belivrhq-auth-registration-desktop.png",
    fullPage: true,
  });
  await page.goto("/login");
  await expect(page.getByLabel("Email Address", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1 }).locator("../.."),
  ).toHaveCSS("opacity", "1");
  await page.screenshot({
    path: "/tmp/belivrhq-auth-login-desktop.png",
    fullPage: true,
  });
});

test("password recovery sends the email and gives a non-enumerating confirmation", async ({
  page,
  context,
}) => {
  await publicSession(context);
  let body: unknown;
  await page.route("**/api/backend/auth/forgot-password", (route) => {
    body = route.request().postDataJSON();
    return route.fulfill({ json: { success: true, data: { success: true } } });
  });
  await page.goto("/forgot-password");
  await page
    .getByLabel("Email Address", { exact: true })
    .fill("recover@example.org");
  await verifyBotForm(page);
  await page
    .getByRole("button", { name: "Send reset link", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Check your email", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/If an account exists/)).toBeVisible();
  expect(body).toEqual({ email: "recover@example.org", altcha: expect.any(String), website: "" });
});
test("reset password preserves the recovery token in memory and removes it from the URL", async ({
  page,
  context,
}) => {
  await publicSession(context);
  let body: unknown;
  await page.route("**/api/backend/auth/reset-password", (route) => {
    body = route.request().postDataJSON();
    return route.fulfill({ json: { success: true, data: { success: true } } });
  });
  await page.goto("/reset-password?token_hash=test-recovery-token");
  await expect(page).toHaveURL(/\/reset-password$/);
  await page
    .getByLabel("New Password", { exact: true })
    .fill("LongNewPassword!29");
  await page
    .getByLabel("Confirm Password", { exact: true })
    .fill("LongNewPassword!29");
  await verifyBotForm(page);
  await page
    .getByRole("button", { name: "Save new password", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Password Reset Complete", exact: true }),
  ).toBeVisible();
  expect(body).toEqual({
    token: "test-recovery-token",
    altcha: expect.any(String), website: "",
    newPassword: "LongNewPassword!29",
  });
});
test("redesigned sign-in retains the authenticator and recovery-code flow", async ({
  page,
  context,
}) => {
  await publicSession(context);
  await page.route("**/api/backend/auth/login", (route) =>
    route.fulfill({
      json: {
        success: true,
        data: {
          requiresTwoFactor: true,
          twoFactorMethod: "authenticator",
          challengeToken: "test-challenge",
          userId: "u",
          twoFactorEmail: "admin@example.org",
        },
      },
    }),
  );
  await page.goto("/login");
  await page
    .getByLabel("Email Address", { exact: true })
    .fill("admin@example.org");
  await page
    .getByLabel("Password", { exact: true })
    .fill("LongUniquePassword!29");
  await verifyBotForm(page);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Verify Your Identity", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Verification Code", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Use a recovery code", exact: true })
    .click();
  await expect(page.getByLabel("Recovery Code", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(() =>
      JSON.stringify({ ...localStorage, ...sessionStorage }),
    ),
  ).not.toContain("test-challenge");
});

test("cancelled checkout keeps the account available for another attempt", async ({
  page,
  context,
}) => {
  await billingSession(context);
  await page.goto("/subscription?status=cancelled");
  await expect(
    page.getByRole("status").filter({ hasText: "Payment was cancelled" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue to payment", exact: true }),
  ).toBeEnabled();
});

test("old dashboard bookmarks redirect to home with their query", async ({ request }) => {
  const response = await request.get("/dashboard?from=bookmark", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(new URL(response.headers().location).pathname).toBe("/home");
  expect(new URL(response.headers().location).search).toBe("?from=bookmark");
});
