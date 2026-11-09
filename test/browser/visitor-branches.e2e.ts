import { expect, test, type BrowserContext } from "@playwright/test";

async function fixture(context: BrowserContext, hq: boolean) {
  await context.route("https://embed.tawk.to/**", (route) => route.fulfill({ body: "" }));
  await context.addCookies([{ name: "belivrhq_token", value: "visitor-branch-fixture", url: "http://127.0.0.1:3107" }]);
  await context.addInitScript(({ hq }) => {
    const original = window.fetch.bind(window);
    const writes: Record<string, unknown>[] = [];
    (window as unknown as { visitorWrites: Record<string, unknown>[] }).visitorWrites = writes;
    const visitor = { id: "visitor-a", churchId: "c", firstName: "Amina", lastName: "Okafor", branchId: hq ? "branch-b" : "branch-a", branchName: hq ? "East Branch" : "West Branch", followUpStatus: "new", firstVisitDate: "2026-10-23", createdAt: "2026-10-23T10:00:00Z", updatedAt: "2026-10-23T10:00:00Z" };
    window.fetch = async (input, options) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.origin);
      if (!url.pathname.startsWith("/api/")) return original(input, options);
      if (url.pathname === "/api/session") return Response.json({ hasSession: true });
      let data: unknown = { data: [], total: 0, meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
      if (url.pathname.endsWith("/profiles/me")) data = {
        profileId: "p", userId: "u", churchId: "c", branchId: "branch-a", role: [hq ? "church_admin" : "secretary"], status: "active", isAdminHq: hq, firstName: "Admin", lastName: "Test",
        branch: { branchId: "branch-a", name: "West Branch" }, church: { churchId: "c", name: "Grace Church" }, planFeatures: ["visitors"],
        permissions: ["visitors:list:read", "visitors:list:update", "visitors:new:create", "branches:read", "profiles:read"],
      };
      else if (url.pathname.endsWith("/branches")) data = { data: [{ branchId: "branch-a", name: "West Branch" }, { branchId: "branch-b", name: "East Branch" }], total: 2 };
      else if ((url.pathname.endsWith("/visitors") && options?.method === "POST") || (url.pathname.endsWith("/visitors/visitor-a") && options?.method === "PATCH")) {
        const payload = JSON.parse(String(options.body));
        writes.push(payload);
        data = { ...visitor, ...payload };
      }
      else if (url.pathname.endsWith("/visitors/visitor-a")) data = visitor;
      else if (url.pathname.endsWith("/visitors")) data = { data: [visitor], total: 1, meta: { total: 1, page: 1, limit: 15, totalPages: 1 } };
      return Response.json({ success: true, data });
    };
  }, { hq });
}

for (const hq of [true, false]) for (const editing of [true, false]) test(`visitor branch form HQ=${hq} editing=${editing}`, async ({ page, context }) => {
  await fixture(context, hq);
  await page.goto("/visitors");
  if (editing) {
    await page.getByRole("button", { name: /^Manage / }).first().click();
    await page.getByRole("menuitem", { name: "Edit Visitor", exact: true }).click();
  } else await page.getByRole("button", { name: "Quick Add", exact: true }).click();
  const dialog = page.getByRole("dialog");
  if (hq) {
    await expect(dialog.getByRole("combobox", { name: "Branch" })).toContainText(editing ? "East Branch" : "West Branch");
    await dialog.getByRole("combobox", { name: "Branch" }).click();
    await page.getByRole("option", { name: editing ? "West Branch" : "East Branch", exact: true }).click();
  } else {
    await expect(dialog.getByLabel("Branch", { exact: false })).toHaveValue("West Branch");
    await expect(dialog.getByLabel("Branch", { exact: false })).toHaveAttribute("readonly", "");
  }
  if (!editing) await dialog.getByLabel("First Name", { exact: false }).fill("Ada");
  await dialog.getByRole("button", { name: editing ? "Save Changes" : "Register Visitor", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const writes = await page.evaluate(() => (window as unknown as { visitorWrites: Record<string, unknown>[] }).visitorWrites);
  expect(writes).toHaveLength(1);
  if (hq) expect(writes[0].branchId).toBe(editing ? "branch-a" : "branch-b");
  else if (!editing) expect(writes[0].branchId).toBe("branch-a");
  else expect(writes[0]).not.toHaveProperty("branchId");
});

for (const hq of [true, false]) test(`full-page visitor registration branch HQ=${hq}`, async ({ page, context }) => {
  await fixture(context, hq);
  await page.goto("/visitors/new");
  if (hq) {
    await expect(page.getByRole("combobox", { name: "Branch" })).toContainText("West Branch");
    await page.getByRole("combobox", { name: "Branch" }).click();
    await page.getByRole("option", { name: "East Branch", exact: true }).click();
  } else {
    await expect(page.getByLabel("Branch", { exact: false })).toHaveValue("West Branch");
    await expect(page.getByLabel("Branch", { exact: false })).toHaveAttribute("readonly", "");
  }
  await page.getByLabel("First Name", { exact: false }).fill("Ada");
  await page.getByRole("button", { name: "Register Visitor", exact: true }).click();
  await expect(page).toHaveURL(/\/visitors\/visitor-a$/);
  expect(await page.evaluate(() => (window as unknown as { visitorWrites: Record<string, unknown>[] }).visitorWrites)).toEqual([expect.objectContaining({ branchId: hq ? "branch-b" : "branch-a" })]);
});
