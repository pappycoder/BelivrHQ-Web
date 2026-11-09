import { test, expect, type BrowserContext, type Page } from "@playwright/test";

async function fixture(
  context: BrowserContext,
  options: {
    failArchive?: boolean;
    delayArchive?: boolean;
    readOnly?: boolean;
  } = {},
) {
  await context.addCookies([
    {
      name: "belivrhq_token",
      value: "manage-fixture",
      url: "http://127.0.0.1:3107",
    },
  ]);
  await context.route("https://embed.tawk.to/**", (route) =>
    route.fulfill({ body: "" }),
  );
  await context.route("**/api/session", (route) =>
    route.fulfill({ json: { hasSession: true } }),
  );
  const writes: {
    path: string;
    method: string;
    body: Record<string, unknown>;
  }[] = [];
  const member = {
    memberId: "member-a",
    churchId: "church",
    branchId: "branch",
    firstName: "Ada",
    lastName: "Rice",
    email: "ada@example.test",
    status: "active",
    memberSince: "2020-01-01",
    createdAt: "2026-11-08",
    updatedAt: "2026-11-08",
    archivedAt: null as string | null,
  };
  const visitor = {
    id: "visitor-a",
    churchId: "church",
    branchId: "branch",
    branchName: "Main Branch",
    firstName: "Ada",
    lastName: "Rice",
    firstVisitDate: "2026-11-01",
    followUpStatus: "new",
    createdAt: "2026-11-08",
    updatedAt: "2026-11-08",
  };
  const schedule = {
    id: "schedule-a",
    churchId: "church",
    memberId: "member-a",
    memberName: "Ada Rice",
    categoryId: "fund",
    categoryName: "Tithes",
    amount: 5000,
    currency: "NGN",
    frequency: "monthly",
    isActive: true,
    nextChargeDate: "2027-01-01",
    failedAttemptCount: 0,
    createdAt: "2026-11-08",
    updatedAt: "2026-11-08",
  };
  const service = {
    serviceId: "service-a",
    churchId: "church",
    branchId: "branch",
    name: "Sunday Worship",
    dayOfWeek: 0,
    recurrence: "weekly",
    startTime: "09:00",
    category: "mixed",
    isActive: true,
    archivedAt: null as string | null,
  };
  const category = {
    id: "category-a",
    churchId: "church",
    name: "Cameras",
    description: "Production cameras",
    archivedAt: null as string | null,
    createdAt: "2026-11-08",
  };
  const form = {
    id: "form-a",
    churchId: "church",
    title: "Welcome form",
    fields: [{ key: "name", label: "Name", type: "text" }],
    status: "published",
    isPublic: true,
    publicToken: "public-token",
    submissionCount: 1,
    createdAt: "2026-11-08",
    updatedAt: "2026-11-08",
  };
  const answer = {
    id: "answer-a",
    formId: "form-a",
    churchId: "church",
    data: { name: "Ada Rice" },
    status: "pending",
    createdAt: "2026-11-08",
  };
  const template = {
    templateId: "template-a",
    churchId: "church",
    name: "Welcome email",
    channel: "email",
    status: "draft",
    content: "Welcome to church",
    createdAt: "2026-11-08",
    updatedAt: "2026-11-08",
  };
  const gift = {
    transactionId: "gift-a",
    churchId: "church",
    memberId: "member-a",
    memberName: "Ada Rice",
    categoryId: "fund",
    categoryName: "Tithes",
    amount: 5000,
    currency: "NGN",
    type: "cash",
    status: "success",
    receiptNumber: "REC-001",
    createdAt: "2026-11-08",
  };
  let archiveFailures = options.failArchive ? 1 : 0;
  const page = (data: unknown[]) => ({
    data,
    total: data.length,
    meta: { total: data.length, page: 1, limit: 15, totalPages: 1 },
  });
  await context.route("**/api/backend/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname.replace("/api/backend", ""),
      method = request.method();
    const body = request.postData() ? request.postDataJSON() : {};
    if (method !== "GET") writes.push({ path, method, body });
    let data: unknown = page([]);
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
        isAdminHq: false,
        planFeatures: [
          "forms",
          "giving",
          "assets",
          "attendance",
          "events",
          "templates",
          "email",
        ],
        permissions: [
          "members:all:read",
          "members:read",
          "visitors:list:read",
          "visitors:details:read",
          "giving:records:read",
          "giving:recurring:read",
          "attendance:services:read",
          "assets:categories:read",
          "assets:list:read",
          "forms:list:read",
          "forms:submissions:read",
          "templates:read",
          ...(options.readOnly
            ? []
            : [
                "members:new:create",
                "members:all:update",
                "members:all:delete",
                "visitors:new:create",
                "visitors:list:update",
                "giving:update",
                "giving:recurring:update",
                "attendance:services:update",
                "attendance:services:delete",
                "assets:categories:update",
                "assets:categories:delete",
                "forms:list:update",
                "forms:submissions:update",
                "templates:update",
                "templates:delete",
              ]),
        ],
      };
    else if (path === "/members")
      data = page(
        member.archivedAt && !url.searchParams.get("archived") ? [] : [member],
      );
    else if (path === "/members/member-a") data = member;
    else if (path === "/members/member-a/archive") {
      if (options.delayArchive)
        await new Promise((resolve) => setTimeout(resolve, 300));
      if (archiveFailures-- > 0)
        return route.fulfill({
          status: 409,
          json: {
            success: false,
            error: { message: "Resolve the outstanding record first." },
          },
        });
      member.archivedAt = "2026-11-08";
      data = member;
    } else if (path === "/visitors/visitor-a") {
      if (method === "PATCH") Object.assign(visitor, body);
      data = visitor;
    } else if (path === "/visitors") data = page([visitor]);
    else if (path === "/giving/recurring") data = page([schedule]);
    else if (path.startsWith("/giving/recurring/schedule-a/")) {
      schedule.isActive = path.endsWith("/resume");
      data = schedule;
    } else if (path === "/services") data = page([service]);
    else if (path === "/services/service-a") {
      if (method === "PATCH") Object.assign(service, body);
      data = service;
    } else if (path === "/services/service-a/archive") {
      service.archivedAt = "2026-11-08";
      data = service;
    } else if (path === "/services/service-a/restore") {
      service.archivedAt = null;
      data = service;
    } else if (path === "/assets/categories") data = [category];
    else if (path === "/assets/categories/category-a/archive") {
      category.archivedAt = "2026-11-08";
      data = category;
    } else if (path === "/forms") data = page([form]);
    else if (path === "/forms/form-a") data = form;
    else if (path === "/forms/form-a/close") {
      form.status = "closed";
      data = form;
    } else if (path === "/forms/form-a/reopen") {
      form.status = "published";
      data = form;
    } else if (path === "/forms/form-a/regenerate-link") {
      form.publicToken = "replacement-token";
      data = form;
    } else if (path === "/forms/form-a/submissions") data = page([answer]);
    else if (path.includes("answer-a") && method !== "GET") {
      answer.status = "approved";
      data = answer;
    } else if (path === "/templates") data = page([template]);
    else if (path === "/templates/template-a/publish") {
      template.status = "published";
      data = template;
    } else if (path === "/giving/transactions") data = page([gift]);
    else if (path === "/giving/transactions/gift-a/send-receipt")
      data = { success: true, message: "Sent" };
    return route.fulfill({ json: { success: true, data } });
  });
  return { writes };
}

