# Date and appointment-status consistency — 21 November 2026

## Changes

- Corresponding record dates use the existing `formatRecordDate` convention, such as **25 Oct 2026**. Remaining numeric/browser-locale readouts in Templates, intake registers and currency-rate metadata were updated. Billing uses the same formatter. Timestamp callers pass Date objects to preserve their previous viewer-local date interpretation; calendar-only values retain their recorded day.
- Submission and appointment timestamps use `formatRecordDateTime`, such as **20 Dec 2026, 10:00**. The shared date/time formatter retains viewer/explicit timezone handling.
- Report Studio periods display friendly date bounds instead of raw ISO strings. Generated dates and PDF/spreadsheet metadata use the same record-date convention. Abbreviated contextual labels retain their shorter length with day-first order.
- Report presets now derive month/quarter/current-day bounds as local calendar dates. The previous UTC conversion could move midnight back a day in Lagos. API date keys remain ISO-shaped, while their calendar boundaries are corrected.
- Appointment list and detail dialog use one `AppointmentStatusBadge` component. Pending is gold, Confirmed moss, Completed sky and Cancelled neutral, with the same shape, dot, label and theme-aware palette in both places. Unknown statuses use the neutral fallback. The obsolete fixed pastel status mapping was removed.
- Narrow-screen appointment headers wrap their title/status instead of overflowing. This was caught at 320px during verification.

## Automated validation

- **818 tests across 71 files passed**, including shared badge states, date ranges, invalid/missing dates, local Date objects, timezone day boundaries and local report-preset boundaries in Africa/Lagos, Europe/London and America/Los_Angeles.
- TypeScript, full ESLint and UI contract audit passed.
- Final production build passed, including type checking and all 114 static pages. `git diff --check` passed.

## Appointment browser checks

The real detail dialog and the same badge used by the list were rendered with sample data, since the live appointment list is empty. All four statuses were checked at 1280px and 390px in both themes. Computed badge foreground/background colors matched in every pair. Confirmed was additionally checked at 320px in both themes. The final 18 checks had no page or dialog horizontal overflow, and the sample scheduled date consistently read **20 Dec 2026, 10:00** in the browser's Lagos timezone. No appointment was created.

The temporary fixture server served the existing public assets and used the application tooltip provider. It was closed after the checks. The earlier intermediate overflow measurements were superseded by `/tmp/belivrhq-date-status-appointments-final.json` after the header adjustment.

Evidence:

- [Final appointment measurements](/tmp/belivrhq-date-status-appointments-final.json)
- [Appointment detail at 320px in dark mode](/tmp/belivrhq-date-status-appointment-320-dark.png)

Logs: `/tmp/belivrhq-date-status-{focused,tests,types,lint,contracts,build}.log`.

## Live browser verification

The rebuilt Templates table showed **25 Oct 2026** at 1280px and 390px in light and dark mode. Report Studio showed **1 Jan 2026 → 21 Nov 2026**, including its generated-date footer, in the same four combinations. Numeric slash dates and raw ISO dates were absent from these displayed record dates/ranges.

At 320px in both themes, the report presets were exercised through the UI: **This month** produced **1 Nov 2026 → 21 Nov 2026**, **This quarter** produced **1 Oct 2026 → 21 Nov 2026**, and **All time** displayed its named unbounded period. The preset was restored to Year to date. These 14 Templates/report checks had no page-level horizontal overflow.

The existing populated form submission was opened read-only on desktop/mobile in both themes and showed **Submitted 4 Nov 2026, 14:35**. All four modal checks had equal client/scroll widths and no horizontal content overflow. It was closed without approving, rejecting or changing an answer.

Export metadata changes were covered by shared formatter and existing export tests; PDF/XLSX downloads were not separately visually audited in this pass.

Further evidence:

- [Live date measurements](/tmp/belivrhq-date-status-live-dates.json)
- [Live report preset checks](/tmp/belivrhq-date-status-report-presets.json)
- [Submission timestamp checks](/tmp/belivrhq-date-status-submissions.json)
- [Templates, desktop light](/tmp/belivrhq-date-status-templates-desktop-light.png)
- [Report Studio, mobile dark](/tmp/belivrhq-date-status-report-mobile-dark.png)
- [Submission detail, mobile light](/tmp/belivrhq-date-status-submission-mobile-light.png)

The existing browser tab remains open on Templates, with light mode restored and the normal viewport reset. The local frontend and API remain running. No appointment, template, submission, message, payment or other business record was created or changed. No commit or hosted deployment was performed.
