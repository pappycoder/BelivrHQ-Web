import { test, expect } from "@playwright/test";

test.beforeEach(async ({ context }, info) => {
  await context.addCookies([
    {
      name: "belivrhq_token",
      value: "roster-test",
      url: "http://127.0.0.1:3107",
    },
  ]);
  await context.addInitScript(
    ({ partial }) => {
      const native = window.fetch.bind(window);
      const members = Array.from({ length: 210 }, (_, index) => ({
        id: `membership-${index}`,
        memberId: `member-${index}`,
        firstName: `Person ${index}`,
        lastName: "Test",
        role: "member",
        joinedAt: "2026-10-01",
      }));
      const calls: {
        path: string;
        body: { memberIds?: string[]; records?: { memberId: string }[] };
      }[] = [];
      (window as unknown as { rosterCalls: unknown }).rosterCalls = calls;
      let failed = false;
      window.fetch = async (input, options) => {
        const url = new URL(
            input instanceof Request ? input.url : String(input),
            location.origin,
          ),
          path = url.pathname;
        if (!path.startsWith("/api/")) return native(input, options);
        if (path === "/api/session")
          return new Response(JSON.stringify({ hasSession: true }));
        let data: unknown = [];
        if (path.endsWith("/profiles/me"))
          data = {
            profileId: "profile-a",
            churchId: "church-a",
            branchId: "branch-a",
            memberId: "owner-a",
            firstName: "Usher",
            lastName: "Test",
            status: "active",
            role: ["custom"],
            isAdminHq: false,
            planFeatures: ["giving", "events", "groups", "tickets"],
            permissions: [
              "attendance:view",
              "attendance:checkin:create",
              "attendance:services:read",
              "attendance:records:read",
              "events:view",
              "events:checkin:create",
              "events:checkin:read",
              "events:list:read",
              "events:all:read",
              "departments:read",
              "departments:update",
              "departments:own:update",
              "departments:own:read",
              "cell_groups:read",
              "cell_groups:details:read",
              "cell_groups:create",
              "cell_groups:own:read",
              "cell_groups:own:update",
              "branches:read",
            ],
          };
        else if (path.endsWith("/auth/session")) data = { userId: "user-a" };
        else if (options?.method === "POST") {
          const body = JSON.parse(String(options.body));
          calls.push({ path, body });
          if (partial && calls.length === 2 && !failed) {
            failed = true;
            return new Response(
              JSON.stringify({
                success: false,
                error: { message: "Temporary failure" },
              }),
              { status: 503 },
            );
          }
          const count = body.memberIds?.length ?? body.records?.length ?? 0;
          data = { recorded: count, checkedIn: count, skipped: 0 };
        } else if (
          path.endsWith("/attendance-sessions") ||
          path.endsWith("/attendance/general")
        )
          data = {
            data: [],
            meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
          };
        else if (path === "/api/backend/members") {
          const filtered = members.filter((member) =>
            `${member.firstName} ${member.lastName}`
              .toLowerCase()
              .includes((url.searchParams.get("search") ?? "").toLowerCase()),
          );
          const page = Number(url.searchParams.get("page") ?? 1),
            limit = Number(url.searchParams.get("limit") ?? 100);
          data = {
            data: filtered.slice((page - 1) * limit, page * limit),
            meta: {
              total: filtered.length,
              page,
              limit,
              totalPages: Math.ceil(filtered.length / limit),
            },
          };
        } else if (path.endsWith("/services"))
          data = {
            data: [
              {
                serviceId: "service-a",
                name: "Sunday Service",
                category: "mixed",
                branchId: "branch-a",
                isActive: true,
              },
            ],
            meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
          };
        else if (path.endsWith("/events"))
          data = {
            data: [
              {
                eventId: "event-a",
                title: "Annual Meeting",
                type: "conference",
                branchId: "branch-a",
                startDate: "2026-10-18",
              },
            ],
            meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
          };
        else if (path.endsWith("/admin/departments/dept-a"))
          data = {
            id: "dept-a",
            name: "Choir",
            branchId: "branch-a",
            headMemberId: "owner-a",
            members: members.slice(0, 3),
            memberCount: 3,
            createdAt: "2026-10-01",
          };
        else if (path.endsWith("/admin/cell-groups/group-a"))
          data = {
            id: "group-a",
            name: "Fellowship",
            branchId: "branch-a",
            leaderId: "owner-a",
            createdAt: "2026-10-01",
          };
        else if (path.endsWith("/admin/cell-groups/group-a/members"))
          data = members.slice(0, 3);
        else if (path.endsWith("/attendance/summary"))
          data = { totalMeetings: 0, averageAttendance: 0 };
        else if (path.endsWith("/branches"))
          data = { data: [{ branchId: "branch-a", name: "Branch A" }] };
        else if (path.endsWith("/unread-count")) data = { count: 0 };
        else if (
          path.endsWith("/notifications") ||
          path.endsWith("/audit-logs/me")
        )
          data = { data: [], total: 0 };
        return new Response(JSON.stringify({ success: true, data }), {
          headers: { "Content-Type": "application/json" },
        });
      };
    },
    { partial: info.title.startsWith("partial") },
  );
});

