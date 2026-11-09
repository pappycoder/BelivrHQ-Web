import type { BrowserContext } from "@playwright/test";

const stamp = "2026-10-01T10:00:00Z";
export async function workspaceFixture(
  context: BrowserContext,
  options: {
    readOnly?: boolean;
    hq?: boolean;
    giving?: boolean;
    archived?: boolean;
    navigation?: boolean;
    empty?: boolean;
  } = {},
) {
  const calls: {
    path: string;
    method: string;
    body: Record<string, unknown> | null;
  }[] = [];
  const members = [
    {
      memberId: "member-a",
      firstName: "Grace",
      lastName: "Adeyemi",
      email: "grace@example.test",
      phone: "+2348012345678",
      branchId: "branch-a",
      status: "active",
      dateOfBirth: "1995-04-20",
      gender: "female",
      memberSince: stamp,
      createdAt: stamp,
      updatedAt: stamp,
      notes: "Existing care context",
      customFields: {},
      ...(options.archived ? { archivedAt: stamp } : {}),
    },
    {
      memberId: "member-b",
      firstName: "David",
      lastName: "Okoro",
      email: "david@example.test",
      phone: "+2348098765432",
      branchId: "branch-b",
      status: "transferred",
      memberSince: stamp,
      createdAt: stamp,
      updatedAt: stamp,
      customFields: {},
    },
    {
      memberId: "member-c",
      firstName: "Mary",
      lastName: "Bello",
      branchId: "branch-a",
      status: "inactive",
      memberSince: stamp,
      createdAt: stamp,
      updatedAt: stamp,
      customFields: {},
    },
    {
      memberId: "member-d",
      firstName: "John",
      lastName: "Eze",
      branchId: "branch-a",
      status: "suspended",
      memberSince: stamp,
      createdAt: stamp,
      updatedAt: stamp,
      customFields: {},
    },
  ];
  const family = {
    familyId: "family-a",
    churchId: "church-a",
    name: "Adeyemi Family",
    headId: "member-a",
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
    createdAt: stamp,
    ...(options.archived ? { archivedAt: stamp } : {}),
  };
  await context.addCookies([
    {
      name: "belivrhq_token",
      value: "members-design",
      url: "http://127.0.0.1:3107",
    },
  ]);
  // Register a no-op worker: visuals exercise the UI, not the offline cache.
  await context.route("**/sw.js", route => route.fulfill({ contentType: "application/javascript", body: 'self.addEventListener("install", () => self.skipWaiting()); self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));' }));
  await context.route("https://**", (route) => route.abort());
  await context.route("https://embed.tawk.to/**", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: "Object.assign(window.Tawk_API, { showWidget() {}, hideWidget() {}, maximize() {}, shutdown() {} }); window.Tawk_API?.onLoad?.();",
    }),
  );
  await context.route("**/api/session", (route) =>
    route.fulfill({ json: { hasSession: true } }),
  );
  await context.route("**/api/backend/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api/backend", "");
    const method = request.method();
    const body = request.postDataJSON();
    calls.push({ path: path + url.search, method, body });
    let data: unknown = [];
    if (path === "/profiles/me")
      data = {
        profileId: "profile-a",
        userId: "user-a",
        churchId: "church-a",
        branchId: "branch-a",
        branch: { name: "Main Branch" },
        church: { name: "Grace Community Church" },
        firstName: "Grace",
        lastName: "Admin",
        role: ["church_admin"],
        status: "active",
        isAdminHq: options.hq ?? true,
        planFeatures: options.navigation ? ["giving", "events", "groups", "forms", "reports", "email", "media", "tickets", "pastoral", "assets", "analytics", "whatsapp"] : ["giving"],
        permissions: [
          ...(options.navigation ? ["giving:dashboard:read", "giving:records:read", "attendance:dashboard:read", "attendance:services:read", "events:calendar:read", "sermons:list:read", "emails:read", "analytics:dashboard:read", "users:read", "profiles:read", "branches:read", "church_settings:read", "forms:list:read", "visitors:list:read", "assets:list:read", "roles:read"] : []),
          "members:all:read",
          "members:import:create",
          "families:read",
          "branches:read",
          ...(options.giving === false ? [] : ["giving:records:read"]),
          ...(options.readOnly
            ? []
            : [
                "members:new:create",
                "members:all:update",
                "members:all:delete",
                "families:create",
                "families:update",
                "families:delete",
              ]),
        ],
      };
    else if (path === "/branches")
      data = {
        data: [
          { branchId: "branch-a", name: "Main Branch" },
          { branchId: "branch-b", name: "West Branch" },
        ],
        total: 2,
      };
    else if (path === "/members/dashboard") data = { total: 4, byStatus: { active: 2, inactive: 1, suspended: 1 }, byAgeGroup: { age_18_30: 2, age_31_45: 2 }, growth: [{ date: "2026-09-01", total: 2 }, { date: "2026-10-01", total: 4 }] };
    else if (path === "/giving/dashboard/charts") data = { currency: url.searchParams.get("currency") || "NGN", total: 25000, count: 3, trend: [{ date: "2026-10-01", total: 10000 }, { date: "2026-10-02", total: 15000 }], byCategory: [{ categoryId: "category-a", categoryName: "Offering", total: 25000, count: 3 }] };
    else if (path.endsWith("/summary")) data = { totalCheckIns: 4, memberCheckIns: 3, visitorCheckIns: 1, bySource: {}, byCategory: {}, byGender: {} };
    else if (path === "/members/search")
      data = {
        data: members.filter((member) => member.memberId !== "member-a"),
      };
    else if (path === "/members" && method === "POST")
      data = { ...members[0], ...body, memberId: "member-new" };
    else if (path === "/members") {
      let rows = options.empty ? [] : members;
      if (url.searchParams.get("search"))
        rows = rows.filter((row) =>
          `${row.firstName} ${row.lastName}`
            .toLowerCase()
            .includes(url.searchParams.get("search")!.toLowerCase()),
        );
      if (url.searchParams.get("status"))
        rows = rows.filter(
          (row) => row.status === url.searchParams.get("status"),
        );
      const limit = Number(url.searchParams.get("limit") ?? 15);
      const page = Number(url.searchParams.get("page") ?? 1);
      data = {
        data: rows,
        meta: { page, limit, total: rows.length, totalPages: 1 },
      };
    } else if (path === "/members/member-a" && method === "PATCH") {
      Object.assign(members[0], body);
      data = members[0];
    } else if (path === "/members/member-a") data = members[0];
    else if (path.endsWith("/attendance") || path.endsWith("/giving"))
      data = { data: [] };
    else if (path === "/families" && method === "POST")
      data = { ...family, ...body };
    else if (path === "/families")
      data = {
        data: [family],
        meta: {
          page: 1,
          limit: Number(url.searchParams.get("limit") ?? 15),
          total: 1,
          totalPages: 1,
        },
      };
    else if (path === "/families/family-a" && method === "PATCH") {
      Object.assign(family, body);
      data = family;
    } else if (path === "/families/family-a") data = family;
    else if (path.endsWith("/archive"))
      data = { ...members[0], archivedAt: stamp };
    else if (path.endsWith("/restore"))
      data = { ...members[0], archivedAt: undefined };
    else if (path === "/families/family-a/members") data = family;
    else if (path.includes("unread")) data = { count: 0 };
    else if (path === "/notifications" || path === "/audit")
      data = { data: [], total: 0, unreadCount: 0 };
    return route.fulfill({ json: { success: true, data } });
  });
  return { calls };
}

