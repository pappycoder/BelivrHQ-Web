import { expect, test, type BrowserContext, type Page } from "@playwright/test";

async function fixture(context: BrowserContext, hq = true) {
  await context.route("https://embed.tawk.to/**", (route) =>
    route.fulfill({ body: "" }),
  );
  await context.addCookies([
    {
      name: "belivrhq_token",
      value: "content-branches-fixture",
      url: "http://127.0.0.1:3107",
    },
  ]);
  await context.addInitScript(
    ({ hq }) => {
      const native = window.fetch.bind(window);
      const date = "2026-10-24T10:00:00Z";
      const branches = [
        { branchId: "west", name: "West Branch" },
        { branchId: "east", name: "East Branch" },
      ];
      const base = {
        churchId: "church",
        branchId: "west",
        branchName: "West Branch",
        createdAt: date,
        updatedAt: date,
      };
      const event = {
        ...base,
        eventId: "event",
        title: "Community Gathering",
        type: "social",
        startDate: date,
        isFree: true,
        registrationCount: 0,
      };
      const sermon = {
        ...base,
        sermonId: "sermon",
        title: "Faith Today",
        sermonDate: date,
        tags: [],
      };
      const template = {
        ...base,
        templateId: "template",
        name: "Welcome Message",
        content: "Hello",
        channel: "email",
        status: "published",
        variables: [],
        language: "en",
      };
      const form = {
        ...base,
        id: "form",
        title: "Volunteer Form",
        fields: [{ key: "name", label: "Full name", type: "text" }],
        status: "published",
        isTemplate: false,
        isPublic: false,
        submissionCount: 0,
        submissionLimit: 0,
      };
      const broadcast = {
        ...base,
        broadcastId: "broadcast",
        name: "Sunday Message",
        templateId: "template",
        templateName: "Welcome Message",
        channel: "email",
        status: "scheduled",
        scheduledAt: "2099-10-24T10:00:00Z",
        totalRecipients: 2,
      };
      const records: Record<string, object> = {
        events: event,
        sermons: sermon,
        templates: template,
        forms: form,
        broadcasts: broadcast,
      };
      const writes: {
        path: string;
        method: string;
        body: Record<string, unknown>;
      }[] = [];
      const requests: string[] = [];
      Object.assign(window, {
        contentWrites: writes,
        contentRequests: requests,
      });
      window.fetch = async (input, options) => {
        const url = new URL(
          input instanceof Request ? input.url : String(input),
          location.origin,
        );
        if (!url.pathname.startsWith("/api/")) return native(input, options);
        requests.push(url.pathname + url.search);
        if (url.pathname === "/api/session")
          return Response.json({ hasSession: true });
        const method = options?.method ?? "GET";
        const parts = url.pathname.split("/");
        const resource = parts[3];
        const record = records[resource];
        let data: unknown = {
          data: [],
          total: 0,
          meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
        };
        if (url.pathname.endsWith("/profiles/me"))
          data = {
            profileId: "profile",
            userId: "user",
            churchId: "church",
            branchId: "west",
            branch: branches[0],
            role: ["church_admin"],
            status: "active",
            isAdminHq: hq,
            firstName: "Admin",
            lastName: "Test",
            church: { churchId: "church", name: "Fixture Church" },
            planFeatures: [
              "events",
              "media",
              "forms",
              "email",
              "sms",
              "whatsapp",
              "attendance",
            ],
            permissions: [
              "branches:read",
              ...[
                "events",
                "events:list",
                "events:all",
                "events:calendar",
                "sermons",
                "sermons:list",
                "sermons:new",
                "forms",
                "forms:list",
                "forms:submissions",
                "templates",
                "broadcasts",
              ].flatMap((name) =>
                ["read", "create", "update", "delete"].map(
                  (action) => `${name}:${action}`,
                ),
              ),
            ],
          };
        else if (url.pathname.endsWith("/branches"))
          data = { data: branches, total: 2 };
        else if (record && ["POST", "PATCH"].includes(method)) {
          const body = JSON.parse(String(options?.body));
          writes.push({ path: url.pathname, method, body });
          data = {
            ...record,
            ...body,
            branchName:
              body.branchId === "east" ? "East Branch" : "West Branch",
          };
        } else if (record && parts.length === 4)
          data = {
            data: [
              resource === "templates" &&
              url.searchParams.get("branchId") === "east"
                ? { ...template, branchId: "east", branchName: "East Branch" }
                : record,
            ],
            total: 1,
            meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
          };
        else if (record && parts.length === 5) data = record;
        else if (
          /\/(tiers|registrations|attendance|comments)$/.test(url.pathname)
        )
          data = [];
        else if (url.pathname.endsWith("/stats"))
          data = { registered: 0, attended: 0, noShows: 0, walkIns: 0 };
        else if (url.pathname.endsWith("/bookmark"))
          data = { bookmarked: false };
        return Response.json({ success: true, data });
      };
    },
    { hq },
  );
}
async function chooseEast(page: Page) {
  const branch = page.getByRole("combobox", { name: /^Branch/ });
  await expect(branch).toContainText("West Branch");
  await branch.click();
  await page.getByRole("option", { name: "East Branch", exact: true }).click();
}
async function writes(page: Page) {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          contentWrites: {
            path: string;
            method: string;
            body: Record<string, unknown>;
          }[];
        }
      ).contentWrites,
  );
}

