import { expect, test } from "@playwright/test";

for (const { width, noEvents } of [{ width: 1280, noEvents: false }, { width: 390, noEvents: false }, { width: 1280, noEvents: true }, { width: 390, noEvents: true }]) test(`ticket availability errors use the general toast with the modal open (${width}px, empty=${noEvents})`, async ({ page, context }) => {
  await page.setViewportSize({ width, height: 900 });
  await context.addCookies([{ name: "belivrhq_token", value: "browser-test-only", url: "http://127.0.0.1:3107" }]);
  await context.addInitScript((noEvents) => {
    const original = window.fetch.bind(window);
    window.fetch = async (input, options) => {
      const path = new URL(input instanceof Request ? input.url : String(input), location.origin).pathname;
      if (!path.startsWith("/api/")) return original(input, options);
      let data: unknown;
      if (path === "/api/session") return new Response(JSON.stringify({ hasSession: true }));
      if (path.endsWith("/auth/session")) data = { userId: "test-user", email: "leader@example.com" };
      else if (path.endsWith("/profiles/me")) data = {
        profileId: "11111111-1111-4111-8111-111111111111",
        churchId: "22222222-2222-4222-8222-222222222222",
        branchId: "33333333-3333-4333-8333-333333333333",
        status: "active", firstName: "Test", lastName: "Leader", role: ["cell_leader", "member"], isAdminHq: false,
        planFeatures: ["events", "tickets"],
        permissions: ["members:own:read", "events:view", "events:list:read", "events:calendar:read", "events:tickets:read"],
        branch: { branchId: "33333333-3333-4333-8333-333333333333", name: "Lekki" },
      };
      else if (path.endsWith("/events")) data = { data: noEvents ? [] : [{
        eventId: "44444444-4444-4444-8444-444444444444",
        branchId: "33333333-3333-4333-8333-333333333333",
        title: "Branch fellowship", isFree: true, startDate: "2026-12-01T10:00:00Z",
        registrationCount: 0,
      }], total: 1 };
      else if (path.endsWith("/tiers")) data = [];
      else if (path.endsWith("/tickets") && options?.method === "POST")
        return new Response(JSON.stringify({ success: false, error: { message: "No tickets available for this event." } }), { status: 409, headers: { "Content-Type": "application/json" } });
      else if (path.endsWith("/roles") || path.endsWith("/roles/labels")) data = [];
      else if (path.endsWith("/notifications/unread-count")) data = { count: 0 };
      else if (path.endsWith("/tickets") || path.endsWith("/notifications") || path.endsWith("/audit-logs/me")) data = { data: [], total: 0, unreadCount: 0 };
      else throw new Error(`Unexpected API call ${path}`);
      return new Response(JSON.stringify({ success: true, data }), { headers: { "Content-Type": "application/json" } });
    };
  }, noEvents);
  await page.goto("/events/management");
  await expect(page.getByRole("link", { name: "All Events", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Registrations", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Claim a Ticket", exact: true }).click();
  const dialog = page.getByRole("dialog");
  if (!noEvents) {
    await dialog.getByRole("combobox").click();
    await page.getByRole("option", { name: "Branch fellowship (Free)", exact: true }).click();
  }
  // Simulate losing runtime-injected styles. The bundled global stylesheet
  // must keep notifications styled and positioned even during modal actions.
  await page.evaluate(() => {
    document.querySelectorAll("style").forEach((style) => {
      if (style.textContent?.includes("[data-sonner-toaster]")) style.remove();
    });
  });
  // Reproduce a page/modal stylesheet trying to move the shared viewport left.
  await page.addStyleTag({ content: "[data-sonner-toaster] { position: absolute; left: 0; right: auto; top: auto; bottom: 0; }" });
  if (noEvents) {
    await dialog.getByRole("combobox").click();
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "Claim Ticket", exact: true })).toBeDisabled();
  } else {
    await dialog.getByRole("button", { name: "Claim Ticket", exact: true }).click();
  }
  const toast = page.locator("[data-sonner-toast]");
  await expect(toast).toBeVisible();
  await expect(toast).toContainText(noEvents ? "No tickets are available to claim." : "No tickets available for this event.");
  await expect(toast).toHaveClass(/app-toast/);
  await expect(dialog).toBeVisible();
  const toaster = page.locator("[data-sonner-toaster]");
  await expect(toaster).toHaveCount(1);
  await expect(toaster).toHaveAttribute("data-x-position", "right");
  await expect(toaster).toHaveAttribute("data-y-position", "top");
  await expect.poll(() => toaster.evaluate((element) => getComputedStyle(element).position)).toBe("fixed");
  expect(await toaster.evaluate((element) => Number(getComputedStyle(element).zIndex))).toBeGreaterThan(await dialog.evaluate((element) => Number(getComputedStyle(element).zIndex)));
  await expect.poll(() => toast.evaluate((element) => Math.round(window.innerWidth - element.getBoundingClientRect().right))).toBe(width <= 600 ? 16 : 24);
});
