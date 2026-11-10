import { expect, test } from "@playwright/test";

test("matching loopback writes pass the origin check while foreign origins remain blocked", async ({
  request,
}) => {
  const headers = {
    "X-BelivrHQ-Client": "web",
    "Sec-Fetch-Site": "same-origin",
    Origin: "http://127.0.0.1:3107",
  };
  // Clears only this test context's empty registration cookie; no account or
  // payment is created and no backend request is needed.
  const allowed = await request.delete("/api/registration-checkout", {
    headers,
  });
  expect(allowed.status()).toBe(204);
  const denied = await request.delete("/api/registration-checkout", {
    headers: { ...headers, Origin: "https://attacker.example" },
  });
  expect(denied.status()).toBe(403);
});

test("all three bundled typefaces load from the app without Google Fonts requests", async ({
  page,
  context,
}) => {
  const googleRequests: string[] = [];
  context.on("request", (request) => {
    if (/fonts\.(?:googleapis|gstatic)\.com/.test(request.url()))
      googleRequests.push(request.url());
  });
  await context.route("**/api/session", (route) =>
    route.fulfill({ json: { hasSession: false } }),
  );
  await page.goto("/login");
  const loaded = await page.evaluate(async () => {
    const style = getComputedStyle(document.documentElement);
    const families = [
      "--font-inter",
      "--font-fraunces",
      "--font-inter-tight",
    ].map((name) => style.getPropertyValue(name).split(",")[0].trim());
    const faces = await Promise.all(
      families.map((family) =>
        document.fonts.load(`400 16px ${family}`, "BelivrHQ"),
      ),
    );
    return faces.map(
      (fonts) =>
        fonts.length > 0 && fonts.every((font) => font.status === "loaded"),
    );
  });
  expect(loaded).toEqual([true, true, true]);
  expect(googleRequests).toEqual([]);
});
