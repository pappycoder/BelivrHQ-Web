# Compact attendance tables, service charts and visible headcounts — 2026-10-29

## General attendance

The shared general-attendance panel uses existing compact pagination with 12px muted range/page captions and small controls, retaining the fixed 20-record server page size. A panel-scoped CSS module keeps header/cell padding and numeric typography compact even inside surrounding directory presentation. Numeric columns align right, with tabular figures and preserved missing-value dashes. Existing date/branch filters, selection, complete filtered exports, editing and context permissions remain intact across services, events, departments and cell groups; unrelated table pagination is unchanged.

## Service details

The identity header is smaller. Two compact donut charts replace the repeated check-in figures and textual breakdown: age category (Adults, Children, Not supplied), and check-in identity (Members, Visitors/walk-ins, Unlinked when present). Both use every record in the existing complete service-attendance response, labelled All recorded named check-ins for this service. Missing ages are no longer inferred as adults. Each dimension counts each check-in once; neither includes reported headcounts. Counts remain readable in legends, with percentages in tooltips through additive optional donut props; other chart callers keep their prior presentation.

Service identity loads independently from attendance. Chart loading, zero data, errors and retries do not hide the service header or headcount records. The existing Giving tab, permission checks, currency handling and management menu are unchanged. Reported headcount records follow the charts.

## Check-In

Reported headcount entry is visible directly below compact service/category controls, without a disclosure or entry dialog. Date/required total appear first; optional adult/child/male/female fields share a responsive grid. Named member/visitor check-in follows, then reported headcount records. The form states that its date is independent from the roster date and that age/gender describe the same reported total.

GeneralAttendancePanel adds optional `entryMode` (dialog/inline/hidden), `showRecords`, and dirty/busy callbacks. Defaults preserve dialog-based creation elsewhere. Check-In composes an entry-only instance and a records-only instance with shared query caching; the entry-only instance never starts a records fetch. Existing record editing remains in a dialog. Inline creation uses the original validation, branch rules, save mutation and invalidation. Failed saves preserve values; successful saves clear counts while retaining date/branch. Dirty inline values participate in existing navigation protection and service-switch confirmation. Confirmed service switches remount/reset that scoped draft, and switching is blocked during a headcount save. Create-only users never request headcount records.

## Validation and release

459 unit tests passed, including complete-record age/identity breakdowns, missing data and zero values. The 58-scenario browser suite passed; 32 focused scenarios passed again after the final scoped density adjustment. Coverage includes actual 12px footer text/6px cell padding, page ranges/boundaries, all-time chart counts, independent errors/retry, empty states, inline subtotal validation, failed-value retention, success reset/date retention, draft confirmation, create-only/no-read requests, read-only controls, shared event/department/cell-group forms, exports, rosters, visitor check-in and service branch rules. Targeted lint, TypeScript, whitespace checks and the production build passed. Mocked desktop/mobile and light/dark previews with a saved violet accent are stored at `/tmp/belivrhq-attendance-compact-previews/`. No live attendance, member or visitor records are written by validation.

Web-only release through the existing Git/Vercel process. No backend, database, subscription, permission-seed or API-contract changes.
