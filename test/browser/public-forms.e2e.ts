import { mockBotChallenges, verifyBotForm } from "../fixtures/bot-protection";
import { expect, test } from "@playwright/test";

const form = {
  churchName: "Grace Community Church",
  churchLogoUrl: "/brand/belivrhq-logo.png",
  title: "Find your place to serve",
  description: "Share your interests and help us build a welcoming Sunday community.",
  fields: [
    { key: "name", label: "Full name", type: "text", required: true },
    { key: "email", label: "Email address", type: "email", required: true },
    { key: "teams", label: "Teams", type: "checkbox", options: ["Welcome", "Music"] },
    { key: "notes", label: "Anything else?", type: "textarea" },
  ],
};

test.beforeEach(async ({ context }) => {
  await mockBotChallenges(context);
  await context.route("**/api/session", (route) => route.fulfill({ json: { hasSession: false } }));
  await context.route("**/api/backend/forms/public/token-a/meta", (route) =>
    route.fulfill({ json: { success: true, data: form } }),
  );
});

test("public form is specific, tracks progress and submits without signing in", async ({
  page,
}) => {
  const bodies: unknown[] = [];
  await page.route("**/api/backend/forms/public/token-a/submit", (route) => {
    bodies.push(route.request().postDataJSON());
    return route.fulfill({ json: { success: true, data: { id: "response-a" } } });
  });
  await page.goto("/forms/public/token-a");
  await expect(page.getByTestId("church-form-branding").getByText(form.churchName)).toBeVisible();
  await expect(page.getByRole("heading", { name: form.title, exact: true })).toBeVisible();
  await expect(page.getByText(form.description, { exact: true })).toBeVisible();
  await expect(page.getByText("No sign-in needed", { exact: true })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Form completion" })).toHaveAttribute(
    "aria-valuenow",
    "0",
  );
  await page.getByLabel("Full name", { exact: false }).fill("Grace Adeyemi");
  await page.getByLabel("Email address", { exact: false }).fill("grace@example.test");
  await page.getByRole("checkbox", { name: "Music", exact: true }).check();
  await expect(page.getByRole("progressbar", { name: "Form completion" })).toHaveAttribute(
    "aria-valuenow",
    "3",
  );
  await page.screenshot({ path: "/tmp/belivrhq-public-form-desktop.png", fullPage: true });
  await verifyBotForm(page);
  await page.getByRole("button", { name: "Send response", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Thank you for being part of it.", exact: true }),
  ).toBeVisible();
  expect(bodies).toEqual([
    { data: { name: "Grace Adeyemi", email: "grace@example.test", teams: ["Music"], notes: "" }, altcha: expect.any(String), website: "" },
  ]);
});

test("sending failures retain answers and allow retry", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/backend/forms/public/token-a/submit", (route) => {
    calls++;
    return route.fulfill({
      status: calls === 1 ? 503 : 201,
      json:
        calls === 1
          ? { success: false, error: { message: "Please retry shortly." } }
          : { success: true, data: { id: "response-a" } },
    });
  });
  await page.goto("/forms/public/token-a");
  await page.getByLabel("Full name", { exact: false }).fill("Grace Adeyemi");
  await page.getByLabel("Email address", { exact: false }).fill("grace@example.test");
  await verifyBotForm(page);
  await page.getByRole("button", { name: "Send response", exact: true }).click();
  await expect(
    page.getByRole("alert")
      .filter({ hasText: "Service temporarily unavailable. Please try again later." })
      .first(),
  ).toBeVisible();
  await expect(page.getByLabel("Full name", { exact: false })).toHaveValue("Grace Adeyemi");
  await verifyBotForm(page);
  await page.getByRole("button", { name: "Send response", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Thank you for being part of it.", exact: true }),
  ).toBeVisible();
  expect(calls).toBe(2);
});

test("required questions prevent sending and an expired link has a useful retry state", async ({
  page,
}) => {
  let posts = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/submit")) posts++;
  });
  await page.goto("/forms/public/token-a");
  await verifyBotForm(page);
  await page.getByRole("button", { name: "Send response", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Please complete all required questions" }),
  ).toBeVisible();
  expect(posts).toBe(0);
  await page.route("**/api/backend/forms/public/token-b/meta", (route) =>
    route.fulfill({ status: 404, json: { success: false, error: { message: "Form not found" } } }),
  );
  await page.goto("/forms/public/token-b");
  await expect(
    page.getByRole("heading", { name: "We couldn’t open this form", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send response", exact: true })).toHaveCount(0);
});

for (const width of [320, 390])
  test(`public form fits ${width}px without a dashboard shell`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/forms/public/token-a");
    await expect(page.getByRole("heading", { name: form.title, exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(page.getByRole("navigation", { name: "Workspace", exact: true })).toHaveCount(0);
    if (width === 390)
      await page.screenshot({ path: "/tmp/belivrhq-public-form-mobile.png", fullPage: true });
  });

test("an expired account session cannot redirect a public form to login", async ({
  page,
  context,
}) => {
  await context.addCookies([
    { name: "belivrhq_token", value: "expired-public-fixture", url: "http://127.0.0.1:3107" },
  ]);
  await context.route("**/api/session", (route) => route.fulfill({ json: { hasSession: true } }));
  await context.route("**/api/backend/auth/session", (route) =>
    route.fulfill({ status: 401, json: { success: false, error: { message: "Expired session" } } }),
  );
  await context.route("**/api/backend/auth/refresh", (route) =>
    route.fulfill({ status: 401, json: { success: false, error: { message: "Expired session" } } }),
  );
  const refresh = page.waitForResponse((response) =>
    response.url().endsWith("/api/backend/auth/refresh"),
  );
  await page.goto("/forms/public/token-a");
  await refresh;
  await expect(page.getByRole("heading", { name: form.title, exact: true })).toBeVisible();
  await page.getByLabel("Full name", { exact: false }).fill("Grace Adeyemi");
  await expect(page).toHaveURL(/\/forms\/public\/token-a$/);
  await expect(page.getByLabel("Full name", { exact: false })).toHaveValue("Grace Adeyemi");
});

test("metadata failures can recover using the public retry action", async ({ page }) => {
  let attempts = 0;
  await page.route("**/api/backend/forms/public/token-a/meta", (route) => {
    attempts++;
    return route.fulfill({
      status: attempts === 1 ? 503 : 200,
      json:
        attempts === 1
          ? { success: false, error: { message: "Temporary error" } }
          : { success: true, data: form },
    });
  });
  await page.goto("/forms/public/token-a");
  await expect(
    page.getByRole("heading", { name: "We couldn’t open this form", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("heading", { name: form.title, exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send response", exact: true })).toBeVisible();
  expect(attempts).toBe(2);
});
