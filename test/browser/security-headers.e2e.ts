import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

test.use({ serviceWorkers: "block" });

test("serves browser security headers on pages and session responses", async ({ request }) => {
  for (const path of ["/login", "/api/session"]) {
    const response = await request.get(path, { headers: { "X-BelivrHQ-Client": "web" } });
    expect(response.status()).toBe(200);
    expect(response.headers()["x-frame-options"]).toBe("SAMEORIGIN");
    expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'self'");
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
    expect(response.headers()["referrer-policy"]).toBe("same-origin");
  }
});

test("blocks a foreign framing page while allowing same-origin frames", async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const html = `<!doctype html><title>Frame fixture</title><iframe src="${origin}/login" style="width:900px;height:900px"></iframe>`;
  const server = createServer((_req, response) => {
    response.writeHead(200, { "Content-Type": "text/html" });
    response.end(html);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const foreign = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    // No external providers, telemetry or real backend traffic leave these fixtures.
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== origin && url.origin !== foreign) return route.abort();
      if (url.pathname === "/__audit_frame")
        return route.fulfill({ status: 200, contentType: "text/html", body: html });
      if (url.pathname.startsWith("/api/backend/"))
        return route.fulfill({ status: 401, contentType: "application/json", body: '{"success":false}' });
      return route.continue();
    });
    const blocked = page.waitForEvent("console", {
      predicate: (message) => /frame-ancestors|X-Frame-Options/i.test(message.text()),
    });
    await page.goto(foreign);
    await blocked;
    expect(page.frames().some((frame) => frame.url() === `${origin}/login`)).toBe(false);
    await page.goto(`${origin}/__audit_frame`);
    await expect(page.frameLocator("iframe").locator('input[type="email"]')).toBeVisible();
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
