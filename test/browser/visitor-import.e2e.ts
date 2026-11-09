import { test, expect, type BrowserContext, type Page } from "@playwright/test";

async function fixture(
  context: BrowserContext,
  options: { allowed?: boolean; failSecondBatch?: boolean } = {},
) {
  const calls: {
    path: string;
    body: {
      visitors?: Record<string, unknown>[];
      members?: Record<string, unknown>[];
      dryRun: boolean;
    };
  }[] = [];
  await context.addCookies([
    {
      name: "belivrhq_token",
      value: "import-fixture",
      url: "http://127.0.0.1:3107",
    },
  ]);
  await context.route("https://embed.tawk.to/**", (route) =>
    route.fulfill({ body: "" }),
  );
  await context.route("**/api/session", (route) =>
    route.fulfill({ json: { hasSession: true } }),
  );
  await context.route("**/api/backend/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.endsWith("/profiles/me"))
      data = {
        profileId: "profile-a",
        userId: "user-a",
        churchId: "church-a",
        branchId: "branch-a",
        branch: { name: "Main Branch" },
        firstName: "Church",
        lastName: "Admin",
        role: ["church_admin"],
        status: "active",
        isAdminHq: false,
        planFeatures: ["giving", "reports"],
        permissions: [
          "visitors:list:read",
          "members:all:read",
          "branches:read",
          ...(options.allowed === false
            ? []
            : ["visitors:new:create", "members:import:create"]),
        ],
      };
    else if (path.endsWith("/branches"))
      data = {
        data: [{ branchId: "branch-a", name: "Main Branch" }],
        total: 1,
      };
    else if (path.endsWith("/bulk-import")) {
      const body = route.request().postDataJSON();
      calls.push({ path, body });
      const records = body.visitors ?? body.members;
      const errors =
        options.failSecondBatch && records[0]?.firstName === "Visitor101"
          ? [{ row: 1, message: "Already exists" }]
          : [];
      data = {
        created: records.length - errors.length,
        errors,
        dryRun: body.dryRun,
      };
    } else if (path.endsWith("/visitors/stats"))
      data = { total: 0, newThisMonth: 0, inFollowUp: 0, converted: 0 };
    else if (
      path.endsWith("/visitors") ||
      path.endsWith("/notifications") ||
      path.endsWith("/auth/sessions")
    )
      data = {
        data: [],
        total: 0,
        meta: { total: 0, page: 1, limit: 20, totalPages: 1 },
      };
    else if (path.endsWith("/unread-count")) data = { count: 0 };
    return route.fulfill({ json: { success: true, data } });
  });
  return { calls };
}
async function upload(page: Page, csv: string) {
  await page.locator('input[type="file"]').setInputFiles({
    name: "import.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await expect(
    page.getByRole("button", { name: "Preview Import", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Preview Import", exact: true })
    .click();
  await expect(page.getByText("Preview", { exact: true })).toBeVisible();
}

test("visitors have an import entry and a preview before creating records", async ({
  context,
  page,
}) => {
  const state = await fixture(context);
  await page.goto("/visitors");
  await expect(page.getByRole("link", { name: "Import Visitors", exact: true })).toHaveAttribute("href", "/visitors/import");
  await expect(page.getByRole("button", { name: "Import Visitors", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Import Visitors", exact: true }).click();
  await expect(page).toHaveURL(/\/visitors\/import$/);
  await expect(
    page.getByText("First Visit Date", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Date of Birth", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Status", { exact: true })).toHaveCount(0);
  await upload(
    page,
    "First Name,Last Name,Phone,WhatsApp Number,Email,First Visit Date,Branch,Notes\nAmina,,+234 801 234 5678,08012345678,amina@example.com,2026-10-25,Main Branch,First visit",
  );
  expect(state.calls).toHaveLength(1);
  expect(state.calls[0].body.dryRun).toBe(true);
  expect(state.calls[0].body.visitors?.[0]).toEqual({
    firstName: "Amina",
    phone: "+234 801 234 5678",
    whatsappNumber: "08012345678",
    email: "amina@example.com",
    firstVisitDate: "2026-10-25",
    branchId: "branch-a",
    notes: "First visit",
  });
  await page
    .getByRole("button", { name: "Import Visitors", exact: true })
    .click();
  await expect(
    page.getByText("Import finished", { exact: true }),
  ).toBeVisible();
  expect(state.calls[1].body.dryRun).toBe(false);
  await expect(
    page.getByText("1 visitors were created.", { exact: true }),
  ).toBeVisible();
});

test("invalid and duplicate source rows are excluded with their spreadsheet row numbers", async ({
  context,
  page,
}) => {
  const state = await fixture(context);
  await page.goto("/visitors/import");
  await upload(
    page,
    "First Name,Email,First Visit Date\nAmina,amina@example.com,2026-10-25\n,missing@example.com,2026-02-31\nAgain,AMINA@example.com,2026-10-25",
  );
  await expect(page.getByText("Row 3", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Row 4", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Import Visitors", exact: true })
    .click();
  await expect(
    page.getByText("Import finished", { exact: true }),
  ).toBeVisible();
  expect(state.calls).toHaveLength(2);
  for (const call of state.calls) expect(call.body.visitors).toHaveLength(1);
});

test("visitor import batches at 100 and maps second-batch errors to the source row", async ({
  context,
  page,
}) => {
  const state = await fixture(context, { failSecondBatch: true });
  await page.goto("/visitors/import");
  await upload(
    page,
    "First Name\n" +
      Array.from({ length: 101 }, (_, index) => `Visitor${index + 1}`).join(
        "\n",
      ),
  );
  await expect(page.getByText("Row 102", { exact: true })).toBeVisible();
  expect(state.calls.map((call) => call.body.visitors?.length)).toEqual([
    100, 1,
  ]);
  await page
    .getByRole("button", { name: "Import Visitors", exact: true })
    .click();
  await expect(page.getByText(/^100 visitors were created\./)).toBeVisible();
  expect(state.calls.map((call) => call.body.visitors?.length)).toEqual([
    100, 1, 100, 1,
  ]);
});

test("the shared importer retains member-specific fields and endpoint", async ({
  context,
  page,
}) => {
  const state = await fixture(context);
  await page.goto("/members/import");
  await upload(
    page,
    "First Name,Last Name,Date of Birth\nGrace,Member,2000-02-29",
  );
  await page
    .getByRole("button", { name: "Import Members", exact: true })
    .click();
  await expect(
    page.getByText("Import finished", { exact: true }),
  ).toBeVisible();
  expect(state.calls[1]).toMatchObject({
    path: "/api/backend/members/bulk-import",
    body: {
      dryRun: false,
      members: [
        { firstName: "Grace", lastName: "Member", dateOfBirth: "2000-02-29" },
      ],
    },
  });
});

test("read-only visitors cannot access importing", async ({
  context,
  page,
}) => {
  const state = await fixture(context, { allowed: false });
  await page.goto("/visitors");
  await expect(
    page.getByRole("button", { name: "Import Visitors", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Import Visitors", exact: true })).toHaveCount(0);
  await page.goto("/visitors/import");
  await expect(
    page.getByRole("heading", { name: "Access denied", exact: true }),
  ).toBeVisible();
  expect(state.calls).toHaveLength(0);
});
