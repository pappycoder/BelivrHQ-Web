import { test, expect, type BrowserContext } from "@playwright/test";
import { workspaceFixture } from "../fixtures/workspace-redesign";
import { mockBotChallenges } from "../fixtures/bot-protection";

const reference = "COSUB_" + "a".repeat(32);
async function fixture(
  context: BrowserContext,
  options: {
    active?: boolean;
    pending?: boolean;
    noGateway?: boolean;
    denied?: boolean;
    review?: boolean;
  } = {},
) {
  await workspaceFixture(context);
  await mockBotChallenges(context);
  let applied = false;
  let closed = false;
  const calls: { path: string; body?: Record<string, unknown> }[] = [];
  const catalog = [
    {
      id: "essentials",
      name: "Essentials",
      monthly: 10,
      annual: 108,
      limits: { members: 100, staff: 2, locations: 1 },
    },
    {
      id: "community",
      name: "Community",
      monthly: 20,
      annual: 216,
      limits: { members: 300, staff: 5, locations: 1 },
    },
    {
      id: "network",
      name: "Network",
      monthly: 40,
      annual: 432,
      limits: { members: 1500, staff: 15, locations: 3 },
    },
  ];
  const status = () => ({
    baseCurrency: "USD",
    gatewayCurrencies: { flutterwave: ["USD", "NGN"] },
    catalog,
    accessReview: options.review ?? false,
    active: applied || (options.active ?? true),
    subscription: {
      plan: "community",
      cycle: "monthly",
      paid_until:
        options.active === false && !applied ? null : "2026-12-09T00:00:00Z",
    },
    limits: { members: 300, staff: 5, locations: 1 },
    features: ["forms", "email", "media"],
    usage: { members: 87, staff: 3, locations: 1, pendingInvitations: 1 },
    gateways: options.noGateway ? [] : ["flutterwave"],
    latestPayment:
      options.pending && !applied && !closed
        ? {
            reference,
            gateway: "flutterwave",
            plan: "network",
            cycle: "annual",
            amount: 432,
            currency: "USD",
          }
        : null,
    payments: Array.from({ length: 12 }, (_, i) => ({
      reference: `COSUB_${String(i).padStart(32, "0")}`,
      plan: "community",
      cycle: "monthly",
      amount: i === 0 ? 15000 : 20,
      currency: i === 0 ? "NGN" : "USD",
      status: "success",
      intent: "renewal",
      application_status: "applied",
      created_at: "2026-11-01T09:00:00Z",
    })),
  });
  await context.route("**/api/backend/profiles/me", (route) =>
    route.fulfill({
      json: {
        success: true,
        data: {
          profileId: "staff",
          userId: "staff",
          churchId: "church",
          firstName: "Grace",
          lastName: "Adeyemi",
          email: "grace@example.test",
          phone: "+2348012345678",
          createdAt: "2026-01-01T00:00:00Z",
          status: "active",
          role: [options.denied ? "secretary" : "church_admin"],
          isAdminHq: true,
          church: { name: "Grace Church" },
          planFeatures: [],
          permissions: options.denied
            ? ["billing:read"]
            : ["billing:read", "billing:update"],
          twoFactorEnabled: false,
        },
      },
    }),
  );
  await context.route("**/api/backend/profiles/me/2fa/factors", (route) =>
    route.fulfill({ json: { success: true, data: [] } }),
  );
  await context.route("**/api/backend/pricing/subscriptions**", (route) => {
    const currency =
      new URL(route.request().url()).searchParams.get("currency") || "USD";
    return route.fulfill({
      json: {
        success: true,
        data: {
          currency,
          rateUpdatedAt: "2026-11-09T00:00:00Z",
          plans: catalog.map((plan) => ({
            ...plan,
            monthly: currency === "NGN" ? plan.monthly * 1500 : plan.monthly,
            annual: currency === "NGN" ? plan.annual * 1500 : plan.annual,
          })),
        },
      },
    });
  });
  await context.route("**/api/backend/billing/**", (route) => {
    const path = new URL(route.request().url()).pathname.replace(
      "/api/backend",
      "",
    );
    const body = route.request().postDataJSON() as
      Record<string, unknown> | undefined;
    calls.push({ path, body });
    let data: unknown = status();
    if (path.endsWith("/checkout/close")) {
      closed = true;
      data = status();
    } else if (path.endsWith("/quote"))
      data = {
        quoteId: "COSQ_" + "b".repeat(32),
        currency: body?.currency || "USD",
        amount: 20,
        intent: "renewal",
        expiresAt: new Date(Date.now() + 900000).toISOString(),
        renewBy: "2026-12-09T00:00:00Z",
      };
    else if (path.endsWith("/verify"))
      data = {
        ...status(),
        verification: {
          reference: body?.reference,
          status: applied ? "success" : "pending",
          application_status: applied ? "applied" : "pending",
        },
      };
    return route.fulfill({ json: { success: true, data } });
  });
  return {
    calls,
    apply: () => {
      applied = true;
    },
  };
}

