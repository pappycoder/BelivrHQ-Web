import { test, expect, type BrowserContext } from "@playwright/test";

async function fixture(context: BrowserContext, failSave = false) {
  const writes: Record<string, unknown>[] = [];
  await context.addCookies([
    {
      name: "belivrhq_token",
      value: "builder-fixture",
      url: "http://127.0.0.1:3107",
    },
  ]);
  await context.route("**/api/session", (route) =>
    route.fulfill({ json: { hasSession: true } }),
  );
  await context.route("**/api/backend/**", (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/api/backend", "");
    let data: unknown = {
      data: [],
      meta: { total: 0, page: 1, limit: 15, totalPages: 0 },
    };
    const form = {
      id: "form-a",
      title: "Volunteer application",
      description: "Tell us where you would like to serve.",
      branchId: "branch-a",
      branchName: "Main Branch",
      status: "draft",
      isPublic: false,
      isTemplate: false,
      submissionLimit: 0,
      fields: [
        { key: "email", label: "Email address", type: "email", required: true },
        {
          key: "team",
          label: "Preferred team",
          type: "dropdown",
          options: ["Welcome", "Music"],
        },
      ],
    };
    if (path.endsWith("/auth/session"))
      data = { userId: "user-a", email: "admin@example.test" };
    else if (path.endsWith("/profiles/me"))
      data = {
        profileId: "profile-a",
        userId: "user-a",
        churchId: "church-a",
        firstName: "Grace",
        lastName: "Adeyemi",
        role: ["church_admin"],
        status: "active",
        branchId: "branch-a",
        branch: { name: "Main Branch" },
        church: { name: "Grace Community Church", logoUrl: null },
        planFeatures: ["forms", "members", "staff_roles"],
        permissions: [
          "forms:list:read",
          "forms:list:create",
          "forms:list:update",
          "forms:submissions:read",
        ],
      };
    else if (path.endsWith("/forms/form-a") && request.method() === "GET")
      data = form;
    else if (
      (path.endsWith("/forms") && request.method() === "POST") ||
      (path.endsWith("/forms/form-a") && request.method() === "PATCH")
    ) {
      writes.push(request.postDataJSON());
      if (failSave)
        return route.fulfill({
          status: 503,
          json: { success: false, error: { message: "Temporary save error" } },
        });
      data = { ...form, ...request.postDataJSON() };
    }
    return route.fulfill({ json: { success: true, data } });
  });
  await context.route("https://embed.tawk.to/**", (route) =>
    route.fulfill({ body: "" }),
  );
  return writes;
}

for (const width of [320, 1440]) {
  test(`live builder preview follows the Paper form at ${width}px without submitting sample answers`, async ({
    context,
    page,
  }) => {
    const writes = await fixture(context);
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/library/forms/form-a/edit");
    await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
      "Volunteer application",
    );
    await page.getByLabel("Title", { exact: true }).fill("Join a team");
    if (width === 320)
      await page
        .getByRole("button", { name: "Preview form", exact: true })
        .click();
    const preview = page.getByRole("region", {
      name: "Form preview",
      exact: true,
    });
    await expect(
      preview.getByRole("heading", { name: "Join a team", exact: true }),
    ).toBeVisible();
    await expect(
      preview.getByText("Grace Community Church", { exact: true }),
    ).toBeVisible();
    await preview
      .getByLabel("Email address", { exact: false })
      .fill("not-an-email");
    await preview
      .getByRole("combobox", { name: "Preferred team", exact: false })
      .click();
    await page.getByRole("option", { name: "Music", exact: true }).click();
    await expect(
      preview.getByRole("button", { name: "Submit response", exact: true }),
    ).toBeDisabled();
    expect(writes).toHaveLength(0);
    await preview
      .getByRole("button", { name: "Reset preview answers" })
      .click();
    await expect(
      preview.getByLabel("Email address", { exact: false }),
    ).toHaveValue("");
    await preview.getByRole("button", { name: "Expand preview" }).click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Join a team", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(
      preview.getByRole("button", { name: "Expand preview" }),
    ).toBeFocused();
    await preview
      .getByLabel("Email address", { exact: false })
      .fill("still-not-an-email");
    await page.screenshot({
      path: `/tmp/belivrhq-form-builder-live-${width}.png`,
      fullPage: true,
    });
    if (width === 320)
      await page
        .getByRole("button", { name: "Edit form", exact: true })
        .click();
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0]).toMatchObject({
      title: "Join a team",
      status: "draft",
      fields: [
        { key: "email", type: "email", required: true },
        { key: "team", type: "dropdown", options: ["Welcome", "Music"] },
      ],
    });
    expect(writes[0]).not.toHaveProperty("data");
  });
}

test("builder preserves stable identifiers, validates choices and retains edits after a failed save", async ({
  context,
  page,
}) => {
  await fixture(context, true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/library/forms/form-a/edit");
  await page
    .getByRole("button", { name: "Move question 2 up", exact: true })
    .click();
  await page
    .getByLabel("Question label", { exact: true })
    .fill("Choose a team");
  await page.getByText("Advanced: answer identifier", { exact: true }).click();
  await expect(page.getByLabel("Field Key", { exact: true })).toHaveValue(
    "team",
  );
  await page.getByLabel("Options (one per line)", { exact: true }).fill("");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "needs at least one option" })
      .first(),
  ).toBeVisible();
  await page
    .getByLabel("Options (one per line)", { exact: true })
    .fill("Welcome\nMusic");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Service temporarily unavailable" })
      .first(),
  ).toBeVisible();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    "Volunteer application",
  );
  await expect(
    page.getByRole("button", { name: "Save changes", exact: true }),
  ).toBeEnabled();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(1440);
  await page.screenshot({
    path: "/tmp/belivrhq-form-builder-desktop.png",
    fullPage: true,
  });
});

test("empty builder guides creation and mobile preview fits 320px", async ({
  context,
  page,
}) => {
  await fixture(context);
  await page.setViewportSize({ width: 320, height: 1000 });
  await page.goto("/library/forms/new");
  await expect(
    page.getByRole("heading", { name: "Start with a question" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Preview form", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your questions will appear here" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  await page.screenshot({
    path: "/tmp/belivrhq-form-builder-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Create form", exact: true }).click();
  await expect(page.getByLabel("Title", { exact: true })).toBeVisible();
  await expect(page.getByRole("alert").first()).toBeVisible();
});

test("shared dropdown arrows have more space from the field edge", async ({
  context,
  page,
}) => {
  await fixture(context);
  await page.goto("/library/forms/form-a/edit");
  const trigger = page.getByRole("combobox", {
    name: "Answer type",
    exact: true,
  });
  const inset = await trigger.evaluate(
    (el) =>
      el.getBoundingClientRect().right -
      el.lastElementChild!.getBoundingClientRect().right,
  );
  expect(inset).toBeGreaterThanOrEqual(20);
  await trigger.click();
  await page.getByRole("option", { name: "Text Area", exact: true }).click();
  await expect(trigger).toContainText("Text Area");
});
