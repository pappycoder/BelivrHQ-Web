import { test, expect, type BrowserContext, type Page } from "@playwright/test";

async function fixture(
  context: BrowserContext,
  mode: "staff" | "finance" | "read" = "staff",
) {
  const requests: string[] = [];
  const writes: string[] = [];
  const members = [
    {
      id: "membership",
      memberId: "ada",
      firstName: "Ada",
      lastName: "Rice",
      role: "member",
      joinedAt: "2026-01-01",
    },
  ];
  const departments = [
    {
      id: "worship",
      name: "Worship team",
      description: "Music ministry",
      branchId: "west",
      branchName: "West Branch",
      headMemberId: "ada",
      headFirstName: "Ada",
      headLastName: "Rice",
      memberCount: 1,
      members,
      createdAt: "2026-01-01",
      updatedAt: "2026-11-01",
    },
    {
      id: "welcome",
      name: "Welcome team",
      description: "Hospitality",
      branchId: "east",
      branchName: "East Branch",
      memberCount: 0,
      members: [],
      createdAt: "2026-03-01",
      updatedAt: "2026-11-01",
    },
  ];
  const groups = [
    {
      id: "west-home",
      name: "West home",
      branchId: "west",
      branchName: "West Branch",
      leaderId: "ada",
      leaderFirstName: "Ada",
      leaderLastName: "Rice",
      meetingDay: "Monday",
      meetingTime: "18:00",
      address: "10 West Road",
      latitude: -1,
      longitude: 0,
      createdAt: "2026-01-01",
      updatedAt: "2026-11-01",
    },
    {
      id: "east-home",
      name: "East home",
      branchId: "east",
      branchName: "East Branch",
      meetingDay: "Tuesday",
      createdAt: "2026-03-01",
      updatedAt: "2026-11-01",
    },
  ];
  await context.addCookies([
    {
      name: "churchos_token",
      value: "groups-fixture",
      url: "http://127.0.0.1:3107",
    },
  ]);
  await context.route("https://embed.tawk.to/**", (route) =>
    route.fulfill({ body: "" }),
  );
  await context.route("**/api/session", (route) =>
    route.fulfill({ json: { hasSession: true } }),
  );
  await context.route("**/api/backend/**", (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^.*\/api\/backend/, "");
    requests.push(path + url.search);
    if (request.method() !== "GET") writes.push(path);
    let data: unknown = {
      data: [],
      total: 0,
      meta: { total: 0, totalPages: 1 },
    };
    if (path === "/profiles/me")
      data = {
        profileId: "staff",
        userId: "staff",
        churchId: "church",
        branchId: "west",
        memberId: "ada",
        firstName: "Staff",
        lastName: "Test",
        status: "active",
        role: [mode === "finance" ? "treasurer" : "secretary"],
        isAdminHq: mode !== "read",
        church: { name: "Grace Church" },
        planFeatures: ["groups", "giving", "attendance"],
        permissions: [
          "departments:read",
          "cell_groups:read",
          "members:all:read",
          ...(mode === "finance"
            ? ["cell_groups:giving:read"]
            : ["cell_groups:details:read"]),
          ...(mode === "staff"
            ? [
                "departments:update",
                "departments:create",
                "departments:delete",
                "cell_groups:update",
                "cell_groups:create",
                "cell_groups:delete",
                "cell_groups:giving:read",
                "cell_groups:giving:create",
              ]
            : []),
        ],
      };
    else if (path === "/admin/departments")
      data = url.searchParams.get("archived")
        ? [
            {
              ...departments[1],
              id: "archived",
              name: "Archived team",
              archivedAt: "2026-11-01",
            },
          ]
        : departments;
    else if (path === "/admin/cell-groups")
      data = url.searchParams.get("archived")
        ? [
            {
              ...groups[1],
              id: "archived",
              name: "Archived circle",
              archivedAt: "2026-11-01",
            },
          ]
        : groups;
    else if (path === "/admin/departments/worship") data = departments[0];
    else if (path === "/admin/cell-groups/west-home") data = groups[0];
    else if (path === "/admin/cell-groups/west-home/members") data = members;
    else if (path.endsWith("/members/ada") && request.method() === "DELETE") {
      members.splice(0);
      data = {};
    } else if (path.endsWith("/attendance/summary"))
      data = { memberCount: 1, totalMeetings: 4, averageAttendance: 1 };
    else if (path.endsWith("/attendance"))
      data = [
        {
          id: "arrival",
          memberId: "ada",
          firstName: "Ada",
          lastName: "Rice",
          status: "present",
          meetingDate: "2026-11-08",
          notes: "On time",
        },
      ];
    else if (path === "/admin/cell-groups/nearest") data = [];
    else if (path === "/giving/cell-groups/west-home")
      data = {
        data: [],
        total: 0,
        categories: [{ categoryId: "fund", name: "Offering" }],
        summary: { allTimeTotal: 5000, count: 1 },
      };
    return route.fulfill({ json: { success: true, data } });
  });
  return { requests, writes };
}

