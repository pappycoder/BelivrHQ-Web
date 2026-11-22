# Ledger navigation and responsive stat values — 21 Nov 2026

The home Ledger link now targets /giving/donations and is shown only with giving:records:read, matching its destination. Legacy dashboard-chart giving destinations use /insights/analytics/giving or /giving/overview, preserving their existing permission branch. Those chart destinations were source-checked; the current home Ledger was exercised live.

Shared StatCard values now use StatValue, a client component that measures the fully formatted final amount in an aria-hidden ruler and fits visible text to the available width. ResizeObserver handles viewport and font changes. Counts retain their animation, formatting and full value; short values retain the original size. Scaling stops at half the original font size, with overflow-wrap:anywhere as a readable fallback for unusually long amounts. Optional prefixes/suffixes retain empty defaults. Hidden measurement text is excluded from assistive output.

## Validation

Scoped ESLint, standalone TypeScript and diff whitespace checks passed. Final production build passed, including lint/types and all 114 generated pages. An earlier build caught a required/optional prefix type mismatch; corrected before final validation.

Eighteen final viewport/theme cases cover real giving records, dashboard metrics and synthetic large giving totals at 1280px, 390px and 320px, in light/dark mode. All 72 visible stat values exactly match their formatted final values and fit without horizontal overflow. Six Ledger href checks and two real navigation checks (mobile dark/desktop light) passed and opened populated giving records.

The actual ₦10,000 amount uses about 21.77px text at 320px, 30.52px at 390px and the original 32.3px on desktop. The synthetic ₦3,703,703,670,369 total remains complete, wrapping at a minimum 16.15px on small phones. Resize measurements were taken after the browser rendered the updated layout.

Synthetic amounts were supplied only by a temporary GET/HEAD-only loopback preview of the same compiled frontend; writes were rejected. No giving/account records were changed and no receipts sent. The preview server was stopped and the main tab restored to real giving records in light mode with the normal viewport. The real frontend/API remain running; no deployment.

Evidence: [18 view checks and eight navigation checks](/tmp/belivrhq-ledger-stat-value-checks.json), [fixed real amount at 320px, light](/tmp/belivrhq-stat-values-fixed-320-light.png).
