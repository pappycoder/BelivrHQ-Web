import { test, expect, type BrowserContext } from "@playwright/test";
import { workspaceFixture } from "../fixtures/workspace-redesign";

async function fixture(context: BrowserContext, failOptions = false) {
  await workspaceFixture(context, { navigation: true });
  const writes: Record<string, unknown>[] = [];
  const reads: string[] = [];
  const record = { sermonId: "saved-sermon", churchId: "church", branchId: "branch-a", title: "A Sunday message", speaker: "Original Speaker", seriesName: "Original Series", sermonDate: "2026-11-01T09:00:00Z", tags: [], createdAt: "2026-11-01T09:00:00Z", updatedAt: "2026-11-01T09:00:00Z" };
  await context.route("**/api/backend/profiles/me", route => route.fulfill({ json: { success: true, data: {
    profileId: "staff", userId: "staff", churchId: "church", branchId: "branch-a", firstName: "Grace", lastName: "Adeyemi", status: "active", role: ["media_team"], isAdminHq: false, church: { name: "Grace Church" }, planFeatures: ["media"],
    permissions: ["sermons:new:create", "sermons:update", "sermons:list:read", "media:library:read", "media:folders:read"],
  } } }));
  await context.route("**/api/backend/sermons**", route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    reads.push(path);
    let data: unknown = record;
    if (path.endsWith("/options")) {
      if (failOptions) return route.fulfill({ status: 503, json: { success: false, error: { message: "Unavailable" } } });
      data = { speakers: ["Pastor Ada", "Pastor John"], series: ["Faith Foundations", "Grace for Today"] };
    } else if (request.method() === "POST" || request.method() === "PATCH") {
      const body = request.postDataJSON(); writes.push(body); Object.assign(record, body);
    }
    return route.fulfill({ json: { success: true, data } });
  });
  const media = [{ assetId: "file-a", filename: "Sunday guide.pdf", url: "/api/backend/media/files/file-a", mimeType: "application/pdf", sizeBytes: 4096, folder: "guides", permissions: "members", createdAt: "2026-11-01T09:00:00Z" }, { assetId: "file-b", filename: "Sunday message.mp3", url: "/api/backend/media/files/file-b", mimeType: "audio/mpeg", sizeBytes: 800000, folder: "sermons", permissions: "public", createdAt: "2026-11-02T09:00:00Z" }];
  await context.route("**/api/backend/media/library**", route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/folders")) return route.fulfill({ json: { success: true, data: { data: [{ folder: "guides", count: 1 }, { folder: "sermons", count: 1 }] } } });
    const q = url.searchParams;
    const rows = media.filter(asset => (!q.get("search") || asset.filename.toLowerCase().includes(q.get("search")!.toLowerCase())) && (!q.get("folder") || asset.folder === q.get("folder")));
    return route.fulfill({ json: { success: true, data: { data: rows, total: rows.length } } });
  });
  return { writes, reads };
}

for (const editing of [false, true]) {
  test(`${editing ? "edit" : "create"} sermon selects existing names and saves custom text`, async ({ page, context }, info) => {
    const state = await fixture(context);
    await page.goto(editing ? "/library/sermons/saved-sermon/edit" : "/library/sermons/new");
    const speaker = page.getByRole("combobox", { name: "Speaker", exact: true });
    const series = page.getByRole("combobox", { name: "Series", exact: true });
    await expect(speaker).toBeVisible({ timeout: 15000 });
    if (editing) await expect(speaker).toHaveValue("Original Speaker");
    else {
      await page.getByLabel("Title *", { exact: true }).fill("A new message");
      await page.getByLabel("Date *", { exact: true }).fill("2026-11-09");
    }
    await speaker.click();
    await page.getByRole("option", { name: "Pastor Ada", exact: true }).click();
    await expect(speaker).toHaveValue("Pastor Ada");
    await series.fill("Faith");
    await expect(page.getByRole("option", { name: "Faith Foundations", exact: true })).toBeVisible();
    await series.press("ArrowDown");
    await series.press("Enter");
    await expect(series).toHaveValue("Faith Foundations");
    expect(state.writes).toEqual([]);
    await page.getByRole("button", { name: "Save Details", exact: true }).click();
    await expect.poll(() => state.writes.length).toBe(1);
    expect(state.writes[0]).toMatchObject({ speaker: "Pastor Ada", seriesName: "Faith Foundations" });
    await expect(page).toHaveURL(/\/library\/sermons\/saved-sermon\/edit$/, { timeout: 15000 });
    await speaker.fill("Guest Speaker");
    await speaker.press("Escape");
    await expect(speaker).toHaveValue("Guest Speaker");
    await series.fill("A new journey");
    await series.press("Tab");
    await expect(series).toHaveValue("A new journey");
    await page.getByRole("button", { name: "Show existing speakers", exact: true }).click();
    await expect(page.getByRole("option", { name: "Pastor John", exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath(`sermon-${editing ? "edit" : "new"}-suggestions.png`), fullPage: true });
    await speaker.press("Escape");
    await page.getByRole("button", { name: "Save Details", exact: true }).click();
    await expect.poll(() => state.writes.length).toBe(2);
    expect(state.writes[1]).toMatchObject({ speaker: "Guest Speaker", seriesName: "A new journey" });
    expect(state.reads).toContain(`/api/backend/sermons/${editing ? "edit" : "new"}/options`);
    expect(state.reads).not.toContain("/api/backend/sermons/speakers");
    expect(state.reads).not.toContain("/api/backend/sermons/series");
  });
}

test("failed suggestions leave free text editable and savable on mobile", async ({ page, context }) => {
  const state = await fixture(context, true);
  await page.setViewportSize({ width: 320, height: 1000 });
  await page.goto("/library/sermons/saved-sermon/edit");
  await page.getByRole("combobox", { name: "Speaker", exact: true }).fill("New speaker offline");
  await page.getByRole("combobox", { name: "Series", exact: true }).fill("New series offline");
  await page.getByRole("button", { name: "Save Details", exact: true }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  expect(state.writes[0]).toMatchObject({ speaker: "New speaker offline", seriesName: "New series offline" });
});

for (const width of [1440, 320]) {
  test(`Media library has list and card views at ${width}px`, async ({ page, context }, info) => {
    await fixture(context);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/library/media");
    await expect(page.getByRole("button", { name: "Card view", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "List view", exact: true }).click();
    const table = page.getByRole("table", { name: "Media library", exact: true });
    await expect(table).toBeVisible();
    await expect(page.getByRole("button", { name: "Choose visible columns" })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "Visibility", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`media-list-${width}.png`), fullPage: true });
    await page.getByRole("button", { name: "Open Sunday guide.pdf", exact: true }).click();
    await expect(page.getByRole("dialog").getByRole("heading", { name: "Sunday guide.pdf" })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByPlaceholder("Search filenames…").fill("message");
    await expect(table.locator('[data-list-column="column-0"]').getByText("Sunday guide.pdf", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Card view", exact: true }).click();
    await expect(table).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Sunday message.mp3/ })).toBeVisible();
  });
}
