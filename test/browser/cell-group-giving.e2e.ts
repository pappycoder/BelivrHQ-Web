import fs from "node:fs/promises";
import { expect, test } from "@playwright/test";

const groupId = "44444444-4444-4444-8444-444444444444";

test.beforeEach(async ({ context }, testInfo) => {
  const role = testInfo.title.startsWith("treasurer") ? "treasurer" : testInfo.title.startsWith("usher") ? "usher" : "cell_leader";
  await context.addCookies([{ name: "belivrhq_token", value: "browser-test-only", url: "http://127.0.0.1:3107" }]);
  await context.addInitScript(({ role, groupId, hq, unowned }) => {
    const nativeFetch = window.fetch.bind(window);
    const records: Record<string, unknown>[] = [];
    const calls: string[] = [];
    Object.defineProperty(window, "__cellGivingCalls", { value: calls });
    const branchId = "33333333-3333-4333-8333-333333333333";
    const memberId = "55555555-5555-4555-8555-555555555555";
    const categoryId = "66666666-6666-4666-8666-666666666666";
    window.fetch = async (input, options) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.origin);
      const path = url.pathname;
      if (!path.startsWith("/api/")) return nativeFetch(input, options);
      calls.push(path);
      let data: unknown;
      if (path === "/api/session") return new Response(JSON.stringify({ hasSession: true }));
      if (path.endsWith("/auth/session")) data = { userId: "browser-user", email: "test@example.com" };
      else if (path.endsWith("/attendance-sessions")) data={data:[],meta:{total:0,page:1,limit:20,totalPages:0}};
      else if (path.endsWith("/profiles/me")) data = {
        profileId: "11111111-1111-4111-8111-111111111111", churchId: "22222222-2222-4222-8222-222222222222", branchId, memberId,
        planFeatures: ["groups", "giving", "staff_roles", "custom_roles"], status: "active", firstName: "Test", lastName: "User", role: [role], isAdminHq: hq, branch: { branchId, name: "Lekki" },
        permissions: ["cell_groups:read", "cell_groups:giving:read", ...(role === "treasurer" ? [] : ["cell_groups:details:read"]), ...(role === "cell_leader" ? ["cell_groups:own:read", "cell_groups:giving:create", ...(hq ? ["cell_groups:create"] : [])] : [])],
      };
      else if (path.endsWith(`/giving/cell-groups/${groupId}`)) {
        if (options?.method === "POST") {
          const body = JSON.parse(String(options.body));
          if (body.memberId || body.serviceId || body.eventId) throw new Error("Expected a combined group total");
          if (records.some((record) => record.cellGroupMeetingDate === body.cellGroupMeetingDate))
            return new Response(JSON.stringify({ success: false, error: { message: "Giving has already been recorded for this cell group meeting" } }), { status: 409, headers: { "Content-Type": "application/json" } });
          data = { transactionId: "77777777-7777-4777-8777-777777777777", cellGroupId: groupId, cellGroupName: "Lekki Fellowship", cellGroupMeetingDate: body.cellGroupMeetingDate, categoryName: "Offering", amount: body.amount, type: body.type, status: "success", currency: "NGN", receiptNumber: "2026/OFF/001" };
          records.push(data as Record<string, unknown>);
        } else data = { data: records, total: records.length, categories: [{ categoryId, name: "Offering", isActive: true }], summary: { allTimeTotal: records.reduce((sum, record) => sum + Number(record.amount), 0), monthTotal: 0, count: records.length, trend: [] } };
      }
      else if (path.endsWith("/admin/cell-groups")) data = [{ id: groupId, name: "Lekki Fellowship", leaderId: memberId, branchId, createdAt: "2026-10-11T10:00:00Z" }];
      else if (path.endsWith("/branches")) data = { data: [{ branchId, name: "Lekki" }] };
      else if (path.endsWith(`/admin/cell-groups/${groupId}`)) data = { id: groupId, name: "Lekki Fellowship", leaderId: unowned ? "other-member" : memberId, leaderFirstName: "Cell", leaderLastName: "Leader", branchId, branchName: "Lekki", createdAt: "2026-10-11T10:00:00Z", updatedAt: "2026-10-11T10:00:00Z" };
      else if (path.endsWith("/attendance/summary")) data = { totalMeetings: 0, averageAttendance: 0 };
      else if (path.endsWith("/attendance")) data = [
        { id: "att-a", memberId, firstName: "Alice", lastName: "Cell", meetingDate: "2026-10-17", status: "present", notes: "Present" },
        { id: "att-b", visitorName: "Visitor Cell", firstName: "", lastName: "", meetingDate: "2026-10-16", status: "absent", notes: "Absent" },
      ].filter(row => !url.searchParams.get("meetingDate") || row.meetingDate === url.searchParams.get("meetingDate"));
      else if (path.endsWith("/members") || path.endsWith("/roles") || path.endsWith("/roles/labels")) data = [];
      else if (path.endsWith("/notifications/unread-count")) data = { count: 0 };
      else if (path.endsWith("/notifications") || path.endsWith("/audit-logs/me")) data = { data: [], total: 0, unreadCount: 0 };
      else throw new Error(`Unexpected API call ${path}`);
      return new Response(JSON.stringify({ success: true, data }), { headers: { "Content-Type": "application/json" } });
    };
  }, { role, groupId, hq: testInfo.title.startsWith("hq"), unowned: testInfo.title.includes("another group") });
});

