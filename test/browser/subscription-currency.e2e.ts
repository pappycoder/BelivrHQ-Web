import { test, expect, type BrowserContext } from "@playwright/test";

async function fixture(
  context: BrowserContext,
  authenticated = false,
  failFx = false,
  usdEnabled = true,
) {
  const checkouts: Record<string, unknown>[] = [];
  await context.exposeBinding(
    "captureCurrencyCheckout",
    (_source, body: Record<string, unknown>) => {
      checkouts.push(body);
    },
  );
  if (authenticated)
    await context.addCookies([
      {
        name: "belivrhq_token",
        value: "currency-test",
        url: "http://127.0.0.1:3107",
      },
    ]);
  await context.addInitScript(
    ({ authenticated, failFx, usdEnabled }) => {
      const original = window.fetch.bind(window);
      const calls: { path: string; body: Record<string, unknown> }[] = [];
      Object.assign(window, { currencyCalls: calls });
      const basePlans = [
        { id: "essentials", monthly: 10, annual: 108 },
        { id: "community", monthly: 20, annual: 216 },
        { id: "network", monthly: 40, annual: 432 },
      ];
      const rate = (currency: string) =>
        currency === "NGN" ? 1500.111 : currency === "EUR" ? 0.89 : 1;
      window.fetch = async (input, options) => {
        const url = new URL(
          input instanceof Request ? input.url : String(input),
          location.origin,
        );
        const path = url.pathname;
        if (!path.startsWith("/api/")) return original(input, options);
        if (path === "/api/session")
          return Response.json({ hasSession: authenticated });
        const body = options?.body ? JSON.parse(String(options.body)) : {};
        calls.push({ path, body });
        let data: unknown = [];
        if (path.endsWith("/pricing/subscriptions")) {
          const currency = url.searchParams.get("currency") || "USD";
          if (failFx && currency !== "USD")
            return Response.json(
              {
                success: false,
                error: { message: "Currency conversion unavailable." },
              },
              { status: 503 },
            );
          data = {
            currency,
            rateUpdatedAt: new Date().toISOString(),
            plans: basePlans.map((p) => ({
              ...p,
              monthly: Math.ceil(p.monthly * rate(currency)),
              annual: Math.ceil(p.annual * rate(currency)),
            })),
          };
        } else if (path.endsWith("/auth/session"))
          data = { userId: "u", email: "grace@example.test" };
        else if (path.endsWith("/profiles/me"))
          data = {
            profileId: "p",
            userId: "u",
            churchId: "c",
            role: ["church_admin"],
            status: "active",
            firstName: "Grace",
            lastName: "Admin",
            permissions: ["billing:read", "billing:update"],
          };
        else if (path.endsWith("/billing/subscription"))
          data = {
            catalog: basePlans,
            gatewayCurrencies: {
              flutterwave: usdEnabled ? ["NGN", "USD"] : ["NGN"],
            },
            gateways: ["flutterwave"],
            active: false,
            subscription: {
              plan: "essentials",
              cycle: "monthly",
              paid_until: null,
            },
            latestPayment: null,
            limits: { members: 100, staff: 2, locations: 1 },
            usage: {
              members: 25,
              staff: 1,
              locations: 1,
              pendingInvitations: 0,
            },
            payments: [
              {
                reference: "legacy-naira-payment",
                plan: "essentials",
                cycle: "monthly",
                amount: 10000,
                currency: "NGN",
                status: "success",
                application_status: "applied",
                created_at: "2026-10-01T00:00:00Z",
              },
            ],
          };
        else if (path.endsWith("/billing/quote"))
          data = {
            quoteId: "BHQQUOTE_" + "b".repeat(32),
            currency: body.currency,
            amount: Math.ceil(10 * rate(body.currency)),
            intent: "renewal",
            expiresAt: new Date(Date.now() + 900000).toISOString(),
            renewBy: "2027-01-19T00:00:00Z",
            exchangeRate: rate(body.currency),
          };
        else if (path.endsWith("/billing/verify")) return Response.json({ success: false, error: { message: "Payment pending" } }, { status: 503 });
        else if (path.endsWith("/billing/checkout")) {
          await (
            window as unknown as {
              captureCurrencyCheckout: (body: unknown) => Promise<void>;
            }
          ).captureCurrencyCheckout(body);
          data = {
            reference: "BHQSUB_" + "a".repeat(32),
            authorizationUrl: "https://checkout.flutterwave.com/currency-fixture",
          };
        }
        return Response.json({ success: true, data });
      };
    },
    { authenticated, failFx, usdEnabled },
  );
  return { checkouts };
}

