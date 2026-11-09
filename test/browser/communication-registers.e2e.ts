import { test, expect, type BrowserContext } from "@playwright/test";
import { workspaceFixture } from "../fixtures/workspace-redesign";

async function fixture(context: BrowserContext, readOnly = false) {
  await workspaceFixture(context, { navigation: true });
  const calls: URL[] = [];
  const writes: string[] = [];
  await context.route("**/api/backend/profiles/me", route => route.fulfill({ json: { success: true, data: {
    profileId: "staff", userId: "staff", churchId: "church", branchId: "branch-a", firstName: "Grace", lastName: "Adeyemi", status: "active", role: ["secretary"], isAdminHq: true,
    church: { name: "Grace Church" }, planFeatures: ["email", "whatsapp"],
    permissions: ["templates:read", "broadcasts:read", "branches:directory:read", ...(!readOnly ? ["templates:create", "templates:update", "templates:delete", "broadcasts:create", "broadcasts:update"] : [])],
  } } }));
  for (const kind of ["templates", "broadcasts"]) await context.route(`**/api/backend/${kind}**`, route => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() !== "GET") {
      writes.push(url.pathname);
      return route.fulfill({ json: { success: true, data: {} } });
    }
    calls.push(url);
    const q = url.searchParams;
    let rows = Array.from({ length: 29 }, (_, i) => ({
      templateId: `template-${i}`, broadcastId: `broadcast-${i}`, churchId: "church", name: i === 28 ? "Zebra welcome" : `${String(i).padStart(2, "0")} Welcome`, content: `Message content ${i}`, templateName: i === 28 ? "Zebra template" : `Template ${i}`, channel: i % 2 ? "email" : "whatsapp", status: kind === "templates" ? i % 2 ? "published" : "draft" : i % 2 ? "sent" : "scheduled", category: "UTILITY", branchId: i % 2 ? "branch-b" : "branch-a", branchName: i % 2 ? "West Branch" : "Main Branch", language: "en", variables: ["first_name"], totalRecipients: i + 1,
      createdAt: new Date(Date.UTC(2026, 0, i + 1)).toISOString(), updatedAt: new Date(Date.UTC(2026, 0, i + 1)).toISOString(), scheduledAt: "2027-01-01T10:00:00Z", archivedAt: kind === "templates" && i === 27 ? "2026-10-01T00:00:00Z" : undefined,
    }));
    if (kind === "templates") rows = rows.filter(row => q.get("archived") === "true" ? !!row.archivedAt : !row.archivedAt);
    for (const key of ["channel", "status", "branchId"] as const) if (q.get(key)) rows = rows.filter(row => row[key] === q.get(key));
    if (q.get("search")) rows = rows.filter(row => `${row.name} ${row.content} ${row.templateName}`.toLowerCase().includes(q.get("search")!.toLowerCase()));
    const field = q.get("sortBy") || (kind === "templates" ? "name" : "createdAt");
    const direction = q.get("sortOrder") === "desc" ? -1 : 1;
    rows.sort((a, b) => String(a[field as keyof typeof a]).localeCompare(String(b[field as keyof typeof b])) * direction);
    const page = Number(q.get("page") || 1), limit = Number(q.get("limit") || 20), total = rows.length;
    return route.fulfill({ json: { success: true, data: { data: rows.slice((page - 1) * limit, page * limit), meta: { total, page, limit, totalPages: Math.ceil(total / limit) } } } });
  });
  return { calls, writes };
}

async function choose(page: import("@playwright/test").Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

for (const kind of ["Templates", "Broadcasts"] as const) {
  test(`${kind}: full register search, filters, sorting, columns and both views`, async ({ page, context }, info) => {
    const state = await fixture(context);
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto(`/connect/${kind.toLowerCase()}`);
    const table = page.getByRole("table", { name: kind, exact: true });
    await expect(table).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: "Choose visible columns" })).toBeVisible();
    await page.getByRole("button", { name: "Choose visible columns" }).click();
    await page.getByRole("textbox", { name: "Find columns" }).fill("Channel");
    await page.getByRole("menuitemcheckbox", { name: "Channel", exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(table.getByRole("columnheader", { name: "Channel", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Choose visible columns" }).click();
    await page.getByRole("menuitem", { name: "Reset default columns" }).click();
    await expect(table.getByRole("columnheader", { name: "Channel", exact: true })).toBeVisible();
    const search = page.getByPlaceholder(kind === "Templates" ? "Search name or text…" : "Search broadcasts or templates…");
    await search.fill("Zebra");
    await expect(table.locator('[data-list-column="column-0"]').getByText("Zebra welcome", { exact: true })).toBeVisible();
    await expect.poll(() => state.calls.some(url => url.pathname.endsWith(kind.toLowerCase()) && url.searchParams.get("search") === "Zebra")).toBe(true);
    await page.getByRole("button", { name: "Clear filters", exact: true }).click();
    await choose(page, "Channel", "Email");
    await choose(page, "Status", kind === "Templates" ? "Published" : "Sent");
    await choose(page, "Branch", "West Branch");
    await choose(page, `Sort ${kind.toLowerCase()}`, "Name");
    if (kind === "Templates") await page.getByRole("button", { name: "Sort descending", exact: true }).click();
    await expect.poll(() => state.calls.some(url => url.pathname.endsWith(kind.toLowerCase()) && url.searchParams.get("sortBy") === "name" && url.searchParams.get("sortOrder") === "desc" && url.searchParams.get("branchId") === "branch-b" && url.searchParams.get("channel") === "email")).toBe(true);
    await page.screenshot({ path: info.outputPath(`${kind}-list.png`), fullPage: true });
    await page.getByRole("button", { name: "Card view", exact: true }).click();
    await expect(table).toHaveCount(0);
    await expect(page.getByText("01 Welcome", { exact: true })).toBeVisible();
    await page.setViewportSize({ width: 320, height: 1000 });
    await page.screenshot({ path: info.outputPath(`${kind}-cards-mobile.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("button", { name: "List view", exact: true }).click();
    await expect(table).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(state.writes).toEqual([]);
  });

  test(`${kind}: pagination, empty filters and permission-gated actions`, async ({ page, context }) => {
    const state = await fixture(context, true);
    await page.goto(`/connect/${kind.toLowerCase()}`);
    const table = page.getByRole("table", { name: kind, exact: true });
    await expect(table).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: kind === "Templates" ? "New template" : "New broadcast", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect.poll(() => state.calls.some(url => url.pathname.endsWith(kind.toLowerCase()) && url.searchParams.get("page") === "2")).toBe(true);
    await page.getByPlaceholder(kind === "Templates" ? "Search name or text…" : "Search broadcasts or templates…").fill("no such record");
    await expect(page.getByText(kind === "Templates" ? "No templates match" : "No broadcasts here", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Clear filters", exact: true }).click();
    await expect(table).toBeVisible();
    if (kind === "Templates") {
      await choose(page, "Status", "Archived");
      await expect(table.locator('[data-list-column="column-0"]').getByText("27 Welcome", { exact: true })).toBeVisible();
    }
    expect(state.writes).toEqual([]);
  });
}
