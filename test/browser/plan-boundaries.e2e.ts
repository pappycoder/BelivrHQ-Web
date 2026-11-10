import { test, expect, type BrowserContext } from "@playwright/test";
async function fixture(
  context: BrowserContext,
  features: string[] | undefined,
  role = "branch_pastor",
  readOnly = false,
) {
  await context.route("https://embed.tawk.to/**", (route) =>
    route.fulfill({ body: "" }),
  );
  await context.addCookies([
    {
      name: "belivrhq_token",
      value: "plan-fixture",
      url: "http://127.0.0.1:3107",
    },
  ]);
  await context.addInitScript(
    ({ features, role, readOnly }) => {
      const original = window.fetch.bind(window);
      const requests: string[] = [];
      (window as unknown as { planRequests: string[] }).planRequests = requests;
      window.fetch = async (input, options) => {
        const path = new URL(
          input instanceof Request ? input.url : String(input),
          location.origin,
        ).pathname;
        if (!path.startsWith("/api/")) return original(input, options);
        requests.push(path);
        if (path === "/api/session")
          return new Response(JSON.stringify({ hasSession: true }));
        const profile = {
          profileId: "p",
          subscriptionReadOnly: readOnly,
          userId: "u",
          churchId: "c",
          role: [role],
          status: "active",
          firstName: "Plan",
          lastName: "Test",
          isAdminHq: true,
          planFeatures: features,
          permissions: [
            ...(role === "church_admin"
              ? [
                  "integrations:read",
                  "integrations:update",
                  "roles:read",
                  "roles:update",
                  "attendance:services:create",
                  "attendance:services:update",
                  "users:read",
                  "profiles:read",
                  "profiles:create",
                ]
              : []),
            ...(readOnly ? ["members:new:create"] : []),
            "members:all:read",
            "members:read",
            "families:read",
            "attendance:dashboard:read",
            "attendance:records:read",
            "attendance:reports:read",
            "attendance:services:read",
            "visitors:list:read",
            "giving:view",
            "giving:dashboard:read",
            "giving:categories:read",
            "giving:records:read",
            "giving:records:create",
            "events:create",
            "events:tickets:create",
            "events:calendar:read",
            "events:all:read",
            "events:list:read",
            "events:registrations:read",
            "events:tickets:read",
            "events:checkin:read",
            "events:checkin:create",
            "departments:read",
            "cell_groups:read",
            "forms:view",
            "forms:list:read",
            "assets:list:read",
            "pastoral:notes:read",
            "appointments:read",
            "sermons:list:read",
            "media:library:read",
            "templates:read",
            "broadcasts:read",
            "giving:reports:read",
            "reports:view",
            "reports:financial:read",
            "reports:attendance:read",
            "reports:members:read",
          ],
        };
        const data = path.endsWith("/profiles/me")
          ? profile
          : path.endsWith("/reports/attendance")
            ? {
                startDate: "2026-10-01",
                endDate: "2026-10-22",
                totalAttendance: 0,
                serviceCount: 0,
                averagePerService: 0,
                byService: [],
                monthlyTrend: [],
              }
            : path.endsWith("/reports/members")
              ? {
                  startDate: "2026-10-01",
                  endDate: "2026-10-22",
                  totalMembers: 0,
                  newMembersInPeriod: 0,
                  activeMembers: 0,
                  byStatus: [],
                  byGender: [],
                  monthlyGrowth: [],
                }
              : path.endsWith("/reports/financial")
                ? {
                    startDate: "2026-10-01",
                    endDate: "2026-10-22",
                    grandTotal: 25000,
                    transactionCount: 2,
                    averageAmount: 12500,
                    byCategory: [],
                    monthlyTrend: [],
                  }
                : path.endsWith("/church/roles")
                  ? {
                      roles: [
                        "super_admin",
                        "senior_pastor",
                        "church_admin",
                      ].map((roleName) => ({
                        roleName,
                        permissions: [],
                        description: null,
                        isCustomized: false,
                      })),
                    }
                  : path.endsWith("/church/roles/all")
                    ? []
                    : path.endsWith("/attendance/summary")
                      ? {
                          totalCheckIns: 42,
                          memberCheckIns: 30,
                          visitorCheckIns: 12,
                          bySource: {},
                          byCategory: {},
                          byGender: {},
                        }
                      : path.endsWith("/attendance/trends")
                        ? []
                        : path.endsWith("/church/integrations")
                          ? {
                              providers: [
                                {
                                  id: "paystack",
                                  label: "Paystack",
                                  channels: ["payment"],
                                  fields: [],
                                  help: "Connect your payment account.",
                                },
                                {
                                  id: "flutterwave",
                                  label: "Flutterwave",
                                  channels: ["payment"],
                                  fields: [],
                                  help: "Connect your payment account.",
                                },
                              ],
                              accounts: [],
                              channels: [
                                {
                                  channel: "payment",
                                  mode: "disabled",
                                  account_id: null,
                                  settings: {},
                                  updated_at: "",
                                },
                              ],
                            }
                          : {
                              data: [],
                              meta: {
                                page: 1,
                                limit: 15,
                                total: 0,
                                totalPages: 1,
                              },
                            };
        return new Response(JSON.stringify({ success: true, data }), {
          headers: { "Content-Type": "application/json" },
        });
      };
    },
    { features, role, readOnly },
  );
}
test("Essentials blocks paid pages and hides their nested navigation without fetching module data", async ({
  page,
  context,
}) => {
  await fixture(context, ["giving"]);
  for (const path of [
    "/departments",
    "/departments/cell-groups",
    "/forms",
    "/events/management",
    "/events/check-in",
    "/pastoral",
    "/assets",
    "/sermons",
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", {
        name: "This feature is available on a different plan",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "View historical records" }),
    ).toHaveCount(0);
    const requests = await page.evaluate(
      () => (window as unknown as { planRequests: string[] }).planRequests,
    );
    expect(
      requests.some((path) =>
        /^\/api\/v1\/(giving|forms|events|pastoral|assets|sermons|admin\/(departments|cell-groups))(\/|$)/.test(
          path,
        ),
      ),
    ).toBe(false);
  }
});
test("Essentials can use giving categories and records while analytics stays locked", async ({
  page,
  context,
}) => {
  await fixture(context, ["giving", "reports"]);
  await page.goto("/giving/categories");
  await expect(
    page.getByRole("heading", { name: "Categories", exact: true }),
  ).toBeVisible();
  await page.goto("/giving/records");
  await expect(
    page.getByRole("heading", { name: "Records", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Send to giver…")).toHaveCount(0);
  await page.goto("/analytics/giving");
  await expect(
    page.getByText("Available on Network and higher plans."),
  ).toBeVisible();
});
test("Community includes event check-in while keeping ticket management on Network", async ({
  page,
  context,
}) => {
  await fixture(context, [
    "giving",
    "events",
    "groups",
    "forms",
    "reports",
    "email",
    "media",
  ]);
  await page.goto("/giving/categories");
  await expect(
    page.getByRole("heading", { name: "Categories", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Tickets", exact: true }),
  ).toHaveCount(0);
  for (const path of ["/events/management"]) {
    await page.goto(path);
    await expect(
      page.getByText("Available on Network and higher plans."),
    ).toBeVisible();
  }
  await page.goto("/events/check-in");
  await expect(
    page.getByRole("heading", { name: "Event Check-In", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Select an event above to start checking people in."),
  ).toBeVisible();
});
test("missing plan entitlements fail closed for paid modules", async ({
  page,
  context,
}) => {
  await fixture(context, undefined);
  await page.goto("/forms");
  await expect(
    page.getByRole("heading", {
      name: "This feature is available on a different plan",
    }),
  ).toBeVisible();
});

test("Community creates free events while paid-event controls require Network", async ({
  page,
  context,
}) => {
  await fixture(context, [
    "giving",
    "events",
    "groups",
    "forms",
    "reports",
    "email",
    "media",
  ]);
  await page.goto("/events/new");
  await expect(page.getByRole("switch")).toBeDisabled();
  await expect(page.getByRole("switch")).toBeChecked();
  await expect(
    page.getByText(
      "Paid events require Network or above and ticket management access.",
    ),
  ).toBeVisible();
});

test("Community keeps check-in separate from registrations and records roster and walk-in attendance", async ({
  page,
  context,
}) => {
  await fixture(context, [
    "giving",
    "events",
    "groups",
    "forms",
    "reports",
    "email",
    "media",
  ]);
  await context.addInitScript(() => {
    const previous = window.fetch.bind(window);
    const event = {
      eventId: "community-event",
      title: "Community Gathering",
      type: "conference",
      isFree: true,
      startDate: "2026-10-25T09:00:00Z",
      registrationCount: 1,
      branchId: "branch-a",
    };
    const calls: { path: string; body: Record<string, unknown> }[] = [];
    (
      window as unknown as { eventCheckInCalls: typeof calls }
    ).eventCheckInCalls = calls;
    const attendance: Record<string, unknown>[] = [];
    window.fetch = async (input, options) => {
      const path = new URL(
        input instanceof Request ? input.url : String(input),
        location.origin,
      ).pathname;
      let data: unknown;
      if (path.endsWith("/events"))
        data = {
          data: [event],
          meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
        };
      else if (path.endsWith("/events/community-event")) data = event;
      else if (path.endsWith("/events/community-event/registrations"))
        data = [
          {
            registrationId: "reg-a",
            eventId: event.eventId,
            memberId: "member-a",
            memberName: "Grace Member",
            quantity: 1,
            createdAt: "2026-10-24T09:00:00Z",
            paymentStatus: "paid",
            checkedIn: attendance.length > 0,
          },
        ];
      else if (path.endsWith("/events/community-event/attendance"))
        data = attendance;
      else if (path.endsWith("/attendance-sessions"))
        data = {
          data: [],
          meta: { total: 0, page: 1, limit: 20, totalPages: 1 },
        };
      else if (path.endsWith("/members"))
        data = {
          data: [
            { memberId: "member-a", firstName: "Grace", lastName: "Member" },
          ],
          meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
        };
      else if (
        path.endsWith("/check-in") ||
        path.endsWith("/check-in/walk-in")
      ) {
        const body = JSON.parse(String(options?.body));
        calls.push({ path, body });
        const record = {
          attendanceId: `attendance-${calls.length}`,
          memberId: body.memberIds ? "member-a" : undefined,
          memberName: body.memberIds ? "Grace Member" : undefined,
          visitorName: body.memberIds
            ? undefined
            : `${body.firstName} ${body.lastName}`,
          checkInAt: "2026-10-25T09:00:00Z",
          source: "manual",
        };
        attendance.push(record);
        data = body.memberIds ? { checkedIn: 1, skipped: 0 } : record;
      } else return previous(input, options);
      return Response.json({ success: true, data });
    };
  });
  await page.goto("/events/community-event");
  await page.getByRole("tab", { name: "Attendance", exact: true }).click();
  await page
    .getByRole("button", { name: "Check In Attendees", exact: true })
    .click();
  await expect(page).toHaveURL(/\/events\/check-in\?eventId=community-event$/);
  await expect(page.getByRole("combobox").first()).toContainText(
    "Community Gathering",
  );
  await page.goto("/events/registrations");
  await page
    .getByRole("combobox", { name: "Select Event", exact: true })
    .click();
  await page.getByRole("option", { name: /Community Gathering/ }).click();
  await expect(
    page.getByRole("link", { name: "Check In Attendees", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Check In Attendees", exact: true }),
  ).toHaveCount(0);
  await page.goto("/events/check-in?eventId=community-event");
  const roster = page.getByLabel("Attendance roster", { exact: true });
  await expect(roster).toBeVisible();
  await page.getByLabel("Attendance Date", { exact: true }).fill("2026-10-24");
  await roster
    .getByRole("checkbox", { name: "Select Grace Member", exact: true })
    .click();
  await roster
    .getByRole("button", { name: "Mark attendance (1)", exact: true })
    .click();
  await expect(
    page.getByText("1 attendance records saved", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Walk-In", exact: true }).click();
  await page.getByLabel("First Name", { exact: true }).fill("New");
  await page.getByLabel("Last Name", { exact: true }).fill("Visitor");
  await page.getByLabel("Phone", { exact: true }).fill("08012345678");
  await page
    .getByRole("button", { name: "Check In Walk-In", exact: true })
    .click();
  await expect(
    page.getByText("New Visitor checked in", { exact: true }),
  ).toBeVisible();
  const calls = await page.evaluate(
    () =>
      (
        window as unknown as {
          eventCheckInCalls: { path: string; body: Record<string, unknown> }[];
        }
      ).eventCheckInCalls,
  );
  expect(calls).toEqual([
    {
      path: "/api/backend/events/community-event/check-in",
      body: { memberIds: ["member-a"], attendanceDate: "2026-10-24" },
    },
    {
      path: "/api/backend/events/community-event/check-in/walk-in",
      body: { firstName: "New", lastName: "Visitor", phone: "08012345678" },
    },
  ]);
});

test("Essentials administrators can configure payments without email or messaging channels", async ({
  page,
  context,
}) => {
  await fixture(context, ["giving", "reports"], "church_admin");
  await page.goto("/admin/integrations");
  await expect(
    page.getByRole("heading", { name: "Payments", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Provider", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Email", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "WhatsApp", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "SMS", exact: true }),
  ).toHaveCount(0);
});

for (const role of ["church_admin", "branch_pastor"]) {
  test(`Essentials ${role} attendance dashboard loads without requesting paid modules`, async ({
    page,
    context,
  }) => {
    await fixture(context, ["giving", "reports"], role);
    await page.goto("/attendance");
    await expect(
      page.getByRole("heading", { name: "Attendance", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("42", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByText("Event Attendance", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", {
        name: "This feature is available on a different plan",
      }),
    ).toHaveCount(0);
    const requests = await page.evaluate(
      () => (window as unknown as { planRequests: string[] }).planRequests,
    );
    expect(requests.some((path) => path.endsWith("/attendance/summary"))).toBe(
      true,
    );
    expect(
      requests.some((path) =>
        /\/api\/v1\/(events|analytics|admin\/dashboard)(\/|$)/.test(path),
      ),
    ).toBe(false);
  });
}

test("church roles and invitation options put Church Admin first and hide Super Admin", async ({
  page,
  context,
}) => {
  await fixture(context, ["giving", "reports"], "church_admin");
  await page.goto("/admin/roles");
  await expect(
    page.getByRole("heading", { name: "Roles & Permissions", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("row").nth(1).getByRole("cell").first(),
  ).toHaveText("Church Admin");
  await expect(
    page.getByRole("cell", { name: "Super Admin", exact: true }),
  ).toHaveCount(0);
  await page.goto("/admin/users");
  await page.getByRole("button", { name: "Invite User", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("combobox", { name: "Role", exact: true })
    .click();
  await expect(page.getByRole("option").first()).toHaveText("Senior Pastor");
  await expect(
    page.getByRole("option", { name: "Church Admin", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("option", { name: "Treasurer", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("option", { name: "Super Admin", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("option", { name: "Senior Pastor", exact: true }),
  ).toBeVisible();
});

test("Essentials can open giving reports and generate financial reports with all standard report blocks", async ({
  page,
  context,
}) => {
  await fixture(context, ["giving", "reports"], "church_admin");
  await page.goto("/giving/reports");
  await expect(
    page.getByRole("heading", { name: "Reports", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "This feature is available on a different plan",
    }),
  ).toHaveCount(0);
  await page.goto("/reports");
  await expect(
    page.getByText("Financial summary", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByRole("checkbox")).toHaveCount(3);
  await page.getByText("Attendance summary", { exact: true }).click();
  await page.getByText("Members summary", { exact: true }).click();
  await expect
    .poll(async () =>
      page.evaluate(() =>
        (window as unknown as { planRequests: string[] }).planRequests.some(
          (path) => path.endsWith("/reports/members"),
        ),
      ),
    )
    .toBe(true);
  const requests = await page.evaluate(
    () => (window as unknown as { planRequests: string[] }).planRequests,
  );
  expect(requests.some((path) => path.endsWith("/reports/financial"))).toBe(
    true,
  );
  expect(requests.some((path) => path.endsWith("/reports/attendance"))).toBe(
    true,
  );
  expect(requests.some((path) => path.endsWith("/reports/members"))).toBe(true);
  await expect(
    page.getByRole("heading", {
      name: "This feature is available on a different plan",
    }),
  ).toHaveCount(0);
});

test("service creation and editing round-trip local clock times", async ({
  page,
  context,
}) => {
  await fixture(context, ["giving", "reports"], "church_admin");
  await context.addInitScript(() => {
    const previous = window.fetch.bind(window);
    let saved: Record<string, unknown> | undefined;
    window.fetch = async (input, options) => {
      const path = new URL(
        input instanceof Request ? input.url : String(input),
        location.origin,
      ).pathname;
      // HQ service creation requires an available branch, even in the clock-time fixture.
      if (path.endsWith("/api/backend/branches"))
        return Response.json({
          success: true,
          data: {
            data: [{ branchId: "clock-branch", name: "Main Branch" }],
            total: 1,
          },
        });
      if (
        !path.startsWith("/api/") ||
        !/\/services(?:\/clock-service)?$/.test(path)
      )
        return previous(input, options);
      const method = options?.method ?? "GET";
      if (method === "POST" || method === "PATCH") {
        saved = {
          serviceId: "clock-service",
          churchId: "c",
          name: "Sunday Service",
          category: "mixed",
          isActive: true,
          createdAt: "2026-10-22",
          updatedAt: "2026-10-22",
          ...saved,
          ...JSON.parse(String(options?.body ?? "{}")),
        };
      }
      const data =
        method === "GET"
          ? {
              data: saved ? [saved] : [],
              meta: { page: 1, limit: 15, total: saved ? 1 : 0, totalPages: 1 },
            }
          : saved;
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { "Content-Type": "application/json" },
      });
    };
  });
  await page.goto("/attendance/services");
  await page.getByRole("button", { name: "Add Service", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Sunday Service");
  await page.getByLabel("Start Time", { exact: true }).fill("09:00");
  await page.getByLabel("End Time", { exact: true }).fill("11:00");
  await page
    .getByRole("button", { name: "Create Service", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("cell", { name: "09:00–11:00", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "More actions", exact: true }).click();
  await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
  await expect(page.getByLabel("Start Time", { exact: true })).toHaveValue(
    "09:00",
  );
  await expect(page.getByLabel("End Time", { exact: true })).toHaveValue(
    "11:00",
  );
  await page.getByLabel("Start Time", { exact: true }).fill("23:30");
  await page.getByLabel("End Time", { exact: true }).fill("00:00");
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "23:30–00:00", exact: true }),
  ).toBeVisible();
});

for (const method of ["cash", "bank_transfer"]) {
  test(`Essentials records ${method} giving without fetching paid event data`, async ({
    page,
    context,
  }) => {
    await fixture(context, ["giving", "reports"], "church_admin");
    await context.addInitScript(() => {
      const previous = window.fetch.bind(window);
      const calls: { path: string; body?: Record<string, unknown> }[] = [];
      (window as unknown as { givingCalls: typeof calls }).givingCalls = calls;
      window.fetch = async (input, options) => {
        const path = new URL(
          input instanceof Request ? input.url : String(input),
          location.origin,
        ).pathname;
        calls.push({
          path,
          body: options?.body ? JSON.parse(String(options.body)) : undefined,
        });
        let data: unknown;
        if (path.endsWith("/profiles/me")) {
          const response = await previous(input, options);
          const body = await response.json();
          body.data.isAdminHq = false;
          body.data.branchId = "branch-a";
          return Response.json(body);
        }
        if (path.endsWith("/events"))
          return Response.json(
            {
              success: false,
              error: {
                code: "PLAN_FEATURE_REQUIRED",
                message: "Upgrade required",
              },
            },
            { status: 403 },
          );
        if (path.endsWith("/giving/categories"))
          data = {
            data: [
              { categoryId: "offering", name: "Offering", isActive: true },
            ],
            meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
          };
        else if (path.endsWith("/giving/cash"))
          data = {
            transactionId: "gift-a",
            currency: "NGN",
            amount: 5000,
            receiptNumber: "R-001",
          };
        else return previous(input, options);
        return Response.json({ success: true, data });
      };
    });
    await page.goto("/giving/records");
    await page
      .getByRole("button", { name: "Record Giving", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("button", { name: "Event", exact: true }),
    ).toHaveCount(0);
    await dialog.getByLabel("Giving Date", { exact: true }).fill("2026-10-18");
    await dialog.getByPlaceholder("e.g. 5000").fill("5000");
    if (method === "bank_transfer") {
      await dialog.getByRole("combobox").nth(1).click();
      await page
        .getByRole("option", { name: "Bank transfer", exact: true })
        .click();
    }
    await dialog
      .getByText("Choose or type a category", { exact: true })
      .click();
    await page.getByRole("option", { name: "Offering", exact: true }).click();
    await dialog
      .getByRole("button", { name: "Record Giving", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const calls = await page.evaluate(
      () =>
        (
          window as unknown as {
            givingCalls: { path: string; body?: Record<string, unknown> }[];
          }
        ).givingCalls,
    );
    expect(calls.some((call) => call.path.endsWith("/events"))).toBe(false);
    expect(
      calls.find((call) => call.path.endsWith("/giving/cash"))?.body,
    ).toMatchObject({
      amount: 5000,
      type: method,
      categoryId: "offering",
      branchId: "branch-a",
      givingDate: "2026-10-18",
    });
  });
}

test("expired paid accounts can view members and export while create actions are hidden", async ({
  page,
  context,
}) => {
  await fixture(context, ["giving", "reports"], "church_admin", true);
  await page.goto("/people/members");
  await expect(
    page.getByRole("heading", { name: "Everyone, held in one place." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add a person", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Export/ }).first(),
  ).toBeVisible();
});