for (const width of [1440, 320]) {
  test(`profile and security have workspace headings at ${width}px`, async ({
    page,
    context,
  }, info) => {
    await fixture(context);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/settings/profile");
    await expect(
      page.getByRole("heading", { name: "My profile", level: 1, exact: true }),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText("Grace Adeyemi", { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`profile-${width}.png`),
      fullPage: true,
    });
    await page.goto("/settings/security");
    await expect(
      page.getByRole("heading", { name: "Security", level: 1, exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`security-${width}.png`),
      fullPage: true,
    });
  });
  test(`subscription redesign has plans, exact history and no sign-out at ${width}px`, async ({
    page,
    context,
  }, info) => {
    await fixture(context);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/subscription");
    await expect(
      page.getByRole("heading", { name: "Plan & Billing", level: 1 }),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole("button", { name: "Sign out", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("progressbar", { name: "members allowance" }),
    ).toHaveAttribute("aria-valuenow", "87");
    const table = page.getByRole("table", {
      name: "Subscription payments",
      exact: true,
    });
    await expect(
      table.getByRole("cell", { name: "NGN 15,000", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(
      page.getByText("Showing", { exact: false }).filter({ hasText: "11–12" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Manage plan", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "Manage plan", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Choose Network", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Choose Network", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page
      .getByLabel("Billing period", { exact: true })
      .selectOption("annual");
    await page
      .getByRole("region", { name: "Payment review" })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: info.outputPath(`subscription-review-${width}.png`),
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: info.outputPath(`subscription-${width}.png`),
    });
  });
}

test("pending payment remains recoverable and only server application returns to home", async ({
  page,
  context,
}) => {
  const state = await fixture(context, { pending: true });
  await page.goto(`/subscription?status=successful&reference=${reference}`);
  await expect(
    page.getByText("Waiting for Flutterwave to confirm your payment.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/subscription$/);
  await expect(
    page.getByRole("button", { name: "Resume secure checkout", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Choose Essentials", exact: true }),
  ).toBeEnabled();
  state.apply();
  await page
    .getByRole("button", { name: "Check my payment", exact: true })
    .click();
  await expect(page).toHaveURL(/\/home$/, { timeout: 15000 });
  expect(state.calls.filter((call) => call.path.endsWith("/checkout"))).toEqual(
    [],
  );
});

test("unconfigured checkout and non-administrator states have no sign-out button", async ({
  page,
  context,
}) => {
  await fixture(context, { active: false, noGateway: true });
  await page.goto("/subscription");
  await expect(
    page.getByText("Checkout is being configured. Contact ChurchOS.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue to payment", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toHaveCount(0);
});

test("non-billing members get a useful contact state without billing requests or sign-out", async ({
  page,
  context,
}) => {
  const state = await fixture(context, { denied: true });
  await page.goto("/subscription");
  await expect(
    page.getByRole("heading", {
      name: "Contact your administrator",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toHaveCount(0);
  expect(state.calls).toEqual([]);
});

for (const width of [320, 1440]) {
  test(`Manage plan reveals and focuses the comparison at ${width}px`, async ({
    context,
    page,
  }) => {
    const { calls } = await fixture(context);
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/subscription");
    const trigger = page.getByRole("button", {
      name: "Manage plan",
      exact: true,
    });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.click();
    const comparison = page.getByRole("region", {
      name: "Manage plan",
      exact: true,
    });
    await expect(comparison).toBeInViewport();
    await expect(comparison).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await page
      .getByRole("button", { name: "Choose Network", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Choose Network", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page
      .getByRole("button", { name: "Close comparison", exact: true })
      .click();
    await expect(comparison).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(comparison).toBeFocused();
    expect(
      calls.some(
        (call) =>
          call.path.endsWith("/checkout") || call.path.endsWith("/schedule"),
      ),
    ).toBe(false);
  });
}

test("Manage plan navigates to an already-visible pending comparison without pretending to close it", async ({
  context,
  page,
}) => {
  await fixture(context, { pending: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/subscription");
  const trigger = page.getByRole("button", {
    name: "Manage plan",
    exact: true,
  });
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await trigger.click();
  const comparison = page.getByRole("region", {
    name: "Manage plan",
    exact: true,
  });
  await expect(comparison).toBeInViewport();
  await expect(comparison).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Close comparison", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Choose Network", exact: true }),
  ).toBeEnabled();
});

for (const width of [320, 1440]) {
  test(`pending checkout does not lock plan or billing-period comparisons at ${width}px`, async ({
    context,
    page,
  }) => {
    const { calls } = await fixture(context, { pending: true });
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/subscription");
    const period = page.getByRole("combobox", {
      name: "Billing period",
      exact: true,
    });
    await expect(period).toBeEnabled();
    await expect(period).toHaveValue("annual");
    const network = page.getByRole("article").filter({
      has: page.getByRole("heading", { name: "Network", exact: true }),
    });
    const annualPrice = await network.locator("p.font-display").innerText();
    await period.selectOption("monthly");
    await expect(period).toHaveValue("monthly");
    await expect(network).toContainText("per month");
    expect(await network.locator("p.font-display").innerText()).not.toBe(
      annualPrice,
    );
    await page
      .getByRole("button", { name: "Choose Essentials", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Choose Essentials", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("button", { name: "Schedule downgrade", exact: true }),
    ).toHaveCount(0);
    const review = page.getByRole("region", {
      name: "Payment review",
      exact: true,
    });
    await expect(review).toContainText(/network/i);
    await expect(review).toContainText("Annual billing");
    await expect(review).toContainText("USD 432");
    await expect(review).toContainText(
      "keeps its original plan, period and amount",
    );
    expect(
      calls.some(
        (call) =>
          call.path.endsWith("/checkout") ||
          call.path.endsWith("/schedule") ||
          call.path.endsWith("/quote"),
      ),
    ).toBe(false);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
  });
}

test("resuming a pending checkout uses its saved terms after browsing a different billing period", async ({
  context,
  page,
}) => {
  await fixture(context, { pending: true });
  const bodies: unknown[] = [];
  await page.route("**/api/backend/billing/checkout", (route) => {
    bodies.push(route.request().postDataJSON());
    return route.fulfill({
      json: {
        success: true,
        data: {
          authorizationUrl: "https://checkout.flutterwave.com/secure",
          reference,
        },
      },
    });
  });
  await context.route("https://checkout.flutterwave.com/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<p>Mock checkout</p>" }),
  );
  await page.goto("/subscription");
  await page
    .getByRole("combobox", { name: "Billing period", exact: true })
    .selectOption("monthly");
  await page
    .getByRole("button", { name: "Choose Essentials", exact: true })
    .click();
  const popup = page.waitForEvent("popup");
  await page
    .getByRole("button", { name: "Resume secure checkout", exact: true })
    .click();
  const checkout = await popup;
  await expect.poll(() => bodies.length).toBe(1);
  expect(bodies[0]).toEqual({
    plan: "network",
    cycle: "annual",
    gateway: "flutterwave",
    currency: "USD",
  });
  await checkout.close();
});

for (const width of [390, 1440]) {
  test(`closes pending checkout before changing paid terms at ${width}px`, async ({
    context,
    page,
  }) => {
    const { calls } = await fixture(context, { pending: true });
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/subscription");
    await page
      .getByRole("button", {
        name: "Close checkout and change plan",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("button", { name: "Resume secure checkout", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Checkout closed. Choose your plan and billing period.", {
        exact: false,
      }),
    ).toBeVisible();
    expect(
      calls.find((call) => call.path.endsWith("/checkout/close"))?.body,
    ).toEqual({ reference });
    expect(calls.some((call) => call.path.endsWith("/checkout"))).toBe(false);
  });
}
test("explains a payment access hold in the billing design", async ({
  context,
  page,
}) => {
  await fixture(context, { active: false, review: true });
  await page.goto("/subscription");
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "partial refund or an open dispute" }),
  ).toContainText("Other paid periods remain available");
});
