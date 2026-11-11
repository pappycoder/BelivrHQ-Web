import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/session", (route) =>
    route.fulfill({ json: { hasSession: false } }),
  );
  await page.route("**/api/backend/**", (route) =>
    route.fulfill({
      status: 403,
      json: {
        success: false,
        error: {
          message: "No private requests expected from the public landing page",
        },
      },
    }),
  );
  await page.route("**/api/backend/pricing/subscriptions?currency=USD", route => route.fulfill({ json: { success: true, data: { currency: 'USD', rateUpdatedAt: null, plans: [{ id: 'essentials', monthly: 10, annual: 108 }, { id: 'community', monthly: 20, annual: 216 }, { id: 'network', monthly: 40, annual: 432 }] } } }));
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("landing page remains public after the unauthenticated session check", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/backend/")) requests.push(request.url());
  });
  const presence = page.waitForResponse((response) =>
    response.url().endsWith("/api/session"),
  );
  await page.goto("/");
  await presence;
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "A little less admin.",
  );
  await expect(page).toHaveURL("http://127.0.0.1:3107/");
  await expect(
    page.getByRole("link", { name: "Bring your church together", exact: true }),
  ).toHaveAttribute("href", "/register");
  await expect(page).toHaveTitle(/BelivrHQ.*ministry/);
  expect(requests.every(url => new URL(url).pathname === "/api/backend/pricing/subscriptions")).toBe(true);
});

test("product preview supports selection and keyboard navigation", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("tabpanel")).toContainText("612");
  const first = page.getByRole("tab", { name: "Sunday overview", exact: true });
  await first.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "People & care", exact: true }),
  ).toBeFocused();
  await expect(page.getByRole("tabpanel")).toContainText("1,284");
  await page
    .getByRole("tab", { name: "Giving & reports", exact: true })
    .click();
  await expect(page.getByRole("tabpanel")).toContainText("₦845k");
});

test("product preview rotates with sliding content and glass headers, and pauses for interaction", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.install();
  await page.goto("/");
  const first = page.getByRole("tab", { name: "Sunday overview", exact: true });
  const people = page.getByRole("tab", { name: "People & care", exact: true });
  const giving = page.getByRole("tab", { name: "Giving & reports", exact: true });
  await page.getByRole("tabpanel").scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await page.clock.runFor(250);
  await page.clock.fastForward(5500);
  await expect(people).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toContainText("1,284");
  const glass = page.locator('[class*="previewTabGlass"]');
  await expect(glass).toHaveCSS("backdrop-filter", "blur(14px) saturate(1.35)");
  expect(await people.evaluate(el => getComputedStyle(el).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
  expect(await page.getByRole("tabpanel").locator('[class*="previewSlide"]').evaluate(el => getComputedStyle(el).animationName)).toContain("previewSlideIn");
  await page.clock.runFor(100);
  await page.clock.fastForward(5000);
  await expect(giving).toHaveAttribute("aria-selected", "true");
  await page.clock.runFor(100);
  await page.clock.fastForward(5000);
  await expect(first).toHaveAttribute("aria-selected", "true");

  await first.hover();
  await page.clock.runFor(250);
  await page.clock.fastForward(5500);
  await expect(first).toHaveAttribute("aria-selected", "true", { timeout: 8000 });
  await giving.click();
  await page.mouse.move(0, 0);
  await page.clock.runFor(100);
  await page.clock.fastForward(5500);
  await expect(giving).toHaveAttribute("aria-selected", "true", { timeout: 8000 });
  await giving.evaluate(el => (el as HTMLElement).blur());
  await page.getByRole("tabpanel").scrollIntoViewIfNeeded();
  await page.clock.runFor(250);
  await page.clock.fastForward(5500);
  await expect(first).toHaveAttribute("aria-selected", "true", { timeout: 8000 });

  await expect(page.getByRole("button", { name: /(?:Pause|Resume) preview/ })).toHaveCount(0);
  await expect(page.getByRole("tabpanel").locator('[class*="previewSlide"]')).toHaveCSS("animation-duration", "1.15s");
  await expect(page.getByRole("tabpanel").locator('[class*="welcomeCard"]')).toHaveCSS("animation-delay", "0.28s");
});

test("reduced motion keeps the preview steady while clicks still switch views", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  const first = page.getByRole("tab", { name: "Sunday overview", exact: true });
  await page.getByRole("tabpanel").scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await page.clock.fastForward(11000);
  await expect(first).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Giving & reports", exact: true }).click();
  await expect(page.getByRole("tabpanel")).toContainText("₦845k");
  expect(await page.getByRole("tabpanel").locator('[class*="previewSlide"]').evaluate(el => getComputedStyle(el).animationName)).toBe("none");
});

