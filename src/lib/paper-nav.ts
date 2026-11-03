import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  House,
  BookOpen,
  Boxes,
  CalendarDays,
  HandCoins,
  MessageSquare,
  Settings2,
  Users,
} from "lucide-react";

/**
 * @file Paper (Abide) navigation tree.
 *
 * Shape-compatible with `filterPermissionNavigation`, so dock, peek panel,
 * mobile sheet, and command palette all share the same permission- and
 * plan-filtered source of truth. `href` is the final (new IA) route; `live`
 * flips on as each migration wave lands its page, and `planPath` maps to the
 * legacy route so `planAllowsPath` keeps working unchanged.
 */

export interface PaperLeaf {
  title: string;
  href: string;
  description?: string;
  permission?: string;
  anyOf?: string[];
  allOf?: string[];
  planPath?: string;
  live: boolean;
  children?: never;
}

export interface PaperModule {
  title: string;
  href: string;
  planPath?: string;
  children: PaperLeaf[];
}

export interface PaperArea {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  blurb: string;
  planPath?: string;
  children: PaperModule[];
}

export const PAPER_AREAS: PaperArea[] = [
  {
    id: "today",
    label: "Today",
    href: "/home",
    icon: House,
    blurb: "Your day, at a glance",
    planPath: "/dashboard",
    children: [
      {
        title: "Workspace",
        href: "/home",
        children: [
          { title: "Overview", href: "/home", description: "Today's rhythm", live: true, planPath: "/dashboard" },
          { title: "Notifications", href: "/notifications", description: "Everything waiting on you", live: true, planPath: "/dashboard" },
          { title: "Search", href: "/search", description: "Find anyone or anything", live: true, planPath: "/dashboard" },
        ],
      },
    ],
  },
  {
    id: "people",
    label: "People",
    href: "/people/members",
    icon: Users,
    blurb: "Members, guests, and care",
    planPath: "/members",
    children: [
      {
        title: "Members",
        href: "/people/members",
        planPath: "/members",
        children: [
          { title: "Directory", href: "/people/members", description: "Everyone in the church", permission: "members:all:read", live: true, planPath: "/members" },
          { title: "Add a member", href: "/people/members/new", description: "Create a profile", permission: "members:new:create", live: true, planPath: "/members/new" },
          { title: "Import people", href: "/people/members/import", description: "Bring your list across", permission: "members:import:create", live: true, planPath: "/members/import" },
          { title: "Families", href: "/people/families", description: "Households and relationships", permission: "families:read", live: true, planPath: "/members/families" },
          { title: "Segments", href: "/people/segments", description: "Saved groups and lists", live: true, planPath: "/members" },
        ],
      },
      {
        title: "Visitors",
        href: "/people/visitors",
        planPath: "/visitors",
        children: [
          { title: "Pipeline", href: "/people/visitors", description: "First-time guests", permission: "visitors:list:read", live: true, planPath: "/visitors" },
          { title: "Follow-up", href: "/people/visitors/follow-up", description: "Who to reach this week", permission: "visitors:list:read", live: true, planPath: "/visitors/follow-up" },
        ],
      },
      {
        title: "Pastoral care",
        href: "/people/pastoral",
        planPath: "/pastoral",
        children: [
          { title: "Notes", href: "/people/pastoral", description: "Care conversation log", permission: "pastoral:notes:read", live: true, planPath: "/pastoral" },
          { title: "Care calendar", href: "/people/pastoral/care", description: "Milestones and visits", permission: "pastoral:life-events:read", live: true, planPath: "/pastoral/life-events" },
          { title: "Life events", href: "/people/pastoral/life-events", description: "Dates to mark", permission: "pastoral:life-events:read", live: true, planPath: "/pastoral/life-events" },
          { title: "Risk radar", href: "/people/pastoral/risk", description: "Who may need attention", permission: "pastoral:risk-scores:read", live: true, planPath: "/pastoral/risk-scores" },
          { title: "Engagement", href: "/people/pastoral/engagement", description: "Who we're reaching", permission: "pastoral:engagement:read", live: true, planPath: "/pastoral/engagement" },
        ],
      },
    ],
  },
  {
    id: "gatherings",
    label: "Gatherings",
    href: "/gatherings/events",
    icon: CalendarDays,
    blurb: "Events, services, and groups",
    planPath: "/events",
    children: [
      {
        title: "Events",
        href: "/gatherings/events",
        planPath: "/events",
        children: [
          { title: "Calendar", href: "/gatherings/events", description: "Month, week, agenda", permission: "events:calendar:read", live: true, planPath: "/events" },
          { title: "Create event", href: "/gatherings/events/new", description: "Plan something new", permission: "events:create", live: true, planPath: "/events/new" },
          { title: "Check-in", href: "/gatherings/events/check-in", description: "Kiosk mode", permission: "events:checkin:create", live: true, planPath: "/events/check-in" },
          { title: "Registrations", href: "/gatherings/events/registrations", description: "Who's coming", permission: "events:registrations:read", live: true, planPath: "/events/registrations" },
          { title: "Ticket tiers", href: "/gatherings/events/tiers", description: "Pricing and capacity", permission: "events:tickets:read", live: true, planPath: "/events/management" },
          { title: "Passes", href: "/gatherings/events/tickets", description: "Assign, print, track", permission: "events:tickets:read", live: true, planPath: "/events/management" },
        ],
      },
      {
        title: "Attendance",
        href: "/gatherings/attendance",
        planPath: "/attendance",
        children: [
          { title: "Overview", href: "/gatherings/attendance", description: "Headcount trends", permission: "attendance:dashboard:read", live: true, planPath: "/attendance" },
          { title: "Live check-in", href: "/gatherings/attendance/check-in", description: "Sunday morning", permission: "attendance:checkin:create", live: true, planPath: "/attendance/check-in" },
          { title: "Services", href: "/gatherings/attendance/services", description: "Every gathering", permission: "attendance:services:read", live: true, planPath: "/attendance/services" },
          { title: "Records", href: "/gatherings/attendance/records", description: "History and exports", permission: "attendance:records:read", live: true, planPath: "/attendance/records" },
          { title: "Reports", href: "/gatherings/attendance/reports", description: "The room, reported", permission: "attendance:reports:read", live: true, planPath: "/attendance/reports" },
        ],
      },
      {
        title: "Groups",
        href: "/gatherings/groups",
        planPath: "/departments",
        children: [
          { title: "All groups", href: "/gatherings/groups", description: "Teams and ministries", permission: "departments:read", live: true, planPath: "/departments" },
          { title: "Cell groups", href: "/gatherings/groups/cell", description: "Small circles", permission: "cell_groups:read", live: true, planPath: "/departments/cell-groups" },
        ],
      },
    ],
  },
  {
    id: "giving",
    label: "Giving",
    href: "/giving/overview",
    icon: HandCoins,
    blurb: "Generosity and stewardship",
    planPath: "/giving",
    children: [
      {
        title: "Stewardship",
        href: "/giving/overview",
        planPath: "/giving",
        children: [
          { title: "Overview", href: "/giving/overview", description: "This season's generosity", permission: "giving:dashboard:read", live: true, planPath: "/giving" },
          { title: "Donations", href: "/giving/donations", description: "Every gift, one feed", permission: "giving:records:read", live: true, planPath: "/giving/records" },
          { title: "Funds", href: "/giving/funds", description: "Designated giving", permission: "giving:categories:read", live: true, planPath: "/giving/categories" },
          { title: "Recurring", href: "/giving/schedules", description: "Scheduled gifts", permission: "giving:recurring:read", live: true, planPath: "/giving/recurring" },
          { title: "Statements", href: "/giving/statements", description: "Year-end receipts", permission: "giving:reports:read", live: true, planPath: "/giving/reports" },
        ],
      },
    ],
  },
  {
    id: "connect",
    label: "Connect",
    href: "/connect/inbox",
    icon: MessageSquare,
    blurb: "Conversations and follow-through",
    planPath: "/communication/inbox",
    children: [
      {
        title: "Conversations",
        href: "/connect/inbox",
        planPath: "/communication/inbox",
        children: [
          { title: "Inbox", href: "/connect/inbox", description: "Shared team inbox", permission: "emails:read", live: true, planPath: "/communication/inbox" },
          { title: "Templates", href: "/connect/templates", description: "Reusable messages", permission: "templates:read", live: true, planPath: "/communication/templates" },
          { title: "Broadcasts", href: "/connect/broadcasts", description: "Send to many", permission: "broadcasts:read", live: true, planPath: "/communication/broadcasts" },
          { title: "Messages", href: "/connect/messages", description: "SMS and WhatsApp", permission: "whatsapp:read", live: true, planPath: "/communication/messages" },
          { title: "Appointments", href: "/connect/appointments", description: "Bookings and slots", permission: "appointments:read", live: true, planPath: "/appointments" },
        ],
      },
    ],
  },
  {
    id: "library",
    label: "Library",
    href: "/library/sermons",
    icon: BookOpen,
    blurb: "Sermons, media, and forms",
    planPath: "/sermons",
    children: [
      {
        title: "Sermons",
        href: "/library/sermons",
        planPath: "/sermons",
        children: [
          { title: "All sermons", href: "/library/sermons", description: "Watch and listen", permission: "sermons:list:read", live: true, planPath: "/sermons" },
          { title: "New sermon", href: "/library/sermons/new", description: "Publish a message", permission: "sermons:new:create", live: true, planPath: "/sermons/new" },
          { title: "Series", href: "/library/sermons/series", description: "Collections", permission: "sermons:series:read", live: true, planPath: "/sermons/series" },
          { title: "Speakers", href: "/library/sermons/speakers", description: "Voices in the room", permission: "sermons:speakers:read", live: true, planPath: "/sermons/speakers" },
        ],
      },
      {
        title: "Media",
        href: "/library/media",
        planPath: "/media",
        children: [
          { title: "Gallery", href: "/library/media", description: "Images, audio, video", permission: "media:library:read", live: true, planPath: "/media" },
          { title: "Folders", href: "/library/media/folders", description: "Organised by theme", permission: "media:folders:read", live: true, planPath: "/media/folders" },
        ],
      },
      {
        title: "Forms",
        href: "/library/forms",
        planPath: "/forms",
        children: [
          { title: "All forms", href: "/library/forms", description: "Build and send", permission: "forms:list:read", live: true, planPath: "/forms" },
          { title: "Builder", href: "/library/forms/new", description: "Start from a blank page", permission: "forms:list:create", live: true, planPath: "/forms/new" },
          { title: "Submissions", href: "/library/forms/submissions", description: "Answers inbox", permission: "forms:submissions:read", live: true, planPath: "/forms/submissions" },
        ],
      },
    ],
  },
  {
    id: "insights",
    label: "Insights",
    href: "/insights/analytics",
    icon: BarChart3,
    blurb: "The story the numbers tell",
    planPath: "/analytics",
    children: [
      {
        title: "Analytics",
        href: "/insights/analytics",
        planPath: "/analytics",
        children: [
          { title: "Overview", href: "/insights/analytics", description: "The whole picture", permission: "analytics:dashboard:read", live: true, planPath: "/analytics" },
          { title: "Giving", href: "/insights/analytics/giving", description: "Generosity over time", permission: "analytics:giving:read", live: true, planPath: "/analytics/giving" },
          { title: "Attendance", href: "/insights/analytics/attendance", description: "Who gathers", permission: "analytics:attendance:read", live: true, planPath: "/analytics/attendance" },
          { title: "Members", href: "/insights/analytics/members", description: "Growth and retention", permission: "analytics:members:read", live: true, planPath: "/analytics/members" },
        ],
      },
      {
        title: "Reports",
        href: "/insights/reports",
        planPath: "/reports",
        children: [
          { title: "Report studio", href: "/insights/reports", description: "Compose and export", permission: "reports:view", anyOf: ["reports:financial:read", "reports:attendance:read", "reports:members:read"], live: true, planPath: "/reports" },
        ],
      },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    href: "/operations/assets",
    icon: Boxes,
    blurb: "Everything the church owns",
    planPath: "/assets",
    children: [
      {
        title: "Assets",
        href: "/operations/assets",
        planPath: "/assets",
        children: [
          { title: "Register", href: "/operations/assets", description: "Every item tracked", permission: "assets:list:read", live: true, planPath: "/assets" },
          { title: "Add asset", href: "/operations/assets/new", description: "Log something new", permission: "assets:list:create", live: true, planPath: "/assets/new" },
          { title: "Categories", href: "/operations/assets/categories", description: "Group by kind", permission: "assets:categories:read", live: true, planPath: "/assets/categories" },
          { title: "Maintenance", href: "/operations/assets/maintenance", description: "Service schedule", permission: "assets:maintenance:read", live: true, planPath: "/assets/maintenance" },
          { title: "Loans", href: "/operations/assets/loans", description: "Borrowed and lent", permission: "assets:loans:read", live: true, planPath: "/assets/loans" },
        ],
      },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    href: "/admin/team",
    icon: Settings2,
    blurb: "People, roles, and settings",
    planPath: "/admin/users",
    children: [
      {
        title: "Team",
        href: "/admin/users",
        planPath: "/admin/users",
        children: [
          { title: "Team members", href: "/admin/team", description: "Staff and volunteers", permission: "users:read", allOf: ["profiles:read"], live: true, planPath: "/admin/users" },
          { title: "Roles", href: "/admin/permissions", description: "What each role can do", permission: "roles:read", live: true, planPath: "/admin/roles" },
        ],
      },
      {
        title: "Church",
        href: "/admin/church",
        planPath: "/admin/settings",
        children: [
          { title: "Church settings", href: "/admin/church", description: "Name, times, location", permission: "church_settings:update", live: true, planPath: "/admin/settings" },
          { title: "Branches", href: "/admin/locations", description: "Locations and campuses", permission: "branches:directory:read", live: true, planPath: "/admin/branches" },
          { title: "Integrations", href: "/admin/channels", description: "Connect your tools", permission: "integrations:read", live: true, planPath: "/admin/integrations" },
        ],
      },
      {
        title: "Personal",
        href: "/settings/profile",
        planPath: "/profile",
        children: [
          { title: "Your profile", href: "/settings/profile", description: "Name, photo, phone", live: true, planPath: "/profile" },
          { title: "Security", href: "/settings/security", description: "Password & two-factor", live: true, planPath: "/profile" },
          { title: "Notifications", href: "/settings/notifications", description: "What reaches you", live: true, planPath: "/notifications" },
          { title: "Appearance", href: "/settings/appearance", description: "Light, dark, rhythm", live: true, planPath: "/profile" },
          { title: "Billing", href: "/settings/billing", description: "Plan & payments", permission: "billing:read", live: true, planPath: "/subscription" },
          { title: "Support", href: "/support", description: "The human desk", live: true, planPath: "/support" },
        ],
      },
    ],
  },
];

/** Every live leaf, flattened — used by the command palette and breadcrumbs. */
export function flattenPaperNav(areas: readonly PaperArea[]): { leaf: PaperLeaf; area: PaperArea; module: PaperModule }[] {
  const rows: { leaf: PaperLeaf; area: PaperArea; module: PaperModule }[] = [];
  for (const area of areas)
    for (const mod of area.children)
      for (const leaf of mod.children)
        if (leaf.live) rows.push({ leaf, area, module: mod });
  return rows;
}

export function areaForPathname(pathname: string): PaperArea | undefined {
  const flat = flattenPaperNav(PAPER_AREAS).map((row) => row.area);
  const unique = [...new Map(flat.map((area) => [area.id, area])).values()];
  const candidates = unique.filter(
    (area) =>
      area.children.some((mod) =>
        mod.children.some(
          (leaf) => leaf.live && (pathname === leaf.href || pathname.startsWith(leaf.href + "/")),
        ),
      ),
  );
  if (!candidates.length) return undefined;
  return candidates.reduce((best, area) => (best.href.length > area.href.length ? best : area));
}

export function navTrail(pathname: string): { area?: PaperArea; module?: PaperModule; leaf?: PaperLeaf } {
  const rows = flattenPaperNav(PAPER_AREAS).filter(
    (row) => pathname === row.leaf.href || pathname.startsWith(row.leaf.href + "/"),
  );
  const best = rows.sort((a, b) => b.leaf.href.length - a.leaf.href.length)[0];
  return { area: best?.area, module: best?.module, leaf: best?.leaf };
}
