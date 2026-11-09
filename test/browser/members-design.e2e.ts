import { test, expect, type BrowserContext } from "@playwright/test";

test.use({ serviceWorkers: "block" });

const stamp = "2026-10-01T10:00:00Z";
async function fixture(
  context: BrowserContext,
  options: {
    readOnly?: boolean;
    hq?: boolean;
    giving?: boolean;
    archived?: boolean;
  } = {},
) {
  const calls: {
    path: string;
    method: string;
    body: Record<string, unknown> | null;
  }[] = [];
  const members = [
    {
      memberId: "member-a",
      firstName: "Grace",
      lastName: "Adeyemi",
      email: "grace@example.test",
      phone: "+2348012345678",
      branchId: "branch-a",
      status: "active",
      dateOfBirth: "1995-04-20",
      gender: "female",
      memberSince: stamp,
      createdAt: stamp,
      updatedAt: stamp,
      notes: "Existing care context",
      customFields: {},
      ...(options.archived ? { archivedAt: stamp } : {}),
    },
    {
      memberId: "member-b",
      firstName: "David",
      lastName: "Okoro",
      email: "david@example.test",
      phone: "+2348098765432",
      branchId: "branch-b",
      status: "transferred",
      memberSince: stamp,
      createdAt: stamp,
      updatedAt: stamp,
      customFields: {},
    },
    {
      memberId: "member-c",
      firstName: "Mary",
      lastName: "Bello",
      branchId: "branch-a",
      status: "inactive",
      memberSince: stamp,
      createdAt: stamp,
      updatedAt: stamp,
      customFields: {},
    },
    {
      memberId: "member-d",
      firstName: "John",
      lastName: "Eze",
      branchId: "branch-a",
      status: "suspended",
      memberSince: stamp,
      createdAt: stamp,
      updatedAt: stamp,
      customFields: {},
    },
  ];
  const family = {
    familyId: "family-a",
    churchId: "church-a",
    name: "Adeyemi Family",
    headId: "member-a",
    members: [
      {
        id: "link-a",
        memberId: "member-a",
        firstName: "Grace",
        lastName: "Adeyemi",
        relationship: "parent",
        isHead: true,
      },
    ],
    createdAt: stamp,
    ...(options.archived ? { archivedAt: stamp } : {}),
  };
  await context.addCookies([
    {
      name: "belivrhq_token",
      value: "members-design",
      url: "http://127.0.0.1:3107",
    },
  ]);
  await context.route("https://**", (route) => route.abort());
  await context.route("https://embed.tawk.to/**", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: "Object.assign(window.Tawk_API, { showWidget() {}, hideWidget() {}, maximize() {}, shutdown() {} }); window.Tawk_API?.onLoad?.();",
    }),
  );
  await context.route("**/api/session", (route) =>
    route.fulfill({ json: { hasSession: true } }),
  );
  await context.route("**/api/backend/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api/backend", "");
    const method = request.method();
    const body = request.postDataJSON();
    calls.push({ path: path + url.search, method, body });
    let data: unknown = [];
    if (path === "/profiles/me")
      data = {
        profileId: "profile-a",
        userId: "user-a",
        churchId: "church-a",
        branchId: "branch-a",
        branch: { name: "Main Branch" },
        church: { name: "Grace Community Church" },
        firstName: "Grace",
        lastName: "Admin",
        role: ["church_admin"],
        status: "active",
        isAdminHq: options.hq ?? true,
        planFeatures: ["giving"],
        permissions: [
          "members:all:read",
          "members:import:create",
          "families:read",
          "branches:read",
          ...(options.giving === false ? [] : ["giving:records:read"]),
          ...(options.readOnly
            ? []
            : [
                "members:new:create",
                "members:all:update",
                "members:all:delete",
                "families:create",
                "families:update",
                "families:delete",
              ]),
        ],
      };
    else if (path === "/branches")
      data = {
        data: [
          { branchId: "branch-a", name: "Main Branch" },
          { branchId: "branch-b", name: "West Branch" },
        ],
        total: 2,
      };
    else if (path === "/members/search")
      data = {
        data: members.filter((member) => member.memberId !== "member-a"),
      };
    else if (path === "/members" && method === "POST")
      data = { ...members[0], ...body, memberId: "member-new" };
    else if (path === "/members") {
      let rows = members;
      if (url.searchParams.get("search"))
        rows = rows.filter((row) =>
          `${row.firstName} ${row.lastName}`
            .toLowerCase()
            .includes(url.searchParams.get("search")!.toLowerCase()),
        );
      if (url.searchParams.get("status"))
        rows = rows.filter(
          (row) => row.status === url.searchParams.get("status"),
        );
      const limit = Number(url.searchParams.get("limit") ?? 15);
      const page = Number(url.searchParams.get("page") ?? 1);
      data = {
        data: rows,
        meta: { page, limit, total: rows.length, totalPages: 1 },
      };
    } else if (path === "/members/member-a" && method === "PATCH") {
      Object.assign(members[0], body);
      data = members[0];
    } else if (path === "/members/member-a") data = members[0];
    else if (path.endsWith("/attendance") || path.endsWith("/giving"))
      data = { data: [] };
    else if (path === "/families" && method === "POST")
      data = { ...family, ...body };
    else if (path === "/families")
      data = {
        data: [family],
        meta: {
          page: 1,
          limit: Number(url.searchParams.get("limit") ?? 15),
          total: 1,
          totalPages: 1,
        },
      };
    else if (path === "/families/family-a" && method === "PATCH") {
      Object.assign(family, body);
      data = family;
    } else if (path === "/families/family-a") data = family;
    else if (path.endsWith("/archive"))
      data = { ...members[0], archivedAt: stamp };
    else if (path.endsWith("/restore"))
      data = { ...members[0], archivedAt: undefined };
    else if (path === "/families/family-a/members") data = family;
    else if (path.includes("unread")) data = { count: 0 };
    else if (path === "/notifications" || path === "/audit")
      data = { data: [], total: 0, unreadCount: 0 };
    return route.fulfill({ json: { success: true, data } });
  });
  return { calls };
}

