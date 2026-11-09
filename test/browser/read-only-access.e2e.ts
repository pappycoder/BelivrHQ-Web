import { expect, test, type BrowserContext } from "@playwright/test";

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

for (const hq of [false, true]) test(`dashboard-only giving works without transaction or write grants (HQ=${hq})`, async ({ page, context }) => {
  await installReadOnlySession(context, ["giving:dashboard:read", "branches:read"], hq);
  await page.goto("/giving");
  await expect(page.getByText("1,234", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Record Cash", exact: true })).toHaveCount(0);
  await expect(page.getByText("Recent Gifts", { exact: true })).toHaveCount(0);
  const calls = await page.evaluate(() => (window as unknown as { auditCalls: string[] }).auditCalls);
  expect(calls.some((call) => call.includes("/giving/dashboard"))).toBe(true);
  expect(calls.some((call) => call.includes("/giving/transactions"))).toBe(false);
  expect(calls.some((call) => call.startsWith("POST ") || call.startsWith("PATCH ") || call.startsWith("DELETE "))).toBe(false);
});

test("asset list and details remain readable without maintenance, loans or write grants", async ({ page, context }) => {
  await installReadOnlySession(context, ["assets:list:read", "branches:read"]);
  await page.goto("/assets");
  await expect(page.getByRole("link", { name: "All Assets", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "View Read-only Asset", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Asset Details" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Maintenance", exact: true })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Loans", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Generate.*QR/ })).toHaveCount(0);
  const calls = await page.evaluate(() => (window as unknown as { auditCalls: string[] }).auditCalls);
  expect(calls.some((call) => /\/maintenance|\/loans|\/assets\/categories/.test(call))).toBe(false);
});

for (const giving of [false, true]) test(`service details load with independently authorized giving (giving=${giving})`, async ({ page, context }) => {
  await installReadOnlySession(context, ["attendance:services:read", ...(giving ? ["giving:records:read"] : [])]);
  await page.goto("/attendance/services/service-a");
  await expect(page.getByRole("heading", { name: "Read-only Service", exact: true })).toBeVisible();
  await expect(page.getByText("Attendance Breakdown", { exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Giving", exact: true })).toHaveCount(giving ? 1 : 0);
  if (giving) {
    await page.getByRole("tab", {name:"Giving",exact:true}).click();
    await expect(page.getByText("Giving Breakdown", {exact:true})).toBeVisible();
    await expect(page.getByRole("combobox", {name:"Giving currency"})).toBeVisible();
  }
  await expect(page.getByRole("button", { name: "Archive", exact: true })).toHaveCount(0);
  const calls = await page.evaluate(() => (window as unknown as { auditCalls: string[] }).auditCalls);
  expect(calls.some((call) => call.includes("/attendance/by-service/service-a"))).toBe(true);
  expect(calls.some((call) => call.includes("/giving/transactions"))).toBe(giving);
});


test("granular form readers can fill a published form without form management grants", async ({ page, context }) => {
  await installReadOnlySession(context, ["forms:list:read"]);
  await page.goto("/forms/form-a/fill");
  await expect(page.getByRole("heading", { name: "Read-only Form", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit", exact: true })).toBeVisible();
  await expect(page.getByText("You don't have access to forms.", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Submissions", exact: true })).toHaveCount(0);
});

test("submission-only readers can open submissions without an unrelated form-list grant", async ({ page, context }) => {
  await installReadOnlySession(context, ["forms:submissions:read"]);
  await page.goto("/forms/submissions");
  await expect(page.getByRole("heading", { name: "Submissions", exact: true })).toBeVisible();
  await expect(page.getByText("You do not have permission to view submissions", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Approve", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "All Forms", exact: true })).toHaveCount(0);
});

test("ticket editors see ticket management without event-create permission", async ({ page, context }) => {
  await installReadOnlySession(context, ["events:tickets:read", "events:tickets:update", "events:list:read"]);
  await page.goto("/events/management");
  await expect(page.getByRole("tab", { name: "Ticket Types", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Create Type|Create Ticket Type/ })).toHaveCount(0);
});

test("read-only user administrators can view accounts without edit controls", async ({ page, context }) => {
  await installReadOnlySession(context, ["users:read", "profiles:read", "branches:read"]);
  await page.goto("/admin/users/profile-b");
  await expect(page.getByText("Account Information", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit", exact: true })).toHaveCount(0);
  await page.getByRole("tab", { name: /Role.*Permissions/ }).click();
  await expect(page.getByRole("switch")).toBeDisabled();
  await expect(page.getByRole("button", { name: /Save/ })).toHaveCount(0);
});

test("asset editors may archive without permanent-delete permission", async ({ page, context }) => {
  await installReadOnlySession(context, ["assets:list:read", "assets:list:update", "branches:read"]);
  await page.goto("/assets");
  await expect(page.getByRole("button", { name: "Archive", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Archive", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
