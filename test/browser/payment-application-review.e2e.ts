import { test, expect, type BrowserContext } from "@playwright/test";
async function fixture(
  context: BrowserContext,
  role = "super_admin",
  intent = "renewal",
) {
  const writes: Record<string, unknown>[] = [];
  await context.addCookies([
    {
      name: "belivrhq_token",
      value: "review-fixture",
      url: "http://127.0.0.1:3107",
    },
  ]);
  await context.route("https://embed.tawk.to/**", (route) =>
    route.fulfill({ body: "" }),
  );
  await context.route("**/api/session", (route) =>
    route.fulfill({ json: { hasSession: true } }),
  );
  const payment = {
    reference: `BHQSUB_${"a".repeat(32)}`,
    plan: "essentials",
    cycle: "monthly",
    amount: 100,
    currency: "NGN",
    intent,
    status: "success",
    application_status: "review",
    unappliedReview: true,
    created_at: "2026-11-14T00:00:00Z",
  };
  const billing = {
    baseCurrency: "USD",
    catalog: [],
    gatewayCurrencies: {},
    gateways: [],
    active: false,
    subscription: null,
    latestPayment: null,
    limits: { members: 100, staff: 2, locations: 1 },
    usage: { members: 1, staff: 1, locations: 1, pendingInvitations: 0 },
    features: [],
    payments: [payment],
  };
  await context.route("**/api/backend/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace(
      "/api/backend",
      "",
    );
    let data: unknown = [];
    if (path === "/auth/session")
      data = { userId: "user", email: "review@example.test" };
    else if (path === "/profiles/me")
      data = {
        profileId: "profile",
        userId: "user",
        churchId: "church",
        firstName: "Review",
        lastName: "Admin",
        role: [role],
        status: "active",
        isAdminHq: true,
        permissions: ["billing:read", "billing:update"],
      };
    else if (path === "/billing/subscription") data = billing;
    else if (path === "/billing/payment-application-review") {
      const body = route.request().postDataJSON();
      writes.push(body);
      payment.application_status =
        body.decision === "apply" ? "applied" : "revoked";
      payment.unappliedReview = false;
      data = billing;
    } else if (path === "/pricing/subscriptions")
      data = { currency: "USD", plans: [] };
    return route.fulfill({ json: { success: true, data } });
  });
  return writes;
}
test("super admin resolves an unapplied renewal with a reason", async ({
  page,
  context,
}) => {
  const writes = await fixture(context);
  await page.goto("/subscription");
  await page
    .getByRole("button", { name: "Resolve unapplied payment", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Resolve unapplied payment",
  });
  await expect(dialog.getByText(/does not refund money/)).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Confirm resolution" }),
  ).toBeDisabled();
  await dialog
    .getByLabel("Review reason")
    .fill("Verified late payment reviewed");
  await dialog.getByRole("button", { name: "Confirm resolution" }).click();
  await expect(dialog).toBeHidden();
  expect(writes).toEqual([
    {
      reference: `BHQSUB_${"a".repeat(32)}`,
      decision: "apply",
      reason: "Verified late payment reviewed",
    },
  ]);
  await expect(
    page.getByRole("button", {
      name: "Resolve unapplied payment",
      exact: true,
    }),
  ).toHaveCount(0);
});
test("ordinary administrators cannot see application review", async ({
  page,
  context,
}) => {
  await fixture(context, "church_admin");
  await page.goto("/subscription");
  await expect(
    page.getByText("Payment history", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Resolve unapplied payment",
      exact: true,
    }),
  ).toHaveCount(0);
});
test("stale upgrades offer revocation without applying the old price", async ({
  page,
  context,
}) => {
  const writes = await fixture(context, "super_admin", "upgrade");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/subscription");
  await page
    .getByRole("button", { name: "Resolve unapplied payment", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Resolve unapplied payment",
  });
  await expect(
    dialog.getByRole("option", { name: "Apply as a renewal" }),
  ).toHaveCount(0);
  await dialog
    .getByLabel("Review reason")
    .fill("Arrange provider refund separately");
  await dialog.getByRole("button", { name: "Confirm resolution" }).click();
  await expect(dialog).toBeHidden();
  expect(writes[0].decision).toBe("revoke");
});
