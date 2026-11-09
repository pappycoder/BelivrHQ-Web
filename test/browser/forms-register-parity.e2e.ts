import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { workspaceFixture } from "../fixtures/workspace-redesign";

async function fixture(context: BrowserContext, options: { readOnly?: boolean; noSubmissions?: boolean; failStatus?: boolean; failReview?: boolean } = {}) {
  await workspaceFixture(context, { navigation: true });
  const writes: { path: string; body: Record<string, unknown> }[] = [];
  const reads: URL[] = [];
  const forms = [{ id: "form-a", title: "Volunteer application", churchId: "church", status: "draft", isPublic: true, publicToken: "public-a", fields: [{ key: "name", label: "Full name", type: "text", required: true }, { key: "email", label: "Email", type: "email" }, { key: "team", label: "Team", type: "text" }], submissionCount: 23, createdAt: "2026-11-01T09:00:00Z", updatedAt: "2026-11-01T09:00:00Z" }];
  const rows = Array.from({ length: 23 }, (_, i) => ({ id: `response-${String(i).padStart(2, "0")}`, formId: "form-a", churchId: "church", data: { name: i === 22 ? "Zebra Volunteer" : `Volunteer ${String(i).padStart(2, "0")}`, email: `person${i}@example.test`, team: i % 2 ? "Music" : "Welcome" }, status: "pending", attachments: [], submittedBy: i % 2 ? "member" : undefined, createdAt: new Date(Date.UTC(2026, 10, i + 1)).toISOString() }));
  let statusFailed = false, reviewFailed = false;
  await context.route("**/api/backend/profiles/me", route => route.fulfill({ json: { success: true, data: {
    profileId: "staff", userId: "staff", churchId: "church", firstName: "Grace", lastName: "Adeyemi", status: "active", role: ["secretary"], isAdminHq: true, church: { name: "Grace Church" }, planFeatures: ["forms"],
    permissions: ["forms:list:read", ...(!options.noSubmissions ? ["forms:submissions:read"] : []), ...(!options.readOnly ? ["forms:list:create", "forms:list:update", "forms:submissions:update"] : [])],
  } } }));
  await context.route("**/api/backend/forms**", route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname.replace("/api/backend", "");
    reads.push(url);
    if (request.method() === "PATCH") {
      const body = request.postDataJSON(); writes.push({ path, body });
      if (path === "/forms/form-a") {
        if (options.failStatus && !statusFailed) { statusFailed = true; return route.fulfill({ status: 503, json: { success: false, error: { message: "Temporary status failure" } } }); }
        Object.assign(forms[0], body);
        return route.fulfill({ json: { success: true, data: forms[0] } });
      }
      if (options.failReview && path.includes("response-01") && !reviewFailed) { reviewFailed = true; return route.fulfill({ status: 503, json: { success: false, error: { message: "Temporary review failure" } } }); }
      const row = rows.find(row => path.includes(row.id));
      if (row) Object.assign(row, body);
      return route.fulfill({ json: { success: true, data: row } });
    }
    if (path.endsWith("/submissions")) {
      const q = url.searchParams;
      let data = rows.filter(row => (!q.get("status") || row.status === q.get("status")) && (!q.get("source") || (q.get("source") === "member" ? !!row.submittedBy : !row.submittedBy)) && (!q.get("search") || JSON.stringify(row.data).toLowerCase().includes(q.get("search")!.toLowerCase())));
      const sortBy = q.get("sortBy") || "createdAt";
      data.sort((a, b) => String(a[sortBy as keyof typeof a]).localeCompare(String(b[sortBy as keyof typeof b])) * (q.get("sortOrder") === "asc" ? 1 : -1));
      const page = Number(q.get("page") || 1), limit = Number(q.get("limit") || 15), total = data.length;
      data = data.slice((page - 1) * limit, page * limit);
      return route.fulfill({ json: { success: true, data: { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } } } });
    }
    return route.fulfill({ json: { success: true, data: path === "/forms/form-a" ? forms[0] : { data: forms, meta: { total: 1, page: 1, limit: 100, totalPages: 1 } } } });
  });
  return { writes, reads };
}
async function choose(page: Page, label: string, value: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: value, exact: true }).click();
}
async function openInbox(page: Page, embedded: boolean) {
  await page.goto(embedded ? "/library/forms/form-a" : "/library/forms/submissions");
  if (!embedded) await choose(page, "Form picker", "Volunteer application");
  await expect(page.getByRole("table", { name: "Form submissions", exact: true })).toBeVisible({ timeout: 15000 });
}

