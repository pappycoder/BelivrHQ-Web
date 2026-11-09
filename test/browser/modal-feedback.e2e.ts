import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "belivrhq_token", value: "feedback-fixture", url: "http://127.0.0.1:3107" }]);
  await context.addInitScript(() => {
    const original = window.fetch.bind(window);
    window.fetch = async (input, options) => {
      const path = new URL(input instanceof Request ? input.url : String(input), location.origin).pathname;
      if (!path.startsWith("/api/")) return original(input, options);
      if (path === "/api/session") return Response.json({ hasSession: true });
      const method = options?.method ?? (input instanceof Request ? input.method : "GET");
      if (method !== "GET") return Response.json({ success: false, error: { message: "This action is unavailable for the selected branch." } }, { status: 409 });
      let data: unknown = { data: [], total: 0, meta: { total: 0, page: 1, limit: 20, totalPages: 1 } };
      if (path.endsWith("/auth/session")) data = { userId: "feedback-user", email: "test@example.com" };
      else if (path.endsWith("/profiles/me")) data = {
        profileId: "feedback-profile", userId: "feedback-user", churchId: "church-a", branchId: "branch-a", role: ["custom_staff"], status: "active", isAdminHq: false,
        firstName: "Test", lastName: "Staff", permissions: ["giving:dashboard:read", "giving:records:create", "giving:categories:read", "attendance:services:read", "giving:recurring:read", "giving:recurring:create", "visitors:list:read", "visitors:new:create", "events:tickets:read", "events:tickets:create"],
        branch: { branchId: "branch-a", name: "Branch A" },
      };
      else if (path.endsWith("/giving/dashboard")) data = { monthTotal: 0, monthCount: 0, allTimeTotal: 0, count: 0, trend: [] };
      else if (path.endsWith("/giving/categories")) data = { data: [{ categoryId: "category-a", name: "Offering", isActive: true, isRecurring: false }], meta: { total: 1, page: 1, limit: 100, totalPages: 1 } };
      else if (path.endsWith("/giving/payment-options")) data = { recurringAvailable: true };
      else if (path.endsWith("/unread-count")) data = { count: 0 };
      return Response.json({ success: true, data });
    };
  });
});

async function expectGeneralToast(page: Page, message: string) {
  const toast = page.locator("[data-sonner-toast]").filter({ hasText: message });
  await expect(toast).toBeVisible();
  await expect(toast).toHaveClass(/app-toast/);
  await expect(page.locator("[data-sonner-toaster]")).toHaveCount(1);
  await expect(page.locator("[data-sonner-toaster]")).toHaveAttribute("data-x-position", "right");
  await expect(page.getByRole("dialog")).toBeVisible();
}

for (const width of [1280, 390]) test(`empty giving service and event selectors use the general toast (${width}px)`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/giving");
  await page.getByRole("button", { name: "Record Cash", exact: true }).click();
  const dialog = page.getByRole("dialog");
  for (const [tab, placeholder, message] of [["Service", "Select service", "No services are available for this branch."], ["Event", "Select event", "No events are available for this branch."]]) {
    await dialog.getByRole("button", { name: tab, exact: true }).click();
    await dialog.getByText(placeholder, { exact: true }).click();
    await expectGeneralToast(page, message);
    await expect(page.getByRole("listbox")).toHaveCount(0);
  }
});

test("giving API errors preserve the server message in the general toast", async ({ page }) => {
  await page.goto("/giving");
  await page.getByRole("button", { name: "Record Cash", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("spinbutton").fill("1000");
  await dialog.getByText("Choose or type a category", { exact: true }).click();
  await page.getByRole("option", { name: "Offering", exact: true }).click();
  await dialog.getByRole("button", { name: "Record Giving", exact: true }).click();
  await expectGeneralToast(page, "This action is unavailable for the selected branch.");
});

test("recurring giving reports unavailable categories through the general toast", async ({ page }) => {
  await page.goto("/giving/recurring");
  await page.getByRole("button", { name: "Create Recurring Giving", exact: true }).click();
  await page.getByRole("dialog").getByRole("combobox", { name: "Recurring giving category", exact: true }).click();
  await expectGeneralToast(page, "No recurring giving categories are available.");
  await expect(page.getByRole("listbox")).toHaveCount(0);
});

test("visitor registration errors preserve the server message in the general toast", async ({ page }) => {
  await page.goto("/visitors");
  await expect(page.getByRole("heading", { name: "Visitors", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Quick Add", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("First Name", { exact: false }).fill("Visitor");
  await dialog.getByRole("button", { name: "Register Visitor", exact: true }).click();
  await expectGeneralToast(page, "This action is unavailable for the selected branch.");
});

test("ticket assignment with no events uses the general toast", async ({ page }) => {
  await page.goto("/events/management");
  await page.getByRole("tab", { name: "Assigned Tickets", exact: true }).click();
  await page.getByRole("button", { name: "Assign Ticket", exact: true }).click();
  await page.getByRole("dialog").getByText("Select an event", { exact: true }).click();
  await expectGeneralToast(page, "No events are available to assign tickets.");
  await expect(page.getByRole("listbox")).toHaveCount(0);
});
