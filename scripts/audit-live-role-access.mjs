import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";
import { chromium } from "@playwright/test";
import ts from "typescript";
import { auditUiContracts } from "./audit-ui-contracts.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const origin = new URL(process.env.BELIVRHQ_AUDIT_URL ?? "https://church-os-web.vercel.app").origin;
if (process.env.BELIVRHQ_AUDIT_DEMO_LOGINS !== "true") throw new Error("Set BELIVRHQ_AUDIT_DEMO_LOGINS=true to authorize existing demo-account logins");
if (!origin.startsWith("https://") && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) throw new Error("Use HTTPS for deployed acceptance checks");
const output = process.env.BELIVRHQ_AUDIT_OUTPUT ?? "/tmp/belivrhq-live-role-access.json";
const requested = (process.env.BELIVRHQ_AUDIT_ACCOUNTS ?? "").split(",").filter(Boolean);
const requestedRoutes = (process.env.BELIVRHQ_AUDIT_ROUTES ?? "").split(",").filter(Boolean);
const source = fs.readFileSync(path.join(root, "src/app/(auth)/login/page.tsx"), "utf8");
const password = process.env.BELIVRHQ_AUDIT_PASSWORD ?? source.match(/const DEV_PASSWORD = "([^"]+)"/)?.[1];
if (!password) throw new Error("Demo login password is unavailable");
const accounts = [...source.matchAll(/label: "([^"]+)", email: "([^"]+)"/g)].slice(0, 16)
  .map((match) => ({ label: match[1], email: match[2] })).filter((account) => !requested.length || requested.includes(account.email));
if (!accounts.length || accounts.some((account) => !account.email.endsWith("@belivrhq.dev"))) throw new Error("Only the existing development demo accounts are supported");
const routeModule = { exports: {} };
runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, "src/lib/route-permissions.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 },
}).outputText, { module: routeModule, exports: routeModule.exports }, { timeout: 1000 });
const { matchRoutePermission, checkRule } = routeModule.exports;
const inventory = auditUiContracts(root);
const pages = inventory.pages.filter((page) => page.file.includes("(dashboard)")).sort((a, b) =>
  Number(a.route.includes("[")) - Number(b.route.includes("[")) || a.route.localeCompare(b.route));
