import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { Workbook } from "exceljs";

for (const logo of ["uploaded", "missing", "broken"]) test(`read-only exports retain church and app identity with ${logo} logo`, async ({ page, context }) => {
  await context.addCookies([{ name: "belivrhq_token", value: "branding-fixture", url: "http://127.0.0.1:3107" }]);
  await context.addInitScript((logo) => {
    const original = window.fetch.bind(window);
    const calls: string[] = [];
    (window as unknown as { brandingCalls: string[] }).brandingCalls = calls;
    window.fetch = async (input, options) => {
      const path = new URL(input instanceof Request ? input.url : String(input), location.origin).pathname;
      if (!path.startsWith("/api/")) return original(input, options);
      calls.push(`${options?.method || "GET"} ${path}`);
      if (path === "/api/session") return Response.json({ hasSession: true });
      let data: unknown = { data: [], total: 0, meta: { total: 0, page: 1, limit: 20, totalPages: 1 } };
      if (path.endsWith("/auth/session")) data = { userId: "user-a", email: "reader@example.com" };
      else if (path.endsWith("/profiles/me")) data = {
        profileId: "profile-a", userId: "user-a", churchId: "church-a", branchId: "branch-a", role: ["custom_reader"], status: "active", isAdminHq: false,
        firstName: "Read", lastName: "Only", planFeatures: ["assets"], permissions: ["assets:list:read"], branch: { branchId: "branch-a", name: "Branch A" },
        church: { churchId: "church-a", name: "Grace Community Church", logoUrl: logo === "uploaded" ? "/brand/belivrhq-emblem.png" : logo === "broken" ? "/missing-church-logo.png" : undefined },
      };
      else if (path.endsWith("/assets")) data = { data: [{ id: "asset-a", churchId: "church-a", branchId: "branch-a", name: "Church keyboard", assetTag: "KEY-001", condition: "good", status: "active", currentValue: 100, createdAt: "2026-10-01T00:00:00Z" }], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } };
      else if (path.endsWith("/unread-count")) data = { count: 0 };
      return Response.json({ success: true, data });
    };
  }, logo);
  await page.goto("/assets");
  await expect(page.getByText("Church keyboard", { exact: true })).toBeVisible();
  for (const format of ["CSV", "Excel", "PDF"]) {
    await page.getByRole("button", { name: "Export", exact: true }).first().click();
    const downloaded = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: `Export as ${format}`, exact: true }).click();
    const download = await downloaded;
    const bytes = await readFile((await download.path())!);
    if (format === "CSV") {
      expect(bytes.toString()).toContain("Grace Community Church,BelivrHQ");
      expect(bytes.toString()).toContain("Church keyboard");
    } else if (format === "Excel") {
      const book = new Workbook();
      await book.xlsx.load(new Uint8Array(bytes).buffer);
      expect(book.worksheets[0].getCell("A1").value).toContain("Grace Community Church");
      expect(book.worksheets[0].getCell("A3").value).toContain("Powered by BelivrHQ");
      expect(book.worksheets[0].getImages()).toHaveLength(logo === "uploaded" ? 1 : 0);
    } else {
      const pdf = bytes.toString("latin1");
      expect(pdf).toContain("/Author (Grace Community Church)");
      expect(pdf).toContain("/Creator (BelivrHQ)");
      expect(pdf.includes("/Subtype /Image")).toBe(logo === "uploaded");
    }
  }
  const calls = await page.evaluate(() => (window as unknown as { brandingCalls: string[] }).brandingCalls);
  expect(calls.some((call) => /\/church(?:\/|$)/.test(call))).toBe(false);
  expect(calls.some((call) => /^(POST|PATCH|DELETE)/.test(call))).toBe(false);
});
