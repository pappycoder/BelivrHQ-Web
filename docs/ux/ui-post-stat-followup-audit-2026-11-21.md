# Post-stat-header follow-up review — 21 Nov 2026

Read-only review of dashboard, populated member directory (four members) and giving records (three gifts). Twelve baseline viewport/theme cases at 1280px/320px in light/dark mode, one Ledger navigation check and four targeted stat-value measurements at desktop/390px/320px.

## Confirmed findings

1. Dashboard Ledger link navigates to /giving and displays a 404. The existing giving-records page is /giving/donations. Source: src/app/(paper)/home/page.tsx:140. src/components/dashboard/dashboard-charts.tsx:189 also contains /giving as a fallback giving destination; that conditional branch was source-checked, not clicked during this review. Align dashboard links with valid current routes and existing permission requirements. The source UI-contract audit returned no issues, but the actual browser navigation proves this route failure; its matcher is not evidence that every rendered destination resolves.
2. Shared stat-card values can clip on narrow phones. The populated giving page displays ₦10,000 in the On this page stat. At 320px in both themes, its value block has scrollWidth 129px and clientWidth 87px; the amount extends beyond the card's outer edge and is clipped. At 390px the content width is 122px, so the amount still intrudes into the padding, though it does not necessarily clip at the outer card. Desktop content width is 225px and fits. Header wrapping is already corrected; the separate value typography needs responsive fitting/layout. Source: src/components/paper/stat.tsx, fixed 1.9rem value display.

No additional layout/status/date issue was confirmed in the checked member directory. No page-level horizontal overflow in the 12 baseline cases: local clipping can occur without page overflow, as the giving stat demonstrates. These checks do not cover every route, role, dataset or interaction. No code, record, financial data or notification state changed. Light mode/default viewport restored; app remains open on giving records. No build/tests rerun for read-only review.

Evidence: [12 baseline cases](/tmp/belivrhq-post-stat-review-checks.json), [four value measurements](/tmp/belivrhq-post-stat-review-values.json), [Ledger 404 screenshot](/tmp/belivrhq-dashboard-ledger-404.png).
