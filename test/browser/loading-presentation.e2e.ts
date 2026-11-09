import { test, expect, type BrowserContext } from "@playwright/test";
import { showCheckoutLoading } from "../../src/lib/checkout-loading";

const fields = [
  { key: "firstName", label: "First name", type: "text", required: true },
  { key: "lastName", label: "Last name", type: "text", required: true },
  { key: "notes", label: "Notes", type: "textarea" },
  {
    key: "gender",
    label: "Gender",
    type: "dropdown",
    options: ["male", "female"],
  },
];
const metadata = {
  title: "Member registration",
  churchName: "Grace Community Church",
  churchLogoUrl: "/brand/belivrhq-logo.png",
  branchName: "Main Branch",
  fields,
};
async function publicSession(context: BrowserContext) {
  await context.route("**/api/session", (route) =>
    route.fulfill({ json: { hasSession: false } }),
  );
  await context.route("https://embed.tawk.to/**", (route) =>
    route.fulfill({ body: "" }),
  );
}
for (const width of [1280, 390, 320]) {
  test(`public registration uses a designed skeleton and form layout at ${width}px`, async ({
    page,
    context,
  }) => {
    await publicSession(context);
    await page.setViewportSize({ width, height: 900 });
    let release!: () => void;
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    await context.route(
      "**/api/backend/intake/public/loading-token/meta",
      async (route) => {
        await wait;
        return route.fulfill({ json: { success: true, data: metadata } });
      },
    );
    await page.goto("/register/public/loading-token", {
      waitUntil: "domcontentloaded",
    });
    try {
      const state = page.getByRole("status", {
        name: "Loading registration form",
        exact: true,
      });
      await expect(state).toBeVisible();
      await expect(state).toHaveAttribute("aria-busy", "true");
      expect(
        await state.locator("[data-slot=skeleton]").count(),
      ).toBeGreaterThanOrEqual(8);
      await expect(
        page.getByText("Loading registration form", { exact: true }),
      ).toHaveClass(/sr-only/);
      await expect(
        page.locator("[data-public-form-frame] aside"),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (width !== 390)
        await page.screenshot({
          path: `/tmp/belivrhq-registration-skeleton-${width}.png`,
          fullPage: true,
        });
    } finally {
      release();
    }
    await expect(
      page.getByRole("heading", { name: "Member registration", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Grace Community Church", { exact: true }),
    ).toBeVisible();
    await expect(page.locator("[data-public-form-frame] aside")).toContainText(
      "Main Branch",
    );
    await expect(
      page.getByRole("button", { name: "Send registration", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 1280)
      await page.screenshot({
        path: "/tmp/belivrhq-registration-form-desktop.png",
        fullPage: true,
      });
  });
}

test("labels and placeholders are italic while typed values remain upright", async ({
  context,
  page,
}) => {
  await publicSession(context);
  await context.route(
    "**/api/backend/intake/public/loading-token/meta",
    (route) => route.fulfill({ json: { success: true, data: metadata } }),
  );
  await page.goto("/register/public/loading-token");
  const name = page.getByLabel("First name", { exact: false });
  await name.fill("Grace");
  expect(
    await name.evaluate(
      (el) => getComputedStyle((el as HTMLInputElement).labels![0]).fontStyle,
    ),
  ).toBe("italic");
  expect(await name.evaluate((el) => getComputedStyle(el).fontStyle)).toBe(
    "normal",
  );
  await name.fill("");
  await name.evaluate((el) =>
    el.setAttribute("placeholder", "Enter your first name"),
  );
  await page
    .getByLabel("Notes", { exact: false })
    .evaluate((el) => el.setAttribute("placeholder", "Additional notes"));
  expect(
    await name.evaluate(
      (el) => getComputedStyle(el, "::placeholder").fontStyle,
    ),
  ).toBe("italic");
  expect(
    await page
      .getByLabel("Notes", { exact: false })
      .evaluate((el) => getComputedStyle(el, "::placeholder").fontStyle),
  ).toBe("italic");
  const gender = page.getByRole("combobox", { name: /^Gender/ });
  expect(
    await gender
      .locator("[data-slot=select-value]")
      .evaluate((el) => getComputedStyle(el).fontStyle),
  ).toBe("italic");
  await gender.click();
  await page.getByRole("option", { name: "female", exact: true }).click();
  expect(
    await gender
      .locator("[data-slot=select-value]")
      .evaluate((el) => getComputedStyle(el).fontStyle),
  ).toBe("normal");
});

test("pending registrations render table skeletons while responses are fetched", async ({
  context,
  page,
}) => {
  await context.addCookies([
    {
      name: "belivrhq_token",
      value: "loading-fixture",
      url: "http://127.0.0.1:3107",
    },
  ]);
  await context.route("**/api/session", (route) =>
    route.fulfill({ json: { hasSession: true } }),
  );
  await context.route("https://embed.tawk.to/**", (route) =>
    route.fulfill({ body: "" }),
  );
  let release!: () => void;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  await context.route("**/api/backend/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = {};
    if (path.endsWith("/profiles/me"))
      data = {
        profileId: "profile-a",
        userId: "user-a",
        churchId: "church-a",
        branchId: "branch-a",
        church: { name: "Grace Church" },
        branch: { name: "Main Branch" },
        firstName: "Grace",
        lastName: "Staff",
        role: ["church_admin"],
        status: "active",
        isAdminHq: false,
        planFeatures: ["giving", "reports"],
        permissions: ["members:all:read", "members:new:create"],
      };
    else if (path.endsWith("/intake/submissions")) {
      await wait;
      data = {
        data: [],
        meta: { total: 0, page: 1, limit: 15, totalPages: 0 },
      };
    } else if (
      path.endsWith("/members") ||
      path.endsWith("/notifications") ||
      path.endsWith("/auth/sessions")
    )
      data = {
        data: [],
        meta: { total: 0, page: 1, limit: 15, totalPages: 0 },
      };
    else if (path.endsWith("/church/config")) data = { config: {} };
    return route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/people/members");
  try {
    await page.getByRole("tab", { name: "Pending registrations" }).click();
    const state = page.getByRole("status", {
      name: "Loading registrations",
      exact: true,
    });
    await expect(state).toBeVisible();
    expect(await state.locator("[data-slot=skeleton]").count()).toBeGreaterThan(
      4,
    );
    await expect(
      page.getByText("Loading registrations", { exact: true }),
    ).toHaveClass(/sr-only/);
  } finally {
    release();
  }
  await expect(
    page.getByText("No pending registrations.", { exact: true }),
  ).toBeVisible();
});

test("converted landing-page prices remain skeletons until a quote arrives", async ({
  context,
  page,
}) => {
  await publicSession(context);
  await context.addInitScript(() =>
    localStorage.setItem("belivrhq:subscription-currency", "NGN"),
  );
  let release!: () => void;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  await context.route(
    "**/api/backend/pricing/subscriptions?*",
    async (route) => {
      await wait;
      return route.fulfill({
        json: {
          success: true,
          data: {
            currency: "NGN",
            rateUpdatedAt: "2026-11-08T00:00:00Z",
            plans: [
              { id: "essentials", monthly: 16000, annual: 172800 },
              { id: "community", monthly: 32000, annual: 345600 },
              { id: "network", monthly: 64000, annual: 691200 },
            ],
          },
        },
      });
    },
  );
  await page.goto("/");
  try {
    await expect(
      page.getByRole("status", { name: "Loading price", exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByText("Loading price…", { exact: true })).toHaveCount(
      0,
    );
  } finally {
    release();
  }
  await expect(
    page.getByRole("status", { name: "Loading price", exact: true }),
  ).toHaveCount(0);
});

test("checkout window reserves its payment layout with skeletons", async ({ page }) => {
  await page.goto("about:blank");
  await page.setViewportSize({ width: 540, height: 760 });
  await page.evaluate(`(${showCheckoutLoading.toString()})(window)`);
  const state = page.getByRole("status", { name: "Preparing secure checkout", exact: true });
  await expect(state).toHaveAttribute("aria-busy", "true");
  await expect(state.locator("[data-slot=skeleton]")).toHaveCount(4);
  await expect(page.getByText("Preparing secure checkout", { exact: true })).toHaveClass("sr-only");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
