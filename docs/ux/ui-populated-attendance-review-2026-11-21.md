# Populated attendance review — 21 Nov 2026

## Verification

Tested department, cell-group, check-in register, service and event attendance at 1280px and 390px in light and dark mode: 20 view combinations plus 10 status-filter/pagination checks.

The existing department and cell group contain no saved meeting attendance. A temporary read-only loopback proxy supplied 20 synthetic rows to the actual compiled application components, covering Present/Late/Absent/Excused, members/walk-ins, long names, long notes and a second page. Check-in register fixtures also contained 20 rows. Service/event detail checks used the real app with five existing service check-ins and two existing event check-ins.

- All 16 matching status-badge comparisons between department and cell group passed: wording, tone, foreground/background colors, font, size, weight, line height and padding.
- Each of the four status filters in both meeting views returned the expected five rows. This exercises the raw lowercase filter values with the readable captions.
- Pagination showed the remaining five of 20 records on page two.
- No page-level horizontal overflow occurred; wide meeting tables scroll internally. Mobile status columns were brought into view and inspected.
- No dark-mode-specific caption or background defect was confirmed.

## Findings

1. **Date formatting remains inconsistent in populated attendance.** The shared meeting table renders row.date directly (2026-11-21), while service check-ins use the shared short date format. Event check-in timestamps use a separate formatter without a year (25 Oct, 01:00). These should use the existing record-date formatters as appropriate.
2. **Mobile event attendance names are excessively truncated.** At 390px, the fixed w-40 timestamp occupies 170px and leaves only about 31.9px for the attendee name. Normal names Ladi Samuel and Jane Garcia appear as La… and Ja…. The timestamp/category metadata should reflow below the name on narrow screens.

Source locations: src/components/departments/meeting-attendance-table.tsx (row.date cell); src/app/(paper)/gatherings/events/[eventId]/page.tsx (attendance row, fixed timestamp width and custom timestamp formatter).

## Evidence and cleanup

- [Meeting checks and 16 badge comparisons](/tmp/belivrhq-populated-attendance-meeting-checks.json)
- [Real service/event checks](/tmp/belivrhq-populated-attendance-live-checks.json)
- [Cell group mobile dark screenshot](/tmp/belivrhq-populated-attendance-cell-mobile-dark.png)
- [Event mobile dark screenshot](/tmp/belivrhq-populated-attendance-event-mobile-dark.png)

The temporary preview rejected all non-GET/HEAD methods; its request log contains only fixture reads and no write attempts. No church records were created or changed. The temporary browser tab and server were closed. The real app/API remain running; light mode and the default viewport were restored, and the main browser remains open on event attendance. Application code was not changed during this test-only request.

## Follow-up fixes

Meeting date cells now use `formatRecordDate`, retaining the recorded calendar day and displaying dates such as `21 Nov 2026`. Event check-ins use `formatRecordDateTime`, including the year and viewer-local time, consistently with other record timestamps. Query/filter/export values remain unchanged.

Event attendance rows now use two grid rows on mobile: the attendee name has the available row width, with wrapping for long names, and category/timestamp metadata reflows below. Desktop retains aligned inline metadata without a fixed-width timestamp column. Existing theme tokens and status captions are preserved.

Validation after fixes: nine focused formatter/meeting-register unit tests, scoped ESLint, non-incremental TypeScript and the production build (114 pages) passed. Eighteen browser checks covered department/cell-group date cells, real event records, long synthetic event names and walk-ins, pagination, desktop (1280px), mobile (390px), an additional 320px event check, light and dark modes. No page-level horizontal overflow; all event names fit, and mobile metadata is below the name. Meeting date/status columns remain visible through internal table scrolling. Both original findings are resolved in the local build.

The [saved follow-up measurements](/tmp/belivrhq-attendance-fix-browser-checks.json) contain 13 cases (department and event); five cell-group cases were observed in browser tool output, including all four theme/viewport combinations with 15 rows and page two with five rows, each showing `21 Nov 2026` and all four readable statuses. [Fixed event mobile dark screenshot](/tmp/belivrhq-attendance-fixed-event-mobile-dark.png) · [Fixed cell-group mobile dark screenshot](/tmp/belivrhq-attendance-fixed-cell-mobile-dark.png). The temporary fixture server was stopped after testing; the real frontend and API remain available and the real event attendance preview is open. No church records were modified.