test("marketing converts whole totals and registration retains the chosen currency", async ({
  page,
  context,
}) => {
  await fixture(context);
  await page.goto("/#pricing");
  await page
    .getByLabel("Subscription currency", { exact: true })
    .selectOption("NGN");
  const card = page
    .getByRole("article")
    .filter({
      has: page.getByRole("heading", { name: "Essentials", exact: true }),
    });
  await expect(card.getByText("NGN 15,002", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Rates by ExchangeRate-API" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Yearly Save 10%/ }).click();
  await expect(card.getByText("NGN 162,012", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Explore Essentials plan", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Continue to registration", exact: true })
    .click();
  await page.getByLabel("Church Name", { exact: true }).fill("Grace Church");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("First Name", { exact: true }).fill("Grace");
  await page.getByLabel("Last Name", { exact: true }).fill("Admin");
  await page
    .getByLabel("Email Address", { exact: true })
    .fill("grace@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("StrongPassword!2026");
  await page
    .getByLabel("Confirm Password", { exact: true })
    .fill("StrongPassword!2026");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByLabel("Subscription currency", { exact: true }),
  ).toHaveValue("NGN");
  await expect(page.getByRole("radio", { name: /Essentials NGN 162,012/ })).toBeChecked();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByText("NGN 162,012", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Subscription currency", { exact: true })).toHaveValue("NGN");
  await expect(page.getByRole("link", { name: "Rates by ExchangeRate-API" })).toBeVisible();
});

test("checkout submits the reviewed currency and quote; historical NGN stays NGN", async ({
  page,
  context,
}) => {
  const state = await fixture(context, true);
  await context.route("https://checkout.flutterwave.com/**", (route) =>
    route.fulfill({ body: "Mock checkout" }),
  );
  await page.goto("/subscription");
  await expect(page.getByText("USD 10 due", { exact: true })).toBeVisible();
  await expect(page.getByText("NGN 10,000", { exact: true })).toBeVisible();
  await page
    .getByLabel("Subscription currency", { exact: true })
    .selectOption("NGN");
  await expect(
    page.getByLabel("Payment currency", { exact: true }),
  ).toHaveValue("NGN");
  await expect(page.getByText("NGN 15,002 due", { exact: true })).toBeVisible();
  await expect(page.getByText("NGN 10,000", { exact: true })).toBeVisible();
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Continue to payment", exact: true }).click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL("https://checkout.flutterwave.com/currency-fixture");
  await expect(page).toHaveURL(/\/subscription$/);
  expect(state.checkouts).toEqual([
    expect.objectContaining({
      currency: "NGN",
      quoteId: "BHQQUOTE_" + "b".repeat(32),
      plan: "essentials",
    }),
  ]);
});

test("an NGN-only merchant clearly quotes NGN while displaying USD", async ({
  page,
  context,
}) => {
  const state = await fixture(context, true, false, false);
  await page.goto("/subscription");
  await expect(
    page.getByLabel("Subscription currency", { exact: true }),
  ).toHaveValue("USD");
  await expect(
    page.getByLabel("Payment currency", { exact: true }),
  ).toHaveValue("NGN");
  await expect(page.getByText("NGN 15,002 due", { exact: true })).toBeVisible();
  await expect(page.getByText(/This provider will charge NGN/)).toBeVisible();
  await context.route("https://checkout.flutterwave.com/**", (route) =>
    route.fulfill({ body: "Mock checkout" }),
  );
  const captured = page.waitForEvent("popup");
  await page
    .getByRole("button", { name: "Continue to payment", exact: true })
    .click();
  await expect(await captured).toHaveURL("https://checkout.flutterwave.com/currency-fixture");
  expect(state.checkouts[0]).toMatchObject({
    currency: "NGN",
    quoteId: "BHQQUOTE_" + "b".repeat(32),
  });
});

test("failed conversions show no invented local price and can return to USD", async ({
  page,
  context,
}) => {
  await fixture(context, false, true);
  await page.goto("/#pricing");
  await page
    .getByLabel("Subscription currency", { exact: true })
    .selectOption("NGN");
  await expect(
    page.getByText("Rate unavailable", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("Conversion unavailable. Try again or select USD."),
  ).toBeVisible();
  await page
    .getByLabel("Subscription currency", { exact: true })
    .selectOption("USD");
  const card = page
    .getByRole("article")
    .filter({
      has: page.getByRole("heading", { name: "Essentials", exact: true }),
    });
  await expect(card.getByText("USD 10", { exact: true })).toBeVisible();
});


test("converted subscription prices and payment controls fit a phone", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture(context, true);
  await page.goto('/subscription');
  await page.getByLabel('Subscription currency', { exact: true }).selectOption('NGN');
  await expect(page.getByText('NGN 15,002 due', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByLabel('Payment currency', { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/tmp/belivrhq-usd-billing-mobile.png' });
});
