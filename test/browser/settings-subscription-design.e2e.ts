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
  } = {},
) {
  await workspaceFixture(context);
  await mockBotChallenges(context);
  let applied = false;
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
      options.pending && !applied
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
    if (path.endsWith("/quote"))
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
  ).toBeDisabled();
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
