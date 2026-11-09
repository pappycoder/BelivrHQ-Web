import { test, expect } from "@playwright/test";

const routes = [
  ["/analytics", "Analytics Overview"],
  ["/analytics/giving", "Giving Analytics"],
  ["/analytics/attendance", "Attendance Analytics"],
  ["/analytics/members", "Member Analytics"],
];
const roles = [
  "church_admin",
  "super_admin",
  "senior_pastor",
  "branch_pastor",
  "secretary",
  "treasurer",
  "usher",
  "department_head",
  "cell_leader",
  "custom_admin",
];
for (const role of roles)
  for (const hq of [false, true]) {
    const admin = ["church_admin", "super_admin"].includes(role);
    test(`${role} HQ=${hq} ${admin ? "can" : "cannot"} access analytics`, async ({
      page,
      context,
    }) => {
      await context.addCookies([
        {
          name: "belivrhq_token",
          value: "analytics-fixture",
          url: "http://127.0.0.1:3107",
        },
      ]);
      await context.addInitScript(
        ({ role, hq, admin }) => {
          const native = window.fetch.bind(window),
            calls: string[] = [];
          (window as unknown as { analyticsCalls: string[] }).analyticsCalls =
            calls;
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
                status: "active",
                firstName: "Test",
                lastName: "User",
                role: [role],
                isAdminHq: hq,
                planFeatures: ["analytics", "giving"],
                permissions: [
                  "branches:read",
                  ...(admin
                    ? [
                        "analytics:view",
                        "analytics:dashboard:read",
                        "analytics:giving:read",
                        "analytics:attendance:read",
                        "analytics:members:read",
                      ]
                    : []),
                ],
              };
            else if (path.includes("/analytics/")) {
              calls.push(path);
              data = path.endsWith("/dashboard")
                ? {
                    totalMembers: 42,
                    activeMembers: 40,
                    totalGiving: 500,
                    totalAttendance: 80,
                    engagementDistribution: {},
                  }
                : {
                    total: 0,
                    count: 0,
                    average: 0,
                    byCategory: [],
                    byBranch: [],
                    byType: [],
                    byStatus: {},
                    byGender: {},
                    byAgeGroup: {},
                    topDonors: [],
                    recurring: {
                      active: 0,
                      totalMonthlyAmount: 0,
                      totalScheduled: 0,
                    },
                    trend: [],
                    growth: [],
                    byService: [],
                    bySource: {},
                    members: 0,
                    visitors: 0,
                    firstTimeVisitors: 0,
                    returningVisitors: 0,
                  };
            } else if (path.endsWith("/branches"))
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
        { role, hq, admin },
      );
      for (const [path, title] of routes) {
        await page.goto(path);
        if (admin)
          await expect(
            page.getByRole("heading", { name: title, exact: true }),
          ).toBeVisible();
        else {
          await expect(
            page.getByRole("heading", { name: "Access denied", exact: true }),
          ).toBeVisible();
          await expect(page.locator('a[href^="/analytics"]')).toHaveCount(0);
          expect(
            await page.evaluate(
              () =>
                (window as unknown as { analyticsCalls: string[] })
                  .analyticsCalls,
            ),
          ).toEqual([]);
        }
      }
      if (admin)
        await expect
          .poll(async () =>
            page.evaluate(
              () =>
                (window as unknown as { analyticsCalls: string[] })
                  .analyticsCalls,
            ),
          )
          .not.toEqual([]);
    });
  }
