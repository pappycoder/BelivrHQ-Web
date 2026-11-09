import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  ROUTE_PERMISSIONS,
  matchRoutePermission,
  checkRule,
  permissionReturnTo,
  type RoutePermissionRule,
} from "./route-permissions";
import {
  isValidPermission,
  routeNotStricterThanNav,
} from "./menu-catalog";

const repoRoot = process.cwd();
const sidebarSrc = fs.readFileSync(
  path.join(repoRoot, "src/components/layouts/sidebar.tsx"),
  "utf8",
);
const headerSrc = fs.readFileSync(
  path.join(repoRoot, "src/components/layouts/header.tsx"),
  "utf8",
);

/** Represents one nav item and its permission gate. */
interface NavItemGate {
  href: string;
  permission?: string;
  /** False when the item carries children — sidebar parents render as menu
   *  openers (`<a href="#">`), so their href never navigates. */
  leaf: boolean;
}

/**
 * Collect every nav item (recursively, including children) that carries a
 * permission gate from a layout source file.
 */
function extractNavGates(source: string): NavItemGate[] {
  const gates: NavItemGate[] = [];
  // Match each nav object: href + optional permission.
  const itemRe = /\{[\s\S]*?href:\s*["`]([^"`]+)["`][\s\S]*?\}/g;
  for (const m of source.matchAll(itemRe)) {
    const block = m[0];
    const href = m[1];
    if (href === "#" || href === "undefined") continue;
    const permMatch = block.match(/permission:\s*["`]([^"`]+)["`]/);
    if (!permMatch) continue;
    gates.push({
      href,
      permission: permMatch?.[1],
      leaf: !block.includes("children:"),
    });
  }
  return gates;
}

describe("route-permissions guard", () => {
  const sidebarGates = extractNavGates(sidebarSrc);
  const headerGates = extractNavGates(headerSrc);

  describe("nav gates use known permission codes", () => {
    it.each([...sidebarGates, ...headerGates].filter((g) => g.permission))(
      "$href uses a known code — $permission",
      (gate) => {
        expect(isValidPermission(gate.permission!)).toBe(true);
      },
    );
  });

  describe("every nav-gated href resolves to a route rule", () => {
    it.each([...sidebarGates, ...headerGates].filter((g) => g.permission))(
      "$href is covered by a route rule — $permission",
      (gate) => {
        const rule = matchRoutePermission(gate.href);
        expect(rule).not.toBeNull();
        expect(rule!.permission).toBeDefined();
      },
    );
  });

  describe("route gate is never stricter than the nav gate", () => {
    // Only leaf items navigate — sidebar parents render as `<a href="#">`
    // menu openers (NavLink discards their href), so only leaf permissions
    // are route gates.
    it.each(
      [...sidebarGates, ...headerGates].filter((g) => g.leaf && g.permission),
    )(
      "$href — nav($permission)",
      (gate) => {
        const rule = matchRoutePermission(gate.href);
        // Open route (e.g. /dashboard) is never stricter.
        if (!rule) {
          expect(gate.permission).toBeUndefined();
          return;
        }

        expect(
          routeNotStricterThanNav(gate.permission, rule.permission),
          `nav ${gate.permission} vs route ${rule.permission}`,
        ).toBe(true);
      },
    );
  });

  describe("route-permissions use known codes", () => {
    it.each(ROUTE_PERMISSIONS.filter((r) => r.permission))(
      "$prefix → $permission is a known code",
      (rule: RoutePermissionRule) => {
        expect(isValidPermission(rule.permission!)).toBe(true);
      },
    );

    it("longest-prefix matching returns the deepest rule for each entry", () => {
      for (const rule of ROUTE_PERMISSIONS) {
        const matched = matchRoutePermission(rule.prefix);
        expect(matched?.prefix).toBe(rule.prefix);
      }
    });
  });
});

