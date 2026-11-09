import { mockBotChallenges, verifyBotForm } from "../fixtures/bot-protection";
import { test, expect } from "@playwright/test";

const documents = [
  ["/privacy-policy", "Privacy Policy"],
  ["/terms-of-service", "Terms of Service"],
  ["/terms-and-conditions", "Website Terms and Conditions"],
] as const;

test.beforeEach(async ({ context }) => {
  await context.route("**/api/session", (route) => route.fulfill({ json: { hasSession: false } }));
  await context.route("**/api/backend/**", (route) => route.fulfill({ status: 404, json: { success: false, error: { message: "Unused fixture endpoint" } } }));
  await mockBotChallenges(context);
});

for (const width of [390, 1440]) for (const [path, title] of documents) {
  test(`${title} is public and readable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const chatRequests: string[] = [];
    page.on("request", (request) => { if (request.url().includes("embed.tawk.to")) chatRequests.push(request.url()); });
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(page.getByRole("article", { name: title })).toContainText("PappyCoder Technologies Limited");
    await expect(page.getByRole("link", { name: "lucasdeekay98@gmail.com", exact: true })).toHaveAttribute("href", "mailto:lucasdeekay98@gmail.com");
    const anchors = await page.getByRole("navigation", { name: "On this page" }).locator("a").evaluateAll((links) => links.map((link) => (link as HTMLAnchorElement).hash.slice(1)));
    expect(anchors.length).toBeGreaterThan(10);
    for (const id of anchors) expect(await page.locator(`[id="${id}"]`).count()).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(chatRequests).toHaveLength(0);
    expect(new URL((await page.locator('link[rel="canonical"]').getAttribute("href"))!).pathname).toBe(path);
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    if (path === "/privacy-policy" && width === 390) await page.screenshot({ path: "/tmp/belivrhq-legal-mobile.png" });
  });
}

test("service risk provisions are conspicuous and print layout keeps the document", async ({ page }) => {
  await page.goto("/terms-of-service#liability");
  const section = page.locator("#liability");
  await expect(section.getByText(/^IMPORTANT LIMITATION OF LIABILITY/)).toBeVisible();
  await expect(section).toContainText("gross negligence");
  await expect(section).toContainText("12 months");
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("button", { name: "Print or save as PDF" })).toBeHidden();
  await expect(page.getByRole("navigation", { name: "On this page" })).toBeHidden();
  await expect(section.getByRole("heading")).toBeVisible();
});

test("landing and login expose all legal documents", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("navigation", { name: "Legal information" });
  for (const [path] of documents) await expect(footer.locator(`a[href="${path}"]`)).toBeVisible();
  await page.goto("/login");
  for (const [path] of documents) await expect(page.getByRole("navigation", { name: "Legal information" }).locator(`a[href="${path}"]`)).toBeVisible();
});

test("registration requires an explicit agreement before any signup request", async ({ page }) => {
  let registrations = 0;
  await page.route("**/api/backend/auth/register", (route) => {
    registrations++;
    return route.fulfill({ status: 503, json: { success: false, error: { message: "Fixture stop" } } });
  });
  await page.goto("/register");
  await page.getByLabel("Church Name", { exact: true }).fill("Example Church");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("First Name", { exact: true }).fill("Test");
  await page.getByLabel("Last Name", { exact: true }).fill("Administrator");
  await page.getByLabel("Email Address", { exact: true }).fill("admin@example.invalid");
  await page.getByLabel("Password", { exact: true }).fill("StrongTestPassword!23");
  await page.getByLabel("Confirm Password", { exact: true }).fill("StrongTestPassword!23");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const agreement = page.getByRole("checkbox", { name: /I am at least 18/ });
  await expect(agreement).not.toBeChecked();
  await verifyBotForm(page);
  await page.getByRole("button", { name: "Create account & continue", exact: true }).click();
  expect(registrations).toBe(0);
  await expect(agreement).toBeFocused();
  await expect(page.getByText(/customer indemnity and limits on our/)).toBeVisible();
  await agreement.check();
  await verifyBotForm(page);
  await page.getByRole("button", { name: "Create account & continue", exact: true }).click();
  await expect.poll(() => registrations).toBe(1);
});

for (const width of [390, 1440]) {
  test(`landing legal navigation opens the policies at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.locator("header").getByRole("link", { name: "Legal & Privacy", exact: true })).toHaveCount(0);
    await page.locator("footer").scrollIntoViewIfNeeded();
    await expect(page.locator("footer").getByRole("heading", { name: "Legal & Privacy", exact: true })).toBeInViewport();
    const navigation = page.locator("#legal").getByRole("navigation", { name: "Legal information" });
    for (const [path] of documents) await expect(navigation.locator(`a[href="${path}"]`)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await navigation.getByRole("link", { name: "Privacy Policy", exact: true }).click();
    await expect(page).toHaveURL(/\/privacy-policy$/, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: "Privacy Policy", exact: true })).toBeVisible();
  });
}
