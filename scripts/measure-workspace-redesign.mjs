/** Local, fixture-backed lab measurements. Never connects to a live backend. */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argument = (name, fallback) => process.argv[process.argv.indexOf(name) + 1] ?? fallback;
const baseURL = process.argv.includes("--base-url") ? argument("--base-url") : "http://127.0.0.1:3107";
if (!["127.0.0.1", "localhost"].includes(new URL(baseURL).hostname)) throw new Error("Benchmark requires a local server.");
const output = process.argv.includes("--output") ? argument("--output") : "/tmp/belivrhq-redesign-performance.json";
const source = await fs.readFile(path.join(root, "test/fixtures/workspace-redesign.ts"), "utf8");
const fixtureModule = {};
runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: fixtureModule, URL });
const browser = await chromium.launch();
const samples = [];
try {
  for (const width of [390, 1440]) for (const route of ["/dashboard", "/members", "/members/member-a", "/members/new", "/giving"]) for (let trial = 1; trial <= 3; trial++) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: "allow" });
    const { calls } = await fixtureModule.workspaceFixture(context, { navigation: true });
    const url = new URL(baseURL);
    await context.addCookies([{ name: "belivrhq_token", value: "redesign-benchmark", url: url.origin }]);
    await context.addInitScript(() => {
      localStorage.setItem("theme", "light");
      window.__workspaceMetrics = { lcp: null, cls: 0, eventDuration: 0, searchPaint: null };
      for (const type of ["largest-contentful-paint", "layout-shift", "event"]) {
        new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (type === "largest-contentful-paint") window.__workspaceMetrics.lcp = entry.startTime;
            if (type === "layout-shift" && !entry.hadRecentInput) window.__workspaceMetrics.cls += entry.value;
            if (type === "event" && entry.interactionId) window.__workspaceMetrics.eventDuration = Math.max(window.__workspaceMetrics.eventDuration, entry.duration);
          }
        }).observe({ type, buffered: true, ...(type === "event" ? { durationThreshold: 16 } : {}) });
      }
    });
    const page = await context.newPage();
    await page.goto(`${baseURL}${route}`);
    await page.locator("main h1").first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(600);
    await page.getByRole("button", { name: "Search navigation", exact: true }).evaluate(element => {
      element.addEventListener("click", () => {
        const start = performance.now();
        requestAnimationFrame(() => requestAnimationFrame(() => { window.__workspaceMetrics.searchPaint = performance.now() - start; }));
      }, { once: true });
    });
    await page.getByRole("button", { name: "Search navigation", exact: true }).click();
    await page.getByPlaceholder("Search pages...").fill("Members");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);
    samples.push({ route, width, trial, metrics: await page.evaluate(() => ({ ...window.__workspaceMetrics,
      scriptBytes: performance.getEntriesByType("resource").filter(entry => entry.initiatorType === "script").reduce((sum, entry) => sum + entry.encodedBodySize, 0),
    })), requests: calls.map(call => `${call.method} ${call.path}`).sort() });
    await context.close();
  }
} finally { await browser.close(); }
await fs.writeFile(output, JSON.stringify({ conditions: { baseURL, browser: "Chromium headless", throttling: "none; local fixture responses", themes: ["light"], trials: 3, note: "Event durations and click-to-paint are lab responsiveness proxies, not field INP." }, samples }, null, 2) + "\n");
console.log(`Wrote ${samples.length} samples to ${output}`);