async function confirmWithoutEarlyWrite(
  page: Page,
  writes: unknown[],
  subject: string,
) {
  const dialog = page.getByTestId("manage-confirmation");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(subject);
  expect(writes).toHaveLength(0);
  return dialog;
}

for (const view of ["Table", "Cards"])
  test(`member archive confirms the named record from ${view}`, async ({
    page,
    context,
  }) => {
    const { writes } = await fixture(context);
    await page.goto("/people/members");
    await page.getByRole("button", { name: view, exact: true }).click();
    const action = page.getByRole("button", {
      name: "Archive member",
      exact: true,
    });
    await action.click();
    const dialog = await confirmWithoutEarlyWrite(page, writes, "Ada Rice");
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    expect(writes).toHaveLength(0);
    await action.click();
    await dialog
      .getByRole("button", { name: "Confirm action", exact: true })
      .click();
    await expect(dialog).toBeHidden();
    expect(writes.map((write) => write.path)).toEqual([
      "/members/member-a/archive",
    ]);
  });

test("failed archive remains reviewable and can be retried", async ({
  page,
  context,
}) => {
  const { writes } = await fixture(context, { failArchive: true });
  await page.goto("/people/members");
  await page.getByRole("button", { name: "Table", exact: true }).click();
  await page
    .getByRole("button", { name: "Archive member", exact: true })
    .click();
  const dialog = await confirmWithoutEarlyWrite(page, writes, "Ada Rice");
  await dialog
    .getByRole("button", { name: "Confirm action", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Resolve the outstanding record first",
  );
  expect(writes).toHaveLength(1);
  await dialog
    .getByRole("button", { name: "Confirm action", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  expect(writes).toHaveLength(2);
});

test("rapid duplicate confirmation clicks create one request", async ({
  page,
  context,
}) => {
  const { writes } = await fixture(context, { delayArchive: true });
  await page.goto("/people/members");
  await page.getByRole("button", { name: "Table", exact: true }).click();
  await page
    .getByRole("button", { name: "Archive member", exact: true })
    .click();
  const dialog = await confirmWithoutEarlyWrite(page, writes, "Ada Rice");
  await dialog
    .getByRole("button", { name: "Confirm action", exact: true })
    .evaluate((button) => {
      (button as HTMLButtonElement).click();
      (button as HTMLButtonElement).click();
    });
  await expect(
    dialog.getByRole("button", { name: "Confirming…", exact: true }),
  ).toBeDisabled();
  await expect(dialog).toBeHidden();
  expect(writes).toHaveLength(1);
});

test("recurring giving pause and resume each require confirmation", async ({
  page,
  context,
}) => {
  const { writes } = await fixture(context);
  await page.goto("/giving/schedules");
  await page
    .getByRole("button", { name: "Pause schedule", exact: true })
    .click();
  const dialog = await confirmWithoutEarlyWrite(page, writes, "Ada Rice");
  await dialog
    .getByRole("button", { name: "Confirm action", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await page
    .getByRole("button", { name: "Resume schedule", exact: true })
    .click();
  expect(writes).toHaveLength(1);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(writes).toHaveLength(1);
  await page
    .getByRole("button", { name: "Resume schedule", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Confirm action", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  expect(writes.map((write) => write.path)).toEqual([
    "/giving/recurring/schedule-a/pause",
    "/giving/recurring/schedule-a/resume",
  ]);
});

test("service pause, archive and restore are gated", async ({
  page,
  context,
}) => {
  const { writes } = await fixture(context);
  await page.goto("/gatherings/attendance/services");
  for (const label of [
    "Pause counting",
    "Archive service and keep attendance history",
    "Restore service",
  ]) {
    const previous = writes.length;
    await page.getByRole("button", { name: label, exact: true }).click();
    const dialog = page.getByTestId("manage-confirmation");
    await expect(dialog).toContainText("Sunday Worship");
    expect(writes).toHaveLength(previous);
    await dialog
      .getByRole("button", { name: "Confirm action", exact: true })
      .click();
    await expect(dialog).toBeHidden();
    expect(writes).toHaveLength(previous + 1);
  }
});

test("category dropdown keeps its confirmation after the menu closes", async ({
  page,
  context,
}) => {
  const { writes } = await fixture(context);
  await page.goto("/operations/assets/categories");
  await page
    .getByRole("button", { name: "Manage Cameras", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Archive", exact: true }).click();
  const dialog = await confirmWithoutEarlyWrite(page, writes, "Cameras");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("button", { name: "Manage Cameras", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Archive", exact: true }).click();
  await dialog
    .getByRole("button", { name: "Confirm action", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  expect(writes.map((write) => write.path)).toEqual([
    "/assets/categories/category-a/archive",
  ]);
});

test("publishing a template requires confirmation", async ({
  page,
  context,
}) => {
  const { writes } = await fixture(context);
  await page.goto("/connect/templates");
  await page
    .getByRole("button", {
      name: "Publish for use in broadcasts",
      exact: true,
    })
    .click();
  const dialog = await confirmWithoutEarlyWrite(page, writes, "Welcome email");
  await dialog
    .getByRole("button", { name: "Confirm action", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  expect(writes.map((write) => write.path)).toEqual([
    "/templates/template-a/publish",
  ]);
});

test("form state, public-link replacement and response approval require confirmation", async ({
  page,
  context,
}) => {
  const { writes } = await fixture(context);
  await page.goto("/library/forms/form-a");
  const dialog = page.getByTestId("manage-confirmation");
  for (const label of ["Close form", "Reopen", "New link", "Approve"]) {
    const count = writes.length;
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(dialog).toBeVisible();
    expect(writes).toHaveLength(count);
    if (label === "New link")
      await expect(dialog).toContainText(
        "current public link will stop working",
      );
    if (label === "Approve") await expect(dialog).toContainText("Ada Rice");
    await dialog
      .getByRole("button", { name: "Confirm action", exact: true })
      .click();
    await expect(dialog).toBeHidden();
    expect(writes).toHaveLength(count + 1);
  }
});

test("visitor status selection snapshots the new value and cancellation preserves the old value", async ({
  page,
  context,
}) => {
  const { writes } = await fixture(context);
  await page.goto("/people/visitors/visitor-a");
  const status = page
    .locator("select")
    .filter({ has: page.locator('option[value="contacted"]') });
  await status.selectOption("contacted");
  const dialog = await confirmWithoutEarlyWrite(page, writes, "Ada Rice");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(status).toHaveValue("new");
  await status.selectOption("contacted");
  await dialog
    .getByRole("button", { name: "Confirm action", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  expect(writes[0].body).toEqual({ followUpStatus: "contacted" });
  await expect(status).toHaveValue("contacted");
});

test("receipt delivery confirms outside the dropdown before sending", async ({
  page,
  context,
}) => {
  const { writes } = await fixture(context);
  await page.goto("/giving/donations");
  await page
    .getByRole("button", {
      name: "Receipt actions for gift of 5000",
      exact: true,
    })
    .click();
  await page
    .getByRole("menuitem", { name: "Send via Email", exact: true })
    .click();
  const dialog = await confirmWithoutEarlyWrite(page, writes, "Ada Rice");
  await dialog
    .getByRole("button", { name: "Confirm action", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  expect(writes).toEqual([
    {
      path: "/giving/transactions/gift-a/send-receipt",
      method: "POST",
      body: { channel: "email" },
    },
  ]);
});

test("existing destructive dialogs remain a single confirmation step", async ({
  page,
  context,
}) => {
  const { writes } = await fixture(context);
  await page.goto("/people/members");
  await page.getByRole("button", { name: "Table", exact: true }).click();
  await page
    .getByRole("button", { name: "Deactivate member", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Deactivate Member", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("manage-confirmation")).toHaveCount(0);
  expect(writes).toHaveLength(0);
});

test("read-only access exposes no mutation confirmation action", async ({
  page,
  context,
}) => {
  const { writes } = await fixture(context, { readOnly: true });
  await page.goto("/people/members");
  await page.getByRole("button", { name: "Table", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Archive member", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Deactivate member", exact: true }),
  ).toHaveCount(0);
  expect(writes).toHaveLength(0);
});

test("confirmation remains usable at 320px", async ({ page, context }) => {
  const { writes } = await fixture(context);
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/people/members");
  await page.getByRole("button", { name: "Cards", exact: true }).click();
  await page
    .getByRole("button", { name: "Archive member", exact: true })
    .click();
  const dialog = await confirmWithoutEarlyWrite(page, writes, "Ada Rice");
  expect(
    await dialog.evaluate((node) => node.getBoundingClientRect().width),
  ).toBeLessThanOrEqual(320);
  await page.screenshot({
    path: "/tmp/belivrhq-manage-confirmation-mobile.png",
    fullPage: true,
  });
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(writes).toHaveLength(0);
});