test("member directory uses a compact count, stable avatars and working advanced filters", async ({
  page,
  context,
}) => {
  const state = await fixture(context);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/members");
  await expect(page.getByLabel("4 results", { exact: true })).toBeVisible();
  await expect(page.getByText("Total Members", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Grace Adeyemi", exact: true }),
  ).toBeVisible();
  expect(
    state.calls
      .filter((call) => call.path.startsWith("/members?"))
      .every((call) => !call.path.includes("limit=1&")),
  ).toBe(true);
  const avatarClass = await page
    .getByRole("row")
    .filter({ hasText: "Grace Adeyemi" })
    .locator('[data-slot="avatar-fallback"]')
    .getAttribute("class");
  await page.screenshot({
    path: test.info().outputPath("members-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "More filters", exact: true }).click();
  await page.getByLabel("Sort members", { exact: true }).click();
  await page.getByRole("option", { name: "Last Name", exact: true }).click();
  await expect
    .poll(() =>
      state.calls.some((call) => call.path.includes("sortBy=last_name")),
    )
    .toBe(true);
  await page.getByRole("heading", { name: "Members", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /More filters/ }),
  ).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("button", { name: /More filters/ }),
  ).toContainText("1");
  await page.getByRole("button", { name: /More filters/ }).click();
  await page.getByRole("button", { name: "Archived", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Archived members", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => state.calls.some((call) => call.path.includes("archived=true")))
    .toBe(true);
  await page.keyboard.press("Escape");
  await page.goto("/members/member-a");
  await expect(
    page.getByRole("heading", { name: "Grace Adeyemi", exact: true }),
  ).toBeVisible();
  expect(
    await page
      .locator('[data-people-profile] [data-slot="avatar-fallback"]')
      .getAttribute("class"),
  ).toBe(avatarClass);
});

test("search, status, selection and CSV export remain available", async ({
  page,
  context,
}) => {
  const state = await fixture(context);
  await page.goto("/members");
  await page.getByPlaceholder("Search name, email, phone...").fill("Grace");
  await expect(page.getByLabel("1 results", { exact: true })).toBeVisible();
  await page.getByLabel("Member status", { exact: true }).click();
  await page.getByRole("option", { name: "Active", exact: true }).click();
  await expect
    .poll(() =>
      state.calls.some(
        (call) =>
          call.path.includes("status=active") &&
          call.path.includes("search=Grace"),
      ),
    )
    .toBe(true);
  await page
    .getByRole("checkbox", { name: "Select Grace Adeyemi", exact: true })
    .check();
  await expect(page.getByText("1 selected", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("menuitem", { name: "Export as CSV", exact: true })
    .click();
  expect((await download).suggestedFilename()).toContain("members-export");
  const supportError = page.getByRole("button", {
    name: "Dismiss support error",
    exact: true,
  });
  if (await supportError.isVisible()) await supportError.click();
  await page.getByLabel("Rows per page").click();
  await page.getByRole("option", { name: "25", exact: true }).click();
  await expect
    .poll(() => state.calls.some((call) => call.path.includes("limit=25")))
    .toBe(true);
});

test("quick add keeps validation and member creation payloads", async ({
  page,
  context,
}) => {
  const state = await fixture(context);
  await page.goto("/members");
  await page.getByRole("button", { name: "Quick Add", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Add Member", exact: true }).click();
  await expect(
    dialog.getByText("First name is required", { exact: true }),
  ).toBeVisible();
  await dialog.getByLabel("First Name", { exact: false }).fill("Ada");
  await dialog.getByLabel("Last Name", { exact: false }).fill("Okafor");
  await dialog.getByRole("button", { name: "Add Member", exact: true }).click();
  await expect
    .poll(() =>
      state.calls.some(
        (call) =>
          call.path === "/members" &&
          call.method === "POST" &&
          call.body?.firstName === "Ada" &&
          call.body?.lastName === "Okafor",
      ),
    )
    .toBe(true);
});

test("member management opens the existing editor and destructive actions still require confirmation", async ({
  page,
  context,
}) => {
  const state = await fixture(context);
  await page.goto("/members/member-a");
  await expect(page.getByRole("button", { name: "Edit Member", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Member management", exact: true }).click();
  await page.getByRole("menuitem", { name: "Edit Member", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Member management", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Member management", exact: true }).click();
  await page.getByRole("menuitem", { name: "Edit Member", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("First Name", { exact: false })
    .fill("Gracie");
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Gracie Adeyemi", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Member management", exact: true })).toBeFocused();
  await expect(
    page.getByRole("tab", { name: "Giving", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Member management", exact: true }).click();
  await page.getByRole("menuitem", { name: "Archive", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(state.calls.some((call) => call.path.endsWith("/archive"))).toBe(
    false,
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.screenshot({
    path: test.info().outputPath("member-profile.png"),
    fullPage: true,
  });
});

test("families drop sampled metrics but retain search, branch, archive and creation", async ({
  page,
  context,
}) => {
  const state = await fixture(context);
  await page.goto("/members/families");
  await expect(page.getByLabel("1 results", { exact: true })).toBeVisible();
  await expect(
    page.getByText("With head (loaded families)", { exact: true }),
  ).toHaveCount(0);
  expect(
    state.calls
      .filter((call) => call.path.startsWith("/families?"))
      .every((call) => call.path.includes("limit=15")),
  ).toBe(true);
  await page.getByRole("button", { name: "Add Family", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Family Name", { exact: false })
    .fill("Okoro Family");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add Family", exact: true })
    .click();
  await expect
    .poll(() =>
      state.calls.some(
        (call) =>
          call.path === "/families" &&
          call.method === "POST" &&
          call.body?.name === "Okoro Family",
      ),
    )
    .toBe(true);
  await page.getByRole("button", { name: "More filters", exact: true }).click();
  await page.getByRole("button", { name: "Archived", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Archived families", exact: true }),
  ).toBeVisible();
});

test("family detail preserves head labels, member links and add-member validation", async ({
  page,
  context,
}) => {
  const state = await fixture(context);
  await page.goto("/members/families/family-a");
  await expect(
    page.getByRole("heading", { name: "Adeyemi Family", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Grace Adeyemi/ }),
  ).toHaveAttribute("href", "/members/member-a");
  await expect(page.getByRole("button", { name: "Edit", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Family management", exact: true }).click();
  await page.getByRole("menuitem", { name: "Edit Family", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByLabel("Family Name", { exact: false }),
  ).toHaveValue("Adeyemi Family");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("button", { name: "Family management", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Family management", exact: true }).click();
  await page.getByRole("menuitem", { name: "Edit Family", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Family Name", { exact: false }).fill("Adeyemi Household");
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Adeyemi Household", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Family management", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Add Member", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add Member", exact: true })
    .click();
  await expect(
    page.getByText("Select a member to add", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Search members/i })
    .click();
  await page.getByRole("option", { name: /Mary Bello/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("combobox", { name: /Relationship to Head/ })
    .click();
  await page.getByRole("option", { name: /^child$/i }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add Member", exact: true })
    .click();
  await expect
    .poll(() =>
      state.calls.some(
        (call) =>
          call.path === "/families/family-a/members" &&
          call.method === "POST" &&
          call.body?.memberId === "member-c" &&
          call.body?.relationship === "child",
      ),
    )
    .toBe(true);
});

test("read-only branch staff keep locked scope and hidden edit/giving controls", async ({
  page,
  context,
}) => {
  await fixture(context, { readOnly: true, hq: false, giving: false });
  await page.goto("/members");
  await expect(
    page.getByLabel("Branch filter locked to your branch"),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Add Member", exact: true }),
  ).toHaveCount(0);
  await page.goto("/members/member-a");
  await expect(
    page.getByRole("heading", { name: "Grace Adeyemi", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Edit Member", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("tab", { name: "Giving", exact: true }),
  ).toHaveCount(0);
});

for (const width of [390, 1440])
  test(`member pages fit ${width}px and dark mode`, async ({
    page,
    context,
  }) => {
    await fixture(context);
    await page.setViewportSize({ width, height: 1000 });
    for (const path of [
      "/members",
      "/members/member-a",
      "/members/new",
      "/members/families",
      "/members/families/family-a",
      "/members/import",
    ]) {
      await page.goto(path);
      await expect(page.locator("main h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      if (path === "/members")
        await expect(
          page.getByRole("link", { name: "Grace Adeyemi", exact: true }),
        ).toBeVisible();
      if (path === "/members" && width === 390) {
        const row = page.getByRole("row").filter({ hasText: "Grace Adeyemi" });
        expect((await row.boundingBox())!.height).toBeLessThan(110);
        const scroll = page.getByRole("region", {
          name: "Scrollable data table",
        });
        expect(
          await scroll.evaluate((node) => node.scrollWidth > node.clientWidth),
        ).toBe(true);
      }
      if (path === "/members/families")
        await expect(
          page.getByText("Adeyemi Family", { exact: true }),
        ).toBeVisible();
      await page.screenshot({
        path: `/tmp/belivrhq-members-previews/${width}${path.replace(/\//g, "-")}.png`,
        fullPage: true,
      });
    }
    await page.getByRole("button", { name: "Switch to dark mode" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.goto("/members");
    await expect(
      page.getByRole("link", { name: "Grace Adeyemi", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: test.info().outputPath(`members-dark-${width}.png`),
      fullPage: true,
    });
  });

test("archived member controls retain restore and permanent-delete confirmation", async ({
  page,
  context,
}) => {
  const state = await fixture(context, { archived: true });
  await page.goto("/members/member-a");
  await expect(page.getByText("Archived", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Edit Member", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Member management", exact: true }).click();
  await expect(page.getByRole("menuitem", { name: "Edit Member", exact: true })).toHaveCount(0);
  await page.getByRole("menuitem", { name: "Restore", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Member management", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Delete Forever", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Delete");
  expect(
    state.calls.some(
      (call) => call.method === "DELETE" || call.path.endsWith("/restore"),
    ),
  ).toBe(false);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
});

test("full member form preserves fields, validation and creation payload", async ({
  page,
  context,
}) => {
  const state = await fixture(context);
  await page.goto("/members/new");
  await page.getByRole("button", { name: "Add Member", exact: true }).click();
  await expect(
    page.getByText("First name is required", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("First Name", { exact: false }).fill("Ada");
  await page.getByLabel("Last Name", { exact: false }).fill("Okafor");
  await page.getByLabel("Email", { exact: true }).fill("ada@example.test");
  await page.getByRole("button", { name: "Add Member", exact: true }).click();
  await expect
    .poll(() =>
      state.calls.some(
        (call) =>
          call.path === "/members" &&
          call.method === "POST" &&
          call.body?.firstName === "Ada" &&
          call.body?.email === "ada@example.test",
      ),
    )
    .toBe(true);
});