async function option(page: Page, label: string, value: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: value, exact: true }).click();
}

for (const width of [1280, 320])
  for (const kind of ["department", "cell group"] as const) {
    test(`${kind} register filters, sorts and switches list/cards at ${width}px`, async ({
      page,
      context,
    }) => {
      const { requests } = await fixture(context);
      await page.setViewportSize({ width, height: 900 });
      await page.goto(
        kind === "department"
          ? "/gatherings/groups"
          : "/gatherings/groups/cell",
      );
      const table = page.locator("[data-list-table]");
      await expect(table).toHaveCount(1);
      await expect(
        table.getByRole("checkbox", {
          name: "Select all visible records",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        table.getByRole("button", {
          name: "Choose visible columns",
          exact: true,
        }),
      ).toBeVisible();
      const search = page.getByRole("textbox", {
        name:
          kind === "department" ? "Search departments…" : "Search cell groups…",
        exact: true,
      });
      await search.fill("Ada West");
      await expect(table).toContainText(
        kind === "department" ? "Worship team" : "West home",
      );
      await expect(table).not.toContainText(
        kind === "department" ? "Welcome team" : "East home",
      );
      await page
        .getByRole("button", { name: "Clear filters", exact: true })
        .click();
      await option(
        page,
        "Leadership",
        kind === "department" ? "Needs a head" : "Needs a leader",
      );
      await expect(table).toContainText(
        kind === "department" ? "Welcome team" : "East home",
      );
      await expect(table).not.toContainText(
        kind === "department" ? "Worship team" : "West home",
      );
      await page
        .getByRole("button", { name: "Clear filters", exact: true })
        .click();
      await option(page, "Branch", "West Branch");
      await option(page, "Sort groups", "Date added");
      await page
        .getByRole("button", { name: "Sort descending", exact: true })
        .click();
      if (kind === "cell group") await option(page, "Meeting day", "Monday");
      await page
        .getByRole("button", { name: "Card view", exact: true })
        .click();
      await expect(table).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Kanban view", exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "List view", exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      await page.screenshot({
        path: `/tmp/churchos-${kind.replace(" ", "-")}-cards-${width}.png`,
        fullPage: true,
        animations: "disabled",
      });
      await page
        .getByRole("button", { name: "Clear filters", exact: true })
        .click();
      await page
        .getByRole("button", { name: "List view", exact: true })
        .click();
      await page.getByRole("button", { name: "Archived", exact: true }).click();
      await expect
        .poll(() =>
          requests.some((path) =>
            path.includes(
              kind === "department"
                ? "/admin/departments?archived=true"
                : "/admin/cell-groups?archived=true",
            ),
          ),
        )
        .toBe(true);
      await expect(table).toContainText(
        kind === "department" ? "Archived team" : "Archived circle",
      );
    });
  }

