import { test, expect, type BrowserContext } from "@playwright/test";
async function fixture(
  context: BrowserContext,
  role = "church_admin",
  plan = "essentials",
) {
  // Keep billing checks independent of the external support widget/network.
  await context.route("https://embed.tawk.to/**", (route) =>
    route.fulfill({ contentType: "application/javascript", body: "" }),
  );
  await context.addCookies([
    {
      name: "churchos_token",
      value: "billing-fixture",
      url: "http://127.0.0.1:3107",
    },
  ]);
  await context.addInitScript(
    ({ role, plan }) => {
      const native = window.fetch.bind(window);
      const calls: { path: string; body: unknown }[] = [];
      (window as unknown as { billingCalls: typeof calls }).billingCalls =
        calls;
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
      let scheduled: string | null = null;
      window.fetch = async (input, options) => {
        const path = new URL(
          input instanceof Request ? input.url : String(input),
          location.origin,
        ).pathname;
        if (!path.startsWith("/api/")) return native(input, options);
        if (path === "/api/session")
          return new Response(JSON.stringify({ hasSession: true }));
        const body = options?.body ? JSON.parse(String(options.body)) : {};
        let data: unknown = [];
        if (path.endsWith("/profiles/me"))
          data = {
            profileId: "p",
            userId: "u",
            churchId: "c",
            role: [role],
            firstName: "Grace",
            lastName: "Admin",
            status: "active",
            isAdminHq: true,
            permissions:
              role === "church_admin" ? ["billing:read", "billing:update"] : [],
            planFeatures: [],
          };
        else if (path.includes("/billing/")) {
          calls.push({ path, body });
          if (path.endsWith("/quote"))
            data = {
              intent: "upgrade",
              amount: 5000,
              currency: "NGN",
              quoteId: "COSQ_" + "b".repeat(32),
              expiresAt: new Date(Date.now() + 900000).toISOString(),
              effectiveAt: new Date().toISOString(),
              renewBy: "2027-01-19T00:00:00Z",
              credit: 5000,
            };
          else if (path.endsWith("/checkout"))
            data = {
              authorizationUrl: "https://checkout.flutterwave.com/fixture",
              reference: "COSUB_" + "a".repeat(32),
            };
          else {
            if (path.endsWith("/schedule")) scheduled = body.plan || null;
            data = {
              subscription: {
                plan,
                cycle: "monthly",
                paid_until: "2027-01-19T00:00:00Z",
                scheduled_plan: scheduled,
                scheduled_cycle: scheduled ? "monthly" : null,
              },
              active: true,
              catalog,
              limits: catalog.find((p) => p.id === plan)!.limits,
              usage: {
                members: 87,
                staff: 1,
                locations: 1,
                pendingInvitations: 0,
              },
              features: [],
              gateways: ["flutterwave"],
              gatewayCurrencies: { flutterwave: ["NGN"] },
              latestPayment: null,
              payments: [],
            };
          }
        }
        return new Response(JSON.stringify({ success: true, data }), {
          headers: { "Content-Type": "application/json" },
        });
      };
    },
    { role, plan },
  );
}
test("church administrator sees allowances and reviews an upgrade before trusted checkout", async ({
  page,
  context,
}) => {
  await fixture(context);
  await context.route("https://checkout.flutterwave.com/**", (r) =>
    r.fulfill({ body: "Mock secure checkout" }),
  );
  await page.goto("/subscription");
  await expect(
    page.getByRole("heading", { name: "Plan & Billing" }),
  ).toBeVisible();
  await expect(
    page.getByRole("progressbar", { name: "members allowance" }),
  ).toHaveAttribute("aria-valuenow", "87");
  await expect(page.getByText("87 / 100", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Manage plan", exact: true }).click();
  await page
    .getByRole("button", { name: "Choose Community", exact: true })
    .click();
  await expect(page.getByText("NGN 5,000 due", { exact: true })).toBeVisible();
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Continue to payment", exact: true }).click();
  await expect(await popupPromise).toHaveURL("https://checkout.flutterwave.com/fixture");
  await expect(page).toHaveURL(/\/subscription$/);
});
test("ordinary staff cannot see billing screens and do not request billing data", async ({
  page,
  context,
}) => {
  await fixture(context, "secretary");
  await page.goto("/subscription");
  await expect(
    page.getByRole("heading", { name: "Access denied" }),
  ).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => (window as unknown as { billingCalls: unknown[] }).billingCalls,
    ),
  ).toEqual([]);
});
test("downgrade shows retention warning and schedules without initiating a charge", async ({
  page,
  context,
}) => {
  await fixture(context, "church_admin", "network");
  await page.goto("/subscription");
  await page.getByRole("button", { name: "Manage plan", exact: true }).click();
  await page
    .getByRole("button", { name: "Choose Community", exact: true })
    .click();
  await expect(page.getByText(/Records will be retained/)).toBeVisible();
  await page
    .getByRole("button", { name: "Schedule downgrade", exact: true })
    .click();
  await expect(page.getByText(/Next renewal: community/)).toBeVisible();
  const calls = await page.evaluate(
    () =>
      (window as unknown as { billingCalls: { path: string }[] }).billingCalls,
  );
  expect(calls.some((c) => c.path.endsWith("/schedule"))).toBe(true);
  expect(calls.some((c) => c.path.endsWith("/checkout"))).toBe(false);
});

test("administrator billing fits a phone screen", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture(context);
  await page.goto("/subscription");
  await expect(page.getByText("87 / 100", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/churchos-billing-mobile.png",
    fullPage: true,
  });
});
