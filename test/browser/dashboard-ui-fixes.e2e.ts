import { test, expect, type BrowserContext } from "@playwright/test";
import {
  COARSE_RESOURCES,
  EXTRA_PERMISSIONS,
  PERMISSION_ACTIONS,
  SURFACE_RESOURCES,
} from "../../src/lib/menu-catalog";

const grants = new Set<string>(EXTRA_PERMISSIONS);
for (const resource of [...COARSE_RESOURCES, ...Object.keys(SURFACE_RESOURCES)])
  for (const action of PERMISSION_ACTIONS) grants.add(`${resource}:${action}`);
for (const [resource, surfaces] of Object.entries(SURFACE_RESOURCES))
  for (const surface of surfaces)
    for (const action of PERMISSION_ACTIONS)
      grants.add(`${resource}:${surface}:${action}`);
const stamp = "2026-10-01T10:00:00Z";
const asset = {
  id: "asset-a",
  churchId: "church-a",
  name: "Sanctuary mixer",
  assetTag: "AUD-001",
  condition: "good",
  status: "active",
  salvageValue: 0,
  depreciationMethod: "straight_line",
  createdAt: stamp,
  updatedAt: stamp,
};
const form = {
  id: "form-a",
  title: "Volunteer application",
  description: "Choose your team",
  status: "published",
  isPublic: true,
  publicToken: "old-token",
  fields: [
    { key: "name", label: "Full name", type: "text", required: true },
    { key: "email", label: "Email address", type: "email", required: true },
  ],
  settings: {},
  submissionCount: 0,
  submissionLimit: 0,
  createdAt: stamp,
  updatedAt: stamp,
};