for (const width of [1280, 320])
  test(`department and cell detail tabs and confirmed removal at ${width}px`, async ({
    page,
    context,
  }) => {
    const { writes, requests } = await fixture(context);
    await page.setViewportSize({ width, height: 900 });
    for (const cell of [false, true]) {
      await page.goto(
        cell
          ? "/gatherings/groups/cell/west-home"
          : "/gatherings/groups/worship",
      );
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        cell ? "West home" : "Worship team",
      );
      const tabList = page.getByRole("tablist", {
        name: cell ? "Cell group workspace" : "Department workspace",
        exact: true,
      });
      await expect
        .poll(() =>
          tabList.evaluate((node) => {
            const bounds = node.getBoundingClientRect();
            return Array.from(node.querySelectorAll('[role="tab"]')).every(
              (tab) => {
                const rect = tab.getBoundingClientRect();
                return (
                  rect.top >= bounds.top &&
                  rect.bottom <= bounds.bottom + 1 &&
                  rect.left >= bounds.left &&
                  rect.right <= bounds.right + 1
                );
              },
            );
          }),
        )
        .toBe(true);
      await page.getByRole("tab", { name: "Members", exact: true }).click();
      await expect(
        page.getByText("Total group giving", { exact: true }),
      ).toHaveCount(0);
      await expect(page.locator("[data-list-table]")).toContainText("Ada Rice");
      await page
        .getByRole("button", { name: "Remove Ada Rice", exact: true })
        .click();
      await expect(page.getByRole("dialog")).toContainText("Ada Rice");
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
      expect(writes).toHaveLength(0);
      await page.getByRole("tab", { name: "Attendance", exact: true }).click();
      await expect(page.locator("[data-list-table]")).toContainText("Ada Rice");
      await expect(page.locator('input[type="date"]')).toHaveAttribute(
        "type",
        "date",
      );
      await expect(page.getByRole("spinbutton")).toHaveCount(0);
      await page
        .getByRole("tab", { name: "Reported totals", exact: true })
        .click();
      await expect(
        page.getByRole("tab", { name: "Reported totals", exact: true }),
      ).toHaveAttribute("data-state", "active");
      if (cell) {
        expect(
          requests.some((path) => path.startsWith("/giving/cell-groups/")),
        ).toBe(false);
        await page.getByRole("tab", { name: "Giving", exact: true }).click();
        await expect(
          page.getByText("Total group giving", { exact: true }),
        ).toBeVisible();
        await page
          .getByRole("button", { name: "Record Meeting Giving", exact: true })
          .click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.getByRole("button", { name: "Cancel", exact: true }).click();
      }
      await page.getByRole("tab", { name: "Overview", exact: true }).click();
      if (cell)
        await expect(page.getByText("-1, 0", { exact: true })).toBeVisible();
      await page.getByRole("heading", { level: 1 }).click();
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: `/tmp/churchos-${cell ? "cell" : "department"}-detail-${width}.png`,
        fullPage: true,
        animations: "disabled",
      });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    }
  });

test("finance access has Giving without requesting member or attendance data", async ({
  page,
  context,
}) => {
  const { requests } = await fixture(context, "finance");
  await page.goto("/gatherings/groups/cell/west-home?tab=giving");
  await expect(
    page.getByText("Total group giving", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Members", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("tab", { name: "Attendance", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Record Meeting Giving", exact: true }),
  ).toHaveCount(0);
  expect(
    requests.some((path) => /west-home\/(members|attendance)/.test(path)),
  ).toBe(false);
});

test("read-only members see no management or giving tab", async ({
  page,
  context,
}) => {
  await fixture(context, "read");
  await page.goto("/gatherings/groups/cell/west-home?tab=members");
  await expect(page.locator("[data-list-table]")).toContainText("Ada Rice");
  await expect(
    page.getByRole("button", { name: "Remove Ada Rice", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("tab", { name: "Giving", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Edit group", exact: true }),
  ).toHaveCount(0);
});

test("cell roster removal saves only after confirmation", async ({
  page,
  context,
}) => {
  const { writes } = await fixture(context);
  await page.goto("/gatherings/groups/cell/west-home?tab=members");
  await page
    .getByRole("button", { name: "Remove Ada Rice", exact: true })
    .click();
  expect(writes).toHaveLength(0);
  await page
    .getByRole("button", { name: "Confirm action", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect
    .poll(() => writes)
    .toEqual(["/admin/cell-groups/west-home/members/ada"]);
  await expect(
    page.getByText("No members match", { exact: true }),
  ).toBeVisible();
});

test("roster bulk removal confirms the named selection once", async ({
  page,
  context,
}) => {
  const { writes } = await fixture(context);
  await page.goto("/gatherings/groups/cell/west-home?tab=members");
  await page
    .getByRole("checkbox", { name: "Select all visible records", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Remove selected roster members",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Ada Rice");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(writes).toHaveLength(0);
  await page
    .getByRole("button", {
      name: "Remove selected roster members",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Confirm action", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect
    .poll(() => writes)
    .toEqual(["/admin/cell-groups/west-home/members/ada"]);
});
