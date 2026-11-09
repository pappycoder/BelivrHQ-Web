import { test, expect, type BrowserContext, type Page } from "@playwright/test";

test.use({ serviceWorkers: "block" });
const key = "belivrhq:appearance:v1:profile-a:church-a";
const stamp = "2026-10-01T10:00:00Z";
async function fixture(
  context: BrowserContext,
  options: { readOnly?: boolean; archived?: boolean } = {},
) {
  const scope = { profileId: "profile-a", churchId: "church-a" };
  const calls: { path: string; method: string }[] = [];
  await context.addCookies([
    {
      name: "belivrhq_token",
      value: "appearance-test",
      url: "http://127.0.0.1:3107",
    },
  ]);
  await context.route("https://**", (route) => route.abort());
  await context.route("https://embed.tawk.to/**", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: "Object.assign(window.Tawk_API,{showWidget(){},hideWidget(){},maximize(){},shutdown(){}});window.Tawk_API?.onLoad?.();",
    }),
  );
  await context.route("**/api/session", (route) =>
    route.fulfill({ json: { hasSession: true } }),
  );
  await context.route("**/api/backend/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace("/api/backend", "");
    calls.push({ path, method: route.request().method() });
    const member = {
      memberId: "member-a",
      firstName: "Grace",
      lastName: "Adeyemi",
      email: "grace@example.test",
      phone: "+2348012345678",
      gender: "female",
      status: "active",
      branchId: "branch-a",
      memberSince: stamp,
      createdAt: stamp,
      customFields: {},
      ...(options.archived ? { archivedAt: stamp } : {}),
    };
    const family = {
      familyId: "family-a",
      name: "Adeyemi Family",
      createdAt: stamp,
      members: [
        {
          id: "link-a",
          memberId: "member-a",
          firstName: "Grace",
          lastName: "Adeyemi",
          relationship: "parent",
          isHead: true,
        },
      ],
      ...(options.archived ? { archivedAt: stamp } : {}),
    };
    const service = {
      serviceId: "service-a",
      name: "Sunday Service",
      category: "mixed",
      dayOfWeek: 0,
      startTime: "09:00",
      endTime: "11:00",
      isActive: true,
      branchId: "branch-a",
      createdAt: stamp,
      ...(options.archived ? { archivedAt: stamp } : {}),
    };
    let data: unknown = [];
    if (path === "/profiles/me")
      data = {
        ...scope,
        userId: "user-a",
        branchId: "branch-a",
        isAdminHq: true,
        status: "active",
        role: ["staff"],
        firstName: "Grace",
        lastName: "Admin",
        church: { name: "Grace Church" },
        branch: { name: "Main Branch" },
        planFeatures: ["giving"],
        permissions: [
          "members:all:read",
          "families:read",
          "attendance:services:read",
          "attendance:records:read",
          "attendance:dashboard:read",
          "branches:read",
          ...(options.readOnly
            ? []
            : [
                "members:all:update",
                "members:all:delete",
                "families:update",
                "families:delete",
                "attendance:services:update",
                "attendance:services:delete",
              ]),
        ],
      };
    else if (path === "/members/member-a") data = member;
    else if (path === "/families/family-a") data = family;
    else if (path === "/services/service-a") data = service;
    else if (path === "/members")
      data = {
        data: [member],
        meta: { page: 1, limit: 15, total: 1, totalPages: 1 },
      };
    else if (path === "/families")
      data = {
        data: [family],
        meta: { page: 1, limit: 15, total: 1, totalPages: 1 },
      };
    else if (path === "/services")
      data = {
        data: [service],
        meta: { page: 1, limit: 15, total: 1, totalPages: 1 },
      };
    else if (path === "/branches")
      data = {
        data: [{ branchId: "branch-a", name: "Main Branch" }],
        total: 1,
      };
    else if (path.includes("/summary"))
      data = {
        totalCheckIns: 0,
        memberCheckIns: 0,
        visitorCheckIns: 0,
        bySource: {},
        byCategory: {},
        byGender: {},
        reportCount: 0,
        total: 0,
        unspecifiedAgeCount: 0,
        unspecifiedGenderCount: 0,
      };
    else if (path.includes("unread")) data = { count: 0 };
    else if (
      path.includes("attendance") ||
      path.includes("giving") ||
      path === "/notifications"
    )
      data = { data: [], total: 0, meta: { page: 1, total: 0, totalPages: 0 } };
    await route.fulfill({ json: { success: true, data } });
  });
  return { scope, calls };
}
async function openAppearance(
  page: Page,
  placement: "header" | "sidebar" = "header",
) {
  await page
    .locator(placement === "header" ? "header" : ".workspace-area-rail")
    .getByRole("button", { name: "Account menu", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Appearance", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Appearance", exact: true }),
  ).toBeVisible();
}
test("fixed teal ignores saved accents and appearance offers light, dark and system", async ({ page, context }) => {
  await fixture(context);
  await context.addInitScript(key => {
    localStorage.setItem(key, JSON.stringify({ accent: "#7c3aed" }));
    if (!localStorage.getItem("theme")) localStorage.setItem("theme", "light");
  }, key);
  await page.goto("/members");
  await expect(page.locator("main h1")).toBeVisible();
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--primary").trim())).toBe("#0f766e");
  await openAppearance(page);
  const dialog = page.getByRole("dialog", { name: "Appearance", exact: true });
  await expect(dialog.getByRole("button", { name: "Violet accent" })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(page.locator("header").getByRole("button", { name: "Account menu", exact: true })).toBeFocused();
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await openAppearance(page);
  await dialog.getByRole("button", { name: "System", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "System", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("read-only staff retain appearance controls without record management", async ({ page, context }) => {
  await fixture(context, { readOnly: true });
  await page.goto("/members/member-a");
  await expect(page.getByRole("button", { name: "Member management", exact: true })).toHaveCount(0);
  await openAppearance(page);
  await expect(page.getByRole("dialog").getByRole("button", { name: "Light", exact: true })).toBeEnabled();
});

for (const [route, label] of [
  ["/members/member-a", "Member"],
  ["/members/families/family-a", "Family"],
  ["/attendance/services/service-a", "Service"],
])
  test(`${label} management supports keyboard, confirmation focus and semantic destructive actions`, async ({
    page,
    context,
  }) => {
    const { calls } = await fixture(context);
    await page.goto(route);
    const trigger = page.getByRole("button", {
      name: `${label} management`,
      exact: true,
    });
    await expect(trigger).toBeVisible();
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("menuitem", { name: "Archive", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.getByRole("menuitem", { name: "Archive", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Archive");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(trigger).toBeFocused();
    if (label !== "Service") {
      await trigger.click();
      await page
        .getByRole("menuitem", {
          name: label === "Member" ? "Deactivate" : "Delete",
          exact: true,
        })
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
    }
    expect(calls.some((call) => call.method !== "GET")).toBe(false);
  });

test("archived details retain labelled restore and permanent-delete confirmations", async ({
  page,
  context,
}) => {
  const { calls } = await fixture(context, { archived: true });
  for (const [route, label] of [
    ["/members/member-a", "Member"],
    ["/members/families/family-a", "Family"],
    ["/attendance/services/service-a", "Service"],
  ]) {
    await page.goto(route);
    const trigger = page.getByRole("button", {
      name: `${label} management`,
      exact: true,
    });
    await trigger.click();
    await expect(
      page.getByRole("menuitem", { name: "Archive", exact: true }),
    ).toHaveCount(0);
    await expect(page.getByRole("menuitem", { name: "Edit Family", exact: true })).toHaveCount(0);
    await page.getByRole("menuitem", { name: "Restore", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Restore");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page
      .getByRole("menuitem", { name: "Delete Forever", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toContainText("cannot be undone");
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  }
  expect(calls.some((call) => call.method !== "GET")).toBe(false);
});
