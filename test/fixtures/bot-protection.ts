import { createChallenge, verifySolution, type Payload } from "altcha-lib";
import { deriveKey } from "altcha-lib/algorithms/sha";
import { expect, type BrowserContext, type Page } from "@playwright/test";

const secret = "browser-test-only-altcha-secret-".repeat(2);

export async function verifyBotForm(page: Page) {
  const protection = page.locator("[data-bot-protection]").last();
  if ((await protection.getAttribute("data-bot-verified")) === "true") return;
  const checkbox = protection.getByRole("checkbox");
  if (!(await checkbox.isChecked())) await checkbox.click();
  await expect(protection).toHaveAttribute("data-bot-verified", "true", {
    timeout: 30000,
  });
  await expect(protection).toBeHidden();
}

/** Real signed challenges and real worker solves; no widget test mode or production bypass. */
export async function mockBotChallenges(context: BrowserContext, counter = 25) {
  const signatures = new Set<string>();
  await context.route(
    "**/api/backend/bot-protection/*challenge?*",
    async (route) => {
      const url = new URL(route.request().url());
      const challenge = await createChallenge({
        algorithm: "SHA-256",
        cost: 1,
        counter,
        deriveKey,
        hmacSignatureSecret: secret,
        expiresAt: new Date(Date.now() + 1200000),
        data: {
          method: url.searchParams.get("method"),
          path: url.searchParams.get("path"),
        },
      });
      signatures.add(challenge.signature!);
      await route.fulfill({
        headers: { "Cache-Control": "no-store" },
        json: challenge,
      });
    },
  );
  return async (
    body: { altcha?: string; website?: string },
    method: string,
    path: string,
  ) => {
    if (!body.altcha || body.website !== "") return false;
    const payload = JSON.parse(
      Buffer.from(body.altcha, "base64").toString(),
    ) as Payload;
    if (
      payload.challenge.parameters.data?.method !== method ||
      payload.challenge.parameters.data?.path !== path
    )
      return false;
    const result = await verifySolution({
      ...payload,
      deriveKey,
      hmacSignatureSecret: secret,
    });
    return result.verified && signatures.delete(payload.challenge.signature!);
  };
}