async function fixture(context: BrowserContext, failWorklist = false) {
  const calls: { method: string; path: string; body: unknown }[] = [];
  let integrationReads = 0;
  await context.addCookies([
    {
      name: "belivrhq_token",
      value: "dashboard-fixes",
      url: "http://127.0.0.1:3107",
    },
  ]);
  await context.route("**/api/session", (route) =>
    route.fulfill({ json: { hasSession: true } }),
  );
  await context.route("https://**", (route) => route.abort());
  await context.route("https://embed.tawk.to/**", route => route.fulfill({
    contentType: "application/javascript",
    body: "Object.assign(window.Tawk_API,{showWidget(){},hideWidget(){},maximize(){},shutdown(){}});window.Tawk_API?.onLoad?.();",
  }));
  await context.route("**/api/backend/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/api/backend", "");
    calls.push({
      method: request.method(),
      path,
      body: request.postDataJSON(),
    });
    let data: unknown;
    if (path === "/profiles/me")
      data = {
        profileId: "profile-a",
        userId: "user-a",
        churchId: "church-a",
        branchId: "branch-a",
        branch: { name: "Main branch" },
        church: { name: "Fixture church" },
        firstName: "Grace",
        lastName: "Reviewer",
        email: "grace@example.test",
        role: ["church_admin"],
        status: "active",
        isAdminHq: true,
        permissions: [...grants],
        planFeatures: [
          "staff_roles",
          "custom_roles",
          "giving",
          "events",
          "groups",
          "forms",
          "reports",
          "email",
          "media",
          "tickets",
          "pastoral",
          "assets",
          "analytics",
          "sms",
          "whatsapp",
          "calls",
          "webhooks",
        ],
      };
    else if (path === "/auth/session")
      data = { userId: "user-a", email: "grace@example.test" };
    else if (path.endsWith("/unread-count") || path.endsWith("/unread"))
      data = { count: 0 };
    else if (path === "/assets/worklists/loans") {
      if (failWorklist)
        return route.fulfill({
          status: 503,
          json: { success: false, error: { message: "Worklist unavailable" } },
        });
      data = {
        data: [
          {
            id: "loan-a",
            assetId: asset.id,
            assetName: asset.name,
            assetTag: asset.assetTag,
            borrowerName: "David Okoro",
            loanDate: stamp,
            expectedReturnDate: "2026-01-01",
            status: "borrowed",
            createdAt: stamp,
            updatedAt: stamp,
          },
        ],
        meta: { page: 1, limit: 15, total: 1, totalPages: 1 },
      };
    } else if (path === "/assets/worklists/maintenance")
      data = {
        data: [
          {
            id: "job-a",
            assetId: asset.id,
            assetName: asset.name,
            assetTag: asset.assetTag,
            type: "Repair",
            performedBy: "City Audio",
            scheduledDate: stamp,
            status: "scheduled",
            createdAt: stamp,
            updatedAt: stamp,
          },
        ],
        meta: { page: 1, limit: 15, total: 1, totalPages: 1 },
      };
    else if (path === "/admin/departments") data = [];
    else if (path === "/assets/categories") data = [];
    else if (path === "/assets/asset-a") data = asset;
    else if (path.startsWith("/assets/asset-a/")) data = [];
    else if (path === "/assets")
      data = {
        data: [asset],
        meta: { page: 1, limit: 15, total: 1, totalPages: 1 },
      };
    else if (path === "/forms/form-a/submissions")
      data = {
        data: [],
        meta: { page: 1, limit: 15, total: 0, totalPages: 0 },
      };
    else if (path === "/forms/form-a/regenerate-token")
      data = { ...form, publicToken: "new-token" };
    else if (path === "/forms/form-a") data = form;
    else if (path === "/forms")
      data = {
        data: [form],
        meta: { page: 1, limit: 15, total: 1, totalPages: 1 },
      };
    else if (path === "/church/integrations") {
      integrationReads++;
      data = {
        providers: [
          {
            id: "resend",
            label: "Resend",
            channels: ["email"],
            fields: [],
            help: "Fixture account",
          },
        ],
        accounts: [
          {
            id: "account-a",
            provider: "resend",
            label: "Office email",
            verification_status: "verified",
            verified_at: stamp,
            archived_at: null,
          },
        ],
        channels: [
          {
            channel: "email",
            mode: "custom",
            account_id: "account-a",
            settings: { from: "office@example.test", senderName: "Office" },
            updated_at: `2026-10-27T12:00:0${integrationReads}Z`,
          },
        ],
      };
    } else if (path === "/church/integrations/accounts/account-a/verify")
      data = { message: "Credentials checked" };
    else if (path === "/church/roles/usher/permissions")
      data = {
        roleName: "usher",
        label: "Usher",
        permissions: [
          {
            id: "inherited",
            name: "members:read",
            resource: "members",
            action: "read",
          },
          {
            id: "added",
            name: "giving:read",
            resource: "giving",
            action: "read",
          },
        ],
        defaultPermissionIds: ["inherited"],
        isCustomized: true,
        isChurchOwned: false,
      };
    else if (path === "/church/roles/all")
      data = [
        {
          id: "inherited",
          name: "members:read",
          resource: "members",
          action: "read",
        },
        {
          id: "added",
          name: "giving:read",
          resource: "giving",
          action: "read",
        },
      ];
    else if (path === "/church/roles") data = { roles: [] };
    else if (path === "/church")
      data = { churchId: "church-a", name: "Fixture church" };
    else
      data = {
        data: [],
        meta: { page: 1, limit: 15, total: 0, totalPages: 0 },
      };
    return route.fulfill({ json: { success: true, data } });
  });
  return calls;
}

for (const width of [1440, 768, 390]) {
  test(`loan worklist shows borrower and overdue date at ${width}px`, async ({
    page,
    context,
  }) => {
    const calls = await fixture(context);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/assets/loans");
    await expect(page.getByRole("cell", { name: "David Okoro" })).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "Overdue", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Current Value" }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("button", { name: "Record return", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(calls.filter((call) => call.method !== "GET")).toEqual([]);
  });
}

test("maintenance worklist shows real jobs and provider, with an editable record", async ({
  page,
  context,
}) => {
  await fixture(context);
  await page.goto("/assets/maintenance");
  await expect(
    page.getByRole("cell", { name: "Repair City Audio" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Update job" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Maintenance Type" }),
  ).toContainText("Repair");
});

