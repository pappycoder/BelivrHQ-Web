import { test, expect, type BrowserContext } from "@playwright/test";
import fs from "node:fs/promises";

const fields = [
  { key: "firstName", label: "First name", type: "text", required: true },
  { key: "lastName", label: "Last name", type: "text", required: true },
  { key: "email", label: "Email", type: "email" },
  { key: "dateOfBirth", label: "Date of birth", type: "date" },
  { key: "custom:language", label: "Preferred language", type: "text" },
];
async function fixture(
  context: BrowserContext,
  options: {
    readOnly?: boolean;
    hq?: boolean;
    failAccept?: boolean;
    failArchive?: boolean;
  } = {},
) {
  await context.addCookies([
    {
      name: "belivrhq_token",
      value: "list-fixture",
      url: "http://127.0.0.1:3107",
    },
  ]);
  await context.route("https://embed.tawk.to/**", (route) =>
    route.fulfill({ body: "" }),
  );
  await context.route("**/api/session", (route) =>
    route.fulfill({ json: { hasSession: true } }),
  );
  const people = [
    {
      memberId: "member-a",
      churchId: "church",
      branchId: "branch",
      firstName: "Ada",
      lastName: "Rice",
      email: "ada@example.test",
      phone: "+234001",
      dateOfBirth: "1990-05-01",
      city: "Lagos",
      status: "active",
      memberSince: "2020-01-01",
      customFields: { Region: "North" },
      createdAt: "2026-11-07",
      updatedAt: "2026-11-08",
    },
    {
      memberId: "member-b",
      churchId: "church",
      branchId: "branch",
      firstName: "Ben",
      lastName: "Rice",
      email: "ben@example.test",
      status: "active",
      memberSince: "2021-01-01",
      customFields: { Region: "South" },
      createdAt: "2026-11-08",
      updatedAt: "2026-11-08",
    },
  ];
  const pending = new Map(
    ["members", "visitors"].map((kind) => [
      kind,
      [
        {
          id: "pending-a",
          branchId: "branch",
          branchName: "Main Branch",
          createdAt: "2026-11-07T10:00:00Z",
          data: {
            firstName: "Grace",
            lastName: "Adeyemi",
            email: "grace@example.test",
            dateOfBirth: "1992-12-25",
            "custom:language": "English",
          },
        },
        {
          id: "pending-b",
          branchId: "branch",
          branchName: "Main Branch",
          createdAt: "2026-11-08T10:00:00Z",
          data: {
            firstName: "Zoe",
            lastName: "Adams",
            email: "zoe@example.test",
            "custom:language": "French",
          },
        },
      ],
    ]),
  );
  const calls: {
    path: string;
    method: string;
    body?: unknown;
    sort?: string | null;
    order?: string | null;
    branch?: string | null;
    search?: string | null;
  }[] = [];
  await context.route("**/api/backend/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname.replace("/api/backend", "");
    const kind = url.searchParams.get("kind") ?? "members";
    const rows = pending.get(kind)!;
    calls.push({
      path,
      method: req.method(),
      body: req.postData() ? req.postDataJSON() : undefined,
      sort: url.searchParams.get("sortBy"),
      order: url.searchParams.get("sortOrder"),
      branch: url.searchParams.get("branchId"),
      search: url.searchParams.get("search"),
    });
    let data: unknown = {
      data: [],
      meta: { total: 0, page: 1, limit: 15, totalPages: 1 },
    };
    if (path === "/profiles/me")
      data = {
        profileId: "staff",
        userId: "user",
        churchId: "church",
        branchId: "branch",
        branch: { name: "Main Branch" },
        church: { name: "Grace Church" },
        firstName: "Staff",
        lastName: "Test",
        role: ["secretary"],
        status: "active",
        isAdminHq: options.hq ?? false,
        planFeatures: ["forms", "giving", "reports", "assets"],
        permissions: [
          "members:all:read",
          "members:read",
          "visitors:list:read",
          "assets:list:read",
          "assets:loans:read",
          "branches:list:read",
          ...(options.readOnly
            ? []
            : [
                "members:new:create",
                "members:all:update",
                "members:all:delete",
                "visitors:new:create",
                "visitors:list:update",
                "visitors:list:delete",
              ]),
        ],
      };
    else if (path === "/branches")
      data = {
        data: [
          { branchId: "branch", name: "Main Branch" },
          { branchId: "north", name: "North Branch" },
        ],
        total: 2,
      };
    else if (path === "/members")
      data = {
        data: people.filter(
          (person) => !(person as { archivedAt?: string }).archivedAt,
        ),
        meta: { total: people.length, page: 1, limit: 15, totalPages: 1 },
      };
    else if (/^\/members\/member-[ab]\/archive$/.test(path)) {
      if (options.failArchive && path.includes("member-b"))
        return route.fulfill({
          status: 400,
          json: {
            success: false,
            error: {
              message: "Resolve this member's outstanding record first.",
            },
          },
        });
      Object.assign(
        people.find((person) => path.includes(person.memberId))!,
        { archivedAt: "2026-11-08" },
      );
      data = {};
    } else if (path === "/intake/submissions") {
      const sort = url.searchParams.get("sortBy") ?? "createdAt",
        order = url.searchParams.get("sortOrder") === "asc" ? 1 : -1;
      const branch = url.searchParams.get("branchId");
      const search = url.searchParams.get("search")?.toLowerCase();
      const filtered = rows.filter(
        (row) =>
          (!branch || row.branchId === branch) &&
          (!search ||
            Object.values(row.data).join(" ").toLowerCase().includes(search)),
      );
      const sorted = [...filtered].sort(
        (a, b) =>
          String(
            sort === "createdAt"
              ? a.createdAt
              : (a.data as Record<string, unknown>)[sort],
          ).localeCompare(
            String(
              sort === "createdAt"
                ? b.createdAt
                : (b.data as Record<string, unknown>)[sort],
            ),
          ) * order,
      );
      data = {
        fields,
        data: sorted,
        meta: { total: filtered.length, page: 1, limit: 15, totalPages: 1 },
      };
    } else if (
      /^\/intake\/submissions\/pending-[ab]$/.test(path) &&
      req.method() === "GET"
    ) {
      data = { ...rows.find((row) => path.endsWith(row.id))!, fields };
    } else if (
      /^\/intake\/submissions\/pending-[ab]\/accept$/.test(path) ||
      (/^\/intake\/submissions\/pending-[ab]$/.test(path) &&
        req.method() === "DELETE")
    ) {
      if (options.failAccept && path.endsWith("pending-b/accept"))
        return route.fulfill({
          status: 400,
          json: {
            success: false,
            error: { message: "Email is already registered." },
          },
        });
      const index = rows.findIndex((row) => path.includes(row.id));
      if (index >= 0) rows.splice(index, 1);
      data = { destinationId: "new-record" };
    } else if (path === "/assets/worklists/loans")
      data = {
        data: [
          {
            id: "loan-a",
            assetId: "asset-a",
            assetName: "Camera",
            assetTag: "CAM-1",
            assetArchived: false,
            borrowerName: "Ada Rice",
            loanDate: "2026-11-01",
            expectedReturnDate: "2027-01-01",
            status: "borrowed",
            notes: "Keep dry",
            conditionBefore: "good",
            createdAt: "2026-11-01",
            updatedAt: "2026-11-01",
          },
        ],
        meta: { total: 1, page: 1, limit: 15, totalPages: 1 },
      };
    return route.fulfill({ json: { success: true, data } });
  });
  return { calls };
}

