import { expect, test, type BrowserContext } from "@playwright/test";
import { mockBotChallenges, verifyBotForm } from "../fixtures/bot-protection";

const fields = [
  { key: "firstName", label: "First name", type: "text", required: true },
  { key: "lastName", label: "Last name", type: "text", required: true },
  { key: "email", label: "Email", type: "email" },
];
const identity = {
  churchName: "Grace Community Church",
  churchLogoUrl: "/brand/belivrhq-logo.png",
};
async function fixture(
  context: BrowserContext,
  options: {
    private?: boolean;
    hq?: boolean;
    denied?: boolean;
    logo?: string | null;
    failAccept?: boolean;
  } = {},
) {
  const calls: {
    path: string;
    method: string;
    body?: Record<string, unknown>;
  }[] = [];
  const pending = new Map([
    ["members", true],
    ["visitors", true],
  ]);
  let failAccept = options.failAccept;
  if (options.private)
    await context.addCookies([
      {
        name: "belivrhq_token",
        value: "intake-fixture",
        url: "http://127.0.0.1:3107",
      },
    ]);
  await context.route("https://embed.tawk.to/**", (route) =>
    route.fulfill({ body: "" }),
  );
  await context.route("**/api/session", (route) =>
    route.fulfill({ json: { hasSession: !!options.private } }),
  );
  await context.route("**/api/backend/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api/backend", "");
    const kind = url.searchParams.get("kind") || "members";
    let data: unknown = {};
    if (path.endsWith("/profiles/me"))
      data = {
        profileId: "profile-a",
        userId: "user-a",
        churchId: "church-a",
        branchId: "branch-a",
        branch: { name: "Main Branch" },
        church: { name: identity.churchName, logoUrl: identity.churchLogoUrl },
        firstName: "Grace",
        lastName: "Staff",
        role: ["church_admin"],
        status: "active",
        isAdminHq: !!options.hq,
        planFeatures: ["forms", "giving", "reports"],
        permissions: [
          "members:all:read",
          "members:import:create",
          "visitors:list:read",
          "branches:read",
          "forms:list:read",
          "forms:list:create",
          ...(options.denied
            ? []
            : ["members:new:create", "visitors:new:create"]),
        ],
      };
    else if (path === "/branches")
      data = {
        data: [
          { branchId: "branch-a", name: "Main Branch" },
          { branchId: "branch-b", name: "North Branch" },
        ],
        total: 2,
      };
    else if (path === "/intake/links") {
      calls.push({
        path,
        method: request.method(),
        body: request.postDataJSON(),
      });
      data = {
        token: "token-a",
        branchName:
          request.postDataJSON().branchId === "branch-b"
            ? "North Branch"
            : "Main Branch",
      };
    } else if (/\/intake\/public\/[^/]+\/meta/.test(path))
      data = {
        ...identity,
        ...(options.logo !== undefined ? { churchLogoUrl: options.logo } : {}),
        title: path.includes("visitor")
          ? "Visitor registration"
          : "Member registration",
        branchName: "Main Branch",
        fields: path.includes("visitor")
          ? fields.map((f) => ({ ...f, required: f.key === "firstName" }))
          : fields,
      };
    else if (path.includes("/intake/public/") && path.endsWith("/submit")) {
      calls.push({
        path,
        method: request.method(),
        body: request.postDataJSON(),
      });
      data = { id: "new-response" };
    } else if (path === "/intake/submissions")
      data = {
        data: pending.get(kind)
          ? [
              {
                id: "response-a",
                branchId: "branch-a",
                branchName: "Main Branch",
                createdAt: "2026-11-07T10:00:00Z",
                data: {
                  firstName: "Grace",
                  lastName: "Adeyemi",
                  email: "grace@example.test",
                },
              },
            ]
          : [],
        meta: {
          total: pending.get(kind) ? 1 : 0,
          page: 1,
          limit: 15,
          totalPages: 1,
        },
      };
    else if (path.endsWith("/response-a") && request.method() === "GET")
      data = {
        id: "response-a",
        data: {
          firstName: "Grace",
          lastName: "Adeyemi",
          email: "grace@example.test",
        },
        fields,
        branchName: "Main Branch",
      };
    else if (
      path.endsWith("/accept") ||
      (path.endsWith("/response-a") && request.method() === "DELETE")
    ) {
      calls.push({
        path,
        method: request.method(),
        ...(request.method() === "POST"
          ? { body: request.postDataJSON() }
          : {}),
      });
      if (failAccept && request.method() === "POST") {
        failAccept = false;
        return route.fulfill({
          status: request.postDataJSON().data.firstName ? 409 : 400,
          json: {
            success: false,
            error: {
              message: request.postDataJSON().data.firstName
                ? "This phone already exists"
                : "First name is required",
            },
          },
        });
      }
      pending.set(kind, false);
      data = { destinationId: "created-person" };
    } else if (path === "/forms/form-a")
      data = {
        id: "form-a",
        title: "Church survey",
        description: "Tell us more",
        fields,
        status: "published",
        isPublic: false,
        ...identity,
      };
    else if (path.endsWith("/visitors/stats"))
      data = { total: 0, newThisMonth: 0, inFollowUp: 0, converted: 0 };
    else if (
      path === "/members" ||
      path === "/visitors" ||
      path === "/notifications" ||
      path === "/auth/sessions"
    )
      data = {
        data: [],
        meta: { total: 0, page: 1, limit: 15, totalPages: 1 },
      };
    else if (path === "/church/config") data = { config: {} };
    else if (path.includes("/count")) data = { count: 0 };
    return route.fulfill({ json: { success: true, data } });
  });
  await mockBotChallenges(context);
  return calls;
}

