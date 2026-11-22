# Shared status captions — 21 Nov 2026

## Changes

Added formatStatusLabel for presentation-only normalization of raw statuses, including snake_case, hyphenated, camelCase and uppercase input. Missing or blank states use the shared fallback. Known form and visitor states retain their established domain labels, including Scheduled for follow_up_scheduled.

Applied readable captions across member lists/inspectors/details and giving ledgers; giving overview, transaction filters and billing history; form details and search results; event registrations and their payment filters; issued tickets and tier ticket states; attendance rows, filters and roster fallbacks; member/giving charts, pastoral risk metadata and remaining shared status fallbacks. Provider verification and assistant access captions also use the formatter.

Stored API values, status comparisons, tones, filter state, option values and mutation payloads are preserved. Arbitrary Tag text and user-authored names are not globally capitalized. Attendance option values remain present/late/absent/excused; their labels are Present/Late/Absent/Excused.

## Automated verification

- All 843 unit tests across 74 files passed on the final source, using two workers to avoid resource-related timeouts.
- New formatter regressions cover enum separators, casing, unknown states and blank values. Existing billing tests now assert readable captions while retaining the checks that pending/failed payments are not completed charges.
- Asset-worklist tests preserve the real status constants when mocking query hooks; the existing read/action permission checks pass.
- Standalone TypeScript, full source ESLint, UI contract audit and diff whitespace checks passed.
- Fresh production build passed, including lint/type validation and all 114 generated pages.

## Browser verification

40 checks at 1280px and 390px in light and dark mode. Covered populated issued tickets (3 Paid), tier ticket states (3 Open), event registrations, member directory, giving transactions, billing payment history (Success/Failed/Pending), form detail (Published), member/form search results and cell-group attendance controls. No page horizontal overflow or remaining raw lowercase status tags appeared in those checks. Tables retain intentional internal horizontal scrolling.

The selected cell group has no saved attendance history. Its Present/Late/Absent/Excused menu, selection and empty-state layout were exercised; saved attendance row captions were source-checked against the shared tested formatter. No attendance, payment, ticket, registration, member or form record was created or changed to populate a test.

The local environment restarted during work, so the API and frontend were restored. A fresh production build eliminated stale development assets; current rendered ticket labels were verified as Free and Paid. Light mode/default viewport were restored, and the app browser remains open on the populated issued-ticket view. Frontend port 3000 and API port 3001 remain running. No commit or deployment was made.

Evidence: [browser checks](/tmp/belivrhq-status-captions-browser.json), [desktop screenshot](/tmp/belivrhq-status-captions-tickets-desktop-light.png), [mobile dark screenshot](/tmp/belivrhq-status-captions-tickets-mobile-dark.png). Logs: /tmp/belivrhq-status-captions-{tests,types,lint,build}.log.
