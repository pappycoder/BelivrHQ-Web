import { expect, test, type Page, type BrowserContext } from "@playwright/test";

async function session(
  context: BrowserContext,
  review = true,
  readSubmissions = true,
  failSecondOnce = false,
) {
  await context.addCookies([
    { name: "churchos_token", value: "forms-tables", url: "http://127.0.0.1:3107" },
  ]);
  await context.addInitScript(
    ({ review, readSubmissions, failSecondOnce }) => {
      const native = window.fetch.bind(window);
      const date = "2026-10-19T10:00:00Z";
      const forms = [
        {
          id: "form-a",
          title: "Volunteer application",
          description: "Choose where you would like to serve on Sundays.",
          fields: [
            { key: "name", label: "Full name", type: "text", required: true },
            { key: "email", label: "Email address", type: "email", required: true },
            {
              key: "team",
              label: "Preferred teams",
              type: "checkbox",
              options: ["Welcome", "Music"],
            },
            { key: "experience", label: "Experience", type: "textarea" },
          ],
        },
        {
          id: "form-b",
          title: "Equipment request",
          description: "Request equipment for your ministry.",
          uniqueField: "equipment",
          fields: [
            { key: "equipment", label: "Equipment name", type: "text", required: true },
            { key: "quantity", label: "Quantity", type: "number" },
            { key: "amount", label: "Amount", type: "text" },
          ],
        },
      ].map((form) => ({
        ...form,
        churchId: "church-a",
        status: "published",
        isTemplate: false,
        isPublic: false,
        submissionCount: 2,
        submissionLimit: 20,
        createdAt: date,
        updatedAt: date,
      }));
      const responses = [
        {
          id: "11111111-1111-4111-8111-111111111111",
          formId: "form-a",
          data: {
            name: "Grace Adeyemi",
            email: "grace@example.test",
            team: ["Welcome", "Music"],
            experience: "I have served on the welcome team for three years.",
          },
        },
        {
          id: "22222222-2222-4222-8222-222222222222",
          formId: "form-a",
          data: {
            name: "David Okoro",
            email: "david@example.test",
            team: ["Music"],
            experience: "Piano and singing.",
          },
        },
        {
          id: "33333333-3333-4333-8333-333333333333",
          formId: "form-b",
          data: { equipment: "Keyboard", quantity: 0, amount: "₦12,345.67" },
        },
      ].map((item) => ({ ...item, status: "pending", attachments: [], createdAt: date }));
      Object.assign(window, { formRequests: [] as string[], formPatchBodies: [] as unknown[] });
      let secondFailed = false;
      window.fetch = async (input, options) => {
        const path = new URL(input instanceof Request ? input.url : String(input), location.origin)
          .pathname;
        if (!path.startsWith("/api/")) return native(input, options);
        (window as unknown as { formRequests: string[] }).formRequests.push(
          `${options?.method || "GET"} ${path}`,
        );
        if (path === "/api/session") return Response.json({ hasSession: true });
        if (options?.method === "PATCH" && path.endsWith("/status")) {
          const body = JSON.parse(String(options.body));
          const id = path.split("/").at(-2);
          (window as unknown as { formPatchBodies: unknown[] }).formPatchBodies.push({
            id,
            ...body,
          });
          if (failSecondOnce && id?.startsWith("22222222") && !secondFailed) {
            secondFailed = true;
            return Response.json(
              { success: false, error: { message: "Temporary review error" } },
              { status: 503 },
            );
          }
          const response = responses.find((row) => row.id === id);
          if (!response || response.status !== "pending")
            return Response.json(
              { success: false, error: { message: "Only pending responses can be reviewed" } },
              { status: 400 },
            );
          response.status = body.status;
          return Response.json({ success: true, data: response });
        }
        let data: unknown = {
          data: [],
          total: 0,
          meta: { total: 0, page: 1, limit: 15, totalPages: 0 },
        };
        if (path.endsWith("/auth/session"))
          data = { userId: "user-a", email: "reader@example.test" };
        else if (path.endsWith("/profiles/me"))
          data = {
            profileId: "profile-a",
            userId: "user-a",
            churchId: "church-a",
            role: ["custom_reader"],
            status: "active",
            firstName: "Grace",
            lastName: "Reader",
            planFeatures: ["forms", "assets", "staff_roles", "custom_roles"],
            permissions: [
              "forms:list:read",
              "members:all:read",
              "assets:list:read",
              ...(readSubmissions ? ["forms:submissions:read"] : []),
              ...(review ? ["forms:submissions:update", "forms:list:update"] : []),
            ],
          };
        else if (path.endsWith("/members"))
          data = {
            data: [
              {
                memberId: "member-a",
                churchId: "church-a",
                firstName: "Grace",
                lastName: "Adeyemi",
                email: "grace@example.test",
                phone: "+2348000000000",
                status: "active",
                memberSince: date,
                createdAt: date,
                updatedAt: date,
              },
            ],
            meta: { total: 1, page: 1, limit: 15, totalPages: 1 },
          };
        else if (path.endsWith("/assets"))
          data = {
            data: ["Keyboard", "Microphone"].map((name, index) => ({
              id: `asset-${index}`,
              churchId: "church-a",
              name,
              assetTag: `ASSET-${index}`,
              condition: "good",
              status: "active",
              currentValue: 100,
              createdAt: date,
              updatedAt: date,
            })),
            meta: { total: 2, page: 1, limit: 15, totalPages: 1 },
          };
        else if (path.endsWith("/assets/stats"))
          data = { count: 2, totalPurchasePrice: 200, totalCurrentValue: 200 };
        else if (path.endsWith("/forms"))
          data = { data: forms, meta: { total: 2, page: 1, limit: 15, totalPages: 1 } };
        else {
          const form = forms.find((item) => path.endsWith(`/forms/${item.id}`));
          if (form) data = form;
          const formId = path.match(/\/forms\/(form-[ab])\/submissions/)?.[1];
          if (formId) {
            const rows = responses.filter((item) => item.formId === formId);
            data = { data: rows, meta: { total: rows.length, page: 1, limit: 15, totalPages: 1 } };
          }
        }
        return Response.json({ success: true, data });
      };
    },
    { review, readSubmissions, failSecondOnce },
  );
}

