import { expect, test } from "@playwright/test";

// Preserve these workflows for reactivation alongside the offline workspace.
test.skip(true, "Offline workspace access is temporarily hidden for this release.");

const profileId = "11111111-1111-4111-8111-111111111111";
const churchId = "22222222-2222-4222-8222-222222222222";
const branchId = "33333333-3333-4333-8333-333333333333";
const passphrase = "correct horse battery staple";

test.beforeEach(async ({ context }, testInfo) => {
  const member = testInfo.title.startsWith("member accounts");
  const hq = testInfo.title.startsWith("HQ");
  const singleBranch = testInfo.title.includes("single branch");
  // Deterministic API fixture: no real account or application database is contacted.
  await context.addInitScript(
    ({ profileId, churchId, branchId, member, hq, singleBranch }) => {
      const original = window.fetch.bind(window);
      Object.defineProperty(window, "__offlineNativeFetch", {
        value: original,
      });
      const members: Record<string, unknown>[] = [];
      const requests: string[] = [];
      Object.defineProperty(window, "__offlineApiCalls", { value: requests });
      window.fetch = async (input, options) => {
        const requestUrl = new URL(input instanceof Request ? input.url : String(input), location.origin);
        const path = requestUrl.pathname;
        if (!path.startsWith("/api/")) return original(input, options);
        requests.push(path);
        if (!navigator.onLine) throw new TypeError("Offline");
        let data: unknown;
        if (path === "/api/session")
          return new Response(JSON.stringify({ hasSession: true }));
        if (path.endsWith("/auth/session"))
          data = { userId: "test-user", email: "test@example.com" };
        else if (path.endsWith("/profiles/me"))
          data = {
            profileId,
            churchId,
            branchId,
            status: "active",
            firstName: "Test",
            lastName: "Secretary",
            role: [member ? "member" : "secretary"],
            isAdminHq: hq,
            planFeatures: member ? ["events"] : ["giving", "reports"],
            permissions: member
              ? [
                  "events:view",
                  "events:calendar:read",
                  "events:list:read",
                  "events:tickets:read",
                ]
              : ["offline:read"],
            branch: { branchId, name: "Lekki" },
          };
        else if (path.endsWith("/branches")) data = { data: [
          { branchId, name: "Lekki" },
          ...(!singleBranch ? [{ branchId: "44444444-4444-4444-8444-444444444444", name: "Ikeja" }] : []),
        ], total: singleBranch ? 1 : 2 };
        else if (path.endsWith("/offline/snapshot"))
          data = {
            profileId,
            churchId,
            branchId: requestUrl.searchParams.get("branchId") || branchId,
            branchName: requestUrl.searchParams.get("branchId") === branchId ? "Lekki" : "Ikeja",
            permissions: [
              "offline:read",
              "members:all:read",
              "members:new:create",
              "members:all:update",
              "forms:list:read",
            ],
            issuedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
            records: { member: members, visitor: [], form: [] },
          };
        else if (path.endsWith("/offline/push")) {
          const body = JSON.parse(String(options?.body));
          if (body.profileId !== profileId || body.churchId !== churchId)
            throw new Error("Invalid owner");
          data = body.mutations.map(
            (mutation: {
              mutationId: string;
              entityId: string;
              data: { firstName: string; lastName: string };
            }) => {
              members.push({
                id: mutation.entityId,
                first_name: mutation.data.firstName,
                last_name: mutation.data.lastName,
                updated_at: new Date().toISOString(),
                branch_id: branchId,
              });
              return {
                mutationId: mutation.mutationId,
                status: "accepted",
                version: new Date().toISOString(),
              };
            },
          );
        } else if (
          path.endsWith("/notifications") ||
          path.endsWith("/audit-logs/me")
        )
          data = { data: [], total: 0, unreadCount: 0 };
        else if (path.endsWith("/notifications/unread-count"))
          data = { count: 0 };
        else if (path.endsWith("/roles") || path.endsWith("/roles/labels"))
          data = [];
        else throw new Error(`Unexpected API call ${path}`);
        return new Response(JSON.stringify({ success: true, data }), {
          headers: { "Content-Type": "application/json" },
        });
      };
    },
    { profileId, churchId, branchId, member, hq, singleBranch },
  );
});