for (const [path, api] of [
  ["/events/list", "events"],
  ["/sermons", "sermons"],
  ["/communication/templates", "templates"],
  ["/communication/broadcasts", "broadcasts"],
  ["/forms", "forms"],
]) {
  test(`${api} list forwards the selected branch`, async ({
    context,
    page,
  }) => {
    await fixture(context);
    await page.goto(path);
    await page.getByRole("combobox", { name: "Filter by branch" }).click();
    await page
      .getByRole("option", { name: "East Branch", exact: true })
      .click();
    await expect
      .poll(async () =>
        page.evaluate(
          (api) =>
            (
              window as unknown as { contentRequests: string[] }
            ).contentRequests.some(
              (path) =>
                path.startsWith(`/api/backend/${api}?`) &&
                new URL(path, location.origin).searchParams.get("branchId") ===
                  "east",
            ),
          api,
        ),
      )
      .toBe(true);
  });
}
for (const [path, record] of [
  ["/events/event", "event"],
  ["/sermons/sermon", "sermon"],
  ["/forms/form", "form"],
]) {
  test(`${record} details show the saved branch`, async ({ context, page }) => {
    await fixture(context);
    await page.goto(path);
    await expect(
      page.getByText("West Branch", { exact: true }).first(),
    ).toBeVisible();
  });
}
for (const [path, title] of [
  ["/communication/templates", "Welcome Message"],
  ["/communication/broadcasts", "Sunday Message"],
]) {
  test(`${title} detail dialog shows the branch`, async ({ context, page }) => {
    await fixture(context);
    await page.goto(path);
    await page.getByText(title, { exact: true }).first().click();
    await expect(
      page.getByRole("dialog").getByText("West Branch", { exact: true }),
    ).toBeVisible();
  });
}
for (const [path, label] of [
  ["/events/event/edit", "event"],
  ["/sermons/sermon/edit", "sermon"],
  ["/forms/form/edit", "form"],
]) {
  test(`${label} edit saves the chosen branch`, async ({ context, page }) => {
    await fixture(context);
    await page.goto(path);
    await chooseEast(page);
    await page
      .getByRole("button", {
        name: label === "sermon" ? "Save Details" : "Save Changes",
        exact: true,
      })
      .click();
    await expect
      .poll(async () => (await writes(page))[0]?.body.branchId)
      .toBe("east");
    if (label === "event")
      expect((await writes(page))[0].body.type).toBe("social");
    if (label === "form")
      expect((await writes(page))[0].body.status).toBe("published");
  });
}
test("template editing preloads and updates its branch", async ({
  context,
  page,
}) => {
  await fixture(context);
  await page.goto("/communication/templates");
  await page
    .getByRole("button", { name: "More actions", exact: true })
    .first()
    .click();
  await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
  await chooseEast(page);
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect
    .poll(async () => (await writes(page))[0]?.body.branchId)
    .toBe("east");
  expect((await writes(page))[0].body.status).toBe("published");
});
test("scheduled broadcast branch editing sends the destination", async ({
  context,
  page,
}) => {
  await fixture(context);
  await page.goto("/communication/broadcasts");
  await page.getByText("Sunday Message", { exact: true }).first().click();
  await page.getByRole("button", { name: "Edit Branch", exact: true }).click();
  await chooseEast(page);
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect
    .poll(async () => (await writes(page))[0]?.body.branchId)
    .toBe("east");
});
test("branch staff edit a sermon without changing its assignment", async ({
  context,
  page,
}) => {
  await fixture(context, false);
  await page.goto("/sermons/sermon/edit");
  await expect(page.getByLabel("Branch", { exact: true })).toHaveValue(
    "West Branch",
  );
  await expect(page.getByLabel("Branch", { exact: true })).toHaveAttribute(
    "readonly",
    "",
  );
  await page.getByRole("button", { name: "Save Details", exact: true }).click();
  await expect.poll(async () => (await writes(page)).length).toBe(1);
  expect((await writes(page))[0].body).not.toHaveProperty("branchId");
});
test("new sermon sends its branch", async ({ context, page }) => {
  await fixture(context);
  await page.goto("/sermons/new");
  await chooseEast(page);
  await page.getByLabel("Title", { exact: false }).fill("Faith");
  await page.getByLabel("Date", { exact: false }).fill("2026-10-24");
  await page.getByRole("button", { name: "Save Details", exact: true }).click();
  await expect
    .poll(async () => (await writes(page))[0]?.body.branchId)
    .toBe("east");
});
test("calendar quick add includes the selected branch", async ({
  context,
  page,
}) => {
  await fixture(context);
  await page.goto("/events");
  await page.getByRole("button", { name: "Create Event", exact: true }).click();
  await chooseEast(page);
  await page.getByLabel("Event Name", { exact: false }).fill("Gathering");
  await page.getByLabel("Event Type", { exact: false }).click();
  await page.getByRole("option", { name: "Social", exact: true }).click();
  await page.getByLabel("Event Date", { exact: false }).fill("2026-10-24");
  await page.getByLabel("Start Time", { exact: false }).fill("10:00");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create Event", exact: true })
    .click();
  await expect
    .poll(async () => (await writes(page))[0]?.body.branchId)
    .toBe("east");
});
test("full event creation includes branch selection", async ({
  context,
  page,
}) => {
  await fixture(context);
  await page.goto("/events/new");
  await chooseEast(page);
  await page.getByLabel("Title", { exact: false }).fill("Gathering");
  await page.getByRole("combobox", { name: /^Type/ }).click();
  await page.getByRole("option", { name: "Social", exact: true }).click();
  await page
    .getByLabel("Start Date", { exact: false })
    .fill("2026-10-24T10:00");
  await page.getByRole("button", { name: "Create Event", exact: true }).click();
  await expect
    .poll(async () => (await writes(page))[0]?.body.branchId)
    .toBe("east");
});
test("new template includes its branch", async ({ context, page }) => {
  await fixture(context);
  await page.goto("/communication/templates");
  await page.getByRole("button", { name: "Add Template", exact: true }).click();
  await chooseEast(page);
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Template Name", { exact: false }).fill("Reminder");
  await dialog.getByLabel("Content", { exact: false }).fill("Welcome");
  await dialog
    .getByRole("button", { name: "Add Template", exact: true })
    .click();
  await expect
    .poll(async () => (await writes(page))[0]?.body.branchId)
    .toBe("east");
});
test("new form includes its branch and field definitions", async ({
  context,
  page,
}) => {
  await fixture(context);
  await page.goto("/forms/new");
  await chooseEast(page);
  await page.getByLabel("Title", { exact: true }).fill("Registration");
  await page.getByRole("button", { name: "Add Field", exact: true }).click();
  await page
    .getByPlaceholder("e.g. Full name", { exact: true })
    .fill("Full name");
  await page.getByText("Advanced: answer identifier", { exact: true }).click();
  await page.getByLabel("Field Key", { exact: true }).fill("name");
  await page.getByRole("button", { name: "Create Form", exact: true }).click();
  await expect
    .poll(async () => (await writes(page))[0]?.body.branchId)
    .toBe("east");
});
test("new broadcast uses the branch for its audience", async ({
  context,
  page,
}) => {
  await fixture(context);
  await page.goto("/communication/broadcasts/new");
  await chooseEast(page);
  await page.getByLabel("Broadcast Name", { exact: false }).fill("Reminder");
  await page.getByRole("combobox", { name: /^Template/ }).click();
  await page
    .getByRole("option", { name: "Welcome Message", exact: false })
    .click();
  await page.getByRole("button", { name: /Send Broadcast/ }).click();
  await expect
    .poll(async () => (await writes(page))[0]?.body.branchId)
    .toBe("east");
  expect((await writes(page))[0].body.audienceFilter).toMatchObject({
    branchId: "east",
  });
});
test("new sermons default to the staff member's fixed branch", async ({
  context,
  page,
}) => {
  await fixture(context, false);
  await page.goto("/sermons/new");
  await expect(page.getByLabel("Branch", { exact: false })).toHaveValue(
    "West Branch",
  );
  await expect(page.getByLabel("Branch", { exact: false })).toHaveAttribute(
    "readonly",
    "",
  );
  await page.getByLabel("Title", { exact: false }).fill("Faith");
  await page.getByLabel("Date", { exact: false }).fill("2026-10-24");
  await page.getByRole("button", { name: "Save Details", exact: true }).click();
  await expect
    .poll(async () => (await writes(page))[0]?.body.branchId)
    .toBe("west");
});
