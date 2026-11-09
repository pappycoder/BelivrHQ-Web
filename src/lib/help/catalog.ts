export const HELP_REVIEWED_AT = "2026-10-19";
export const helpTopics = [
  {
    id: "getting-started",
    title: "Getting started",
    description: "Set up your church and sign in with confidence.",
    icon: "start",
  },
  {
    id: "people",
    title: "People & follow-up",
    description: "Care for members, families and visitors.",
    icon: "people",
  },
  {
    id: "attendance",
    title: "Attendance",
    description: "Check people in and record service totals.",
    icon: "attendance",
  },
  {
    id: "ministry",
    title: "Events & ministry",
    description: "Organise events, tickets and church groups.",
    icon: "ministry",
  },
  {
    id: "billing",
    title: "Giving & subscriptions",
    description: "Understand records, allowances and payments.",
    icon: "billing",
  },
  {
    id: "workspace",
    title: "Manage your workspace",
    description: "Invite staff and connect your providers.",
    icon: "workspace",
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    description: "Find a way forward when something goes wrong.",
    icon: "help",
  },
] as const;
export type HelpTopic = (typeof helpTopics)[number]["id"];
export interface HelpSummary {
  slug: string;
  title: string;
  summary: string;
  topic: HelpTopic;
  keywords: string[];
  minutes: number;
  popular?: boolean;
  permissions?: string[];
  adminOnly?: boolean;
}
export const helpArticles = [
  {
    slug: "set-up-your-church",
    title: "Set up your church workspace",
    summary:
      "Create your administrator account, activate a plan and prepare your workspace for the team.",
    topic: "getting-started",
    keywords: ["onboarding", "register", "setup", "headquarters", "start"],
    minutes: 4,
    popular: true,
  },
  {
    slug: "sign-in-and-account-recovery",
    title: "Sign in and recover your account",
    summary:
      "Find your workspace, reset a password and use your authenticator or recovery codes.",
    topic: "getting-started",
    keywords: ["login", "password", "2fa", "mfa", "security", "locked out"],
    minutes: 3,
    popular: true,
  },
  {
    slug: "invite-staff-and-manage-access",
    title: "Invite staff and manage access",
    summary:
      "Give your team the roles and location access they need without sharing accounts.",
    topic: "workspace",
    keywords: [
      "users",
      "permissions",
      "roles",
      "invitation",
      "staff seats",
      "pastor",
      "usher",
    ],
    minutes: 4,
    permissions: ["profiles:read", "users:read", "roles:read"],
  },
  {
    slug: "add-and-update-members",
    title: "Add and update members",
    summary:
      "Create directory records, find existing people and keep their details accurate.",
    topic: "people",
    keywords: ["directory", "person", "edit", "archive", "restore"],
    minutes: 3,
    popular: true,
    permissions: ["members:all:read"],
  },
  {
    slug: "import-members",
    title: "Import your member directory",
    summary:
      "Prepare the import template, check errors and bring existing records into BelivrHQ.",
    topic: "people",
    keywords: ["csv", "spreadsheet", "excel", "upload", "migration", "bulk"],
    minutes: 4,
    popular: true,
    permissions: ["members:import:create"],
  },
  {
    slug: "organise-families",
    title: "Organise members into families",
    summary:
      "Link people to their households while keeping individual directory records.",
    topic: "people",
    keywords: ["household", "parents", "children", "relationships"],
    minutes: 2,
    permissions: ["families:read"],
  },
  {
    slug: "welcome-and-follow-up-visitors",
    title: "Welcome and follow up with visitors",
    summary:
      "Record a first visit, keep follow-up details and avoid creating duplicate people.",
    topic: "people",
    keywords: ["guest", "newcomer", "first timer", "care", "convert"],
    minutes: 3,
    permissions: ["visitors:list:read"],
  },
  {
    slug: "check-in-attendees",
    title: "Check people in for a service",
    summary:
      "Use the attendance roster to find attendees and save named check-ins.",
    topic: "attendance",
    keywords: ["usher", "roster", "checkin", "check-in", "bulk", "service"],
    minutes: 3,
    popular: true,
    permissions: ["attendance:checkin:create", "attendance:services:read"],
  },
  {
    slug: "record-attendance-totals",
    title: "Record service and meeting totals",
    summary:
      "Capture the overall headcount and optional breakdowns alongside named attendance.",
    topic: "attendance",
    keywords: [
      "general attendance",
      "headcount",
      "adult",
      "children",
      "male",
      "female",
      "meeting",
    ],
    minutes: 3,
    permissions: ["attendance:records:read", "attendance:services:read"],
  },
  {
    slug: "create-events-and-registrations",
    title: "Create an event and manage registrations",
    summary:
      "Prepare an event, review its audience and manage registration records.",
    topic: "ministry",
    keywords: [
      "calendar",
      "conference",
      "booking",
      "registration",
      "free event",
    ],
    minutes: 3,
    permissions: ["events:all:read", "events:calendar:read"],
  },
  {
    slug: "manage-event-tickets",
    title: "Manage paid tickets and event check-in",
    summary:
      "Set up ticket tiers, confirm payments and validate tickets at the door.",
    topic: "ministry",
    keywords: ["qr", "scan", "paid event", "ticket", "paystack", "flutterwave"],
    minutes: 4,
    permissions: [
      "events:tickets:read",
      "events:checkin:create",
      "events:ticket-records:read",
    ],
  },
  {
    slug: "departments-and-cell-groups",
    title: "Work with departments and cell groups",
    summary:
      "Organise teams, assign leaders and work with the groups you can access.",
    topic: "ministry",
    keywords: [
      "department",
      "cell leader",
      "small group",
      "meeting",
      "group giving",
    ],
    minutes: 3,
    permissions: ["departments:read", "cell_groups:read"],
  },
  {
    slug: "record-giving-and-receipts",
    title: "Record giving and find receipts",
    summary:
      "Record cash or bank giving, review transactions and keep receipts with the right records.",
    topic: "billing",
    keywords: [
      "donation",
      "tithe",
      "offering",
      "treasurer",
      "finance",
      "transaction",
      "export",
    ],
    minutes: 4,
    permissions: ["giving:records:read"],
  },
  {
    slug: "reports-and-analytics",
    title: "Understand reports and analytics access",
    summary:
      "Find reports for your work and understand why some dashboards are restricted.",
    topic: "billing",
    keywords: [
      "report",
      "analytics",
      "statistics",
      "download",
      "export",
      "hq",
      "branch",
    ],
    minutes: 3,
    permissions: [
      "reports:financial:read",
      "reports:attendance:read",
      "analytics:dashboard:read",
    ],
  },
  {
    slug: "plans-and-allowances",
    title: "Choose a plan and understand allowances",
    summary:
      "Compare member, staff and location limits, and understand upgrades and renewal preferences.",
    topic: "billing",
    keywords: [
      "essentials",
      "community",
      "network",
      "enterprise",
      "subscription",
      "limit",
      "full",
      "80%",
      "90%",
    ],
    minutes: 4,
    popular: true,
    adminOnly: true,
  },
  {
    slug: "subscription-currencies-and-payments",
    title: "Pay for your subscription in an available currency",
    summary:
      "Understand USD base prices, rounded conversions, payment quotes and manual renewals.",
    topic: "billing",
    keywords: [
      "dollar",
      "usd",
      "ngn",
      "naira",
      "exchange rate",
      "currency",
      "renew",
      "billing",
    ],
    minutes: 4,
    adminOnly: true,
  },
  {
    slug: "subscription-payment-problems",
    title: "Resolve a subscription payment problem",
    summary:
      "Check a pending payment, recover a checkout and know when to contact support.",
    topic: "troubleshooting",
    keywords: [
      "charged",
      "failed",
      "pending",
      "payment",
      "reference",
      "expired quote",
      "cancelled",
      "renewal",
    ],
    minutes: 3,
    adminOnly: true,
  },
  {
    slug: "connect-provider-accounts",
    title: "Connect your church’s service providers",
    summary:
      "Set up your church’s email, messaging and payment providers and choose their channels.",
    topic: "workspace",
    keywords: [
      "integrations",
      "resend",
      "sendgrid",
      "mailgun",
      "termii",
      "twilio",
      "whatsapp",
      "sms",
      "paystack",
      "flutterwave",
    ],
    minutes: 4,
    permissions: ["integrations:read"],
  },
  {
    slug: "offline-work-and-reconnection",
    title: "Work offline and reconnect safely",
    summary:
      "Understand saved drafts, pending sync and what to check before retrying.",
    topic: "troubleshooting",
    keywords: [
      "offline",
      "internet",
      "network",
      "connection",
      "sync",
      "queue",
      "draft",
      "retry",
    ],
    minutes: 3,
    permissions: ["offline:read"],
  },
  {
    slug: "get-help-and-report-a-problem",
    title: "Get help and report a problem",
    summary:
      "Find a guide or ask your church administrator to contact BelivrHQ through the in-app chat.",
    topic: "troubleshooting",
    keywords: ["help", "support", "bug", "contact", "tawk", "documentation", "ticket", "tickets", "email", "new conversation"],
    minutes: 2,
  },
] as const satisfies readonly HelpSummary[];
export type HelpSlug = (typeof helpArticles)[number]["slug"];
export function helpArticle(slug: string) {
  return helpArticles.find((article) => article.slug === slug);
}
export function helpTopic(id: string) {
  return helpTopics.find((topic) => topic.id === id);
}