for (const embedded of [false, true]) {
  test(`${embedded ? "embedded" : "main"} submissions have shared columns, filters, views, paging and confirmed row actions`, async ({ page, context }, info) => {
    const state = await fixture(context);
    await page.setViewportSize({ width: 1440, height: 1100 });
    await openInbox(page, embedded);
    const table = page.getByRole("table", { name: "Form submissions", exact: true });
    await expect(table.getByRole("columnheader", { name: "Manage", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Choose visible columns", exact: true }).click();
    await page.getByRole("textbox", { name: "Find columns" }).fill("Team");
    await page.getByRole("menuitemcheckbox", { name: "Team", exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(table.getByRole("columnheader", { name: "Team", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Read answer", exact: true }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Approve answer", exact: true }).first().click();
    expect(state.writes).toEqual([]);
    await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
    expect(state.writes).toEqual([]);
    await page.getByRole("button", { name: "Approve answer", exact: true }).first().click();
    await page.getByRole("dialog").getByRole("button", { name: "Confirm action", exact: true }).click();
    await expect.poll(() => state.writes.length).toBe(1);
    await page.getByRole("button", { name: "Reject answer", exact: true }).first().click();
    await expect(page.getByRole("button", { name: "Confirm rejection", exact: true })).toBeDisabled();
    await page.getByLabel("Rejection reason (required when rejecting)").fill("Please include the missing information.");
    await page.getByRole("button", { name: "Confirm rejection", exact: true }).click();
    await expect.poll(() => state.writes.length).toBe(2);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByPlaceholder("Search answers or reference…").fill("Zebra");
    await expect.poll(() => state.reads.some(url => url.searchParams.get("search") === "Zebra")).toBe(true);
    await expect(page.getByPlaceholder("Search answers or reference…")).toHaveValue("Zebra");
    await expect(table.locator('[data-list-column="column-0"]').getByText("Zebra Volunteer", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Clear filters", exact: true }).click();
    await choose(page, "Submission source", "Signed in");
    await choose(page, "Submission status", "Pending");
    await choose(page, "Sort submissions", "Status");
    await page.getByRole("button", { name: "Sort ascending", exact: true }).click();
    await expect.poll(() => state.reads.some(url => url.searchParams.get("source") === "member" && url.searchParams.get("sortBy") === "status" && url.searchParams.get("sortOrder") === "asc")).toBe(true);
    await page.screenshot({ path: info.outputPath(`submissions-${embedded ? "embedded" : "main"}-desktop.png`), fullPage: true });
    await page.getByRole("button", { name: "Card view", exact: true }).click();
    await expect(table).toHaveCount(0);
    await page.setViewportSize({ width: 320, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`submissions-${embedded ? "embedded" : "main"}-mobile.png`), fullPage: true });
    await page.getByRole("button", { name: "List view", exact: true }).click();
    await expect(table).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Clear filters", exact: true }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect.poll(() => state.reads.some(url => url.pathname.endsWith("/submissions") && url.searchParams.get("page") === "2")).toBe(true);
  });
}

test("form status changes confirm in cards, list and details; failure retains the choice", async ({ page, context }) => {
  const state = await fixture(context, { failStatus: true });
  await page.goto("/library/forms");
  await page.getByRole("button", { name: "Change form status", exact: true }).click();
  await choose(page, "New status", "Published");
  expect(state.writes).toEqual([]);
  await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
  expect(state.writes).toEqual([]);
  await page.getByRole("button", { name: "Change form status", exact: true }).click();
  await choose(page, "New status", "Published");
  await page.getByRole("button", { name: "Confirm status change", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("temporarily unavailable");
  await expect(page.getByRole("combobox", { name: "New status" })).toContainText("Published");
  await page.getByRole("button", { name: "Confirm status change", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(state.writes.at(-1)?.body).toEqual({ status: "published" });
  await page.getByRole("button", { name: "Table", exact: true }).click();
  await page.getByRole("button", { name: "Change form status", exact: true }).click();
  await choose(page, "New status", "Closed");
  await page.getByRole("button", { name: "Confirm status change", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/library/forms/form-a");
  await page.getByRole("button", { name: "Change form status", exact: true }).click();
  await choose(page, "New status", "Draft");
  await page.getByRole("button", { name: "Confirm status change", exact: true }).click();
  await expect.poll(() => state.writes.at(-1)?.body.status).toBe("draft");
});

test("bulk rejection requires confirmation and a reason; failed rows stay selected", async ({ page, context }) => {
  const state = await fixture(context, { failReview: true });
  await openInbox(page, true);
  await choose(page, "Sort submissions", "Reference");
  await page.getByRole("button", { name: "Sort ascending", exact: true }).click();
  const table = page.getByRole("table", { name: "Form submissions", exact: true });
  await expect(table.locator('[data-list-column="column-0"]').getByText("Volunteer 00", { exact: true })).toBeVisible();
  await table.getByRole("checkbox", { name: /Select Volunteer 00/ }).check();
  await table.getByRole("checkbox", { name: /Select Volunteer 01/ }).check();
  await page.getByRole("button", { name: "Reject selected answers", exact: true }).click();
  await expect(page.getByRole("button", { name: "Confirm action", exact: true })).toBeDisabled();
  expect(state.writes).toEqual([]);
  await page.getByRole("dialog").getByRole("textbox", { name: "Reason", exact: true }).fill("Missing required information");
  await page.getByRole("button", { name: "Confirm action", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("temporarily unavailable");
  await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).first().click();
  await expect(table.getByRole("checkbox", { name: /Select Volunteer 00/ })).not.toBeChecked();
  await expect(table.getByRole("checkbox", { name: /Select Volunteer 01/ })).toBeChecked();
  expect(state.writes).toHaveLength(2);
  expect(state.writes.every(write => write.body.rejectionReason === "Missing required information")).toBe(true);
});

test("read-only viewers can select and export without review or form-status controls", async ({ page, context }) => {
  await fixture(context, { readOnly: true });
  await openInbox(page, true);
  await expect(page.getByRole("button", { name: "Change form status", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Approve answer", exact: true })).toHaveCount(0);
  await page.getByRole("checkbox", { name: "Select all visible records", exact: true }).check();
  await expect(page.getByRole("button", { name: "Export selected rows", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve selected answers", exact: true })).toHaveCount(0);
});

test("Form Builder precedes All forms and submission reads remain permission gated", async ({ page, context }) => {
  const state = await fixture(context, { noSubmissions: true });
  await page.goto("/library/forms/form-a");
  await expect(page.getByText("Submission access is required", { exact: true })).toBeVisible();
  expect(state.reads.some(url => url.pathname.endsWith("/submissions"))).toBe(false);
  await page.getByRole("button", { name: "Library", exact: true }).first().click();
  await expect(page.getByRole("link", { name: /Form Builder/ })).toBeVisible();
  const links = await page.locator('a[href="/library/forms/new"], a[href="/library/forms"]').allTextContents();
  const builder = links.findIndex(label => label.includes("Form Builder"));
  const allForms = links.findIndex((label, index) => index > builder && label.includes("All forms"));
  expect(builder).toBeGreaterThanOrEqual(0);
  expect(allForms).toBeGreaterThan(builder);
});
