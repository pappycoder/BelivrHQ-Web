import { test, expect, type BrowserContext } from "@playwright/test";
import { roles as DEFAULT_PERMISSION_MATRIX } from "../fixtures/default-role-permissions.json";

async function fixture(context: BrowserContext, essentials = false) {
  const writes: { path: string; body: Record<string, unknown> }[] = [];
  const event = {
    eventId: "event-a",
    churchId: "church-a",
    branchId: "branch-a",
    branchName: "Main Branch",
    title: "Secretary Event",
    type: "conference",
    startDate: "2026-10-27T09:00:00Z",
    isFree: true,
    registrationCount: 0,
    status: "published",
    createdAt: "2026-10-27T09:00:00Z",
    updatedAt: "2026-10-27T09:00:00Z",
  };
  await context.addCookies([
    {
      name: "belivrhq_token",
      value: "secretary-fixture",
      url: "http://127.0.0.1:3107",
    },
  ]);
  await context.route("https://embed.tawk.to/**", (route) =>
    route.fulfill({ body: "" }),
  );
  await context.route("**/api/session", (route) =>
    route.fulfill({ json: { hasSession: true } }),
  );
  await context.route("**/api/backend/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let data: unknown = [];
    if (path.endsWith("/profiles/me"))
      data = {
        profileId: "profile-a",
        userId: "user-a",
        churchId: "church-a",
        branchId: "branch-a",
        branch: { name: "Main Branch" },
        role: ["secretary"],
        firstName: "Church",
        lastName: "Secretary",
        status: "active",
        isAdminHq: false,
        permissions: DEFAULT_PERMISSION_MATRIX.secretary,
        planFeatures: essentials
          ? ["giving", "reports"]
          : [
              "giving",
              "reports",
              "events",
              "email",
              "media",
              "groups",
              "forms",
              "whatsapp",
              "sms",
            ],
      };
    else if (path.endsWith("/templates"))
      data = {
        data: [
          {
            templateId: "template-a",
            name: "Published Notice",
            channel: "email",
            status: "published",
            branchId: "branch-a",
          },
        ],
        total: 1,
      };
    else if (path.endsWith("/broadcasts") && request.method() === "POST") {
      writes.push({ path, body: request.postDataJSON() });
      data = { broadcastId: "broadcast-a", status: "sending" };
    } else if (path.endsWith("/whatsapp/send")) {
      writes.push({ path, body: request.postDataJSON() });
      data = {
        messageId: "message-a",
        channel: "whatsapp",
        direction: "outbound",
        status: "sent",
      };
    } else if (path.endsWith("/events/event-a")) {
      if (request.method() === "PATCH") {
        const body = request.postDataJSON();
        writes.push({ path, body });
        Object.assign(event, body);
      }
      data = event;
    } else if (path.endsWith("/events")) data = { data: [event], total: 1 };
    else if (path.endsWith("/branches"))
      data = {
        data: [{ branchId: "branch-a", name: "Main Branch" }],
        total: 1,
      };
    else if (path.endsWith("/unread-count")) data = { count: 0 };
    else if (
      path.endsWith("/broadcasts") ||
      path.endsWith("/messages") ||
      path.endsWith("/notifications") ||
      path.endsWith("/auth/sessions") ||
      path.endsWith("/attendance-sessions")
    )
      data = {
        data: [],
        total: 0,
        meta: { page: 1, limit: 15, total: 0, totalPages: 1 },
      };
    return route.fulfill({ json: { success: true, data } });
  });
  return { writes };
}

test("Secretary can create and send a branch broadcast", async ({
  page,
  context,
}) => {
  const state = await fixture(context);
  await page.goto("/communication/broadcasts");
  await page
    .getByRole("button", { name: "New Broadcast", exact: true })
    .click();
  await page
    .getByLabel("Broadcast Name *", { exact: true })
    .fill("Secretary notice");
  await page.getByRole("combobox", { name: "Template *", exact: true }).click();
  await page
    .getByRole("option", { name: "Published Notice", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Send Broadcast", exact: true })
    .click();
  await expect.poll(() => state.writes.length).toBe(1);
  expect(state.writes[0]).toMatchObject({
    path: "/api/backend/broadcasts",
    body: {
      name: "Secretary notice",
      channel: "email",
      templateId: "template-a",
      branchId: "branch-a",
      audienceFilter: { branchId: "branch-a" },
    },
  });
});

test("Secretary can send a message", async ({ page, context }) => {
  const state = await fixture(context);
  await page.goto("/communication/messages");
  await page.getByRole("button", { name: "New Message", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByPlaceholder("e.g. +2348012345678").fill("+2348000000000");
  await dialog
    .getByPlaceholder("Type your message...")
    .fill("Secretary test notice");
  await dialog.getByRole("button", { name: "Send", exact: true }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  expect(state.writes[0]).toEqual({
    path: "/api/backend/whatsapp/send",
    body: { to: "+2348000000000", text: "Secretary test notice", type: "text" },
  });
});

test("Secretary can create events and edit event details without gaining check-in access", async ({
  page,
  context,
}) => {
  const state = await fixture(context);
  await page.goto("/events/new");
  await expect(page.getByLabel("Title *", { exact: true })).toBeVisible();
  await page.goto("/events/event-a/edit");
  await page
    .getByLabel("Title *", { exact: true })
    .fill("Updated Secretary Event");
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  expect(state.writes[0].body.title).toBe("Updated Secretary Event");
  await page.goto("/events/check-in");
  await expect(
    page.getByRole("heading", { name: "Access denied", exact: true }),
  ).toBeVisible();
});

test("Secretary operational grants preserve Essentials plan restrictions", async ({
  page,
  context,
}) => {
  const state = await fixture(context, true);
  for (const path of [
    "/events/new",
    "/communication/broadcasts/new",
    "/communication/messages",
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", {
        name: "This feature is available on a different plan",
        exact: true,
      }),
    ).toBeVisible();
  }
  expect(state.writes).toHaveLength(0);
});