const titleCache = new Map();
function pageTitles(entry) {
  if (titleCache.has(entry.file)) return titleCache.get(entry.file);
  const source = ts.createSourceFile(entry.file, fs.readFileSync(path.join(root, entry.file), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const titles = [];
  const visit = (node) => {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(source) === "PageHeader") {
      const title = node.attributes.properties.find((attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText(source) === "title");
      if (title?.initializer && ts.isStringLiteral(title.initializer)) titles.push(title.initializer.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source); titleCache.set(entry.file, titles); return titles;
}
const headers = { "x-belivrhq-client": "web", origin, "sec-fetch-site": "same-origin" };
const normalize = (value) => value.replace(/[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}/gi, "[id]");
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let stopRequested = false;
process.on("SIGINT", () => { stopRequested = true; });
process.on("SIGTERM", () => { stopRequested = true; });
const report = { origin, startedAt: new Date().toISOString(), liveDataMutationsAllowed: false, actors: [] };
const save = () => fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
const primaryActions = {
  "/members": ["Add Member", "members:new:create"],
  "/visitors": ["Add Visitor", "visitors:new:create"],
  "/forms": ["Add Form", "forms:list:create"],
  "/giving": ["Record Cash", "giving:records:create"],
  "/sermons": ["Add Sermon", "sermons:new:create"],
  "/pastoral": ["Add Note", "pastoral:notes:create"],
  "/appointments": ["New Appointment", "appointments:create"],
  "/admin/branches": ["Add Branch", "branches:create"],
  "/departments": ["Add Department", "departments:create"],
  "/departments/cell-groups": ["Add Cell Group", "cell_groups:create"],
  "/communication/broadcasts": ["New Broadcast", "broadcasts:create"],
};

const browser = await chromium.launch({ headless: true, handleSIGINT: false, handleSIGTERM: false });
try {
  for (const account of accounts) {
    if (stopRequested) break;
    // Logout revokes sessions for this identity; parallel audit processes must
    // never test the same account at the same time.
    const lock = path.join("/tmp", `belivrhq-role-audit-${createHash("sha256").update(`${origin}:${account.email}`).digest("hex").slice(0, 24)}.lock`);
    let acquired = false;
    while (!acquired && !stopRequested) {
      try { fs.mkdirSync(lock, { mode: 0o700 }); acquired = true; }
      catch (error) { if (error.code !== "EEXIST") throw error; await pause(1000); }
    }
    if (!acquired) break;
    const actor = { label: account.label, login: "pending", pages: [], navigation: [], apiFailures: [], scopeFailures: [], blockedMutations: [], pageErrors: [] };
    report.actors.push(actor); save();
    const context = await browser.newContext({ baseURL: origin, serviceWorkers: "allow" }).catch((error) => { fs.rmdirSync(lock); throw error; });
    const ids = {};
    const rowEndpoints = { members: "memberId", families: "familyId", events: "eventId", sermons: "sermonId", forms: "formId", profiles: "profileId", branches: "branchId", services: "serviceId", visitors: "visitorId", "admin/cell-groups": "groupId" };
    let currentProfile;
    try {
      const login = await context.request.post("/api/backend/auth/login", { headers, data: { email: account.email, password }, timeout: 75000 });
      const auth = await login.json().catch(() => ({}));
      actor.loginStatus = login.status();
      if (!login.ok() || !auth.success) { actor.login = "failed"; actor.errorCode = auth.error?.code; console.log(JSON.stringify({ actor: account.label, login: actor.login, status: login.status() })); continue; }
      if (auth.data?.requiresTwoFactor) { actor.login = "two-factor-required"; actor.setupRequired = !!auth.data.authenticatorSetup; console.log(JSON.stringify({ actor: account.label, login: actor.login })); continue; }
      const meResponse = await context.request.get("/api/backend/profiles/me", { headers, timeout: 75000 });
      const me = await meResponse.json().catch(() => ({}));
      if (!meResponse.ok() || !me.data?.permissions) { actor.login = "profile-unavailable"; actor.profileStatus = meResponse.status(); continue; }
      currentProfile = me.data;
      actor.login = "passed"; actor.roles = currentProfile.role; actor.scope = currentProfile.isAdminHq ? "HQ" : "branch"; actor.active = currentProfile.status === "active"; actor.permissionCount = currentProfile.permissions.length;
      const grants = new Set(currentProfile.permissions);
      if (currentProfile.memberId) ids.memberId = currentProfile.memberId;
      ids.profileId = currentProfile.profileId;
      ids.branchId = currentProfile.branchId;
      ids.roleName = "secretary";
      const readCapabilities = { members: ["members:all:read"], families: ["families:read"], events: ["events:list:read"], sermons: ["sermons:list:read"], forms: ["forms:list:read", "forms:submissions:read"], profiles: ["users:read"], branches: ["branches:directory:read"], services: ["attendance:services:read"], visitors: ["visitors:list:read"], "admin/cell-groups": ["cell_groups:read"] };
      for (const [endpoint, names] of Object.entries(readCapabilities)) {
        if (requestedRoutes.length && !requestedRoutes.some((route) => route.includes(`[${rowEndpoints[endpoint]}]`))) continue;
        if (!names.some((name) => grants.has(name))) continue;
        const response = await context.request.get(`/api/backend/${endpoint}${endpoint === "admin/cell-groups" ? "" : "?limit=20"}`, { headers, timeout: 45000 });
        if (!response.ok()) {
          (actor.fixtureLookupFailures ??= []).push({ endpoint, status: response.status() });
          continue;
        }
        const body = await response.json().catch(() => ({}));
        const data = body.data;
        const rows = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : [];
        const key = rowEndpoints[endpoint];
        const row = rows.find((row) => !row.archivedAt && !row.archived_at && (endpoint !== "forms" || row.status === "published")) ?? rows[0];
        if (key && row) ids[key] = row[key] ?? row.id ?? row.cellGroupId;
      }
      await context.addInitScript(() => {
        window.__belivrhqAcceptance = { pending: 0, responses: [], writes: [] };
        const original = window.fetch.bind(window);
        window.fetch = async (input, options) => {
          const method = options?.method ?? (input instanceof Request ? input.method : "GET");
          const pathname = new URL(input instanceof Request ? input.url : String(input), location.origin).pathname;
          if (!["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) {
            window.__belivrhqAcceptance.writes.push({ method, endpoint: pathname });
            return new Response(JSON.stringify({ success: false, error: { code: "AUDIT_READ_ONLY", message: "Live mutations are disabled for acceptance testing" } }), { status: 409, headers: { "Content-Type": "application/json" } });
          }
          if (!pathname.startsWith("/api/backend/")) return original(input, options);
          window.__belivrhqAcceptance.pending++;
          try {
            const response = await original(input, options);
            const body = response.headers.get("content-type")?.includes("application/json") ? await response.clone().json().catch(() => ({})) : {};
            const data = body.data;
            const rows = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : [];
            const keys = ["id", "memberId", "familyId", "eventId", "sermonId", "formId", "profileId", "branchId", "branch_id", "serviceId", "groupId", "cellGroupId", "visitorId", "status", "archivedAt", "archived_at"];
            window.__belivrhqAcceptance.responses.push({ endpoint: pathname.slice("/api/backend/".length), status: response.status, rows: rows.map((row) => Object.fromEntries(keys.filter((key) => row[key] !== undefined).map((key) => [key, row[key]]))) });
            return response;
          } finally { window.__belivrhqAcceptance.pending--; }
        };
      });
      await context.route("**/api/**", async (route) => {
        const request = route.request();
        if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
          actor.blockedMutations.push({ method: request.method(), endpoint: normalize(new URL(request.url()).pathname) });
          return route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ success: false, error: { code: "AUDIT_READ_ONLY", message: "Live mutations are disabled for acceptance testing" } }) });
        }
        await route.continue();
      });
      let navChecked = false;
      async function checkEntries(queue) {
      let activeRoute = "/login";
      const page = await context.newPage();
      page.on("dialog", (dialog) => { void dialog.accept(); });
      const pending = new Set();
      const responseTasks = new Set();
      page.on("pageerror", (error) => actor.pageErrors.push({ route: activeRoute, error: normalize(error.message).slice(0, 220) }));
      page.on("request", (req) => { if (req.url().includes("/api/backend/")) pending.add(req); });
      page.on("requestfailed", (req) => pending.delete(req));
      page.on("response", (response) => {
        const task = (async () => {
          const url = new URL(response.url());
          if (!url.pathname.startsWith("/api/backend/")) return;
          const endpoint = url.pathname.slice("/api/backend/".length);
          const observedRoute = activeRoute;
          if (response.status() >= 400) actor.apiFailures.push({ route: observedRoute, endpoint: normalize(endpoint), status: response.status() });
          const body = await response.json().catch(() => ({}));
          const data = body.data;
          const rows = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : [];
          const key = rowEndpoints[endpoint];
          if (key) {
            const row = rows.find((row) => !row.archivedAt && !row.archived_at && (endpoint !== "forms" || row.status === "published")) ?? rows[0];
            if (row) ids[key] = row[key] ?? row.id ?? row.cellGroupId;
          }
          if (!currentProfile.isAdminHq && ["members", "families", "events", "sermons", "forms", "profiles", "branches", "assets", "visitors", "admin/departments", "admin/cell-groups", "giving/transactions", "attendance/services", "attendance/attendance"].includes(endpoint)) {
            const outOfScope = rows.filter((row) => (row.branchId ?? row.branch_id) && (row.branchId ?? row.branch_id) !== currentProfile.branchId);
            if (outOfScope.length) actor.scopeFailures.push({ route: observedRoute, endpoint, count: outOfScope.length });
          }
        })().catch(() => {}).finally(() => { pending.delete(response.request()); responseTasks.delete(task); });
        responseTasks.add(task);
      });
      while (queue.length && !stopRequested) {
        const entry = queue.shift();
        for (let attempt = 0; attempt < 3 && await page.getByRole("dialog").count(); attempt++) {
          await page.keyboard.press("Escape");
          await pause(200);
        }
        activeRoute = entry.route;
        const expected = checkRule(matchRoutePermission(entry.route), (name) => grants.has(name));
        let missingFixture = false;
        const target = entry.route.replace(/\[([^\]]+)\]/g, (_, key) => {
          if (!ids[key]) { missingFixture = true; return "00000000-0000-4000-8000-000000000000"; }
          return encodeURIComponent(ids[key]);
        });
        if (expected && missingFixture) { actor.pages.push({ route: entry.route, expected: "allowed", result: "unverified-no-readable-record" }); continue; }
        const startedAt = Date.now();
        const observed = { route: entry.route, expected: expected ? "allowed" : "denied", result: "pending" };
        actor.pages.push(observed);
        try {
          const link = page.locator(`aside a[href="${target}"]`).last();
          if (expected && await link.count()) {
            await link.evaluate((anchor) => {
              for (let node = anchor.parentElement; node; node = node.parentElement) {
                if (node.tagName === "LI" && node.classList.contains("submenu")) {
                  const toggle = [...node.children].find((child) => child.tagName === "A");
                  if (toggle && !toggle.classList.contains("subdrop")) toggle.click();
                }
              }
            });
            await pause(400);
            await link.scrollIntoViewIfNeeded({ timeout: 10000 });
            await link.click({ timeout: 10000 });
            await page.waitForURL((url) => url.pathname === target, { timeout: 15000 });
            observed.navigationMethod = "sidebar-click";
          } else {
            await page.goto(target, { waitUntil: "domcontentloaded", timeout: 45000 });
            observed.navigationMethod = "direct-url";
          }
          await page.locator("main").waitFor({ state: "visible", timeout: 15000 });
          await pause(900);
          const titles = pageTitles(entry);
          if (expected && titles.length && !entry.route.includes("[")) await page.getByRole("main").getByRole("heading", { name: new RegExp(`^(?:${titles.map((title) => title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})$`) }).first().waitFor({ state: "visible", timeout: 15000 });
          const deadline = Date.now() + 16000;
          do { await pause(250); } while (Date.now() < deadline && (pending.size || await page.evaluate(() => window.__belivrhqAcceptance?.pending ?? 0) || await page.locator("main").innerText().then((text) => text.trim().length < 8)));
          await Promise.allSettled([...responseTasks]);
          const telemetry = await page.evaluate(() => window.__belivrhqAcceptance);
          if (telemetry) {
            for (const response of telemetry.responses) {
              if (response.status >= 400) actor.apiFailures.push({ route: activeRoute, endpoint: normalize(response.endpoint), status: response.status });
              const key = rowEndpoints[response.endpoint];
              const row = response.rows.find((row) => !row.archivedAt && (response.endpoint !== "forms" || row.status === "published")) ?? response.rows[0];
              if (key && row) ids[key] = row[key] ?? row.id ?? row.cellGroupId;
              if (!currentProfile.isAdminHq && response.rows.some((row) => (row.branchId ?? row.branch_id) && (row.branchId ?? row.branch_id) !== currentProfile.branchId) && ["members", "families", "events", "sermons", "forms", "profiles", "branches", "assets", "visitors", "admin/departments", "admin/cell-groups", "giving/transactions", "services", "attendance"].includes(response.endpoint)) actor.scopeFailures.push({ route: activeRoute, endpoint: response.endpoint, count: response.rows.filter((row) => (row.branchId ?? row.branch_id) && (row.branchId ?? row.branch_id) !== currentProfile.branchId).length });
            }
            actor.blockedMutations.push(...telemetry.writes.map((write) => ({ route: activeRoute, ...write })));
            await page.evaluate(() => { window.__belivrhqAcceptance.responses = []; window.__belivrhqAcceptance.writes = []; });
          }
          const text = await page.locator("main").innerText();
          const denied = /\bAccess denied\b|You do not have permission to view|You don't have access to forms/.test(text);
          const crashed = /Something went wrong|Application error: a client-side exception/.test(text);
          const unavailable = /Failed to load|Unable to load|Unable to verify|Could not load|There was an error|Something went wrong|We're having trouble/.test(text);
          observed.result = crashed ? "render-failure" : expected === !denied ? (expected && unavailable ? "data-error" : "passed") : "guard-mismatch";
          if (expected && primaryActions[entry.route]) {
            const [name, permission] = primaryActions[entry.route];
            const visible = await page.getByRole("main").getByRole("button", { name, exact: true }).count() + await page.getByRole("main").getByRole("link", { name, exact: true }).count();
            const scopeRestricted = entry.route === "/departments/cell-groups" && grants.has("cell_groups:own:read") && !grants.has("cell_groups:delete");
            observed.primaryAction = { permission, expected: grants.has(permission) && !scopeRestricted, present: visible > 0 };
            if (observed.primaryAction.expected !== observed.primaryAction.present) observed.result = "action-mismatch";
          }
          if (!navChecked && observed.result === "passed") {
            navChecked = true;
            const actual = new Set(await page.locator("aside a[href]").evaluateAll((links) => links.map((link) => link.getAttribute("href"))));
            for (const nav of inventory.navigation.filter((nav) => nav.location.includes("sidebar"))) {
              const allowed = checkRule(matchRoutePermission(nav.href), (name) => grants.has(name));
              actor.navigation.push({ href: nav.href, expected: allowed, present: actual.has(nav.href), result: allowed === actual.has(nav.href) ? "passed" : "mismatch" });
            }
          }
          if (observed.primaryAction?.present && observed.primaryAction.expected) {
            const name = primaryActions[entry.route][0];
            const action = page.getByRole("main").getByRole("button", { name, exact: true }).or(page.getByRole("main").getByRole("link", { name, exact: true })).first();
            const before = page.url();
            await action.click({ timeout: 5000 });
            const openedBy = Date.now() + 12000;
            do { await pause(200); } while (Date.now() < openedBy && page.url() === before && !await page.getByRole("dialog").isVisible().catch(() => false));
            observed.primaryAction.opened = page.url() !== before || await page.getByRole("dialog").isVisible().catch(() => false);
            if (!observed.primaryAction.opened) observed.result = "form-open-failure";
            const afterOpen = Date.now() + 10000;
            do { await pause(250); } while (pending.size && Date.now() < afterOpen);
            await Promise.allSettled([...responseTasks]);
          }
          const limits = actor.apiFailures.filter((failure) => failure.status === 429 && failure.route === activeRoute);
          if (limits.length) { observed.result = "rate-limited"; await pause(30000); }
        } catch (error) { observed.result = "navigation-error"; observed.error = normalize(String(error.message)).split("\n").slice(0, 12).join("\n"); }
        observed.durationMs = Date.now() - startedAt;
        save();
        if (actor.pages.length % 10 === 0) console.log(JSON.stringify({ actor: account.label, scope: actor.scope, checked: actor.pages.length, failures: actor.pages.filter((page) => !["passed", "pending", "unverified-no-readable-record"].includes(page.result)).length }));
        await pause(500);
      }
      await page.close();
      }
      for (const dynamic of [false, true]) {
        const queue = pages.filter((entry) => entry.route.includes("[") === dynamic && (!requestedRoutes.length || requestedRoutes.includes(entry.route)) && (!process.env.BELIVRHQ_AUDIT_DETAILS_ONLY || dynamic || ["/members/families", "/giving", "/members", "/forms"].includes(entry.route)));
        await Promise.all(Array.from({ length: Math.min(3, queue.length) }, () => checkEntries(queue)));
      }
      actor.apiFailures = [...new Map(actor.apiFailures.map((item) => [JSON.stringify(item), item])).values()];
      console.log(JSON.stringify({ actor: account.label, roles: actor.roles, scope: actor.scope, pages: actor.pages.length, passed: actor.pages.filter((page) => page.result === "passed").length, skipped: actor.pages.filter((page) => page.result.startsWith("unverified")).length, failures: actor.pages.filter((page) => !["passed", "pending", "unverified-no-readable-record"].includes(page.result)).length, apiFailures: actor.apiFailures.length, scopeFailures: actor.scopeFailures.length, navFailures: actor.navigation.filter((nav) => nav.result !== "passed").length }));
    } catch (error) { actor.login = actor.login === "pending" ? "connection-error" : actor.login; actor.error = String(error.name); }
    finally {
      if (currentProfile) await context.request.post("/api/backend/auth/logout", { headers, timeout: 20000 }).catch(() => {});
      try { await context.close(); } finally { fs.rmdirSync(lock); save(); }
    }
    await pause(13000);
  }
} finally { await browser.close(); report.completedAt = new Date().toISOString(); save(); }
console.log(JSON.stringify({ report: output, actors: report.actors.length, roles: [...new Set(report.actors.flatMap((actor) => actor.roles ?? []))] }));
