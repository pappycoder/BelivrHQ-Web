import { test, expect, type BrowserContext } from "@playwright/test";
import { mkdir } from "node:fs/promises";
test.use({ serviceWorkers: "block" });
async function fixture(
  context: BrowserContext,
  options: {
    reader?: boolean;
    archived?: boolean;
    empty?: boolean;
    fail?: boolean;
    hq?: boolean;
    dark?: boolean;
    aggregateOnly?: boolean;
  } = {},
) {
  const state = {
    reads: [] as string[],
    writes: [] as { path: string; method: string }[],
    fail: !!options.fail,
    archived: !!options.archived,
    bookmarked: false,
  };
  const base = {
    sermonId: "sermon-a",
    churchId: "church",
    branchId: "west",
    branchName: "West Branch",
    title: "Walking in Faith",
    speaker: "Grace Adeyemi",
    sermonDate: "2026-10-25T09:00:00Z",
    scriptureReference: "Hebrews 11:1",
    seriesName: "Faith & Hope",
    tags: ["Faith", "Community"],
    durationSeconds: 1820,
    description: "A message about faith and hope in everyday life.",
    audioUrl: options.empty ? undefined : "/api/backend/media/files/audio-a",
    videoUrl: options.empty
      ? undefined
      : "https://www.youtube.com/watch?v=abcdefghijk",
    createdAt: "2026-10-25T09:00:00Z",
    updatedAt: "2026-10-25T09:00:00Z",
  };
  const sermon = () => ({
    ...base,
    archivedAt: state.archived ? "2026-10-28T09:00:00Z" : undefined,
  });
  await context.addCookies([
    {
      name: "belivrhq_token",
      value: "sermon-design",
      url: "http://127.0.0.1:3107",
    },
  ]);
  await context.addInitScript(
    ({ dark }) => {
      delete (Navigator.prototype as { serviceWorker?: ServiceWorkerContainer })
        .serviceWorker;
      localStorage.setItem("theme", dark ? "dark" : "light");
      localStorage.setItem(
        "belivrhq:appearance:v1:profile:church",
        JSON.stringify({ accent: "#7c3aed" }),
      );
    },
    { dark: options.dark },
  );
  await context.route("https://**", (route) => route.abort());
  await context.route("https://embed.tawk.to/**", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: "Object.assign(window.Tawk_API,{showWidget(){},hideWidget(){},maximize(){},shutdown(){}});window.Tawk_API?.onLoad?.();",
    }),
  );
  await context.route("**/api/session", (route) =>
    route.fulfill({ json: { hasSession: true } }),
  );
  await context.route("**/api/backend/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname.replace("/api/backend", "");
    if (req.method() === "GET") state.reads.push(path + url.search);
    else state.writes.push({ path, method: req.method() });
    let data: unknown = [];
    if (path.startsWith("/media/files/")) {
      const bytes = Buffer.alloc(160044);
      bytes.write("RIFF");
      bytes.writeUInt32LE(bytes.length - 8, 4);
      bytes.write("WAVEfmt ", 8);
      bytes.writeUInt32LE(16, 16);
      bytes.writeUInt16LE(1, 20);
      bytes.writeUInt16LE(1, 22);
      bytes.writeUInt32LE(8000, 24);
      bytes.writeUInt32LE(16000, 28);
      bytes.writeUInt16LE(2, 32);
      bytes.writeUInt16LE(16, 34);
      bytes.write("data", 36);
      bytes.writeUInt32LE(160000, 40);
      const range = req.headers().range;
      const start = Number(range?.match(/^bytes=(\d+)-/)?.[1] ?? 0);
      return route.fulfill({
        status: range ? 206 : 200,
        body: bytes.subarray(start),
        headers: {
          "Content-Type": "audio/wav",
          "Accept-Ranges": "bytes",
          ...(range
            ? {
                "Content-Range": `bytes ${start}-${bytes.length - 1}/${bytes.length}`,
              }
            : {}),
        },
      });
    }
    if (path === "/profiles/me")
      data = {
        profileId: "profile",
        userId: "user",
        churchId: "church",
        branchId: "west",
        branch: { name: "West Branch" },
        firstName: "Sermon",
        lastName: "Staff",
        role: ["media_team"],
        status: "active",
        isAdminHq: !!options.hq,
        planFeatures: ["media"],
        permissions: [
          ...(!options.aggregateOnly ? ["sermons:list:read"] : []),
          "sermons:series:read",
          "sermons:speakers:read",
          "branches:read",
          ...(!options.reader
            ? [
                "sermons:new:create",
                "sermons:update",
                "sermons:delete",
                "media:library:read",
              ]
            : []),
        ],
      };
    else if (path === "/auth/session")
      data = { userId: "user", email: "sermons@example.test" };
    else if (path === "/branches")
      data = {
        data: [
          { branchId: "west", name: "West Branch" },
          { branchId: "east", name: "East Branch" },
        ],
        total: 2,
      };
    else if (path === "/sermons/series" || path === "/sermons/speakers")
      data = options.empty
        ? []
        : [
            {
              name: path.endsWith("series") ? "Faith & Hope" : "Grace Adeyemi",
              count: 16,
              lastDate: base.sermonDate,
            },
          ];
    else if (path === "/sermons/sermon-a/bookmark") {
      if (req.method() !== "GET") state.bookmarked = req.method() === "POST";
      data = { bookmarked: state.bookmarked };
    } else if (path === "/sermons/sermon-a/archive") {
      state.archived = true;
      data = sermon();
    } else if (path === "/sermons/sermon-a/restore") {
      state.archived = false;
      data = sermon();
    } else if (path === "/sermons/sermon-a") data = sermon();
    else if (path === "/sermons") {
      if (state.fail)
        return route.fulfill({
          status: 500,
          json: { success: false, error: { message: "Unavailable" } },
        });
      const rows = options.empty
        ? []
        : Array.from({ length: 16 }, (_, i) => ({
            ...sermon(),
            sermonId: i === 0 ? "sermon-a" : `sermon-${i}`,
            title: i === 0 ? base.title : `Sermon ${i + 1}`,
          }));
      const page = Number(url.searchParams.get("page") || 1),
        limit = Number(url.searchParams.get("limit") || 15);
      data = {
        data: rows.slice((page - 1) * limit, page * limit),
        total: rows.length,
      };
    } else if (path.endsWith("/unread-count")) data = { count: 0 };
    else if (path === "/notifications" || path === "/media")
      data = { data: [], total: 0 };
    await route.fulfill({ json: { success: true, data } });
  });
  return state;
}
for (const width of [390, 1440])
  for (const dark of [false, true])
    test(`sermon previews ${width}px ${dark ? "dark" : "light"}`, async ({
      context,
      page,
    }) => {
      await fixture(context, { dark });
      await page.setViewportSize({ width, height: 1000 });
      await mkdir("/tmp/belivrhq-sermon-previews", { recursive: true });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      for (const [path, name] of [
        ["/sermons", "directory"],
        ["/sermons/series", "series"],
        ["/sermons/speakers", "speakers"],
        ["/sermons/sermon-a", "details"],
        ["/sermons/new", "new"],
        ["/sermons/sermon-a/edit", "editor"],
      ]) {
        await page.goto(path);
        await expect(page.locator("h1"), path).toBeVisible();
        if (name === "directory")
          await expect(
            page.getByRole("link", { name: "Walking in Faith", exact: true }),
          ).toBeVisible();
        if (name === "details")
          await expect(
            page.getByRole("heading", { name: "Audio Recording", exact: true }),
          ).toBeVisible();
        if (name === "editor")
          await expect(
            page.getByRole("button", { name: "Save Details", exact: true }),
          ).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          path,
        ).toBe(true);
        await page.screenshot({
          path: `/tmp/belivrhq-sermon-previews/${name}-${width}-${dark ? "dark" : "light"}.png`,
          fullPage: true,
        });
      }
      for (const section of ["Audio", "Video"]) {
        await page
          .getByRole("tab", {
            name: `${section === "Audio" ? 2 : 3}. ${section}`,
            exact: true,
          })
          .click();
        await expect(
          page.getByRole("button", { name: `Save ${section}`, exact: true }),
        ).toBeVisible();
        await page.screenshot({
          path: `/tmp/belivrhq-sermon-previews/editor-${section.toLowerCase()}-${width}-${dark ? "dark" : "light"}.png`,
          fullPage: true,
        });
      }
      expect(errors).toEqual([]);
    });
