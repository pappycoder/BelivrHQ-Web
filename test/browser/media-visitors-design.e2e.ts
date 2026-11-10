import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
test.use({ serviceWorkers: "block" });
const grants = [
  "media:library:read",
  "media:folders:read",
  "media:library:update",
  "media:library:delete",
  "media:upload:create",
  "media:restricted:read",
  "visitors:list:read",
  "visitors:list:update",
  "visitors:list:delete",
  "visitors:new:create",
  "visitors:followup:update",
  "members:all:read",
  "members:import:create",
  "profiles:read",
  "branches:read",
  "attendance:records:read",
];
async function fixture(
  context: BrowserContext,
  options: {
    reader?: boolean;
    folderOnly?: boolean;
    dark?: boolean;
    empty?: boolean;
    hq?: boolean;
  } = {},
) {
  const state = {
    reads: [] as string[],
    writes: [] as {
      path: string;
      method: string;
      body: Record<string, unknown>;
    }[],
    failMedia: false,
    failVisitor: false,
    failUpload: false,
    failMove: false,
    storagePuts: 0,
  };
  const visitor = {
    id: "visitor-a",
    churchId: "church",
    branchId: "west",
    branchName: "West Branch",
    firstName: "Amina",
    lastName: "Okafor",
    email: "amina@example.test",
    phone: "+2348012345678",
    whatsappNumber: "+2348012345678",
    gender: "female",
    firstVisitDate: "2026-10-25",
    followUpStatus: "new",
    assignedToId: "staff",
    assignedToName: "Follow-up Staff",
    notes: "Visited with a friend.",
    customFields: { Interest: "Community" },
    createdAt: "2026-10-25T09:00:00Z",
    updatedAt: "2026-10-25T09:00:00Z",
    archivedAt: null as string | null,
    convertedMemberId: undefined as string | undefined,
  };
  let assets = [
    {
      assetId: "image-a",
      filename: "Community photo.png",
      url: "/api/backend/media/files/image-a",
      mimeType: "image/png",
      sizeBytes: 20000,
      folder: "Community",
      permissions: "public",
      createdAt: "2026-10-25T09:00:00Z",
    },
    {
      assetId: "audio-a",
      filename: "Sunday message.wav",
      url: "/api/backend/media/files/audio-a",
      mimeType: "audio/wav",
      sizeBytes: 160044,
      folder: "Sermons",
      permissions: "members",
      createdAt: "2026-10-25T09:00:00Z",
    },
    {
      assetId: "video-a",
      filename: "Service recording.mp4",
      url: "/api/backend/media/files/video-a",
      mimeType: "video/mp4",
      sizeBytes: 2000000,
      folder: "Sermons",
      permissions: "members",
      createdAt: "2026-10-25T09:00:00Z",
    },
    {
      assetId: "doc-a",
      filename: "Welcome guide.pdf",
      url: "/api/backend/media/files/doc-a",
      mimeType: "application/pdf",
      sizeBytes: 12000,
      folder: "Community",
      permissions: "public",
      createdAt: "2026-10-25T09:00:00Z",
    },
    {
      assetId: "secret",
      filename: "Leadership only.pdf",
      url: "/api/backend/media/files/secret",
      mimeType: "application/pdf",
      sizeBytes: 10000,
      folder: "Leadership",
      permissions: "leadership",
      createdAt: "2026-10-25T09:00:00Z",
    },
  ];
  await context.addCookies([
    {
      name: "belivrhq_token",
      value: "media-visitors-design",
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
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: async (value: string) => {
            (window as unknown as { copiedUrl: string }).copiedUrl = value;
          },
        },
      });
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
  await context.route("https://storage.example/**", async (route) => {
    const headers = {
      "Access-Control-Allow-Origin": "http://127.0.0.1:3107",
      "Access-Control-Allow-Methods": "PUT,OPTIONS",
      "Access-Control-Allow-Headers": "content-type,x-upsert",
    };
    if (route.request().method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });
    state.storagePuts++;
    return route.fulfill({ status: 200, headers, body: "" });
  });
  await context.route("**/api/session", (route) =>
    route.fulfill({ json: { hasSession: true } }),
  );
  await context.route("**/api/backend/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname.replace("/api/backend", "");
    if (req.method() === "GET") state.reads.push(path + url.search);
    else
      state.writes.push({
        path,
        method: req.method(),
        body: req.postData() ? req.postDataJSON() : {},
      });
    if (path.startsWith("/media/files/")) {
      if (path.endsWith("image-a"))
        return route.fulfill({
          contentType: "image/png",
          body: Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aKDcAAAAASUVORK5CYII=",
            "base64",
          ),
        });
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
      return route.fulfill({
        contentType: path.endsWith("audio-a") ? "audio/wav" : "video/mp4",
        body: bytes,
      });
    }
    let data: unknown = [];
    if (path === "/profiles/me")
      data = {
        profileId: "profile",
        userId: "user",
        churchId: "church",
        branchId: "west",
        branch: { name: "West Branch" },
        firstName: "Workspace",
        lastName: "Staff",
        role: ["church_admin"],
        status: "active",
        isAdminHq: !!options.hq,
        planFeatures: ["media", "attendance", "giving", "reports"],
        permissions: options.folderOnly
          ? ["media:folders:read"]
          : options.reader
            ? [
                "media:library:read",
                "media:folders:read",
                "visitors:list:read",
                "attendance:records:read",
              ]
            : grants,
      };
    else if (path === "/auth/session")
      data = { userId: "user", email: "workspace@example.test" };
    else if (path === "/profiles")
      data = {
        data: [
          {
            profileId: "staff",
            firstName: "Follow-up",
            lastName: "Staff",
            status: "active",
          },
        ],
        total: 1,
        meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
      };
    else if (path === "/branches")
      data = {
        data: [
          { branchId: "west", name: "West Branch" },
          { branchId: "east", name: "East Branch" },
        ],
        total: 2,
      };
    else if (path === "/media/library/folders")
      data = {
        data: options.empty
          ? []
          : [
              {
                folder: "Community",
                count: 2,
                newestAt: "2026-10-25T09:00:00Z",
              },
              { folder: "Sermons", count: 2, newestAt: "2026-10-25T09:00:00Z" },
            ],
      };
    else if (path === "/media/library") {
      if (state.failMedia)
        return route.fulfill({
          status: 500,
          json: { success: false, error: { message: "Unavailable" } },
        });
      let rows = options.empty ? [] : assets;
      if (url.searchParams.get("folder"))
        rows = rows.filter((a) => a.folder === url.searchParams.get("folder"));
      if (url.searchParams.get("mimeType"))
        rows = rows.filter((a) =>
          a.mimeType.startsWith(url.searchParams.get("mimeType")!),
        );
      data = { data: rows, total: rows.length };
    } else if (path.startsWith("/media/library/") && req.method() === "PATCH") {
      const asset = assets.find((a) => path.includes(a.assetId))!;
      Object.assign(asset, req.postDataJSON());
      data = asset;
    } else if (
      path.startsWith("/media/library/") &&
      req.method() === "DELETE"
    ) {
      assets = assets.filter((a) => !path.endsWith(a.assetId));
      data = {};
    } else if (path === "/media/upload/prepare")
      data = {
        uploadUrl: "https://storage.example/new-file",
        ticket: "ticket",
      };
    else if (path === "/media/upload/complete") {
      if (state.failUpload)
        return route.fulfill({
          status: 503,
          json: { success: false, error: { message: "Try again" } },
        });
      data = {
        assetId: "new-file",
        url: "/api/backend/media/files/new-file",
        path: "new-file",
        size: 100,
        contentType: "application/pdf",
      };
    } else if (path.endsWith("/bulk-import")) {
      const body = req.postDataJSON();
      data = {
        created: (body.visitors ?? body.members).length,
        errors: [],
        dryRun: body.dryRun,
      };
    } else if (path === "/visitors") {
      if (req.method() === "POST") {
        data = { ...visitor, ...req.postDataJSON() };
      } else {
        const page = Number(url.searchParams.get("page") || 1),
          limit = Number(url.searchParams.get("limit") || 15);
        const rows = options.empty
          ? []
          : Array.from({ length: 16 }, (_, i) => ({
              ...visitor,
              id: i === 0 ? "visitor-a" : `visitor-${i}`,
              firstName: i === 0 ? "Amina" : `Visitor ${i + 1}`,
              followUpStatus:
                i === 0
                  ? visitor.followUpStatus
                  : [
                      "new",
                      "contacted",
                      "follow_up_scheduled",
                      "interested",
                      "converted",
                      "dropped_off",
                    ][i % 6],
            }));
        data = {
          data: rows.slice((page - 1) * limit, page * limit),
          meta: {
            total: rows.length,
            page,
            limit,
            totalPages: Math.ceil(rows.length / limit),
          },
        };
      }
    } else if (path === "/visitors/visitor-a") {
      if (req.method() === "PATCH") {
        if (state.failVisitor || state.failMove)
          return route.fulfill({
            status: 500,
            json: { success: false, error: { message: "Could not save" } },
          });
        Object.assign(visitor, req.postDataJSON());
      }
      data = { ...visitor };
    } else if (path === "/visitors/visitor-a/archive") {
      visitor.archivedAt = "2026-10-28T09:00:00Z";
      data = { ...visitor };
    } else if (path === "/visitors/visitor-a/restore") {
      visitor.archivedAt = null;
      data = { ...visitor };
    } else if (path === "/visitors/visitor-a/convert") {
      visitor.followUpStatus = "converted";
      visitor.convertedMemberId = "member-a";
      data = { visitor: { ...visitor }, memberId: "member-a" };
    } else if (path === "/members/member-a")
      data = {
        memberId: "member-a",
        churchId: "church",
        firstName: "Amina",
        lastName: "Okafor",
        status: "active",
        createdAt: visitor.createdAt,
      };
    else if (path.endsWith("/unread-count")) data = { count: 0 };
    else if (
      path === "/notifications" ||
      path === "/attendance" ||
      path === "/members"
    )
      data = {
        data: [],
        total: 0,
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      };
    await route.fulfill({ json: { success: true, data } });
  });
  return state;
}
async function shot(page: Page, name: string) {
  await mkdir("/tmp/belivrhq-media-visitors-previews", { recursive: true });
  await page.screenshot({
    path: `/tmp/belivrhq-media-visitors-previews/${name}.png`,
    fullPage: true,
  });
}
for (const width of [390, 1440])
  for (const dark of [false, true])
    test(`Media and Visitors previews ${width}px ${dark ? "dark" : "light"}`, async ({
      context,
      page,
    }) => {
      await fixture(context, { dark });
      await page.setViewportSize({ width, height: 1000 });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      for (const [path, name] of [
        ["/media", "media"],
        ["/media/folders", "folders"],
        ["/media/upload", "upload"],
        ["/visitors", "visitors"],
        ["/visitors/visitor-a", "visitor-detail"],
        ["/visitors/new", "visitor-new"],
        ["/visitors/follow-up", "follow-up"],
        ["/visitors/import", "import"],
      ]) {
        await page.goto(path);
        await expect(page.locator("#main-content h1"), path).toBeVisible();
        if (name === "media") {
          await expect(
            page.getByRole("combobox", { name: "Rows per page", exact: true }),
          ).toContainText("12");
        }
        if (name === "media")
          await expect(
            page.getByRole("button", {
              name: "Preview Community photo.png",
              exact: true,
            }),
          ).toBeVisible();
        if (name === "visitors")
          await expect(
            page.getByRole("link", { name: "Amina Okafor", exact: true }),
          ).toBeVisible();
        if (name === "follow-up")
          await expect(page.getByText(/up to 100 visitors/)).toBeVisible();
        if (name === "import")
          await expect(
            page.getByRole("list", { name: "Import progress", exact: true }),
          ).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          path,
        ).toBe(true);
        await shot(page, `${name}-${width}-${dark ? "dark" : "light"}`);
      }
      expect(errors).toEqual([]);
    });