async function openTableOption(page: Page, name: string) {
  const option = page.getByRole("button", { name, exact: true });
  if (!(await option.isVisible())) await page.getByRole("button", { name: "Table options", exact: true }).click();
  await option.click();
}

const responseId = "11111111-1111-4111-8111-111111111111";

test("form detail shows its own questions, metadata and distinct answer columns", async ({
  page,
  context,
}) => {
  await session(context);
  await page.goto("/forms/form-a");
  await expect(
    page.getByRole("heading", { name: "Volunteer application", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Choose where you would like to serve on Sundays.")).toBeVisible();
  await page.getByRole("tab", { name: "Questions & access" }).click();
  await expect(page.getByRole("heading", { name: "Questions in this form" })).toBeVisible();
  await page.getByRole("tab", { name: "Responses", exact: true }).click();
  const table = page.getByRole("table", { name: "Volunteer application submissions" });
  await expect(
    table.getByRole("columnheader", { name: "Submission reference", exact: true }),
  ).toBeVisible();
  await expect(table.getByRole("columnheader", { name: "Full name", exact: false })).toBeVisible();
  await expect(table.getByRole("cell", { name: "Grace Adeyemi", exact: true })).toBeVisible();
  await expect(table.getByRole("cell", { name: "David Okoro", exact: true })).toBeVisible();
  await expect(table.getByRole("cell", { name: "Welcome, Music", exact: true })).toBeVisible();
  await page.screenshot({ path: "/tmp/churchos-form-detail.png", fullPage: true });
  await table.getByRole("button", { name: responseId, exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("dialog").getByText("grace@example.test", { exact: true }),
  ).toBeVisible();
});

test("the first two identifiers remain aligned when scrolling, resizing and hiding columns", async ({
  page,
  context,
}) => {
  await session(context);
  await page.setViewportSize({ width: 1000, height: 900 });
  await page.goto("/forms/form-a");
  const table = page.getByRole("table", { name: "Volunteer application submissions" });
  const pinned = table.locator("thead [data-pinned-column]");
  await expect(pinned).toHaveCount(2);
  const before = await pinned.evaluateAll((cells) =>
    cells.map((cell) => cell.getBoundingClientRect().x),
  );
  const scroll = table.locator("..");
  await scroll.evaluate((element) => {
    element.scrollLeft = 350;
  });
  await expect.poll(() => scroll.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await expect
    .poll(() =>
      pinned.evaluateAll((cells) =>
        cells.map((cell) => Math.round(cell.getBoundingClientRect().x)),
      ),
    )
    .toEqual(before.map(Math.round));
  await openTableOption(page, "Choose visible columns");
  await page.getByRole("menuitemcheckbox", { name: "Source", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(table.getByRole("columnheader", { name: "Source", exact: true })).toBeHidden();
  await page.setViewportSize({ width: 800, height: 900 });
  await expect
    .poll(() =>
      pinned.evaluateAll((cells) =>
        cells.length === 2
          ? Math.abs(cells[1].getBoundingClientRect().left - cells[0].getBoundingClientRect().right)
          : Infinity,
      ),
    )
    .toBeLessThan(2);
  await expect
    .poll(() =>
      table.evaluate((element) => {
        const cells = Array.from(element.querySelectorAll("thead [data-pinned-column]"));
        if (cells.length !== 2) return Infinity;
        const width = cells.reduce((total, cell) => total + cell.getBoundingClientRect().width, 0);
        return width / element.parentElement!.clientWidth;
      }),
    )
    .toBeLessThan(0.72);
  const body = table.locator("tbody tr").first();
  await expect
    .poll(async () =>
      Math.abs(
        (await body.locator('[data-pinned-column="1"]').boundingBox())!.x -
          (await pinned.nth(1).boundingBox())!.x,
      ),
    )
    .toBeLessThan(2);
});

test("desktop row actions stay discoverable through hover and keyboard focus", async ({ page, context }) => {
  await session(context);
  await page.goto("/forms/form-a");
  const action = page.getByRole("button", { name: `View submission ${responseId}`, exact: true });
  await expect
    .poll(() => action.evaluate((element) => getComputedStyle(element).opacity))
    .toBe("1");
  await page.getByRole("row").filter({ hasText: "Grace Adeyemi" }).hover();
  await expect
    .poll(() => action.evaluate((element) => getComputedStyle(element).opacity))
    .toBe("1");
  await page.getByRole("heading", { name: "Volunteer application", exact: true }).hover();
  await expect
    .poll(() => action.evaluate((element) => getComputedStyle(element).opacity))
    .toBe("1");
  await action.focus();
  await expect
    .poll(() => action.evaluate((element) => getComputedStyle(element).opacity))
    .toBe("1");
});

for (const width of [390, 1024])
  test(`touch actions stay visible at ${width}px`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      hasTouch: true,
      isMobile: true,
      baseURL: "http://127.0.0.1:3107",
    });
    await session(context);
    const page = await context.newPage();
    await page.goto("/forms/form-a");
    const action = page.getByRole("button", { name: `View submission ${responseId}`, exact: true });
    await expect
      .poll(() => action.evaluate((element) => getComputedStyle(element).opacity))
      .toBe("1");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (width === 390)
      await page.screenshot({ path: "/tmp/churchos-form-detail-mobile.png", fullPage: true });
    await context.close();
  });

test("switching forms replaces answer headers and records", async ({ page, context }) => {
  await session(context);
  await page.goto("/forms/submissions");
  await page.getByRole("combobox").filter({ hasText: "Select a form" }).click();
  await page.getByRole("option", { name: "Volunteer application" }).click();
  await expect(
    page.getByRole("table", { name: "Volunteer application submissions" }),
  ).toBeVisible();
  await page.getByRole("combobox").filter({ hasText: "Volunteer application" }).click();
  await page.getByRole("option", { name: "Equipment request" }).click();
  const table = page.getByRole("table", { name: "Equipment request submissions" });
  await expect(
    table.getByRole("columnheader", { name: "Equipment name", exact: false }),
  ).toBeVisible();
  await expect(table.getByRole("cell", { name: "Keyboard", exact: true })).toBeVisible();
  await expect(table.getByRole("cell", { name: "0", exact: true }).first()).toBeVisible();
  await expect(
    table.getByRole("columnheader", { name: "Email address", exact: false }),
  ).toHaveCount(0);
  await expect(table.getByText("Grace Adeyemi")).toHaveCount(0);
});

test("form readers without submissions permission never fetch responses", async ({
  page,
  context,
}) => {
  await session(context, false, false);
  await page.goto("/forms/form-a");
  await expect(page.getByRole("heading", { name: "Questions in this form" })).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  const requests = await page.evaluate(
    () => (window as unknown as { formRequests: string[] }).formRequests,
  );
  expect(requests.some((path) => path.includes("/submissions"))).toBe(false);
  await expect(page.getByRole("button", { name: "More form actions" })).toHaveCount(0);
});

test("selection checkboxes do not displace the two record identifiers", async ({
  page,
  context,
}) => {
  await session(context);
  await page.goto("/members");
  const table = page.getByRole("table").first();
  await expect(table.locator("thead [data-pinned-column]")).toHaveText(["Member", "Contact"]);
  await page.getByRole("checkbox", { name: "Select Grace Adeyemi", exact: true }).check();
  await expect(
    page.getByRole("checkbox", { name: "Select Grace Adeyemi", exact: true }),
  ).toBeChecked();
  await expect(table.locator("thead th").first()).not.toHaveAttribute("data-pinned-column");
});

test("fill view identifies the opened form and labels its questions", async ({ page, context }) => {
  await session(context, false, false);
  await page.goto("/forms/form-a/fill");
  await expect(
    page.getByRole("heading", { name: "Volunteer application", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("4 questions", { exact: true })).toBeVisible();
  await expect(page.getByText("2 required", { exact: true })).toBeVisible();
  await page.getByLabel("Full name", { exact: false }).fill("Grace Adeyemi");
  await expect(page.getByLabel("Full name", { exact: false })).toHaveValue("Grace Adeyemi");
});

test("pinned separator appears only after horizontal scrolling and clears at the origin", async ({
  page,
  context,
}) => {
  await session(context);
  await page.setViewportSize({ width: 1000, height: 900 });
  await page.goto("/forms/form-a");
  const table = page.getByRole("table", { name: "Volunteer application submissions" });
  const divider = table.locator('thead [data-pinned-column="1"]');
  const scroll = table.locator("..");
  await expect(divider).toBeVisible();
  await expect
    .poll(() => divider.evaluate((element) => getComputedStyle(element).boxShadow))
    .toBe("none");
  await scroll.evaluate((element) => {
    element.scrollLeft = 300;
  });
  await expect
    .poll(() => divider.evaluate((element) => getComputedStyle(element).boxShadow))
    .not.toBe("none");
  await scroll.evaluate((element) => {
    element.scrollLeft = 0;
  });
  await expect
    .poll(() => divider.evaluate((element) => getComputedStyle(element).boxShadow))
    .toBe("none");
  await page.setViewportSize({ width: 1600, height: 1000 });
  await openTableOption(page, "Column actions");
  await page.getByRole("button", { name: "Select all columns", exact: true }).click();
  await page.getByRole("button", { name: "Hide selected", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect
    .poll(() => scroll.evaluate((element) => element.scrollWidth <= element.clientWidth + 1))
    .toBe(true);
  await expect
    .poll(() => divider.evaluate((element) => getComputedStyle(element).boxShadow))
    .toBe("none");
});

test("row and column compaction preserve numeric/currency widths and full headers", async ({
  page,
  context,
}) => {
  await session(context);
  await page.goto("/forms/form-b");
  const table = page.getByRole("table", { name: "Equipment request submissions" });
  const quantity = table.getByRole("columnheader", { name: "Quantity", exact: true });
  const amount = table.getByRole("columnheader", { name: "Amount", exact: true });
  await expect(quantity).toHaveAttribute("data-value-type", "numeric");
  await expect(amount).toHaveAttribute("data-value-type", "numeric");
  const initial = await quantity.evaluate((element) => ({
    width: element.getBoundingClientRect().width,
    height: element.getBoundingClientRect().height,
    font: getComputedStyle(element).fontSize,
  }));
  const moneyWidth = (await amount.boundingBox())!.width;
  const firstRow = table.locator("tbody tr").first();
  const rowHeight = (await firstRow.boundingBox())!.height;
  await openTableOption(page, "Table view");
  await page.getByRole("button", { name: "Compact rows", exact: true }).click();
  await page.getByRole("button", { name: "Compact columns", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(table).toHaveAttribute("data-compact-rows", "true");
  await expect.poll(async () => (await firstRow.boundingBox())!.height).toBeLessThan(rowHeight);
  await expect
    .poll(async () => Math.abs((await quantity.boundingBox())!.width - initial.width))
    .toBeLessThan(2);
  await expect
    .poll(async () => Math.abs((await amount.boundingBox())!.width - moneyWidth))
    .toBeLessThan(2);
  expect(await quantity.evaluate((element) => getComputedStyle(element).fontSize)).toBe(
    initial.font,
  );
  expect((await quantity.boundingBox())!.height).toBe(initial.height);
  await expect(table.getByRole("cell", { name: "₦12,345.67", exact: true })).toBeVisible();
  await openTableOption(page, "Table view");
  await page.getByRole("button", { name: "Comfortable rows", exact: true }).click();
  await page.getByRole("button", { name: "Expand columns", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(table).toHaveAttribute("data-compact-rows", "false");
  await expect(table).toHaveAttribute("data-compact-columns", "false");
});

test("multiple columns can be compacted, hidden, shown and expanded together", async ({
  page,
  context,
}) => {
  await session(context);
  await page.goto("/forms/form-a");
  const table = page.getByRole("table", { name: "Volunteer application submissions" });
  await openTableOption(page, "Column actions");
  await page.getByRole("checkbox", { name: "Select column Preferred teams", exact: true }).check();
  await page.getByRole("checkbox", { name: "Select column Experience", exact: true }).check();
  await page.getByRole("button", { name: "Compact selected", exact: true }).click();
  await expect(
    table.getByRole("columnheader", { name: "Experience", exact: true }),
  ).toHaveAttribute("data-column-size", "compact");
  await expect(
    table.getByRole("columnheader", { name: "Preferred teams", exact: true }),
  ).toHaveAttribute("data-column-size", "compact");
  const text = table.getByRole("cell", {
    name: "I have served on the welcome team for three years.",
    exact: true,
  });
  await expect
    .poll(() =>
      text
        .locator('[data-slot="table-cell-content"] > span')
        .evaluate((element) => element.scrollWidth > element.clientWidth),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Hide selected", exact: true }).click();
  await expect(table.getByRole("columnheader", { name: "Experience", exact: true })).toBeHidden();
  await expect(
    table.getByRole("columnheader", { name: "Preferred teams", exact: true }),
  ).toBeHidden();
  await page.getByRole("button", { name: "Show selected", exact: true }).click();
  await page.getByRole("button", { name: "Expand selected", exact: true }).click();
  await expect(
    table.getByRole("columnheader", { name: "Experience", exact: true }),
  ).toHaveAttribute("data-column-size", "expanded");
});

test("bulk review retains only failed responses for a focused retry", async ({ page, context }) => {
  await session(context, true, true, true);
  await page.goto("/forms/form-a");
  await page.getByRole("checkbox", { name: "Select all submissions on this page" }).check();
  await page.getByRole("button", { name: "Approve selected", exact: true }).click();
  await page.getByRole("button", { name: "Confirm approval", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "remain selected for retry" }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: `Select submission ${responseId}`, exact: true }),
  ).not.toBeChecked();
  const secondId = "22222222-2222-4222-8222-222222222222";
  await expect(
    page.getByRole("checkbox", { name: `Select submission ${secondId}`, exact: true }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Approve selected", exact: true }).click();
  await page.getByRole("button", { name: "Confirm approval", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: `Select submission ${secondId}`, exact: true }),
  ).not.toBeChecked();
  const calls = await page.evaluate(
    () => (window as unknown as { formPatchBodies: { id: string }[] }).formPatchBodies,
  );
  expect(calls.filter((call) => call.id === responseId)).toHaveLength(1);
  expect(calls.filter((call) => call.id === secondId)).toHaveLength(2);
});

test("bulk rejection requires a reason and sends it only to selected responses", async ({
  page,
  context,
}) => {
  await session(context);
  await page.goto("/forms/form-a");
  await page
    .getByRole("checkbox", { name: `Select submission ${responseId}`, exact: true })
    .check();
  await page.getByRole("button", { name: "Reject selected", exact: true }).click();
  await expect(page.getByRole("button", { name: "Confirm rejection", exact: true })).toBeDisabled();
  await page
    .getByLabel("Rejection reason", { exact: true })
    .fill("Please complete the missing details.");
  await page.getByRole("button", { name: "Confirm rejection", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const calls = await page.evaluate(
    () =>
      (
        window as unknown as {
          formPatchBodies: { id: string; status: string; rejectionReason: string }[];
        }
      ).formPatchBodies,
  );
  expect(calls).toEqual([
    { id: responseId, status: "rejected", rejectionReason: "Please complete the missing details." },
  ]);
});

test("read-only selections can export but cannot bulk-review", async ({ page, context }) => {
  await session(context, false);
  await page.goto("/forms/form-a");
  await page.getByRole("checkbox", { name: "Select all submissions on this page" }).check();
  await expect(
    page.getByRole("button", { name: "Export selected rows", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve selected", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Reject selected", exact: true })).toHaveCount(0);
});

test("selected-row export excludes other records in an export-enabled collection", async ({
  page,
  context,
}) => {
  await session(context, false);
  await page.goto("/assets");
  await page.getByRole("checkbox", { name: "Select row asset-0", exact: true }).check();
  await page.getByRole("button", { name: "Export selected rows", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Export as CSV", exact: true }).click();
  const file = await download;
  const { readFile } = await import("node:fs/promises");
  const bytes = await readFile((await file.path())!);
  expect(bytes.toString()).toContain("Keyboard");
  expect(bytes.toString()).not.toContain("Microphone");
});

test("native dropdown arrows have an inset and retain forced-colour accessibility", async ({ context, page }) => {
  await session(context, false);
  await page.goto("/operations/assets");
  const select = page.getByRole("combobox", { name: "Category filter", exact: true });
  await expect(select).toHaveCSS("appearance", "none");
  expect(await select.evaluate(el => parseFloat(getComputedStyle(el).paddingRight))).toBeGreaterThanOrEqual(40);
  expect(await select.evaluate(el => getComputedStyle(el).backgroundPosition)).toContain("21.25px");
  await page.emulateMedia({ forcedColors: "active" });
  await expect(select).toHaveCSS("appearance", "auto");
  await expect(select).toHaveCSS("background-image", "none");
});
