import { expect, test } from "@playwright/test";
import { mockBotChallenges, verifyBotForm } from "../fixtures/bot-protection";

const path = "/forms/public/token-a/submit";
test.beforeEach(async ({ context }) => {
  await context.route("**/api/session", (route) =>
    route.fulfill({ json: { hasSession: false } }),
  );
  await context.route("https://embed.tawk.to/**", (route) =>
    route.fulfill({ body: "" }),
  );
  await context.route("**/api/backend/forms/public/token-a/meta", (route) =>
    route.fulfill({
      json: {
        success: true,
        data: {
          title: "Protected response",
          fields: [
            { key: "name", label: "Full name", type: "text", required: true },
          ],
        },
      },
    }),
  );
});

test("submission stays disabled before verification, while solving, after unchecking and after expiry", async ({
  page,
  context,
}) => {
  await mockBotChallenges(context);
  let release!: () => void;
  let requested = false;
  await page.route(
    "**/api/backend/bot-protection/challenge?*",
    async (route) => {
      requested = true;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return route.fallback();
    },
  );
  let posts = 0;
  await page.route(`**/api/backend${path}`, (route) => {
    posts++;
    return route.fulfill({ json: { success: true, data: {} } });
  });
  await page.goto("/forms/public/token-a");
  await page.getByLabel("Full name").fill("Grace");
  const submit = page.getByRole("button", {
    name: "Send response",
    exact: true,
  });
  const checkbox = page.locator("[data-bot-protection]").getByRole("checkbox");
  await expect(checkbox).toBeVisible();
  await expect(checkbox).not.toBeChecked();
  await expect(submit).toBeDisabled();
  expect(requested).toBe(false);
  await page
    .locator("form")
    .evaluate((form) =>
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      ),
    );
  await expect(page.getByLabel("Full name")).toHaveValue("Grace");
  expect(posts).toBe(0);
  await checkbox.click();
  await expect.poll(() => requested).toBe(true);
  await expect(submit).toBeDisabled();
  release();
  await page.unroute("**/api/backend/bot-protection/challenge?*");
  await expect(
    page.getByText("Browser verified.", { exact: true }),
  ).toBeVisible();
  await expect(checkbox).toBeChecked();
  await expect(submit).toBeEnabled();
  await checkbox.click();
  await expect(submit).toBeDisabled();
  await verifyBotForm(page);
  await page.locator("altcha-widget").evaluate((element) => {
    (element as HTMLElement & { reset: (state: string) => void }).reset(
      "expired",
    );
  });
  await expect(submit).toBeDisabled();
  expect(posts).toBe(0);
  await checkbox.focus();
  await page.keyboard.press("Space");
  await expect(checkbox).toBeChecked();
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(
    page.getByRole("heading", { name: "Thank you for being part of it." }),
  ).toBeVisible();
  expect(posts).toBe(1);
});

test("login and second-factor submissions each use an independently scoped proof", async ({
  page,
  context,
}) => {
  const valid = await mockBotChallenges(context);
  let secondFactor = false;
  await page.route("**/api/backend/auth/login", async (route) => {
    expect(
      await valid(route.request().postDataJSON(), "POST", "/auth/login"),
    ).toBe(true);
    return route.fulfill({
      json: {
        success: true,
        data: {
          requiresTwoFactor: true,
          twoFactorMethod: "authenticator",
          challengeToken: "fixture-challenge",
          userId: "user-a",
        },
      },
    });
  });
  await page.route("**/api/backend/auth/login/2fa", async (route) => {
    expect(
      await valid(route.request().postDataJSON(), "POST", "/auth/login/2fa"),
    ).toBe(true);
    secondFactor = true;
    return route.fulfill({
      status: 401,
      json: {
        success: false,
        error: { message: "Incorrect authenticator code" },
      },
    });
  });
  await page.goto("/login");
  await page
    .getByLabel("Email Address", { exact: true })
    .fill("grace@example.test");
  await page.getByLabel("Password", { exact: true }).fill("Password123!");
  await verifyBotForm(page);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await page.getByLabel("Verification Code", { exact: true }).fill("123456");
  await verifyBotForm(page);
  await page
    .getByRole("button", { name: "Verify & Sign In", exact: true })
    .click();
  await expect(
    page.getByText("Incorrect authenticator code", { exact: true }),
  ).toBeVisible();
  expect(secondFactor).toBe(true);
  await expect(
    page.getByLabel("Verification Code", { exact: true }),
  ).toHaveValue("123456");
});