test("media filters remove statistic reads, forward scope and keep folder navigation", async ({
  context,
  page,
}) => {
  const state = await fixture(context, { hq: true });
  await page.goto("/media");
  await expect(
    page.getByRole("button", {
      name: "Preview Community photo.png",
      exact: true,
    }),
  ).toBeVisible();
  expect(
    state.reads.some(
      (url) => new URL(url, "http://test").searchParams.get("limit") === "1",
    ),
  ).toBe(false);
  await page.getByRole("button", { name: "Audio", exact: true }).click();
  await expect
    .poll(() => state.reads.some((url) => url.includes("mimeType=audio")))
    .toBe(true);
  await page.getByRole("button", { name: "More filters" }).click();
  await page.getByLabel("Sort files", { exact: true }).selectOption("filename");
  await expect
    .poll(() => state.reads.some((url) => url.includes("sortBy=filename")))
    .toBe(true);
  await page
    .getByRole("button", { name: "Reset filters", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await page
    .getByRole("combobox", { name: "Filter by branch", exact: true })
    .click();
  await page.getByRole("option", { name: "East Branch", exact: true }).click();
  await expect
    .poll(() => state.reads.some((url) => url.includes("branchId=east")))
    .toBe(true);
  await page.goto("/media/folders");
  await page.getByRole("link", { name: "Community", exact: true }).click();
  await expect(page).toHaveURL(/folder=Community/);
});
test("media previews, copy, permission changes and delete confirmations preserve focus", async ({
  context,
  page,
}) => {
  await fixture(context);
  await page.goto("/media");
  const preview = page.getByRole("button", {
    name: "Preview Sunday message.wav",
    exact: true,
  });
  await preview.click();
  await expect(page.getByRole("dialog").locator("audio")).toHaveCount(1);
  await page.getByRole("button", { name: "Copy URL", exact: true }).click();
  expect(
    await page.evaluate(
      () => (window as unknown as { copiedUrl: string }).copiedUrl,
    ),
  ).toContain("/api/backend/media/files/audio-a");
  await page.keyboard.press("Escape");
  await expect(preview).toBeFocused();
  const menu = page.getByRole("button", { name: /^Manage Sunday message.wav/ });
  await menu.click();
  await page
    .getByRole("menuitem", { name: "Change Permissions", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await menu.click();
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
});
test("restricted media stays hidden for readers and folder-only readers retain folder names", async ({
  context,
  page,
}) => {
  await fixture(context, { reader: true });
  await page.goto("/media");
  await expect(
    page.getByRole("button", {
      name: "Preview Leadership only.pdf",
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: /^Manage Community photo.png/ })
    .click();
  await expect(
    page.getByRole("menuitem", { name: "Delete", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("menuitem", { name: "Change Permissions", exact: true }),
  ).toHaveCount(0);
});
test("folder-only access exposes names without inaccessible browse links", async ({
  context,
  page,
}) => {
  const state = await fixture(context, { folderOnly: true });
  await page.goto("/media/folders");
  await expect(
    page.getByRole("cell", { name: "Community", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Community", exact: true }),
  ).toHaveCount(0);
  expect(state.reads.some((url) => url.startsWith("/media/library?"))).toBe(
    false,
  );
});
test("media upload retries completion without transferring successful bytes twice", async ({
  context,
  page,
}) => {
  const state = await fixture(context);
  state.failUpload = true;
  await page.goto("/media/upload");
  await page.locator('input[type="file"]').setInputFiles({
    name: "guide.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("fixture guide"),
  });
  await page.getByRole("button", { name: "Upload All", exact: true }).click();
  await expect
    .poll(
      () =>
        state.writes.filter((row) => row.path === "/media/upload/complete")
          .length,
    )
    .toBe(1);
  await expect(
    page.getByRole("button", { name: "Upload All", exact: true }),
  ).toBeEnabled();
  await shot(page, "media-upload-retry");
  state.failUpload = false;
  await page.getByRole("button", { name: "Upload All", exact: true }).click();
  await expect
    .poll(
      () =>
        state.writes.filter((row) => row.path === "/media/upload/complete")
          .length,
    )
    .toBe(2);
  expect(state.storagePuts).toBe(1);
  await expect(
    page.getByRole("button", { name: "View in Library", exact: true }),
  ).toBeVisible();
  await shot(page, "media-upload-complete");
});
test("visitor directory removes stats reads and preserves filtering, selection and export", async ({
  context,
  page,
}) => {
  const state = await fixture(context);
  await page.goto("/visitors");
  await expect(
    page.getByRole("link", { name: "Amina Okafor", exact: true }),
  ).toBeVisible();
  expect(state.reads.some((url) => url.startsWith("/visitors/stats"))).toBe(
    false,
  );
  await page
    .getByRole("checkbox", { name: "Select Amina Okafor", exact: true })
    .check();
  await expect(
    page.getByText("1 selected", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Delete Selected", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "More filters" }).click();
  await page.getByRole("button", { name: "Archived", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Delete Selected", exact: true }),
  ).toHaveCount(0);
  await expect
    .poll(() => state.reads.some((url) => url.includes("archived=true")))
    .toBe(true);
});
test("visitor details edit and lifecycle dialogs restore focus after cache refresh", async ({
  context,
  page,
}) => {
  const state = await fixture(context);
  await page.goto("/visitors/visitor-a");
  const menu = page.getByRole("button", {
    name: "Visitor management",
    exact: true,
  });
  await menu.click();
  await page
    .getByRole("menuitem", { name: "Edit Visitor", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("First Name", { exact: true })
    .fill("Ada");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save Changes", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ada Okafor", level: 1 }),
  ).toBeVisible();
  await expect(menu).toBeFocused();
  await menu.click();
  await page.getByRole("menuitem", { name: "Archive", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await menu.click();
  await page
    .getByRole("menuitem", { name: "Convert to Member", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Convert to Member", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  expect(state.writes[0].body).toMatchObject({ firstName: "Ada" });
});
test("follow-up dropdown updates and failed moves roll back", async ({
  context,
  page,
}) => {
  const state = await fixture(context);
  await page.goto("/visitors/follow-up");
  const card = page
    .getByText("Amina Okafor", { exact: true })
    .locator("xpath=../../..");
  const select = card.getByRole("combobox");
  await select.click();
  await page.getByRole("option", { name: "Contacted", exact: true }).click();
  await expect
    .poll(() =>
      state.writes.some(
        (row) =>
          row.path === "/visitors/visitor-a" &&
          row.body.followUpStatus === "contacted",
      ),
    )
    .toBe(true);
  await expect(select).toBeEnabled();
  state.failMove = true;
  await select.click();
  await page.getByRole("option", { name: "Interested", exact: true }).click();
  await expect(select).toContainText("Contacted");
});
test("reader visitor details retain history and omit management controls", async ({
  context,
  page,
}) => {
  await fixture(context, { reader: true });
  await page.goto("/visitors/visitor-a");
  await expect(
    page.getByRole("heading", { name: "Amina Okafor", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Visitor management", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("tab", { name: "Visit history", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visit History", exact: true }),
  ).toBeVisible();
});

test("media permissions save and deletion retain their existing payloads", async ({
  context,
  page,
}) => {
  const state = await fixture(context);
  await page.goto("/media");
  const menu = page.getByRole("button", {
    name: /^Manage Community photo.png/,
  });
  await menu.click();
  await page
    .getByRole("menuitem", { name: "Change Permissions", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Members All members", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(menu).toBeFocused();
  expect(state.writes[0]).toMatchObject({
    method: "PATCH",
    path: "/media/library/image-a/permissions",
    body: { permissions: "members" },
  });
  await menu.click();
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Preview Community photo.png",
      exact: true,
    }),
  ).toHaveCount(0);
});
test("visitor import presents compact mapping, review and completion", async ({
  context,
  page,
}) => {
  await fixture(context);
  await page.goto("/visitors/import");
  await page.locator('input[type="file"]').setInputFiles({
    name: "visitors.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "First Name,Last Name,Email\nAda,Okafor,ada@example.test",
    ),
  });
  await expect(
    page.getByRole("button", { name: "Preview Import", exact: true }),
  ).toBeVisible();
  await shot(page, "visitor-import-mapping");
  await page
    .getByRole("button", { name: "Preview Import", exact: true })
    .click();
  await expect(page.getByText("Preview", { exact: true })).toBeVisible();
  await shot(page, "visitor-import-review");
  await page
    .getByRole("button", { name: "Import Visitors", exact: true })
    .click();
  await expect(
    page.getByText("Import finished", { exact: true }),
  ).toBeVisible();
  await shot(page, "visitor-import-done");
});
test("visitor conversion keeps its payload and navigation", async ({
  context,
  page,
}) => {
  const state = await fixture(context);
  await page.goto("/visitors/visitor-a");
  await page
    .getByRole("button", { name: "Visitor management", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Convert to Member", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Convert to Member", exact: true })
    .click();
  await expect
    .poll(() =>
      state.writes.some((row) => row.path === "/visitors/visitor-a/convert"),
    )
    .toBe(true);
  expect(
    state.writes.find((row) => row.path.endsWith("/convert"))?.body,
  ).toMatchObject({
    firstName: "Amina",
    lastName: "Okafor",
    email: "amina@example.test",
    phone: "+2348012345678",
  });
  await expect(page).toHaveURL(/members\/member-a$/);
});
test("media read errors retry without a full page reload", async ({
  context,
  page,
}) => {
  const state = await fixture(context);
  state.failMedia = true;
  await page.goto("/media");
  await expect(
    page.getByText("Failed to load media library.", { exact: true }),
  ).toBeVisible();
  state.failMedia = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Preview Community photo.png",
      exact: true,
    }),
  ).toBeVisible();
});

test("follow-up grip still drags a visitor into the target column", async ({
  context,
  page,
}) => {
  const state = await fixture(context);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/visitors/follow-up");
  const handle = page.getByRole("button", {
    name: "Move Amina to another column",
    exact: true,
  });
  const target = page.getByText("Contacted", { exact: true }).first();
  await expect(handle).toBeVisible();
  const from = await handle.boundingBox(),
    to = await target.boundingBox();
  expect(from).not.toBeNull();
  expect(to).not.toBeNull();
  await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    from!.x + from!.width / 2 + 12,
    from!.y + from!.height / 2,
    { steps: 3 },
  );
  await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height / 2, {
    steps: 15,
  });
  await page.mouse.up();
  await expect
    .poll(() =>
      state.writes.some(
        (row) =>
          row.path === "/visitors/visitor-a" &&
          row.body.followUpStatus === "contacted",
      ),
    )
    .toBe(true);
});

test("empty Media and Visitors collections keep clear empty states", async ({
  context,
  page,
}) => {
  await fixture(context, { empty: true });
  for (const [path, title] of [
    ["/media", "No files found"],
    ["/media/folders", "No folders yet"],
    ["/visitors", "No visitors found"],
    ["/visitors/follow-up", "No visitors to follow up"],
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
  }
});
