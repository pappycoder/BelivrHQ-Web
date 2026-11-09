import { expect, test, type BrowserContext, type Page } from "@playwright/test";

async function fixture(
  context: BrowserContext,
  options: {
    readOnly?: boolean;
    full?: boolean;
    archived?: boolean;
    paid?: boolean;
    failOnce?: boolean;
  } = {},
) {
  const event = {
    eventId: "event-a",
    churchId: "church-a",
    title: "Community Gathering",
    type: "conference",
    isFree: !options.paid,
    branchId: "branch-a",
    branchName: "Main Branch",
    startDate: "2026-10-25T09:00:00Z",
    registrationCount: options.full ? 1 : 0,
    capacity: 1,
    createdAt: "2026-10-24T09:00:00Z",
    updatedAt: "2026-10-24T09:00:00Z",
    archivedAt: options.archived ? "2026-10-24T09:00:00Z" : undefined,
  };
  const members = [
    {
      memberId: "member-a",
      firstName: "Grace",
      lastName: "Member",
      branchId: "branch-a",
      email: "grace@example.test",
    },
  ];
  const registrations: Record<string, unknown>[] = [];
  const writes: { path: string; body: Record<string, unknown> }[] = [];
  const requests: string[] = [];
  let failed = false;
  await context.addCookies([
    {
      name: "belivrhq_token",
      value: "registration-fixture",
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
    requests.push(path);
    let data: unknown = [];
    if (path.endsWith("/profiles/me"))
      data = {
        profileId: "profile-a",
        userId: "user-a",
        churchId: "church-a",
        branchId: "branch-a",
        branch: { name: "Main Branch" },
        firstName: "Church",
        lastName: "Admin",
        role: ["church_admin"],
        status: "active",
        isAdminHq: false,
        planFeatures: [
          "events",
          "reports",
          "giving",
          ...(options.paid ? ["tickets"] : []),
        ],
        permissions: [
          "events:list:read",
          "events:all:read",
          "events:registrations:read",
          "members:read",
          "members:all:read",
          ...(!options.readOnly ? ["events:registrations:create"] : []),
        ],
      };
    else if (path.endsWith("/events/event-a/register")) {
      const body = request.postDataJSON();
      writes.push({ path, body });
      if (options.failOnce && !failed) {
        failed = true;
        return route.fulfill({
          status: 409,
          json: {
            success: false,
            error: {
              message: "Registration could not be completed. Please try again.",
            },
          },
        });
      }
      const registration = {
        registrationId: "registration-a",
        eventId: event.eventId,
        memberId: body.memberId,
        memberName: "Grace Member",
        paymentStatus: "paid",
        checkedIn: false,
        quantity: 1,
        createdAt: "2026-10-25T09:00:00Z",
      };
      registrations.push(registration);
      event.registrationCount++;
      data = registration;
    } else if (path.endsWith("/events/event-a/registrations"))
      data = registrations;
    else if (path.endsWith("/events/event-a")) data = event;
    else if (path.endsWith("/events")) data = { data: [event], total: 1 };
    else if (path.endsWith("/members"))
      data = { data: members, total: members.length };
    else if (path.endsWith("/unread-count")) data = { count: 0 };
    else if (path.endsWith("/notifications") || path.endsWith("/auth/sessions"))
      data = { data: [], total: 0 };
    else if (path.endsWith("/attendance-sessions"))
      data = { data: [], total: 0 };
    return route.fulfill({ json: { success: true, data } });
  });
  return { event, registrations, writes, requests };
}

async function selectEvent(page: Page) {
  await page.goto("/events/registrations");
  await page
    .getByRole("combobox", { name: "Select Event", exact: true })
    .click();
  await page.getByRole("option", { name: /Community Gathering/ }).click();
}
async function chooseMember(page: Page) {
  await page
    .getByRole("button", { name: "Register Attendee", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(/This event is free/)).toBeVisible();
  await dialog
    .getByRole("button", { name: "Select member...", exact: true })
    .click();
  await page.getByRole("option", { name: /Grace Member/ }).click();
  await expect(
    dialog.getByRole("button", { name: "Grace Member", exact: true }),
  ).toBeVisible();
}

for (const surface of ["registrations", "details"]) {
  test(`Community can register a free-event attendee from ${surface} without marking attendance`, async ({
    context,
    page,
  }) => {
    const state = await fixture(context);
    if (surface === "registrations") await selectEvent(page);
    else await page.goto("/events/event-a");
    await expect(
      page.getByRole("link", { name: "Check In Attendees", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Check In Attendees", exact: true }),
    ).toHaveCount(0);
    await chooseMember(page);
    await page
      .getByRole("button", { name: "Confirm Registration", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("cell", { name: "Grace Member", exact: true }),
    ).toBeVisible();
    expect(state.writes).toEqual([
      {
        path: "/api/backend/events/event-a/register",
        body: { memberId: "member-a", quantity: 1 },
      },
    ]);
    expect(state.registrations[0].checkedIn).toBe(false);
    await expect(
      page.getByRole("button", { name: "Event Full", exact: true }),
    ).toBeDisabled();
    expect(
      state.requests.some((path) =>
        /\/tickets|\/tiers|\/check-in|\/management/.test(path),
      ),
    ).toBe(false);
    await page.reload();
    if (surface === "registrations") {
      await page
        .getByRole("combobox", { name: "Select Event", exact: true })
        .click();
      await page.getByRole("option", { name: /Community Gathering/ }).click();
    }
    await expect(
      page.getByRole("cell", { name: "Grace Member", exact: true }),
    ).toBeVisible();
  });
}

test("a failed registration keeps the member selected and can be retried", async ({
  context,
  page,
}) => {
  const state = await fixture(context, { failOnce: true });
  await selectEvent(page);
  await chooseMember(page);
  await page
    .getByRole("button", { name: "Confirm Registration", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Grace Member", exact: true }),
  ).toBeVisible();
  expect(state.registrations).toHaveLength(0);
  await page
    .getByRole("button", { name: "Confirm Registration", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(state.registrations).toHaveLength(1);
  expect(state.writes).toHaveLength(2);
});

for (const option of ["readOnly", "archived", "paid", "full"] as const) {
  test(`${option} events do not offer an available free-registration action`, async ({
    context,
    page,
  }) => {
    const state = await fixture(context, { [option]: true });
    await selectEvent(page);
    await expect(
      page.getByRole("button", { name: "Register Attendee", exact: true }),
    ).toHaveCount(0);
    if (option === "full")
      await expect(
        page.getByRole("button", { name: "Event Full", exact: true }),
      ).toBeDisabled();
    expect(state.writes).toHaveLength(0);
  });
}