test("worklist failures remain errors and can be retried", async ({
  page,
  context,
}) => {
  const calls = await fixture(context, true);
  await page.goto("/assets/loans");
  await expect(
    page.getByRole("heading", { name: "Unable to load loans" }),
  ).toBeVisible();
  await expect(page.getByText("No loans recorded.")).toHaveCount(0);
  const before = calls.filter(
    (call) => call.path === "/assets/worklists/loans",
  ).length;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect
    .poll(
      () =>
        calls.filter((call) => call.path === "/assets/worklists/loans").length,
    )
    .toBeGreaterThan(before);
});

test("full asset editor guards a dirty cancel and keeps the draft", async ({
  page,
  context,
}) => {
  await fixture(context);
  await page.goto("/assets/new");
  await page.getByLabel("Asset Name").fill("New sound desk");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page).toHaveURL(/\/assets\/new$/);
  await expect(page.getByLabel("Asset Name")).toHaveValue("New sound desk");
  await expect(
    page.getByRole("heading", { name: "Purchase and valuation" }),
  ).toBeVisible();
});

test("inherited grants are locked before editing and added grants remain removable", async ({
  page,
  context,
}) => {
  await fixture(context);
  await page.goto("/admin/roles/usher");
  await expect(
    page.getByRole("checkbox", { name: "members:read", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "members:read", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("checkbox", { name: "giving:read", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("checkbox", { name: "giving:read", exact: true })
    .uncheck();
  await expect(
    page.getByRole("checkbox", { name: "giving:read", exact: true }),
  ).not.toBeChecked();
});

test("form task views use history and retain unrelated query parameters", async ({
  page,
  context,
}) => {
  await fixture(context);
  await page.goto("/forms/form-a?context=kept");
  await expect(
    page.getByRole("tab", { name: "Responses", exact: true }),
  ).toHaveAttribute("data-state", "active");
  await page.getByRole("tab", { name: "Questions & access" }).click();
  await expect(
    page.getByRole("heading", { name: "Questions in this form" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/context=kept&tab=details/);
  await page.goBack();
  await expect(
    page.getByRole("tab", { name: "Responses", exact: true }),
  ).toHaveAttribute("data-state", "active");
});

test("question outline reorders questions without changing their stable answer keys", async ({
  page,
  context,
}) => {
  await fixture(context);
  await page.goto("/forms/form-a/edit");
  await expect(page.getByLabel("Question label", { exact: true })).toHaveValue(
    "Full name",
  );
  await page
    .getByRole("button", { name: "Move question 2 up", exact: true })
    .click();
  await expect(page.getByLabel("Question label", { exact: true })).toHaveValue(
    "Email address",
  );
  await page
    .getByText("Advanced", { exact: false })
    .filter({ hasText: "answer" })
    .click();
  await expect(page.getByLabel("Field Key", { exact: true })).toHaveValue(
    "email",
  );
  await page
    .getByLabel("Question label", { exact: true })
    .fill("Preferred email address");
  await expect(page.getByLabel("Field Key", { exact: true })).toHaveValue(
    "email",
  );
});

test("table options retain column controls behind one secondary control", async ({
  page,
  context,
}) => {
  await fixture(context);
  await page.goto("/assets/loans");
  await expect(
    page.getByRole("button", { name: "Choose visible columns" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Table options", exact: true })
    .click();
  await page.getByRole("button", { name: "Choose visible columns" }).click();
  await page
    .getByRole("menuitemcheckbox", { name: "Expected return", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("columnheader", { name: "Expected return", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("columnheader", { name: "Asset", exact: true }),
  ).toBeVisible();
});

test("asset history failure retains record context and a retry action", async ({
  page,
  context,
}) => {
  await fixture(context);
  await context.route("**/api/backend/assets/asset-a/maintenance", (route) =>
    route.fulfill({
      status: 503,
      json: { success: false, error: { message: "History unavailable" } },
    }),
  );
  await page.goto("/assets/asset-a?tab=maintenance&context=kept");
  await expect(
    page.getByRole("heading", { name: "Sanctuary mixer", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Unable to load maintenance history" }),
  ).toBeVisible();
  await expect(
    page.getByText("No maintenance records.", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("tab", { name: "Loans", exact: true }).click();
  await expect(page).toHaveURL(/tab=loans&context=kept/);
});

test("event selector failure is visible before any event is selected", async ({
  page,
  context,
}) => {
  await fixture(context);
  await context.route("**/api/backend/events?**", (route) =>
    route.fulfill({
      status: 503,
      json: { success: false, error: { message: "Events unavailable" } },
    }),
  );
  await page.goto("/events/registrations");
  await expect(
    page.getByRole("heading", { name: "Unable to load the event selector" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Try again", exact: true }),
  ).toBeVisible();
});

test("form read failure has persistent recovery", async ({ page, context }) => {
  await fixture(context);
  await context.route("**/api/backend/forms/form-a", (route) =>
    route.fulfill({
      status: 503,
      json: { success: false, error: { message: "Form unavailable" } },
    }),
  );
  await page.goto("/forms/form-a");
  await expect(
    page.getByRole("heading", { name: "Unable to load this form" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Try again", exact: true }),
  ).toBeVisible();
});

test("appointment read failures keep date filters available", async ({
  page,
  context,
}) => {
  await fixture(context);
  await context.route("**/api/backend/appointments?**", (route) =>
    route.fulfill({
      status: 503,
      json: { success: false, error: { message: "Appointments unavailable" } },
    }),
  );
  await page.goto("/appointments");
  await expect(
    page.getByRole("heading", { name: "Unable to load appointments" }),
  ).toBeVisible();
  await expect(page.getByLabel("Start date")).toBeVisible();
  await expect(page.getByLabel("End date")).toBeVisible();
  await page.setViewportSize({ width: 768, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("submission choice and review status survive a shared URL", async ({
  page,
  context,
}) => {
  await fixture(context);
  await page.goto(
    "/forms/submissions?formId=form-a&status=pending&context=kept",
  );
  await expect(
    page.getByRole("heading", { name: "Submissions", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox").filter({ hasText: "Volunteer application" }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox").filter({ hasText: "Pending" }),
  ).toBeVisible();
});

test("new questions receive unique identifiers that stay stable while relabelling", async ({
  page,
  context,
}) => {
  await fixture(context);
  await page.goto("/forms/form-a/edit");
  await page.getByRole("button", { name: "Add Field", exact: true }).click();
  await page
    .getByLabel("Question label", { exact: true })
    .fill("Preferred contact");
  await page.getByText("Advanced: answer identifier", { exact: true }).click();
  const first = await page
    .getByLabel("Field Key", { exact: true })
    .inputValue();
  expect(first).toMatch(/^field_[a-f0-9]+$/);
  await page
    .getByLabel("Question label", { exact: true })
    .fill("Primary contact");
  await expect(page.getByLabel("Field Key", { exact: true })).toHaveValue(
    first,
  );
  await page.getByRole("button", { name: "Add Field", exact: true }).click();
  await page.getByText("Advanced: answer identifier", { exact: true }).click();
  expect(
    await page.getByLabel("Field Key", { exact: true }).inputValue(),
  ).not.toBe(first);
});

test("integration refetch preserves a local sender draft across task views", async ({
  page,
  context,
}) => {
  await fixture(context);
  await page.goto("/admin/integrations");
  await page.getByRole("tab", { name: "Service routing", exact: true }).click();
  await page
    .getByLabel("Sender name", { exact: true })
    .fill("Unsaved church office");
  await page
    .getByRole("tab", { name: "Provider accounts", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Check credentials", exact: true })
    .click();
  await expect(
    page.getByText("Credentials checked", { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Service routing", exact: true }).click();
  await expect(page.getByLabel("Sender name", { exact: true })).toHaveValue(
    "Unsaved church office",
  );
});


test("member note draft survives task switching and a cancelled exit", async ({page,context})=>{
 await fixture(context);
 await context.route("**/api/backend/members/member-a",route=>route.fulfill({json:{success:true,data:{memberId:"member-a",firstName:"Grace",lastName:"Adeyemi",status:"active",gender:"female",branchId:"branch-a",memberSince:stamp,createdAt:stamp,updatedAt:stamp,notes:"Existing care context",customFields:{}}}}));
 await page.goto("/members/member-a");
 await expect(page.getByRole("heading",{name:"Grace Adeyemi",level:1})).toBeVisible();
 await page.getByPlaceholder("Add an admin note for this member...").fill("Arrange a follow-up visit");
 await page.getByRole("tab",{name:"Attendance",exact:true}).click();
 await expect(page.getByRole("heading",{name:"Attendance History"})).toBeVisible();
 await page.getByRole("tab",{name:"Overview & notes",exact:true}).click();
 await expect(page.getByPlaceholder("Add an admin note for this member...")).toHaveValue("Arrange a follow-up visit");
 page.once("dialog",dialog=>dialog.dismiss());
 await page.getByRole("main").getByRole("button",{name:"Members",exact:true}).click();
 await expect(page).toHaveURL(/\/members\/member-a/);
});


test("permission reset replaces the matrix after a reverted local edit", async ({page,context})=>{
 await fixture(context);let reset = false;
 await context.route("**/api/backend/church/roles/usher/**",route=>{
  if(new URL(route.request().url()).pathname.endsWith("/reset")) reset = true;
  return route.fulfill({json:{success:true,data:{roleName:"usher",label:"Usher",isChurchOwned:false,isCustomized:!reset,defaultPermissionIds:["inherited"],permissions:[{id:"inherited",name:"members:read",resource:"members",action:"read"},...(!reset ? [{id:"added",name:"giving:read",resource:"giving",action:"read"}] : [])]}}});
 });
 await page.goto("/admin/roles/usher");
 await page.getByRole("checkbox",{name:"giving:read",exact:true}).uncheck();
 await page.getByRole("checkbox",{name:"giving:read",exact:true}).check();
 await page.getByRole("button",{name:"Reset to Defaults",exact:true}).click();
 await page.getByRole("dialog").getByRole("button",{name:/Reset/}).click();
 await expect(page.getByRole("checkbox",{name:"giving:read",exact:true})).not.toBeChecked();
 await expect(page.getByRole("checkbox",{name:"members:read",exact:true})).toBeChecked();
});

test("validation upgrade preserves numeric asset payloads", async ({page,context})=>{
 await fixture(context);let saved:Record<string,unknown> | undefined;
 await context.route("**/api/backend/assets",route=>{
  if(route.request().method()!=="POST") return route.fallback();
  saved=route.request().postDataJSON();
  return route.fulfill({json:{success:true,data:asset}});
 });
 await page.goto("/assets/new");
 await page.getByLabel("Asset Name").fill("Updated sound desk");
 await page.getByLabel("Asset Tag").fill("AUD-002");
 await page.getByLabel("Purchase Price").fill("1250");
 await page.getByLabel("Useful Life").fill("5");
 await page.getByRole("button",{name:"Register Asset",exact:true}).click();
 await expect(page).toHaveURL(/\/assets\/asset-a$/);
 expect(saved).toMatchObject({name:"Updated sound desk",assetTag:"AUD-002",purchasePrice:1250,usefulLifeYears:5});
});

test("validation upgrade preserves numeric maintenance costs", async ({page,context})=>{
 await fixture(context);let saved:Record<string,unknown> | undefined;
 await context.route("**/api/backend/assets/asset-a/maintenance/job-a",route=>{
  saved=route.request().postDataJSON();
  return route.fulfill({json:{success:true,data:{id:"job-a",assetId:"asset-a",type:"Repair",status:"scheduled",scheduledDate:stamp,cost:75}}});
 });
 await page.goto("/assets/maintenance");
 await page.getByRole("button",{name:"Update job",exact:true}).click();
 await page.getByRole("dialog").getByLabel("Cost").fill("75");
 await page.getByRole("dialog").getByRole("button",{name:"Save Changes",exact:true}).click();
 await expect(page.getByRole("dialog")).toHaveCount(0);
 expect(saved).toMatchObject({cost:75});
});