test("directory removes statistics requests and preserves filters, media labels and pagination", async ({
  context,
  page,
}) => {
  const state = await fixture(context, { hq: true });
  await page.goto("/sermons?speaker=Grace%20Adeyemi&series=Faith%20%26%20Hope");
  await expect(
    page.getByText("Speaker: Grace Adeyemi", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Series: Faith & Hope", { exact: true }),
  ).toBeVisible();
  expect(
    state.reads.some(
      (url) => new URL(url, "http://test").searchParams.get("limit") === "1",
    ),
  ).toBe(false);
  const row = page.getByRole("row").filter({
    has: page.getByRole("link", { name: "Walking in Faith", exact: true }),
  });
  await expect(row.getByText("Audio attached", { exact: true })).toBeVisible();
  await expect(row.getByText("Video attached", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Sermon 16", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "More filters" }).click();
  await page.getByLabel("Sort sermons").selectOption("title");
  await expect
    .poll(() => state.reads.some((url) => url.includes("sortBy=title")))
    .toBe(true);
  await page
    .getByRole("button", { name: "Reset filters", exact: true })
    .click();
  await expect(
    page.getByText("Speaker: Grace Adeyemi", { exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page
    .getByRole("combobox", { name: "Filter by branch", exact: true })
    .click();
  await page.getByRole("option", { name: "East Branch", exact: true }).click();
  await expect
    .poll(() => state.reads.some((url) => url.includes("branchId=east")))
    .toBe(true);
});
test("series and speakers retain keyboard-accessible filtered links", async ({
  context,
  page,
}) => {
  await fixture(context);
  await page.goto("/sermons/series");
  const series = page.getByRole("link", { name: "Faith & Hope", exact: true });
  await series.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/series=Faith%20%26%20Hope/);
  await page.goto("/sermons/speakers");
  await page.getByRole("link", { name: "Grace Adeyemi", exact: true }).click();
  await expect(page).toHaveURL(/speaker=Grace%20Adeyemi/);
});
test("detail management supports confirmation focus, archive/restore and independent bookmarks", async ({
  context,
  page,
}) => {
  const state = await fixture(context);
  await page.goto("/sermons/sermon-a");
  const trigger = page.getByRole("button", {
    name: "Sermon management",
    exact: true,
  });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("menuitem", { name: "Edit", exact: true }),
  ).toBeVisible();
  await page.getByRole("menuitem", { name: "Archive", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole("menuitem", { name: "Archive", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Archive", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole("menuitem", { name: "Restore", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Restore", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Bookmark", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Bookmarked", exact: true }),
  ).toBeVisible();
  expect(state.writes.map((row) => row.path)).toEqual([
    "/sermons/sermon-a/archive",
    "/sermons/sermon-a/restore",
    "/sermons/sermon-a/bookmark",
  ]);
});
test("archived details retain permanent-delete confirmation and reader controls stay restricted", async ({
  context,
  page,
}) => {
  await fixture(context, { archived: true });
  await page.goto("/sermons/sermon-a");
  const trigger = page.getByRole("button", {
    name: "Sermon management",
    exact: true,
  });
  await trigger.click();
  await expect(
    page.getByRole("menuitem", { name: "Edit", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("menuitem", { name: "Delete Forever", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});
test("readers can play recordings and bookmark without management or upload actions", async ({
  context,
  page,
}) => {
  const state = await fixture(context, { reader: true });
  await page.goto("/sermons/sermon-a");
  await expect(page.locator("audio")).toHaveCount(1);
  await expect(page.locator("iframe")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Sermon management", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Bookmark", exact: true }),
  ).toBeVisible();
  await page.goto("/sermons");
  await expect(
    page.getByRole("button", { name: "Add Sermon", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Manage Walking in Faith", exact: true }),
  ).toHaveCount(0);
  expect(state.writes).toEqual([]);
});
test("directory error retries recover and empty views retain clear explanations", async ({
  context,
  page,
}) => {
  const state = await fixture(context, { fail: true });
  await page.goto("/sermons");
  await expect(
    page.getByRole("heading", { name: "Failed to load sermons.", exact: true }),
  ).toBeVisible();
  state.fail = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Walking in Faith", exact: true }),
  ).toBeVisible();
});
test("empty sermon, series and speaker directories show existing empty states", async ({
  context,
  page,
}) => {
  await fixture(context, { empty: true });
  for (const [path, title] of [
    ["/sermons", "No sermons yet"],
    ["/sermons/series", "No series yet"],
    ["/sermons/speakers", "No speakers yet"],
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
  }
});

test("directory management keeps delete focus and archived lifecycle controls", async ({
  context,
  page,
}) => {
  const state = await fixture(context);
  await page.goto("/sermons");
  const trigger = page.getByRole("button", {
    name: "Manage Walking in Faith",
    exact: true,
  });
  await trigger.click();
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Delete Sermon", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await page.getByRole("button", { name: "More filters" }).click();
  await page.getByRole("button", { name: "Archived", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect
    .poll(() => state.reads.some((url) => url.includes("archived=true")))
    .toBe(true);
  await trigger.click();
  await expect(
    page.getByRole("menuitem", { name: "Restore", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: "Delete Forever", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: "Edit", exact: true }),
  ).toHaveCount(0);
  expect(state.writes).toEqual([]);
});

test("aggregate-only readers retain names without inaccessible sermon links", async ({
  context,
  page,
}) => {
  const state = await fixture(context, { reader: true, aggregateOnly: true });
  for (const [path, name] of [
    ["/sermons/series", "Faith & Hope"],
    ["/sermons/speakers", "Grace Adeyemi"],
  ]) {
    await page.goto(path);
    await expect(page.getByRole("cell", { name, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name, exact: true })).toHaveCount(0);
  }
  expect(state.reads.some((url) => url.startsWith("/sermons?"))).toBe(false);
});

test("sermons without recordings keep metadata and a clear empty state", async ({
  context,
  page,
}) => {
  await fixture(context, { reader: true, empty: true });
  await page.goto("/sermons/sermon-a");
  await expect(
    page.getByText("No recordings attached to this sermon.", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Sermon summary", exact: true })
      .getByText("Hebrews 11:1", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("audio, video, iframe")).toHaveCount(0);
});