for (const kind of ["members", "visitors"])
  test(`${kind} pending register has sorting, all response columns and direct review actions`, async ({
    page,
    context,
  }) => {
    const { calls } = await fixture(context);
    await page.goto(`/people/${kind}`);
    await page.getByRole("tab", { name: /Pending registrations/ }).click();
    const table = page.locator(`[data-list-table="pending-${kind}"]`);
    await expect(
      table.getByRole("columnheader", { name: "Person", exact: true }),
    ).toBeVisible();
    await expect(
      table.getByRole("button", { name: "Approve", exact: true }),
    ).toHaveCount(2);
    await expect(
      table.getByRole("button", { name: "Decline", exact: true }),
    ).toHaveCount(2);
    await page
      .getByRole("combobox", { name: "Sort registrations", exact: true })
      .click();
    await page.getByRole("option", { name: "First name", exact: true }).click();
    await expect
      .poll(
        () =>
          calls.filter(
            (call) =>
              call.path === "/intake/submissions" && call.sort === "firstName",
          ).length,
      )
      .toBeGreaterThan(0);
    await table
      .getByRole("button", { name: "Choose visible columns", exact: true })
      .click();
    await page
      .getByRole("menuitemcheckbox", {
        name: "Preferred language",
        exact: true,
      })
      .click();
    await page.keyboard.press("Escape");
    await expect(
      table.getByRole("columnheader", {
        name: "Preferred language",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      table.getByRole("cell", { name: "English", exact: true }),
    ).toBeVisible();
    await table
      .getByRole("button", { name: "View", exact: true })
      .first()
      .click();
    await expect(
      page.getByRole("dialog", { name: "Review registration", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await table
      .getByRole("button", { name: "Approve", exact: true })
      .first()
      .click();
    await expect(
      page.getByRole("dialog", { name: "Accept registration?", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    expect(calls.filter((call) => call.path.endsWith("/accept"))).toHaveLength(
      0,
    );
  });

for (const kind of ["members", "visitors"])
  test(`${kind} pending filters support HQ branch scope, search and clearing while preserving sorting`, async ({
    page,
    context,
  }) => {
    const { calls } = await fixture(context, { hq: true });
    await page.goto(`/people/${kind}`);
    await page.getByRole("tab", { name: /Pending registrations/ }).click();
    const filters = page.getByRole("group", {
      name: "Pending registration filters",
      exact: true,
    });
    await filters
      .getByRole("combobox", {
        name: "Filter registrations by branch",
        exact: true,
      })
      .click();
    await page
      .getByRole("option", { name: "North Branch", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "Pending registration summary" }),
    ).toContainText("North Branch");
    await expect(
      page.locator(`[data-list-table="pending-${kind}"]`),
    ).toContainText("No pending registrations.");
    await filters
      .getByRole("combobox", { name: "Sort registrations", exact: true })
      .click();
    await page.getByRole("option", { name: "First name", exact: true }).click();
    await filters
      .getByRole("button", { name: "Sort ascending", exact: true })
      .click();
    await filters.getByRole("textbox").fill("Grace");
    await expect
      .poll(
        () =>
          calls.filter(
            (call) =>
              call.path === "/intake/submissions" &&
              call.branch === "north" &&
              call.search === "Grace" &&
              call.sort === "firstName" &&
              call.order === "asc",
          ).length,
      )
      .toBeGreaterThan(0);
    await filters
      .getByRole("button", { name: "Clear filters", exact: true })
      .click();
    await expect(filters.getByRole("textbox")).toHaveValue("");
    await expect(
      filters.getByRole("combobox", {
        name: "Filter registrations by branch",
        exact: true,
      }),
    ).toContainText("All branches");
    await expect
      .poll(
        () =>
          calls.filter(
            (call) =>
              call.path === "/intake/submissions" &&
              call.branch === null &&
              call.search === "" &&
              call.sort === "firstName" &&
              call.order === "asc",
          ).length,
      )
      .toBeGreaterThan(0);
    await expect(
      page
        .locator(`[data-list-table="pending-${kind}"]`)
        .getByRole("button", { name: "View", exact: true }),
    ).toHaveCount(2);
    await expect(
      page
        .getByRole("region", { name: "Pending registration summary" })
        .getByText("2", { exact: true }),
    ).toHaveCount(2);
    await page.screenshot({
      path: `/tmp/belivrhq-pending-filters-${kind}-desktop.png`,
      fullPage: true,
    });
  });

test("bulk approval confirms once, reports validation failures and keeps the failed registration", async ({
  page,
  context,
}) => {
  const { calls } = await fixture(context, { failAccept: true });
  await page.goto("/people/members");
  await page.getByRole("tab", { name: /Pending registrations/ }).click();
  const table = page.locator('[data-list-table="pending-members"]');
  await table
    .getByRole("checkbox", { name: "Select all visible records", exact: true })
    .check();
  await expect(
    table.getByRole("checkbox", {
      name: "Select all visible rows",
      exact: true,
    }),
  ).toBeChecked();
  await table
    .getByRole("button", { name: "Approve selected", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Approve selected?",
    exact: true,
  });
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(calls.filter((call) => call.path.endsWith("/accept"))).toHaveLength(0);
  await table
    .getByRole("button", { name: "Approve selected", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Confirm action", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Email is already registered",
  );
  expect(calls.filter((call) => call.path.endsWith("/accept"))).toHaveLength(2);
  await dialog
    .getByRole("button", { name: "Close", exact: true })
    .first()
    .click();
  await expect(table.getByRole("status")).toHaveText("1 selected on this page");
  await expect(
    table.getByRole("button", { name: "View", exact: true }),
  ).toHaveCount(1);
});

test("bulk decline permanently deletes the selected visitor responses after confirmation", async ({
  page,
  context,
}) => {
  const { calls } = await fixture(context);
  await page.goto("/people/visitors");
  await page.getByRole("tab", { name: /Pending registrations/ }).click();
  const table = page.locator('[data-list-table="pending-visitors"]');
  await table
    .getByRole("checkbox", { name: "Select all visible records", exact: true })
    .check();
  await table
    .getByRole("button", { name: "Decline selected permanently", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Decline selected permanently?",
    exact: true,
  });
  await expect(dialog).toContainText(
    "permanently removed and cannot be recovered",
  );
  await dialog
    .getByRole("button", { name: "Confirm action", exact: true })
    .click();
  await expect(table).toContainText("No pending registrations.");
  expect(calls.filter((call) => call.method === "DELETE")).toHaveLength(2);
});

test("member tables preserve default columns and can show every extra business field", async ({
  page,
  context,
}) => {
  await fixture(context);
  await page.goto("/people/members");
  await page.getByRole("button", { name: "Table", exact: true }).click();
  const table = page.locator('[data-list-table="people-members-1"]');
  await expect(
    table.getByRole("columnheader", { name: "Date of birth", exact: true }),
  ).toBeHidden();
  await table
    .getByRole("button", { name: "Choose visible columns", exact: true })
    .click();
  await page
    .getByRole("menuitemcheckbox", { name: "Date of birth", exact: true })
    .click();
  await page
    .getByRole("menuitemcheckbox", { name: "Region", exact: true })
    .click();
  await page
    .getByRole("menuitemcheckbox", { name: "Branch", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(
    table.getByRole("columnheader", { name: "Branch", exact: true }),
  ).toBeHidden();
  await expect(
    table.getByRole("cell", { name: "1990-05-01", exact: true }),
  ).toBeVisible();
  await expect(
    table.getByRole("cell", { name: "North", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "/tmp/belivrhq-members-extra-columns.png",
    fullPage: true,
  });
  await table
    .getByRole("button", { name: "Choose visible columns", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Reset default columns", exact: true })
    .click();
  await expect(
    table.getByRole("columnheader", { name: "Branch", exact: true }),
  ).toBeVisible();
  await expect(
    table.getByRole("columnheader", { name: "Date of birth", exact: true }),
  ).toBeHidden();
  await table
    .getByRole("button", { name: "Choose visible columns", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Find columns", exact: true })
    .fill("WhatsApp");
  await expect(
    page.getByRole("menuitemcheckbox", { name: "WhatsApp", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("menuitem", { name: "Show all columns", exact: true })
    .click();
  await expect(
    table.getByRole("columnheader", { name: "WhatsApp", exact: true }),
  ).toBeVisible();
  await expect(table.getByRole("columnheader").last()).toHaveText("Manage");
});

test("bulk member archive uses the existing register action and leaves failures selected", async ({
  page,
  context,
}) => {
  const { calls } = await fixture(context, { failArchive: true });
  await page.goto("/people/members");
  await page.getByRole("button", { name: "Table", exact: true }).click();
  const table = page.locator('[data-list-table="people-members-1"]');
  await table
    .getByRole("checkbox", { name: "Select all visible records", exact: true })
    .check();
  await table
    .getByRole("button", { name: "Archive selected", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Archive selected?",
    exact: true,
  });
  await dialog
    .getByRole("button", { name: "Confirm action", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("outstanding record");
  await dialog
    .getByRole("button", { name: "Close", exact: true })
    .first()
    .click();
  await expect(table.getByRole("status")).toHaveText("1 selected on this page");
  expect(calls.filter((call) => call.path.endsWith("/archive"))).toHaveLength(
    2,
  );
});

test("read-only lists support selected export without exposing mutation actions", async ({
  page,
  context,
}) => {
  const { calls } = await fixture(context, { readOnly: true });
  await page.goto("/people/members");
  await page.getByRole("button", { name: "Table", exact: true }).click();
  const table = page.locator('[data-list-table="people-members-1"]');
  await table.getByRole("checkbox", { name: /^Select Ada/ }).check();
  await expect(
    table.getByRole("button", { name: /Archive selected|Deactivate selected/ }),
  ).toHaveCount(0);
  await table
    .getByRole("button", { name: "Export selected rows", exact: true })
    .click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("menuitem", { name: "Export as CSV", exact: true })
    .click();
  const contents = await fs.readFile(
    (await (await downloadPromise).path())!,
    "utf8",
  );
  expect(contents).toContain("Ada");
  expect(contents).not.toContain("Ben");
  expect(calls.filter((call) => call.method !== "GET")).toHaveLength(0);
});

test("native loan tables have selection and optional columns with real record values", async ({
  page,
  context,
}) => {
  await fixture(context);
  await page.goto("/operations/assets/loans");
  const table = page.locator('[data-slot="table"]');
  await expect(
    table.getByRole("checkbox", { name: /Select row loan-a/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Choose visible columns", exact: true })
    .click();
  await page
    .getByRole("menuitemcheckbox", { name: "Notes", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(
    table.getByRole("cell", { name: "Keep dry", exact: true }),
  ).toBeVisible();
});

for (const width of [390, 320])
  test(`pending table controls and additional columns fit ${width}px`, async ({
    page,
    context,
  }) => {
    await fixture(context);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/people/members");
    await page.getByRole("tab", { name: /Pending registrations/ }).click();
    await expect(
      page.locator('[data-list-table="pending-members"]'),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Choose visible columns", exact: true })
      .click();
    await page
      .getByRole("menuitemcheckbox", {
        name: "Preferred language",
        exact: true,
      })
      .click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu", { includeHidden: true })).toHaveCount(
      0,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `/tmp/belivrhq-pending-table-${width}.png`,
      fullPage: true,
    });
  });