test("a real worker proof is accepted once and retries use fresh proofs", async ({
  page,
  context,
}) => {
  const valid = await mockBotChallenges(context);
  const proofs: string[] = [];
  await page.route(`**/api/backend${path}`, async (route) => {
    const body = route.request().postDataJSON();
    expect(await valid(body, "POST", path)).toBe(true);
    proofs.push(body.altcha);
    return route.fulfill({
      status: proofs.length === 1 ? 400 : 201,
      json:
        proofs.length === 1
          ? {
              success: false,
              error: {
                code: "BOT_VERIFICATION_FAILED",
                message: "Please verify again.",
              },
            }
          : { success: true, data: { id: "saved" } },
    });
  });
  await page.goto("/forms/public/token-a");
  await page.getByLabel("Full name").fill("Grace");
  await verifyBotForm(page);
  await expect(
    page.getByText("Browser verified.", { exact: true }),
  ).toBeVisible();
  await verifyBotForm(page);
  await page
    .getByRole("button", { name: "Send response", exact: true })
    .click();
  await expect(page.getByLabel("Full name")).toHaveValue("Grace");
  await expect(
    page.getByText("Please verify again.", { exact: true }).first(),
  ).toBeVisible();
  await verifyBotForm(page);
  await page
    .getByRole("button", { name: "Send response", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Thank you for being part of it." }),
  ).toBeVisible();
  expect(proofs).toHaveLength(2);
  expect(proofs[0]).not.toBe(proofs[1]);
});

test("challenge outages block submission and offer a retry while preserving answers", async ({
  page,
  context,
}) => {
  let posts = 0;
  await mockBotChallenges(context);
  await page.route("**/api/backend/bot-protection/challenge?*", (route) =>
    route.fulfill({ status: 503, json: { error: "Unavailable" } }),
  );
  await page.route(`**/api/backend${path}`, (route) => {
    posts++;
    return route.fulfill({ json: { success: true, data: {} } });
  });
  await page.goto("/forms/public/token-a");
  await page.getByLabel("Full name").fill("Grace");
  await expect(
    page.getByRole("button", { name: "Send response", exact: true }),
  ).toBeDisabled();
  await page.locator("[data-bot-protection]").getByRole("checkbox").click();
  await expect(
    page.getByRole("button", { name: "Retry verification" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send response", exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("Full name")).toHaveValue("Grace");
  expect(posts).toBe(0);
  await page.unroute("**/api/backend/bot-protection/challenge?*");
  await page.getByRole("button", { name: "Retry verification" }).click();
  await verifyBotForm(page);
  await expect(
    page.getByText("Browser verified.", { exact: true }),
  ).toBeVisible();
  await verifyBotForm(page);
  await page
    .getByRole("button", { name: "Send response", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Thank you for being part of it." }),
  ).toBeVisible();
  expect(posts).toBe(1);
});

test("honeypots stay outside keyboard/accessibility flow and filled values reach server checks", async ({
  page,
  context,
}) => {
  await mockBotChallenges(context);
  let website: unknown;
  await page.route(`**/api/backend${path}`, (route) => {
    website = route.request().postDataJSON().website;
    return route.fulfill({
      status: 400,
      json: {
        success: false,
        error: {
          code: "BOT_VERIFICATION_FAILED",
          message: "Please verify again.",
        },
      },
    });
  });
  await page.goto("/forms/public/token-a");
  await expect(page.getByRole("textbox", { name: "Website" })).toHaveCount(0);
  await expect(page.locator("input[name=website]")).toHaveAttribute(
    "tabindex",
    "-1",
  );
  await expect(page.locator("input[name=website]")).toHaveAttribute(
    "autocomplete",
    "off",
  );
  await page.getByLabel("Full name").fill("Grace");
  await page
    .locator("input[name=website]")
    .evaluate((input: HTMLInputElement) => {
      input.value = "https://spam.test";
    });
  await verifyBotForm(page);
  await page
    .getByRole("button", { name: "Send response", exact: true })
    .click();
  await expect(
    page.getByText("Please verify again.", { exact: true }).first(),
  ).toBeVisible();
  expect(website).toBe("https://spam.test");
  await page.getByLabel("Full name").focus();
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() => document.activeElement?.getAttribute("name")),
  ).not.toBe("website");
});

test("a mobile browser completes the upper-bound challenge without horizontal overflow", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  const valid = await mockBotChallenges(context, 100000);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.route(`**/api/backend${path}`, async (route) => {
    expect(await valid(route.request().postDataJSON(), "POST", path)).toBe(
      true,
    );
    return route.fulfill({ json: { success: true, data: {} } });
  });
  await page.goto("/forms/public/token-a");
  const started = Date.now();
  await page.getByLabel("Full name").fill("Grace");
  await verifyBotForm(page);
  await expect(
    page.getByText("Browser verified.", { exact: true }),
  ).toBeVisible({ timeout: 30000 });
  expect(Date.now() - started).toBeLessThan(30000);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await verifyBotForm(page);
  await page
    .getByRole("button", { name: "Send response", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Thank you for being part of it." }),
  ).toBeVisible();
});

test("password changes preserve a proof through silent session refresh", async ({
  page,
  context,
}) => {
  const valid = await mockBotChallenges(context);
  await context.addCookies([
    { name: "churchos_token", value: "fixture", url: "http://127.0.0.1:3107" },
  ]);
  await context.route("**/api/session", (route) =>
    route.fulfill({ json: { hasSession: true } }),
  );
  let attempts = 0;
  let refreshes = 0;
  const proofs: string[] = [];
  await context.route("**/api/backend/**", async (route) => {
    const request = route.request();
    const current = new URL(request.url()).pathname.replace("/api/backend", "");
    if (current.startsWith("/bot-protection/")) return route.fallback();
    let data: unknown = {};
    if (current === "/profiles/me")
      data = {
        userId: "user-a",
        profileId: "profile-a",
        churchId: "church-a",
        firstName: "Grace",
        lastName: "Admin",
        email: "grace@example.test",
        status: "active",
        role: ["church_admin"],
        permissions: [],
        planFeatures: [],
        isAdminHq: true,
      };
    else if (current === "/auth/session")
      data = { userId: "user-a", email: "grace@example.test" };
    else if (current === "/profiles/me/2fa/factors") data = [];
    else if (current === "/auth/refresh") {
      refreshes++;
      data = { sessionEstablished: true };
    } else if (current === "/auth/password") {
      const body = request.postDataJSON();
      proofs.push(body.altcha);
      attempts++;
      if (attempts === 1)
        return route.fulfill({
          status: 401,
          json: { success: false, error: { message: "Expired session" } },
        });
      expect(await valid(body, "PUT", "/auth/password")).toBe(true);
      data = { success: true };
    }
    return route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/settings/security");
  await page
    .getByPlaceholder("••••••••••", { exact: true })
    .fill("OldPassword123!");
  await page.getByPlaceholder("A phrase, not a word").fill("NewPassword123!");
  await page.locator("input[type=password]").last().fill("NewPassword123!");
  await verifyBotForm(page);
  await page
    .getByRole("button", { name: "Update password", exact: true })
    .click();
  await expect.poll(() => attempts).toBe(2);
  expect(refreshes).toBe(1);
  expect(proofs[0]).toBeTruthy();
  expect(proofs[0]).toBe(proofs[1]);
  await expect(page).toHaveURL(/\/settings\/security$/);
});

test("staff invitations use the authenticated challenge and retain branch assignment", async ({
  page,
  context,
}) => {
  const valid = await mockBotChallenges(context);
  await context.addCookies([
    { name: "churchos_token", value: "fixture", url: "http://127.0.0.1:3107" },
  ]);
  await context.route("**/api/session", (route) =>
    route.fulfill({ json: { hasSession: true } }),
  );
  let invited = false;
  await context.route("**/api/backend/**", async (route) => {
    const current = new URL(route.request().url()).pathname.replace(
      "/api/backend",
      "",
    );
    if (current.startsWith("/bot-protection/")) {
      expect(current).toBe("/bot-protection/authenticated-challenge");
      return route.fallback();
    }
    let data: unknown = {
      data: [],
      meta: { total: 0, page: 1, totalPages: 1 },
    };
    if (current === "/profiles/me")
      data = {
        userId: "user-a",
        profileId: "profile-a",
        churchId: "church-a",
        firstName: "Grace",
        lastName: "Admin",
        status: "active",
        role: ["church_admin"],
        branchId: "branch-a",
        branch: { name: "Central" },
        isAdminHq: false,
        permissions: [
          "users:read",
          "users:create",
          "profiles:read",
          "profiles:create",
          "roles:read",
        ],
        planFeatures: ["staff_roles"],
      };
    else if (current === "/auth/session") data = { userId: "user-a" };
    else if (current === "/church/roles")
      data = {
        roles: [
          {
            roleName: "secretary",
            permissions: [],
            description: null,
            isCustomized: false,
          },
        ],
      };
    else if (current === "/church/roles/all") data = [];
    else if (current === "/profiles/invite") {
      const body = route.request().postDataJSON();
      expect(await valid(body, "POST", "/profiles/invite")).toBe(true);
      expect(body.branchId).toBe("branch-a");
      invited = true;
      data = { profileId: "invited" };
    }
    return route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/admin/team");
  await page
    .getByRole("button", { name: "Invite someone", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("First Name", { exact: true }).fill("Test");
  await dialog.getByLabel("Last Name", { exact: true }).fill("Invite");
  await dialog.getByLabel("Email", { exact: true }).fill("invite@example.test");
  await dialog.getByRole("combobox", { name: "Role", exact: true }).click();
  await page.getByRole("option", { name: "Secretary", exact: true }).click();
  await verifyBotForm(page);
  await dialog
    .getByRole("button", { name: "Send Invitation", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  expect(invited).toBe(true);
});

for (const scheduled of [false, true])
  test(`${scheduled ? "scheduled" : "immediate"} broadcasts include verified proof before queueing`, async ({
    page,
    context,
  }) => {
    const valid = await mockBotChallenges(context);
    await context.addCookies([
      {
        name: "churchos_token",
        value: "fixture",
        url: "http://127.0.0.1:3107",
      },
    ]);
    await context.route("**/api/session", (route) =>
      route.fulfill({ json: { hasSession: true } }),
    );
    let queued = false;
    await context.route("**/api/backend/**", async (route) => {
      const current = new URL(route.request().url()).pathname.replace(
        "/api/backend",
        "",
      );
      if (current.startsWith("/bot-protection/")) return route.fallback();
      let data: unknown = {
        data: [],
        meta: { total: 0, page: 1, totalPages: 1 },
      };
      if (current === "/profiles/me")
        data = {
          userId: "user-a",
          profileId: "profile-a",
          churchId: "church-a",
          firstName: "Grace",
          lastName: "Admin",
          status: "active",
          role: ["church_admin"],
          branchId: "branch-a",
          isAdminHq: false,
          permissions: [
            "broadcasts:read",
            "broadcasts:create",
            "templates:read",
          ],
          planFeatures: ["email"],
        };
      else if (current === "/auth/session") data = { userId: "user-a" };
      else if (current === "/templates")
        data = {
          data: [
            {
              templateId: "template-a",
              name: "Sunday reminder",
              channel: "email",
              status: "published",
              body: "Welcome",
            },
          ],
          meta: { total: 1 },
        };
      else if (
        current === "/broadcasts" &&
        route.request().method() === "POST"
      ) {
        const body = route.request().postDataJSON();
        expect(await valid(body, "POST", "/broadcasts")).toBe(true);
        expect(Boolean(body.scheduledAt)).toBe(scheduled);
        queued = true;
        data = { id: "broadcast-a" };
      }
      return route.fulfill({ json: { success: true, data } });
    });
    await page.goto("/connect/broadcasts");
    await page.getByRole("button", { name: /New broadcast/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByPlaceholder("November news").fill("Sunday reminder");
    await dialog.locator("select").first().selectOption("email");
    await dialog
      .locator("select")
      .filter({ has: page.locator('option[value="template-a"]') })
      .selectOption("template-a");
    if (scheduled)
      await dialog
        .locator("input[type=datetime-local]")
        .fill("2099-01-01T12:00");
    await verifyBotForm(page);
    await dialog
      .getByRole("button", {
        name: scheduled ? "Schedule broadcast" : "Send now",
        exact: true,
      })
      .click();
    await expect(dialog).toHaveCount(0);
    expect(queued).toBe(true);
  });