test("prepares, reopens offline, retains queued changes and syncs on reconnect", async ({
  page,
  context,
}) => {
  await page.goto("/offline");
  await page.getByRole("button", { name: "Load available branches" }).click();
  await expect(page.getByLabel("Branch", { exact: true })).toHaveValue(
    branchId,
  );
  await expect(page.getByLabel("Branch", { exact: true })).toBeDisabled();
  await page.getByLabel("Offline passphrase").fill(passphrase);
  await page.getByRole("button", { name: "Enable on this device" }).click();
  await expect(page.getByRole("button", { name: "Add member" })).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.getByRole("button", { name: "Add member" }).click();
  await page.getByLabel("First name", { exact: true }).fill("OfflineAda");
  await page.getByLabel("Last name", { exact: true }).fill("Obi");
  await page.getByRole("button", { name: "Save on device" }).click();
  await expect(page.getByText("OfflineAda Obi", { exact: true })).toBeVisible();
  await expect(
    page.getByText("1 changes waiting to sync or review", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Unlock this device", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("OfflineAda Obi", { exact: true })).toHaveCount(
    0,
  );
  await page
    .getByLabel("Offline passphrase")
    .fill("a different wrong passphrase");
  await page.getByRole("button", { name: "Unlock workspace" }).click();
  await expect(
    page.getByText("Unlock this device", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("OfflineAda Obi", { exact: true })).toHaveCount(
    0,
  );
  await page.getByLabel("Offline passphrase").fill(passphrase);
  await page.getByRole("button", { name: "Unlock workspace" }).click();
  await expect(page.getByText("OfflineAda Obi", { exact: true })).toBeVisible();
  await context.setOffline(false);
  await expect(
    page.getByText("All changes synced", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("OfflineAda Obi", { exact: true })).toBeVisible();
  // Exercise a real same-origin API request through the service worker too.
  await page.evaluate(async () => {
    const response = await Reflect.get(
      window,
      "__offlineNativeFetch",
    )("/api/session");
    if (!response.ok) throw new Error("API route unavailable");
    await response.json();
  });
  const urls = await page.evaluate(async () =>
    (
      await Promise.all(
        (await caches.keys()).map(async (name) =>
          (await (await caches.open(name)).keys()).map(
            (request) => request.url,
          ),
        ),
      )
    ).flat(),
  );
  expect(urls.some((url) => new URL(url).pathname.startsWith("/api/"))).toBe(
    false,
  );
  await page.evaluate(() => {
    const channel = new BroadcastChannel("belivrhq-session");
    channel.postMessage("ended");
    channel.close();
  });
  await expect(
    page.getByText("Unlock this device", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("OfflineAda Obi", { exact: true })).toHaveCount(
    0,
  );
});

test("offline shell remains available without a session and cannot enable a new device offline", async ({
  page,
  context,
}) => {
  await page.goto("/offline");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByText("Enable offline access", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Enable on this device" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Load available branches" }),
  ).toBeDisabled();
});

test("locks the prepared workspace after inactivity without polling the server", async ({
  page,
  context,
}) => {
  await page.clock.install();
  await page.goto("/offline");
  await page.getByRole("button", { name: "Load available branches" }).click();
  await page.getByLabel("Offline passphrase").fill(passphrase);
  await page.getByRole("button", { name: "Enable on this device" }).click();
  await expect(page.getByRole("button", { name: "Add member" })).toBeVisible();
  await context.setOffline(true);
  const calls = await page.evaluate(
    () => Reflect.get(window, "__offlineApiCalls").length,
  );
  await page.clock.runFor(16 * 60 * 1000);
  expect(
    await page.evaluate(() => Reflect.get(window, "__offlineApiCalls").length),
  ).toBe(calls);
  await expect(
    page.getByText("Unlock this device", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Add member" })).toHaveCount(0);
});

test("member accounts cannot open the offline workspace or see event management menus", async ({
  page,
  context,
}) => {
  await page.goto("/offline");
  await expect(
    page.getByText("Offline access unavailable", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Enable on this device" }),
  ).toHaveCount(0);
  await context.addCookies([
    {
      name: "belivrhq_token",
      value: "browser-test-only",
      url: "http://127.0.0.1:3107",
    },
  ]);
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Events", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Calendar", exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "All Events", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Registrations", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Offline workspace", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Dismiss offline banner" }),
  ).toHaveCount(0);
});

test("staff can dismiss the banner and keep the header offline shortcut", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "belivrhq_token",
      value: "browser-test-only",
      url: "http://127.0.0.1:3107",
    },
  ]);
  await page.goto("/dashboard");
  await expect(
    page.getByRole("button", { name: "Dismiss offline banner" }),
  ).toBeVisible();
  await expect(
    page
      .locator("header")
      .getByRole("link", { name: "Offline workspace", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Dismiss offline banner" }).click();
  await expect(
    page.getByRole("button", { name: "Dismiss offline banner" }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page
      .locator("header")
      .getByRole("link", { name: "Offline workspace", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Dismiss offline banner" }),
  ).toHaveCount(0);
});

test("staff offline shortcut remains visible on mobile", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.addCookies([
    {
      name: "belivrhq_token",
      value: "browser-test-only",
      url: "http://127.0.0.1:3107",
    },
  ]);
  await page.goto("/dashboard");
  await expect(
    page
      .locator("header")
      .getByRole("link", { name: "Offline workspace", exact: true }),
  ).toBeVisible();
});


test("HQ single branch is preselected and can be prepared", async ({ page }) => {
  await page.goto("/offline");
  await expect(page.getByRole("button", { name: "Enable on this device" })).toBeDisabled();
  await page.getByRole("button", { name: "Load available branches" }).click();
  const branch = page.getByLabel("Branch", { exact: true });
  await expect(branch).toBeEnabled();
  await expect(branch).toHaveValue(branchId);
  await branch.selectOption(branchId);
  await page.getByLabel("Offline passphrase").fill(passphrase);
  await page.getByRole("button", { name: "Enable on this device" }).click();
  await expect(page.getByRole("button", { name: "Add member" })).toBeVisible();
  await expect(page.getByText("Lekki", { exact: true })).toBeVisible();
});

test("HQ can select another branch and preserve selection when reloading options", async ({ page }) => {
  await page.goto("/offline");
  await page.getByRole("button", { name: "Load available branches" }).click();
  const branch = page.getByLabel("Branch", { exact: true });
  await expect(branch).toBeEnabled();
  await branch.selectOption("44444444-4444-4444-8444-444444444444");
  await page.getByRole("button", { name: "Load available branches" }).click();
  await expect(branch).toHaveValue("44444444-4444-4444-8444-444444444444");
  await page.getByLabel("Offline passphrase").fill(passphrase);
  await page.getByRole("button", { name: "Enable on this device" }).click();
  await expect(page.getByText("Ikeja", { exact: true })).toBeVisible();
});
