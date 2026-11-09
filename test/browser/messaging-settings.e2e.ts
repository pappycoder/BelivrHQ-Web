import { expect, test, type BrowserContext } from "@playwright/test";
import providers from "../fixtures/provider-catalog.json";

async function session(
  context: BrowserContext,
  grants: string[],
  role = "church_admin",
  settingsAccess = true,
) {
  await context.addCookies([
    {
      name: "belivrhq_token",
      value: "integration-browser-test",
      url: "http://127.0.0.1:3107",
    },
  ]);
  await context.addInitScript(
    ({ grants, role, providers, settingsAccess }) => {
      const original = window.fetch.bind(window);
      const accounts = [
        {
          id: "11111111-1111-4111-8111-111111111111",
          provider: "resend",
          label: "Church email",
          verification_status: "verified",
          verified_at: null,
          archived_at: null,
        },
        {
          id: "22222222-2222-4222-8222-222222222222",
          provider: "twilio",
          label: "Office communications",
          verification_status: "verified",
          verified_at: null,
          archived_at: null,
        },
        {
          id: "33333333-3333-4333-8333-333333333333",
          provider: "paystack",
          label: "Church payments",
          verification_status: "verified",
          verified_at: null,
          archived_at: null,
        },
      ];
      const channels: {
        channel: string;
        mode: string;
        account_id: string | null;
        settings: Record<string, string>;
        updated_at: string;
      }[] = ["email", "sms", "whatsapp", "voice", "payment"].map(channel => ({ channel, mode: "disabled", account_id: null, settings: {}, updated_at: "2026-10-01T10:00:00Z" }));
      const requests: {
        path: string;
        method: string;
        body?: Record<string, unknown>;
      }[] = [];
      Object.assign(window, { integrationRequests: requests });
      window.fetch = async (input, options) => {
        const path = new URL(
          input instanceof Request ? input.url : String(input),
          location.origin,
        ).pathname;
        if (!path.startsWith("/api/")) return original(input, options);
        if (path === "/api/session")
          return new Response(JSON.stringify({ hasSession: true }));
        const method = options?.method ?? "GET";
        const body = options?.body
          ? JSON.parse(String(options.body))
          : undefined;
        requests.push({ path, method, body });
        let data: unknown = { data: [], total: 0 };
        if (path.endsWith("/auth/session"))
          data = { userId: "test-user", email: "admin@example.org" };
        else if (path.endsWith("/profiles/me"))
          data = {
            userId: "test-user",
            profileId: "profile-a",
            churchId: "church-a",
            role: [role],
            phone: "+12345678901",
            firstName: "Staff",
            lastName: "User",
            status: "active",
            isAdminHq: true,
            planFeatures: ["giving", "email", "sms", "whatsapp", "calls"],
            permissions: [
              "church:read",
              ...(settingsAccess ? ["church_settings:update"] : []),
              "members:all:read",
              ...grants,
            ],
          };
        else if (path.endsWith("/church"))
          data = {
            churchId: "church-a",
            name: "Test church",
            country: "Nigeria",
            memberCount: 1,
            branchCount: 1,
          };
        else if (path.endsWith("/church/config")) data = { config: {} };
        else if (path.endsWith("/church/integrations"))
          data = { providers, accounts, channels };
        else if (path.endsWith("/integrations/accounts") && method === "POST") {
          const credentials = body.credentials as Record<string, string>;
          if (Object.values(credentials).includes("reject-this-key"))
            return new Response(
              JSON.stringify({
                success: false,
                error: { message: "Invalid provider key" },
              }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          const account = {
            id: "44444444-4444-4444-8444-444444444444",
            provider: body.provider,
            label: body.label,
            verification_status: "unchecked",
            verified_at: null,
            archived_at: null,
          };
          accounts.push(account);
          data = account;
        } else if (path.endsWith("/verify")) {
          const id = path.split("/").at(-2);
          const account = accounts.find((account) => account.id === id);
          if (account) account.verification_status = "verified";
          data = {
            status: "verified",
            message:
              "Provider account access verified. Confirm sender approval with a channel test.",
          };
        } else if (
          path.includes("/integrations/channels/") &&
          method === "PUT"
        ) {
          const channel = path.split("/").at(-1)!;
          const index = channels.findIndex((item) => item.channel === channel);
          const next = {
            channel,
            mode: body.mode,
            account_id: body.accountId ?? null,
            settings: body.settings ?? {},
            updated_at: new Date().toISOString(),
          };
          if (index < 0) channels.push(next);
          else channels[index] = next;
          data = { saved: true };
        } else if (path.endsWith("/test"))
          data = {
            accepted: true,
            message: "Provider accepted the test. Confirm receipt.",
          };
        else if (path.endsWith("/members/member-a"))
          data = {
            memberId: "member-a",
            firstName: "Test",
            lastName: "Member",
            phone: "+2348012345678",
            status: "active",
            memberSince: "2026-01-01T00:00:00Z",
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z",
          };
        else if (path.endsWith("/calls")) data = { accepted: true };
        else if (path.endsWith("/unread-count")) data = { count: 0 };
        else if (path.endsWith("/roles") || path.endsWith("/roles/labels"))
          data = [];
        return new Response(JSON.stringify({ success: true, data }), {
          headers: { "Content-Type": "application/json" },
        });
      };
    },
    { grants, role, providers, settingsAccess },
  );
}
async function openSettings(page: import("@playwright/test").Page) {
  await page.goto("/admin/integrations");
}

test("all external services default to disabled and cannot select platform credentials", async ({
  page,
  context,
}) => {
  await session(context, ["integrations:read", "integrations:update"]);
  await openSettings(page);
  await page.getByRole("tab", { name: "Service routing", exact: true }).click();
  for (const channel of ["email", "sms", "whatsapp", "voice", "payment"]) {
    const mode = page.locator(`#${channel}-mode`);
    await expect(mode).toHaveValue("disabled");
    await expect(mode.locator('option[value="platform"]')).toHaveCount(0);
  }
});

for (const role of ["church_admin", "super_admin"])
  test(`${role} can find integrations directly without church-settings access`, async ({
    page,
    context,
  }) => {
    await session(
      context,
      ["integrations:read", "integrations:update"],
      role,
      false,
    );
    await page.goto("/dashboard");
    await page.getByRole("navigation", { name: "Workspace areas", exact: true }).filter({ visible: true }).getByRole("link", { name: "Administration", exact: true }).click();
    const link = page
      .getByRole("navigation", { name: "Workspace", exact: true })
      .getByRole("link", { name: "Integrations", exact: true });
    await expect(link).toHaveAttribute("href", "/admin/integrations");
    await link.click();
    await expect(
      page.getByRole("heading", { name: "Provider accounts", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save provider account", exact: true }),
    ).toBeVisible();
    await page
      .locator("header")
      .getByRole("button", { name: "Account menu", exact: true })
      .click();
    await expect(
      page.getByRole("menuitem", { name: "Integrations", exact: true }),
    ).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/\/admin\/integrations$/);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Provider accounts", exact: true }),
    ).toBeVisible();
  });

test("church settings still exposes the integrations tab", async ({
  page,
  context,
}) => {
  await session(context, ["integrations:read", "integrations:update"]);
  await page.goto("/admin/settings");
  await page.getByRole("tab", { name: "Integrations", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Provider accounts", exact: true }),
  ).toBeVisible();
});

test("HQ staff without integration permissions cannot open the page or fetch credentials settings", async ({
  page,
  context,
}) => {
  await session(context, [], "usher", false);
  await page.goto("/admin/integrations");
  await expect(
    page.getByRole("heading", { name: "Provider accounts", exact: true }),
  ).toHaveCount(0);
  await expect(
    page
      .getByRole("navigation", { name: "Workspace", exact: true })
      .getByRole("link", { name: "Integrations", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Access denied", exact: true }),
  ).toBeVisible();
  await page
    .locator("header")
    .getByRole("button", { name: "Account menu", exact: true })
    .click();
  await expect(
    page.getByRole("menuitem", { name: "Integrations", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { integrationRequests: { path: string }[] }
      ).integrationRequests.some((row) =>
        row.path.includes("/church/integrations"),
      ),
    ),
  ).toBe(false);
});

test("provider forms request the correct credential fields and clear failed submissions", async ({
  page,
  context,
}) => {
  await session(context, ["integrations:read", "integrations:update"]);
  await openSettings(page);
  const section = page.locator("#provider-accounts");
  for (const provider of providers) {
    await section
      .getByLabel("Provider", { exact: true })
      .selectOption(provider.id);
    for (const field of provider.fields)
      await expect(section.locator(`#credential-${field.key}`)).toBeVisible();
  }
  await section.getByLabel("Provider", { exact: true }).selectOption("resend");
  await section.getByLabel("Account name").fill("Private email account");
  await section.getByLabel("API key", { exact: true }).fill("reject-this-key");
  await section.getByRole("button", { name: "Save provider account" }).click();
  await expect(section.getByLabel("API key", { exact: true })).toHaveValue("");
  await expect(section.getByRole("status")).toContainText(
    "Invalid provider key",
  );
  await section
    .getByLabel("API key", { exact: true })
    .fill("re_browser-private-key");
  await section.getByRole("button", { name: "Save provider account" }).click();
  await expect(section.getByLabel("API key", { exact: true })).toHaveValue("");
  await expect(
    section.getByText(/Private email account — Resend/),
  ).toBeVisible();
  const row = section.getByTestId(
    "account-44444444-4444-4444-8444-444444444444",
  );
  await row.getByRole("button", { name: "Check credentials" }).click();
  await expect(row.getByText(/Credential check: verified/)).toBeVisible();
  expect(
    await page.evaluate(() => JSON.stringify([localStorage, sessionStorage])),
  ).not.toContain("re_browser-private-key");
});

test("independent email, WhatsApp, SMS and payment selection supports shared accounts and email senders", async ({
  page,
  context,
}) => {
  await session(context, ["integrations:read", "integrations:update"]);
  await openSettings(page);
  await page.getByRole("tab", { name: "Service routing", exact: true }).click();
  const email = page.locator("#channel-email");
  await email.getByLabel("Account source").selectOption("custom");
  await email
    .getByLabel("Provider account")
    .selectOption("11111111-1111-4111-8111-111111111111");
  await email
    .getByLabel("Sender email", { exact: true })
    .fill("office@example.org");
  await email.getByLabel("Sender name", { exact: true }).fill("Church office");
  await email
    .getByLabel("Reply-to email", { exact: true })
    .fill("pastor@example.org");
  await email.getByRole("button", { name: "Save email settings" }).click();
  await expect(email.getByText("Saved mode: custom.")).toBeVisible();
  await email.getByLabel("Test email recipient").fill("test@example.org");
  await email.getByRole("button", { name: "Send test message" }).click();
  await expect(email.getByRole("status")).toContainText("Provider accepted");
  for (const channel of ["sms", "whatsapp", "voice"]) {
    const section = page.locator(`#channel-${channel}`);
    await section.getByLabel("Account source").selectOption("custom");
    await section
      .getByLabel("Provider account")
      .selectOption("22222222-2222-4222-8222-222222222222");
    await section
      .getByLabel("Provider sender number (+country code)")
      .fill(channel === "sms" ? "+12345678901" : "+12345678902");
    await section.getByRole("button", { name: /^Save/ }).click();
    await expect(section.getByText(/Saved mode: custom/)).toBeVisible();
  }
  const payments = page.locator("#channel-payment");
  await payments.getByLabel("Account source").selectOption("custom");
  await payments
    .getByLabel("Provider account")
    .selectOption("33333333-3333-4333-8333-333333333333");
  await payments
    .getByRole("button", { name: "Save payments settings" })
    .click();
  await expect(payments.getByText(/Saved mode: custom/)).toBeVisible();
  await expect(
    payments.getByRole("button", { name: "Send test message" }),
  ).toHaveCount(0);
  const requests = await page.evaluate(
    () =>
      (
        window as unknown as {
          integrationRequests: {
            path: string;
            body?: Record<string, unknown>;
          }[];
        }
      ).integrationRequests,
  );
  expect(
    requests.find((row) => row.path.endsWith("/channels/email"))?.body
      ?.settings,
  ).toEqual({
    from: "office@example.org",
    senderName: "Church office",
    replyTo: "pastor@example.org",
  });
});

test("read-only users cannot save, test, verify or archive accounts", async ({
  page,
  context,
}) => {
  await session(context, ["integrations:read"]);
  await openSettings(page);
  await expect(
    page.getByRole("heading", { name: "Provider accounts", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: /Save|Check credentials|Archive account|Send test/,
    }),
  ).toHaveCount(0);
  await expect(page.locator("#email-mode")).toBeDisabled();
});

test("missing integration permission suppresses the tab and configuration query", async ({
  page,
  context,
}) => {
  await session(context, []);
  await page.goto("/admin/settings");
  await expect(
    page.getByRole("tab", { name: "Security", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Integrations", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { integrationRequests: { path: string }[] }
      ).integrationRequests.some((row) =>
        row.path.includes("/church/integrations"),
      ),
    ),
  ).toBe(false);
});

test("live member calls require an explicit staff confirmation", async ({
  page,
  context,
}) => {
  await session(context, ["calls:create"]);
  await page.goto("/members/member-a");
  await page.getByRole("button", { name: "Call member", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "phone number on your staff profile first",
  );
  await page
    .getByRole("button", { name: "Call my phone", exact: true })
    .click();
  await expect(
    page.getByText(
      "Answer the call on your staff phone to connect to the member.",
    ),
  ).toBeVisible();
});
