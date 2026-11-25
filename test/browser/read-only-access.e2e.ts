import { expect, test, type BrowserContext } from "@playwright/test";

test.use({ serviceWorkers: "block" });
test.beforeEach(async ({ context }) => {
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return url.origin === "http://127.0.0.1:3107" ? route.continue() : route.abort();
  });
});


test("login has no seeded-account dropdown or prefilled credentials", async ({ page }) => {
  let loginRequests = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname.endsWith("/auth/login")) loginRequests++;
  });
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Sign In", exact: true })).toBeVisible();
  await expect(page.getByLabel("Quick sign-in (seeded accounts)")).toHaveCount(0);
  await expect(page.locator("#dev-account")).toHaveCount(0);
  await expect(page.getByLabel("Email Address")).toHaveValue("");
  await expect(page.locator('input[type="password"]')).toHaveValue("");
  expect(loginRequests).toBe(0);
});

async function installReadOnlySession(context: BrowserContext, grants: string[], hq = false) {
  await context.addCookies([{ name: "belivrhq_token", value: "readonly-test", url: "http://127.0.0.1:3107" }]);
  await context.addInitScript(({ grants, hq }) => {
    const original = window.fetch.bind(window);
    const calls: string[] = [];
    (window as unknown as { auditCalls: string[] }).auditCalls = calls;
    const asset = { id: "asset-a", churchId: "church-a", branchId: "branch-a", name: "Read-only Asset", assetTag: "TEST-001", condition: "good", status: "active", salvageValue: 0, depreciationMethod: "straight_line", currentValue: 100, createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z" };
    const form = { id: "form-a", churchId: "church-a", title: "Read-only Form", fields: [], status: "published", isTemplate: false, isPublic: false, submissionCount: 0, submissionLimit: 0, createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z" };
    const user = { profileId: "profile-b", userId: "user-b", churchId: "church-a", branchId: "branch-a", role: ["secretary"], isAdminHq: false, firstName: "Other", lastName: "User", status: "active", effectivePermissions: [], mfaEnabled: false, createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z" };
    window.fetch = async (input, options) => {
      const path = new URL(input instanceof Request ? input.url : String(input), location.origin).pathname;
      if (!path.startsWith("/api/")) return original(input, options);
      calls.push(`${options?.method ?? "GET"} ${path}`);
      if (path === "/api/session") return new Response(JSON.stringify({ hasSession: true }));
      let data: unknown = { data: [], total: 0, meta: { total: 0, page: 1, limit: 20, totalPages: 1 } };
      if (path.endsWith("/auth/session")) data = { userId: "user-a", email: "test@example.com" };
      else if (path.endsWith("/attendance-sessions")) data={data:[],meta:{total:0,page:1,limit:20,totalPages:0}};
      else if (path.endsWith("/profiles/me")) data = { profileId: "profile-a", userId: "user-a", churchId: "church-a", branchId: "branch-a", role: ["custom_readonly"], status: "active", isAdminHq: hq, firstName: "Read", lastName: "Only", permissions: grants, planFeatures: ["giving","assets","forms","tickets","events","staff_roles","custom_roles"], branch: { branchId: "branch-a", name: "Branch A" } };
      else if (path.endsWith("/events/event-a/tiers")) data = [{ id: "tier-a", name: "Standard", price: 1000, capacity: 100, ticketsSold: 0, isActive: true }];
      else if (path.endsWith("/events")) data = { data: [{ eventId: "event-a", title: "Paid Event", isFree: false, startDate: "2030-10-01T10:00:00Z", recurrence: "one_time", type: "conference" }], total: 1 };
      else if (path.endsWith("/profiles/profile-b")) data = user;
      else if (path.endsWith("/forms/form-a")) data = form;
      else if (path.endsWith("/services/service-a")) data = { serviceId: "service-a", name: "Read-only Service", isActive: true, category: "adult" };
      else if (path.endsWith("/forms")) data = { data: [form], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } };
      else if (path.endsWith("/giving/dashboard")) data = { monthTotal: 1234, monthCount: 2, allTimeTotal: 4567, count: 8, trend: [] };
      else if (path.endsWith("/assets")) data = { data: [asset], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } };
      else if (path.endsWith("/assets/stats")) data = { count: 1, totalPurchasePrice: 100, totalCurrentValue: 100 };
      else if (path.endsWith("/assets/asset-a")) data = asset;
      else if (path.endsWith("/qr")) data = { qrData: "test" };
      else if (path.endsWith("/depreciation/summary")) data = { assetId: "asset-a", purchasePrice: 100, currentValue: 100, totalDepreciation: 0, entries: [] };
      else if (path.endsWith("/branches")) data = { data: [{ branchId: "branch-a", name: "Branch A" }] };
      else if (path.endsWith("/unread-count")) data = { count: 0 };
      return new Response(JSON.stringify({ success: true, data }), { headers: { "Content-Type": "application/json" } });
    };
  }, { grants, hq });
}

for (const width of [320, 390]) test(`mobile workspace logo and saved light/dark switch at ${width}px`, async ({ page, context }) => {
  await page.setViewportSize({ width, height: 844 });
  await context.addInitScript(() => {
    if (!localStorage.getItem("theme")) localStorage.setItem("theme", "light");
  });
  await installReadOnlySession(context, ["giving:dashboard:read", "branches:read"]);
  await page.goto("/giving/overview");
  const header = page.locator("header");
  const logo = header.getByRole("img", { name: "BelivrHQ", exact: true });
  await expect(header.getByRole("link", { name: "BelivrHQ home", exact: true })).toBeVisible();
  await expect(logo).toBeVisible();
  await expect.poll(() => logo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  const darkSwitch = header.getByRole("button", { name: "Switch to dark mode", exact: true });
  await expect(darkSwitch).toBeEnabled();
  const target = await darkSwitch.boundingBox();
  expect(target?.width).toBeGreaterThanOrEqual(44);
  expect(target?.height).toBeGreaterThanOrEqual(44);
  await darkSwitch.click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(header.getByRole("button", { name: "Switch to light mode", exact: true })).toBeVisible();
  await expect(logo).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await header.getByRole("button", { name: "Switch to light mode", exact: true }).press("Enter");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(header.getByRole("button", { name: "Switch to dark mode", exact: true })).toBeHidden();
  await expect(page.getByRole("button", { name: "Toggle theme", exact: true })).toBeVisible();
});

for (const hq of [false, true]) test(`dashboard-only giving works without transaction or write grants (HQ=${hq})`, async ({ page, context }) => {
  await installReadOnlySession(context, ["giving:dashboard:read", "branches:read"], hq);
  await page.goto("/giving/overview");
  await expect(page.getByText("₦1,234", { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Record (cash|gift)/i })).toHaveCount(0);
  await expect(page.getByText("Recent Gifts", { exact: true })).toHaveCount(0);
  for (const href of ["/giving/donations", "/giving/funds", "/giving/schedules", "/giving/statements", "/insights/analytics/giving"])
    await expect(page.locator(`a[href="${href}"]`)).toHaveCount(0);
  const calls = await page.evaluate(() => (window as unknown as { auditCalls: string[] }).auditCalls);
  expect(calls.some((call) => call.includes("/giving/dashboard"))).toBe(true);
  expect(calls.some((call) => call.includes("/giving/transactions"))).toBe(false);
  expect(calls.some((call) => call.startsWith("POST ") || call.startsWith("PATCH ") || call.startsWith("DELETE "))).toBe(false);
});

test("asset list and details remain readable without maintenance, loans or write grants", async ({ page, context }) => {
  await installReadOnlySession(context, ["assets:list:read", "branches:read"]);
  await page.goto("/operations/assets");
  await expect(page.getByRole("heading", { name: "Everything we hold in trust.", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Read-only Asset/ }).click();
  await expect(page.getByRole("heading", { name: "Asset Details", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Maintenance", exact: true })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Loans", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Generate.*QR/ })).toHaveCount(0);
  const calls = await page.evaluate(() => (window as unknown as { auditCalls: string[] }).auditCalls);
  expect(calls.some((call) => /\/maintenance|\/loans|\/assets\/categories/.test(call))).toBe(false);
});

for (const giving of [false, true]) test(`service details load with independently authorized giving (giving=${giving})`, async ({ page, context }) => {
  await installReadOnlySession(context, ["attendance:services:read", ...(giving ? ["giving:records:read"] : [])]);
  await page.goto("/gatherings/attendance/services/service-a");
  await expect(page.getByRole("heading", { name: "Read-only Service", exact: true, level: 1 })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Overview", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "People", exact: true }).click();
  await expect(page.getByRole("tab", { name: "People", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "People counted by name", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "What this service raised", exact: true })).toHaveCount(giving ? 1 : 0);
  await expect(page.getByRole("button", { name: /Archive/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Open the desk", exact: true })).toHaveCount(0);
  const calls = await page.evaluate(() => (window as unknown as { auditCalls: string[] }).auditCalls);
  expect(calls.some((call) => call.includes("/attendance/by-service/service-a"))).toBe(true);
  expect(calls.some((call) => call.includes("/giving/transactions"))).toBe(giving);
  expect(calls.every((call) => call.startsWith("GET "))).toBe(true);
});


test("granular form readers can fill a published form without form management grants", async ({ page, context }) => {
  await installReadOnlySession(context, ["forms:list:read"]);
  await page.goto("/library/forms/form-a/fill");
  await expect(page.getByRole("heading", { name: "Read-only Form", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send answer", exact: true })).toBeVisible();
  await expect(page.getByText("You don't have access to forms.", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Submissions", exact: true })).toHaveCount(0);
});

test("submission-only readers can open submissions without an unrelated form-list grant", async ({ page, context }) => {
  await installReadOnlySession(context, ["forms:submissions:read"]);
  await page.goto("/library/forms/submissions");
  await expect(page.getByRole("heading", { name: "Every answer, one inbox.", exact: true })).toBeVisible();
  await expect(page.getByText("Form directory access is required", { exact: true })).toHaveCount(0);
  await page.getByRole("combobox", { name: "Form picker" }).click();
  await page.getByRole("option", { name: "Read-only Form", exact: true }).click();
  await expect(page.getByRole("region", { name: "Read-only Form submissions register", exact: true })).toBeVisible();
  await expect(page.getByText("You do not have permission to view submissions", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Approve", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "All Forms", exact: true })).toHaveCount(0);
});

for (const action of ["create", "update", "delete"] as const) test(`ticket tier ${action} grant does not expose unrelated write actions`, async ({ page, context }) => {
  await installReadOnlySession(context, ["events:tickets:read", `events:tickets:${action}`, "events:list:read"]);
  await page.goto("/gatherings/events/tiers?event=event-a");
  await expect(page.getByRole("heading", { name: "Pricing and capacity, decided kindly.", exact: true })).toBeVisible();
  await expect(page.getByText("Standard", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "New tier", exact: true })).toHaveCount(action === "create" ? 1 : 0);
  await expect(page.getByRole("button", { name: "Edit Standard", exact: true })).toHaveCount(action === "update" ? 1 : 0);
  await expect(page.getByRole("button", { name: "Delete Standard", exact: true })).toHaveCount(action === "delete" ? 1 : 0);
  const calls = await page.evaluate(() => (window as unknown as { auditCalls: string[] }).auditCalls);
  expect(calls.every((call) => call.startsWith("GET "))).toBe(true);
});

test("read-only user administrators can view accounts without edit controls", async ({ page, context }) => {
  await installReadOnlySession(context, ["users:read", "profiles:read", "branches:read"]);
  await page.goto("/admin/team/profile-b");
  await expect(page.getByText("Account Information", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit", exact: true })).toHaveCount(0);
  await page.getByRole("tab", { name: /Role.*Permissions/ }).click();
  await expect(page.getByRole("switch")).toBeDisabled();
  await expect(page.getByRole("button", { name: /Save/ })).toHaveCount(0);
});

test("asset editors may archive without permanent-delete permission", async ({ page, context }) => {
  await installReadOnlySession(context, ["assets:list:read", "assets:list:update", "branches:read"]);
  await page.goto("/operations/assets");
  await expect(page.getByRole("button", { name: "Archive asset", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Archive asset", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
