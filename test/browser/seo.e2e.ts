import { test, expect } from "@playwright/test";
import { helpArticles } from "../../src/lib/help/catalog";

test.use({ javaScriptEnabled: false });
for (const [route, image] of [["/", "/og.png"], ["/help", "/og/help.png"], ["/help/set-up-your-church", "/og/help/set-up-your-church.png"]]) {
  test(`public metadata is complete in the server HTML: ${route}`, async ({ page }) => {
    await page.goto(route);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(new URL(canonical!).pathname).toBe(route);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", canonical!);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", new URL(image, canonical!).href);
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute("content", new URL(image, canonical!).href);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
    const data = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(data.length).toBeGreaterThan(0);
    data.forEach(value => expect(JSON.parse(value)["@context"]).toBe("https://schema.org"));
  });
}
for (const route of ["/login", "/register", "/subscription", "/payment/complete", "/forms/public/seo-token", "/dashboard"]) {
  test(`non-public content stays out of search: ${route}`, async ({ page, context }) => {
    await context.addCookies([{ name: "belivrhq_token", value: "metadata-only-fixture", url: "http://127.0.0.1:3107" }]);
    await page.goto(route);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
    await expect(page.locator('meta[property="og:url"]')).toHaveCount(0);
  });
}
test("crawlers can fetch all banners, robots and the public sitemap", async ({ request }) => {
  for (const file of ["/og.png", "/og/help.png", ...helpArticles.map(article => `/og/help/${article.slug}.png`)]) {
    const response = await request.get(file);
    expect(response.status(), file).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
  }
  const robots = await request.get("/robots.txt");
  const text = await robots.text();
  expect(text).toContain("Disallow: /api/");
  expect(text).toContain("Sitemap: https://");
  const sitemap = await request.get("/sitemap.xml");
  const xml = await sitemap.text();
  expect(xml).toContain("/help/set-up-your-church</loc>");
  expect(xml).not.toMatch(/\/(dashboard|login|forms\/public|subscription)<\/loc>/);
});