for (const kind of ["members", "visitors"]) {
  test(`public ${kind} registration works anonymously on mobile with church branding`, async ({
    context,
    page,
  }) => {
    const calls = await fixture(context);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(
      `/register/public/${kind === "visitors" ? "visitor" : "member"}-token`,
    );
    await expect(
      page.getByText(identity.churchName, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: `${identity.churchName} logo` }),
    ).toBeVisible();
    const submit = page.getByRole("button", {
      name: "Send registration",
      exact: true,
    });
    await expect(submit).toBeDisabled();
    await page.getByLabel("First name", { exact: false }).fill("Grace");
    if (kind === "members")
      await page.getByLabel("Last name", { exact: false }).fill("Adeyemi");
    if (kind === "members")
      await page.screenshot({
        path: "/tmp/belivrhq-intake-members-mobile.png",
        fullPage: true,
      });
    await verifyBotForm(page);
    await submit.click();
    await expect(
      page.getByRole("heading", { name: "Registration received" }),
    ).toBeVisible();
    expect(calls[0].body).toMatchObject({
      data: { firstName: "Grace" },
      altcha: expect.any(String),
      website: "",
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
  test(`${kind} review allows corrections and requires confirmation before accepting`, async ({
    context,
    page,
  }) => {
    const calls = await fixture(context, { private: true });
    await page.goto(`/people/${kind}`);
    await page.getByRole("tab", { name: "Pending registrations" }).click();
    await page.getByRole("button", { name: "View", exact: true }).click();
    await page.getByLabel("First name", { exact: false }).fill("Corrected");
    await page
      .getByRole("button", { name: "Approve registration", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Accept registration?", exact: true }),
    ).toBeVisible();
    expect(calls).toHaveLength(0);
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    expect(calls).toHaveLength(0);
    await page
      .getByRole("button", { name: "Approve registration", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Confirm acceptance", exact: true })
      .click();
    await expect(
      page.getByText("No pending registrations.", { exact: true }),
    ).toBeVisible();
    expect(calls).toHaveLength(1);
    expect(calls[0].body).toMatchObject({ data: { firstName: "Corrected" } });
  });
}

for (const path of [
  "/people/members",
  "/people/members/import",
  "/people/visitors",
  "/people/visitors/import",
]) {
  test(`${path} shares a fixed branch link with preview and copy controls`, async ({
    context,
    page,
  }) => {
    const calls = await fixture(context, { private: true });
    await page.goto(path);
    await page
      .getByRole("button", { name: "Public registration link", exact: true })
      .click();
    await page.getByRole("button", { name: "Get link", exact: true }).click();
    await expect(page.getByLabel("Public registration URL")).toHaveValue(
      `${new URL(page.url()).origin}/register/public/token-a`,
    );
    await expect(
      page.getByRole("link", { name: "Preview form" }),
    ).toHaveAttribute("href", `${new URL(page.url()).origin}/register/public/token-a`);
    await expect(page.getByRole("button", { name: "Copy link" })).toBeVisible();
    expect(calls[0].body).toEqual({
      kind: path.includes("visitors") ? "visitors" : "members",
      branchId: "branch-a",
    });
  });
}

test("HQ chooses a branch before generating its link", async ({
  context,
  page,
}) => {
  const calls = await fixture(context, { private: true, hq: true });
  await page.goto("/people/members");
  await page.getByRole("button", { name: "Public registration link" }).click();
  await expect(
    page.getByRole("button", { name: "Get link", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("dialog")
    .getByLabel("Registration branch", { exact: true })
    .selectOption("branch-b");
  await page.getByRole("button", { name: "Get link", exact: true }).click();
  await expect(page.getByLabel("Public registration URL")).toBeVisible();
  expect(calls[0].body?.branchId).toBe("branch-b");
});

test("rejection requires confirmation and deletes only after confirmation", async ({
  context,
  page,
}) => {
  const calls = await fixture(context, { private: true });
  await page.goto("/people/visitors");
  await page.getByRole("tab", { name: "Pending registrations" }).click();
  await page.getByRole("button", { name: "View", exact: true }).click();
  await page
    .getByRole("button", { name: "Decline registration", exact: true })
    .click();
  await expect(
    page.getByText("This cannot be undone.", { exact: false }),
  ).toBeVisible();
  expect(calls).toHaveLength(0);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(calls).toHaveLength(0);
  await page
    .getByRole("button", { name: "Decline registration", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete permanently", exact: true })
    .click();
  await expect(
    page.getByText("No pending registrations.", { exact: true }),
  ).toBeVisible();
  expect(calls[0].method).toBe("DELETE");
});

test("failed acceptance retains the draft for correction and retry", async ({
  context,
  page,
}) => {
  const calls = await fixture(context, { private: true, failAccept: true });
  await page.goto("/people/members");
  await page.getByRole("tab", { name: "Pending registrations" }).click();
  await page.getByRole("button", { name: "View", exact: true }).click();
  await page.getByLabel("First name", { exact: false }).fill("Corrected");
  await page
    .getByRole("button", { name: "Approve registration", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm acceptance", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "already exists" }),
  ).toBeVisible();
  await expect(page.getByLabel("First name", { exact: false })).toHaveValue(
    "Corrected",
  );
  expect(calls).toHaveLength(1);
  await page
    .getByRole("button", { name: "Approve registration", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm acceptance", exact: true })
    .click();
  await expect(
    page.getByText("No pending registrations.", { exact: true }),
  ).toBeVisible();
  expect(calls).toHaveLength(2);
});

test("read-only staff see neither link management nor the review queue", async ({
  context,
  page,
}) => {
  await fixture(context, { private: true, denied: true });
  await page.goto("/people/members");
  await expect(
    page.getByRole("heading", { name: "Everyone, held in one place." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Public registration link" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("tab", { name: "Pending registrations" }),
  ).toHaveCount(0);
});

test("missing church logo falls back to the app mark while keeping the church name", async ({
  context,
  page,
}) => {
  await fixture(context, { logo: null });
  await page.goto("/register/public/member-token");
  await expect(
    page.getByText(identity.churchName, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "BelivrHQ", exact: true }),
  ).toBeVisible();
});

test("failed church logo keeps church identity without app-logo substitution", async ({
  context,
  page,
}) => {
  await fixture(context, { logo: "/broken-church-logo.png" });
  await page.route("**/broken-church-logo.png", (route) =>
    route.fulfill({ status: 404, body: "" }),
  );
  await page.goto("/register/public/member-token");
  await expect(
    page.getByRole("img", { name: "Church logo unavailable" }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "BelivrHQ", exact: true }),
  ).toHaveCount(0);
});

test("private Forms-module respondents see the owning church branding", async ({
  context,
  page,
}) => {
  await fixture(context, { private: true });
  await page.goto("/library/forms/form-a/fill");
  await expect(
    page.getByRole("heading", { name: "Church survey", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByTestId("church-form-branding").getByText(identity.churchName),
  ).toBeVisible();
  await expect(
    page
      .getByTestId("church-form-branding")
      .getByRole("img", { name: `${identity.churchName} logo` }),
  ).toBeVisible();
});

test("Forms-module builder previews use church branding", async ({
  context,
  page,
}) => {
  await fixture(context, { private: true });
  await page.goto("/library/forms/new");
  const previewSwitch = page.getByRole("button", { name: "Preview form", exact: true });
  if (await previewSwitch.isVisible()) await previewSwitch.click();
  await expect(
    page.getByTestId("church-form-branding").getByText(identity.churchName),
  ).toBeVisible();
});

test("intake review highlights missing required fields after a validation error", async ({
  context,
  page,
}) => {
  await fixture(context, { private: true, failAccept: true });
  await page.goto("/people/members");
  await page.getByRole("tab", { name: "Pending registrations" }).click();
  await page.getByRole("button", { name: "View", exact: true }).click();
  const firstName = page.getByLabel("First name", { exact: false });
  await firstName.fill("");
  await page
    .getByRole("button", { name: "Approve registration", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm acceptance", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "First name is required" }),
  ).toBeVisible();
  await expect(firstName).toHaveAttribute("aria-invalid", "true");
  await firstName.fill("Grace");
  await expect(firstName).not.toHaveAttribute("aria-invalid", "true");
});