describe("dynamic route authorization", () => {
  it.each([
    ["/events/123/edit", "events:update"],
    ["/events/123/tiers", "events:tickets:read"],
    ["/sermons/123/edit", "sermons:update"],
    ["/forms/123/edit", "forms:list:update"],
    ["/forms/123/fill", "forms:list:read"],
    ["/events/123/edit/preview", "events:update"],
  ])("%s uses its specific action permission", (pathname, permission) => {
    expect(matchRoutePermission(pathname)?.permission).toBe(permission);
  });

  it("keeps static routes and path-segment boundaries distinct", () => {
    expect(matchRoutePermission("/events/new")?.permission).toBe("events:create");
    expect(matchRoutePermission("/forms/new")?.permission).toBe("forms:list:create");
    expect(matchRoutePermission("/events/123/editor")?.permission).toBe("events:all:read");
    expect(matchRoutePermission("/events-other")).toBeNull();
  });
});


describe("dashboard route coverage", () => {
  it("requires a permission rule for every operational page", () => {
    const root = path.join(repoRoot, "src/app/(paper)");
    const openPages = new Set(["/home", "/search", "/support", "/notifications", "/docs"]);
    const walk = (directory: string): string[] => fs.readdirSync(directory, { withFileTypes: true })
      .flatMap((entry) => entry.isDirectory() ? walk(path.join(directory, entry.name))
        : entry.name === "page.tsx" ? [path.dirname(path.join(directory, entry.name))] : []);
    for (const directory of walk(root)) {
      const route = `/${path.relative(root, directory)}`;
      if (!openPages.has(route)) expect(matchRoutePermission(route), route).not.toBeNull();
    }
  });
});


describe("read-only page access", () => {
  it("allows report readers without an unrelated view or write grant", () => {
    const rule = matchRoutePermission("/reports");
    expect(checkRule(rule, (name) => name === "reports:financial:read")).toBe(true);
    expect(checkRule(rule, (name) => name === "reports:financial:create")).toBe(false);
  });
  it("opens ticket tiers with a read grant and keeps edit pages write protected", () => {
    expect(checkRule(matchRoutePermission("/events/123/tiers"), (name) => name === "events:tickets:read")).toBe(true);
    expect(checkRule(matchRoutePermission("/events/123/edit"), (name) => name === "events:tickets:read")).toBe(false);
  });
  it("allows read-only follow-up viewing", () => {
    expect(checkRule(matchRoutePermission("/visitors/follow-up"), (name) => name === "visitors:list:read")).toBe(true);
  });
});

describe("explicit authenticated routes", () => {
  it("allows shared authenticated pages without a module grant", () => {
    for (const href of ["/home", "/profile", "/docs"]) {
      expect(checkRule(matchRoutePermission(href), () => false)).toBe(true);
    }
  });
  it("denies unknown dashboard routes and descendants of open shared pages", () => {
    for (const href of ["/missing-page", "/profile/unconfigured-admin", "/dashboard/new-admin"]) {
      expect(checkRule(matchRoutePermission(href), () => true)).toBe(false);
    }
  });
  it("requires both the user administration entry grant and the API read grant", () => {
    const rule = matchRoutePermission("/admin/users/profile-1");
    expect(checkRule(rule, (name) => name === "profiles:read")).toBe(false);
    expect(checkRule(rule, (name) => name === "users:read")).toBe(false);
    expect(checkRule(rule, (name) => ["users:read", "profiles:read"].includes(name))).toBe(true);
  });
});


describe("authorized login return destinations", () => {
  it("maps the retired dashboard return URL to home and preserves query and fragment", () => {
    expect(permissionReturnTo("/dashboard?from=login#activity", () => false)).toBe("/home?from=login#activity");
  });
  it("retains authorized routes with their query and fragment", () => {
    expect(permissionReturnTo("/forms/form-a?tab=answers#top", (name) => name === "forms:list:read")).toBe("/forms/form-a?tab=answers#top");
  });
  it("falls back from missing, unauthorized, external and backslash destinations", () => {
    for (const destination of [null, "/missing", "/admin/settings", "https://example.com", "//example.com", "/\\example.com", "/api/session"]) {
      expect(permissionReturnTo(destination, () => false)).toBe("/home");
    }
  });
});