async function selectService(page: import("@playwright/test").Page) {
  await page.goto("/attendance/check-in");
  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: /Sunday Service/ }).click();
}
async function selectAllPages(page: import("@playwright/test").Page) {
  const roster = page.getByLabel("Attendance roster", { exact: true });
  await expect(roster.getByRole("checkbox")).toHaveCount(100);
  await roster
    .getByRole("button", { name: "Select visible", exact: true })
    .click();
  await roster
    .getByRole("button", { name: "Load more members", exact: true })
    .click();
  await expect(roster.getByRole("checkbox")).toHaveCount(200);
  await roster
    .getByRole("button", { name: "Select visible", exact: true })
    .click();
  await roster
    .getByRole("button", { name: "Load more members", exact: true })
    .click();
  await expect(roster.getByRole("checkbox")).toHaveCount(210);
  await roster
    .getByRole("button", { name: "Select visible", exact: true })
    .click();
  return roster;
}
test("service roster loads real pages and records 210 selections in bounded batches", async ({
  page,
}) => {
  await selectService(page);
  await page.getByLabel("Attendance Date", {exact:true}).fill("2026-10-18");
  const roster = await selectAllPages(page);
  await expect(roster.getByRole("button",{name:/export/i})).toHaveCount(0);
  await roster
    .getByRole("button", { name: "Mark attendance (210)", exact: true })
    .click();
  await expect(roster.getByText("0 selected", { exact: true })).toBeVisible();
  const calls = await page.evaluate(
    () =>
      (window as unknown as { rosterCalls: { body: { records: unknown[]; attendanceDate: string } }[] })
        .rosterCalls,
  );
  expect(calls.map((call) => call.body.records.length)).toEqual([200, 10]);
  expect(calls.map((call) => call.body.attendanceDate)).toEqual(["2026-10-18", "2026-10-18"]);
});
test("partial batch failure keeps unsaved selections for retry", async ({
  page,
}) => {
  await selectService(page);
  await page.getByLabel("Attendance Date", {exact:true}).fill("2026-10-18");
  const roster = await selectAllPages(page);
  await roster
    .getByRole("button", { name: "Mark attendance (210)", exact: true })
    .click();
  await expect(
    roster.getByRole("button", { name: "Mark attendance (10)", exact: true }),
  ).toBeEnabled();
  await roster
    .getByRole("button", { name: "Mark attendance (10)", exact: true })
    .click();
  await expect(roster.getByText("0 selected", { exact: true })).toBeVisible();
});
test("event roster keeps selections across searches", async ({ page }) => {
  await page.goto("/events/check-in");
  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: /Annual Meeting/ }).click();
  await page.getByLabel("Attendance Date", {exact:true}).fill("2026-10-19");
  const roster = page.getByLabel("Attendance roster", { exact: true });
  await roster
    .getByRole("checkbox", { name: "Select Person 0 Test", exact: true })
    .click();
  await roster
    .getByRole("textbox", { name: "Search roster", exact: true })
    .fill("Person 209");
  await expect(roster.getByRole("checkbox")).toHaveCount(1);
  await roster
    .getByRole("checkbox", { name: "Select Person 209 Test", exact: true })
    .click();
  await roster
    .getByRole("button", { name: "Mark attendance (2)", exact: true })
    .click();
  const calls = await page.evaluate(
    () =>
      (
        window as unknown as {
          rosterCalls: { body: { memberIds: string[]; attendanceDate: string } }[];
        }
      ).rosterCalls,
  );
  expect(calls[0].body.memberIds).toEqual(["member-0", "member-209"]);
  expect(calls[0].body.attendanceDate).toBe("2026-10-19");
});
for (const type of ["department", "cell"] as const)
  test(`${type} meeting roster searches and saves multiple own members`, async ({
    page,
  }) => {
    await page.goto(
      type === "department"
        ? "/departments/dept-a"
        : "/departments/cell-groups/group-a",
    );
    await page.getByRole("tab", { name: "Attendance", exact: true }).click();
    await page
      .getByRole("button", {
        name:
          type === "department"
            ? "Record meeting attendance"
            : "Record Attendance",
        exact: true,
      })
      .click();
    const dialog = page.getByRole("dialog");
    const roster = dialog.getByLabel("Attendance roster", { exact: true });
    await roster
      .getByRole("checkbox", { name: "Select Person 0 Test", exact: true })
      .click();
    await roster
      .getByRole("textbox", { name: "Search roster", exact: true })
      .fill("Person 2");
    await roster
      .getByRole("checkbox", { name: "Select Person 2 Test", exact: true })
      .click();
    await roster
      .getByRole("button", { name: "Mark attendance (2)", exact: true })
      .click();
    await expect(roster.getByText("0 selected", { exact: true })).toBeVisible();
    const calls = await page.evaluate(
      () =>
        (
          window as unknown as {
            rosterCalls: { path: string; body: { memberIds: string[] } }[];
          }
        ).rosterCalls,
    );
    expect(calls[0].path).toContain("/attendance/bulk");
    expect(calls[0].body.memberIds).toEqual(["member-0", "member-2"]);
  });
test("dashboard has no export controls", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator("#main-content").getByRole("button", { name: /export/i }),
  ).toHaveCount(0);
});

test("service roster requires a date and clears selections when the day changes", async ({page}) => {
  await selectService(page);
  const roster = page.getByLabel('Attendance roster', {exact:true});
  const date = roster.getByLabel('Attendance Date', {exact:true});
  await expect(date).toHaveValue(/\d{4}-\d{2}-\d{2}/);
  await date.fill('');
  await roster.getByRole('checkbox', {name:'Select Person 0 Test',exact:true}).click();
  await expect(roster.getByRole('button', {name:'Mark attendance (1)',exact:true})).toBeDisabled();
  await date.fill('2026-10-18');
  await expect(roster.getByText('0 selected', {exact:true})).toBeVisible();
  await roster.getByRole('checkbox', {name:'Select Person 0 Test',exact:true}).click();
  await date.fill('2026-10-19');
  await expect(roster.getByText('0 selected', {exact:true})).toBeVisible();
});