test("feature carousel rotates along an arc and preserves manual selection", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.install();
  await page.goto("/");
  const carousel = page.getByRole("region", { name: "Explore church features" });
  await carousel.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await page.clock.runFor(300);
  await expect(carousel.getByRole("button", { name: "Show People & care", exact: true })).toHaveAttribute("aria-pressed", "true");
  for (const name of ["Attendance", "Giving & records", "Communication", "Teams & groups", "People & care"]) {
    await page.clock.fastForward(3200);
    await expect(carousel.getByRole("button", { name: `Show ${name}`, exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.clock.runFor(150);
  }
  await carousel.getByRole("button", { name: "Show Attendance", exact: true }).click();
  await expect(carousel.getByRole("heading", { name: /A calmer Sunday/ })).toBeVisible();
  await page.clock.runFor(150);
  await page.clock.fastForward(7000);
  await expect(carousel.getByRole("button", { name: "Show Attendance", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("ArrowRight");
  await expect(carousel.getByRole("heading", { name: /Good stewardship/ })).toBeVisible();
  await carousel.getByRole("button", { name: "Show Communication", exact: true }).click();
  await expect(carousel.getByRole("heading", { name: /A thoughtful word/ })).toBeVisible();
  await carousel.getByRole("button", { name: "Show Giving & records", exact: true }).click();
  await expect(carousel.getByRole("heading", { name: /Good stewardship/ })).toBeVisible();
  await carousel.getByRole("button", { name: "View Communication", exact: true }).click();
  await expect(carousel.getByRole("heading", { name: /A thoughtful word/ })).toBeVisible();
});

for (const width of [320, 390, 1440]) {
  test(`feature carousel keeps its focused card readable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.install();
    await page.goto("/");
    const carousel = page.getByRole("region", { name: "Explore church features" });
    await carousel.scrollIntoViewIfNeeded();
    for (const name of ["People & care", "Attendance", "Giving & records", "Communication", "Teams & groups"]) {
      await carousel.getByRole("button", { name: `Show ${name}`, exact: true }).click();
      const active = carousel.locator('[data-active="true"] article');
      const box = await active.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      if (width <= 480) {
        expect(box!.width).toBeLessThanOrEqual(width * .8);
        for (const position of [-1, 1]) {
          const neighbor = await carousel.locator(`[data-position="${position}"]`).boundingBox();
          const visibleWidth = Math.min(width, neighbor!.x + neighbor!.width) - Math.max(0, neighbor!.x);
          expect(visibleWidth).toBeGreaterThan(30);
        }
      }
      expect(await active.evaluate(el => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
      await expect(carousel.getByRole("heading", { level: 3 })).toHaveCount(1);
      await expect(carousel.locator('[data-active="true"] [class*="featureCardContent"]')).not.toHaveAttribute("inert");
    }
    await carousel.getByRole("button", { name: "Show People & care", exact: true }).click();
    await page.clock.fastForward(15000);
    await expect(carousel.getByRole("button", { name: "Show People & care", exact: true })).toHaveAttribute("aria-pressed", "true");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const controls = carousel.locator('[class*="featureCarouselControls"]');
    await expect(controls.getByRole("button")).toHaveCount(5);
    await expect(controls).toHaveText("");
    await carousel.screenshot({ path: `/tmp/belivrhq-feature-carousel-${width}.png` });
  });
}

test("feature carousel supports a touch swipe", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/");
  const carousel = page.getByRole("region", { name: "Explore church features" });
  await carousel.scrollIntoViewIfNeeded();
  const card = carousel.locator('[data-active="true"]');
  await card.dispatchEvent("pointerdown", { pointerType: "touch", clientX: 280, clientY: 300 });
  await card.dispatchEvent("pointerup", { pointerType: "touch", clientX: 100, clientY: 305 });
  await expect(carousel.getByRole("button", { name: "Show Attendance", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("feature cards remain readable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 900 } });
  try {
    const page = await context.newPage();
    await page.goto("/");
    const carousel = page.getByRole("region", { name: "Explore church features" });
    await expect(carousel.getByRole("heading", { level: 3 })).toHaveCount(5);
    await expect(carousel.getByRole("group", { name: "Choose a feature" })).toBeHidden();
    const last = carousel.getByRole("heading", { name: /Many helping hands/ });
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  } finally { await context.close(); }
});

test("pricing switches billing periods and reviews a plan without buying anything", async ({
  page,
}) => {
  await page.goto("/#pricing");
  const plans = [
    {
      name: "Essentials",
      monthly: "USD 10",
      effective: "USD 108",
      yearly: "USD 108",
    },
    {
      name: "Community",
      monthly: "USD 20",
      effective: "USD 216",
      yearly: "USD 216",
    },
    {
      name: "Network",
      monthly: "USD 40",
      effective: "USD 432",
      yearly: "USD 432",
    },
  ];
  const card = (name: string) =>
    page.getByRole("article").filter({
      has: page.getByRole("heading", { name, exact: true }),
    });
  for (const plan of plans) {
    await expect(
      card(plan.name).getByText(plan.monthly, { exact: true }),
    ).toBeVisible();
  }
  await page.getByRole("button", { name: /Yearly Save 10%/ }).click();
  for (const plan of plans) {
    await expect(
      card(plan.name).locator("strong").getByText(plan.effective, { exact: true }),
    ).toBeVisible();
    await expect(card(plan.name)).toContainText(`${plan.yearly} billed yearly`);
  }
  const trigger = page.getByRole("button", {
    name: "Explore Network plan",
    exact: true,
  });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText(
    "activate your workspace with secure checkout",
  );
  await expect(
    dialog.getByRole("link", { name: "Continue to registration", exact: true }),
  ).toHaveAttribute("href", "/register?plan=network&cycle=annual&currency=USD");
  await expect(dialog).toContainText("USD 432");
  await expect(dialog).toContainText("/ year");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.getByRole("button", { name: "Monthly", exact: true }).click();
  for (const plan of plans) {
    await expect(
      card(plan.name).getByText(plan.monthly, { exact: true }),
    ).toBeVisible();
  }
});

test("Enterprise has negotiated pricing without an amount or checkout in either billing period", async ({
  page,
}) => {
  await page.goto("/#pricing");
  const card = page
    .getByRole("article")
    .filter({
      has: page.getByRole("heading", { name: "Enterprise", exact: true }),
    });
  for (const period of ["Monthly", "Yearly Save 10%"]) {
    await page.getByRole("button", { name: period, exact: true }).click();
    await expect(card).toContainText("Let’s talk");
    await expect(card).toContainText(
      "Pricing and billing terms agreed with you",
    );
    await expect(card).not.toContainText("₦");
    await page
      .getByRole("button", { name: "Explore Enterprise plan", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText(
      "negotiated directly with the BelivrHQ team",
    );
    await expect(dialog).not.toContainText("₦");
    await expect(
      dialog.getByRole("link", {
        name: "Continue to registration",
        exact: true,
      }),
    ).toHaveCount(0);
    await page.keyboard.press("Escape");
  }
});

test("FAQs and section links work", async ({ page }) => {
  await page.goto("/");
  const question = page
    .locator("summary")
    .filter({ hasText: "Can we subscribe to these plans today?" });
  await question.click();
  await expect(page.getByText(/complete secure checkout/)).toBeVisible();
  const missing = await page
    .locator('a[href^="#"]')
    .evaluateAll((anchors) =>
      anchors
        .map((anchor) => (anchor as HTMLAnchorElement).hash.slice(1))
        .filter((id) => id && !document.getElementById(id)),
    );
  expect(missing).toEqual([]);
});

for (const width of [320, 390, 768, 1440])
  test(`landing layout fits ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    if (width === 1440) {
      await page.screenshot({ path: "/tmp/belivrhq-landing-desktop.png" });
      await page.screenshot({
        path: "/tmp/belivrhq-landing-full.png",
        fullPage: true,
      });
      await page
        .locator("#pricing")
        .screenshot({ path: "/tmp/belivrhq-landing-pricing.png" });
    }
    if (width === 390) {
      await page.screenshot({ path: "/tmp/belivrhq-landing-mobile.png" });
      await page
        .getByRole("button", { name: "Open navigation", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Close navigation", exact: true }),
      ).toHaveAttribute("aria-expanded", "true");
      await page
        .locator("#marketing-mobile-navigation")
        .getByRole("link", { name: "Pricing", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Open navigation", exact: true }),
      ).toHaveAttribute("aria-expanded", "false");
      await expect(page).toHaveURL(/#pricing$/);
    }
  });

test("protected workspace routes still require sign-in", async ({
  request,
}) => {
  const response = await request.get("/insights/analytics", { maxRedirects: 0 });
  expect([307, 308]).toContain(response.status());
  expect(response.headers().location).toContain("/login");
});

test("mobile account actions are distinct buttons and policies stay in the footer", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation", exact: true }).click();
  const menu = page.locator("#marketing-mobile-navigation");
  const signIn = menu.getByRole("link", { name: "Sign in", exact: true });
  const register = menu.getByRole("link", { name: "Get started", exact: true });
  await expect(signIn).toHaveAttribute("href", "/login");
  await expect(register).toHaveAttribute("href", "/register");
  for (const action of [signIn, register]) {
    expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(await action.evaluate(el => getComputedStyle(el).borderRadius)).not.toBe("0px");
  }
  expect(await signIn.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe(
    await register.evaluate(el => getComputedStyle(el).backgroundColor),
  );
  await expect(menu.getByRole("link", { name: /Legal/ })).toHaveCount(0);
  await page.screenshot({ path: "/tmp/belivrhq-landing-mobile-menu.png" });
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(page.getByText("Departments & cell groups", { exact: true })).toHaveCount(0);
  const footer = page.locator("footer");
  await footer.screenshot({ path: "/tmp/belivrhq-landing-mobile-footer.png" });
  const brand = await footer.getByRole("link", { name: "BelivrHQ home", exact: true }).boundingBox();
  const description = await footer.getByText(/A thoughtful home for the work/).boundingBox();
  expect(description!.y).toBeGreaterThan(brand!.y + brand!.height);
  expect(Math.abs(description!.x - brand!.x)).toBeLessThan(2);
  await expect(footer.getByRole("navigation", { name: "Legal information" }).getByRole("link")).toHaveCount(3);
});

test("section entrances animate cursive headings and respect reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const heading = page.locator("#integrations-title em");
  await heading.scrollIntoViewIfNeeded();
  await expect.poll(() => heading.evaluate(el => el.getAnimations().length)).toBeGreaterThan(0);
  await expect.poll(() => heading.evaluate(el => el.getAnimations().length)).toBe(0);
  await expect(heading).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator("#faq-title em").scrollIntoViewIfNeeded();
  await expect(page.locator("#faq-title em")).toBeVisible();
  expect(await page.locator("#faq-title em").evaluate(el => el.getAnimations().length)).toBe(0);
});

test("recurring landing motion follows the visible section and reduced-motion preference", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const scribble = page.getByText(/More human\./).locator("..");
  await expect(scribble).toHaveCSS("animation-play-state", "running");
  for (const target of [scribble, scribble.locator("svg").first(), scribble.locator("path").last()]) {
    expect(await target.evaluate(el => el.getAnimations().some(animation => animation.effect?.getTiming().iterations === Infinity))).toBe(true);
  }
  const card = page.getByText("Reach your people", { exact: true }).locator("..");
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveCSS("animation-play-state", "running");
  await expect(scribble).toHaveCSS("animation-play-state", "paused");
  await page.locator("footer").scrollIntoViewIfNeeded();
  await expect(card).toHaveCSS("animation-play-state", "paused");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveCSS("animation-name", "none");
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(scribble).toHaveCSS("animation-name", "none");
});

for (const width of [320, 390, 1440]) {
  test(`preview tabs and workspace labels remain readable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    const tabs = page.getByRole("tab");
    for (const tab of await tabs.all()) {
      expect(await tab.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(13);
      expect((await tab.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    const strip = page.getByText("ONE CONNECTED WORKSPACE", { exact: true }).locator("..");
    await strip.scrollIntoViewIfNeeded();
    expect(await strip.getByText("People", { exact: true }).evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(15);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.getByRole("tab", { name: "Giving & reports", exact: true }).click();
    const glass = await page.locator('[class*="previewTabGlass"]').boundingBox();
    const active = await page.getByRole("tab", { name: "Giving & reports", exact: true }).boundingBox();
    expect(Math.abs(glass!.x - active!.x)).toBeLessThan(1);
    expect(Math.abs(glass!.width - active!.width)).toBeLessThan(1);
    await page.getByRole("tablist").screenshot({ path: `/tmp/belivrhq-larger-preview-tabs-${width}.png` });
    await strip.screenshot({ path: `/tmp/belivrhq-larger-workspace-strip-${width}.png` });
  });
}