test("treasurer sees group giving without requesting members or attendance", async ({ page }) => {
  await page.goto(`/departments/cell-groups/${groupId}?tab=giving`);
  await expect(page.getByText("Meeting Giving", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Record Meeting Giving" })).toHaveCount(0);
  await expect(page.getByText("Members (0)", { exact: true })).toHaveCount(0);
  const calls = await page.evaluate(() => (window as unknown as { __cellGivingCalls: string[] }).__cellGivingCalls);
  expect(calls.some((path) => path.includes(`/cell-groups/${groupId}/members`) || path.includes(`/cell-groups/${groupId}/attendance`))).toBe(false);
});

test("usher sees full cell group data with read-only giving", async ({ page }) => {
  await page.goto(`/departments/cell-groups/${groupId}?tab=giving`);
  await page.getByRole("tab", {name:"Members",exact:true}).click();
  await expect(page.getByText("Members (0)", { exact: true })).toBeVisible();
  await page.getByRole("tab", {name:"Giving",exact:true}).click();
  await expect(page.getByText("Meeting Giving", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Record Meeting Giving" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add Member" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Record Attendance" })).toHaveCount(0);
});

test("leader records a combined meeting total and receives duplicate feedback", async ({ page }) => {
  await page.goto(`/departments/cell-groups/${groupId}?tab=giving`);
  const record = async () => {
    await page.getByRole("button", { name: "Record Meeting Giving" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Meeting date").fill("2026-10-11");
    await dialog.getByLabel("Combined group total (NGN)").fill("5000");
    await dialog.getByRole("combobox", { name: "Meeting giving category" }).click();
    await page.getByRole("option", { name: "Offering", exact: true }).click();
    await dialog.getByRole("button", { name: "Record Group Total" }).click();
  };
  await record();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("2026/OFF/001", { exact: true })).toBeVisible();
  const table=page.getByRole("table").filter({hasText:"2026/OFF/001"});
  await table.locator('xpath=ancestor::*[@data-slot="card"][1]').getByRole("button",{name:"Export",exact:true}).click();
  for(const format of ["CSV","Excel","PDF"]) await expect(page.getByRole("menuitem",{name:`Export as ${format}`,exact:true})).toBeVisible();
  const downloadPromise=page.waitForEvent("download");
  await page.getByRole("menuitem",{name:"Export as CSV",exact:true}).click();
  const file=await downloadPromise;const content=await fs.readFile((await file.path())!,"utf8");expect(content).toContain("2026/OFF/001");
  await record();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: "Giving has already been recorded" })).toBeVisible();
  await expect(page.getByText("2026/OFF/001", { exact: true })).toHaveCount(1);
});

test("hq leader cannot record giving for another group", async ({ page }) => {
  await page.goto(`/departments/cell-groups/${groupId}?tab=giving`);
  await expect(page.getByText("Meeting Giving", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Record Meeting Giving" })).toHaveCount(0);
});
test("hq leader can record giving for the group they lead", async ({ page }) => {
  await page.goto(`/departments/cell-groups/${groupId}?tab=giving`);
  await expect(page.getByRole("button", { name: "Record Meeting Giving" })).toBeVisible();
});

test("hq leader can create cell groups", async ({ page }) => {
  await page.goto("/departments/cell-groups");
  await expect(page.getByRole("button", { name: "Add Cell Group", exact: true })).toBeVisible();
});
test("leader attendance filters and exports respect the selected records", async ({ page }) => {
  await page.goto(`/departments/cell-groups/${groupId}?tab=attendance`);
  await page.getByLabel("Cell group attendance status", { exact: true }).selectOption("present");
  await page.getByLabel("Cell group attendance search", { exact: true }).fill("Alice");
  const table = page.getByRole("table", { name: "Cell group attendance", exact: true });
  await expect(table.getByText("Alice Cell", { exact: true })).toBeVisible();
  await expect(table.getByText("Visitor Cell", { exact: true })).toHaveCount(0);
  await table.locator("xpath=ancestor::section[1]").getByRole("button", { name: "Export", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Export as CSV", exact: true }).click();
  const download = await pending; const csv = await fs.readFile((await download.path())!, "utf8");
  expect(csv).toContain("Alice Cell"); expect(csv).not.toContain("Visitor Cell");
});

test("leader giving appears only on the individual cell group page", async ({ page }) => {
  for (const path of ["/dashboard", "/departments/cell-groups"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: path === "/dashboard" ? "Dashboard" : "Cell Groups", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Record Meeting Giving", exact: true })).toHaveCount(0);
    await expect(page.getByText("My Cell Group Giving", { exact: true })).toHaveCount(0);
    const calls = await page.evaluate(() => (window as unknown as { __cellGivingCalls: string[] }).__cellGivingCalls);
    expect(calls.some(path => path.includes("/giving/cell-groups/"))).toBe(false);
    if (path === "/dashboard") expect(calls.some(path => path.includes("/admin/cell-groups"))).toBe(false);
  }
  await page.goto(`/departments/cell-groups/${groupId}?tab=giving`);
  await expect(page.getByRole("button", { name: "Record Meeting Giving", exact: true })).toBeVisible();
});
