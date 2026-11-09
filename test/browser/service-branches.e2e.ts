import { expect, test, type BrowserContext } from "@playwright/test";

async function fixture(context: BrowserContext, hq: boolean, branchId: string | null = "branch-a", editing = false) {
  await context.route("https://embed.tawk.to/**", (route) => route.fulfill({ body: "" }));
  await context.addCookies([{ name: "belivrhq_token", value: "service-branch-fixture", url: "http://127.0.0.1:3107" }]);
  await context.addInitScript(({ hq, branchId, editing }) => {
    const original = window.fetch.bind(window);
    const writes: Record<string, unknown>[] = [];
    (window as unknown as { serviceWrites: Record<string, unknown>[] }).serviceWrites = writes;
    window.fetch = async (input, options) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.origin);
      if (!url.pathname.startsWith("/api/")) return original(input, options);
      if (url.pathname === "/api/session") return Response.json({ hasSession: true });
      let data: unknown = { data: [], total: 0, meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
      if (url.pathname.endsWith("/profiles/me")) data = {
        profileId: "p", userId: "u", churchId: "c", branchId, role: [hq ? "church_admin" : "branch_pastor"], status: "active", isAdminHq: hq, firstName: "Admin", lastName: "Test",
        branch: branchId ? { branchId, name: "West Branch" } : undefined,
        church: { churchId: "c", name: "Grace Church" }, planFeatures: ["attendance"],
        permissions: ["attendance:services:read", "attendance:services:create", "attendance:services:update", "branches:read"],
      };
      else if (url.pathname.endsWith("/branches")) data = { data: [{ branchId: "branch-a", name: "West Branch" }, { branchId: "branch-b", name: "East Branch" }], total: 2 };
      else if (url.pathname.endsWith("/services") && options?.method === "POST") {
        const payload = JSON.parse(String(options.body));
        writes.push(payload);
        data = { ...payload, serviceId: "new-service", churchId: "c" };
      }
      else if (url.pathname.endsWith("/services") && editing) data = { data: [{ serviceId: "existing-service", name: "Sunday Service", branchId: hq ? "branch-b" : branchId, category: "adult", isActive: true }], total: 1, meta: { total: 1, page: 1, limit: 20, totalPages: 1 } };
      else if (url.pathname.endsWith("/services/existing-service") && options?.method === "PATCH") {
        const payload = JSON.parse(String(options.body));
        writes.push(payload);
        data = { ...payload, serviceId: "existing-service", churchId: "c" };
      }
      return Response.json({ success: true, data });
    };
  }, { hq, branchId, editing });
}

test("HQ selects the creation branch independently of the table filter", async ({ page, context }) => {
  await fixture(context, true);
  await page.goto("/attendance/services");
  await page.getByRole("button", { name: "Add Service", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("combobox", { name: "Branch" })).toContainText("West Branch");
  await dialog.getByRole("combobox", { name: "Branch" }).click();
  await page.getByRole("option", { name: "East Branch", exact: true }).click();
  await dialog.getByLabel("Name", { exact: false }).fill("Sunday Service");
  await dialog.getByRole("button", { name: "Create Service", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { serviceWrites: unknown[] }).serviceWrites)).toEqual([expect.objectContaining({ name: "Sunday Service", branchId: "branch-b" })]);
});

test("branch-scoped creation shows and sends only the assigned branch", async ({ page, context }) => {
  await fixture(context, false);
  await page.goto("/attendance/services");
  await page.getByRole("button", { name: "Add Service", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Branch", { exact: false })).toHaveValue("West Branch");
  await expect(dialog.getByLabel("Branch", { exact: false })).toHaveAttribute("readonly", "");
  await dialog.getByLabel("Name", { exact: false }).fill("Evening Service");
  await dialog.getByRole("button", { name: "Create Service", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { serviceWrites: unknown[] }).serviceWrites)).toEqual([expect.objectContaining({ branchId: "branch-a" })]);
});

test("HQ must choose a branch when none is assigned", async ({ page, context }) => {
  await fixture(context, true, null);
  await page.goto("/attendance/services");
  await page.getByRole("button", { name: "Add Service", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name", { exact: false }).fill("Sunday Service");
  await dialog.getByRole("button", { name: "Create Service", exact: true }).click();
  await expect(dialog.getByText("Select an available branch.", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { serviceWrites: unknown[] }).serviceWrites)).toEqual([]);
});

for (const changeBranch of [true, false]) test(`HQ editing prefills the service branch and saves branch changes=${changeBranch}`, async ({ page, context }) => {
  await fixture(context, true, "branch-a", true);
  await page.goto("/attendance/services");
  await page.getByRole("button", { name: "More options", exact: true }).first().click();
  await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("combobox", { name: "Branch" })).toContainText("East Branch");
  if (changeBranch) {
    await dialog.getByRole("combobox", { name: "Branch" }).click();
    await page.getByRole("option", { name: "West Branch", exact: true }).click();
  }
  await dialog.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const writes = await page.evaluate(() => (window as unknown as { serviceWrites: Record<string, unknown>[] }).serviceWrites);
  expect(writes).toHaveLength(1);
  if (changeBranch) expect(writes[0].branchId).toBe("branch-a");
  else expect(writes[0]).not.toHaveProperty("branchId");
});

test("branch-scoped editing keeps the branch read-only", async ({ page, context }) => {
  await fixture(context, false, "branch-a", true);
  await page.goto("/attendance/services");
  await page.getByRole("button", { name: "More options", exact: true }).first().click();
  await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Branch", { exact: false })).toHaveValue("West Branch");
  await expect(dialog.getByLabel("Branch", { exact: false })).toHaveAttribute("readonly", "");
  await dialog.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const writes = await page.evaluate(() => (window as unknown as { serviceWrites: Record<string, unknown>[] }).serviceWrites);
  expect(writes).toHaveLength(1);
  expect(writes[0]).not.toHaveProperty("branchId");
});
