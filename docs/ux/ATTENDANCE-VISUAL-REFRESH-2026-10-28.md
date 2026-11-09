# Attendance visual refresh — 2026-10-28

## Scope

The Attendance dashboard now uses the existing complete attendance-summary response for four named-check-in charts (members/visitors, category, gender, source) and two separately labelled reported-headcount charts. The trend uses the existing report grant. Basic charts do not require advanced Analytics. Unknown categories remain visible; null demographic subtotals are not turned into supplied zeroes. The reported age/gender dimensions describe the same total and are never added together or to named check-ins.

The automatic dashboard range starts 29 days before today and includes the final day through 23:59:59.999Z, matching the existing API calendar-date contract. HQ uses permitted church-wide scope; branch users send their assigned branch. KPI cards, recent-record/event lists and dashboard filters were removed, including their unnecessary queries. Compact task links retain their individual permissions. Summary and trend failures load and retry independently.

Check-in, records, reports, service directories/details and service forms opt into the Members neutral/teal presentation through Attendance wrappers. Category and status badges have text labels. Service administration lives under More options; archive/restore/delete confirmations and mutation handlers remain intact. Forms retain their fields, schemas, defaults and unsaved-change guards. Shared headcount dialogs accept an optional presentation class with unchanged defaults for events/departments/cell groups.

Records retain visible branch/service/date filters and move category/reset into More filters. Report exports now include the selected branch as well as dates. Named and reported-headcount exports stay within their respective tabs. Reports emphasize charts and explicitly identify the per-service chart as a maximum-200-loaded-record sample; export fetches all matching pages.

No API, database, subscription, route, or permission-seed changes. Dedicated Analytics is unchanged.

## Verification

- 448 unit tests passed; targeted lint, TypeScript and the production web build passed.
- Attendance browser verification covers 49 cases across the full regression and focused reruns (including visitor registration outcomes and duplicate check-ins).
- New mocked browser coverage checks summary-only/report access, denied access, HQ/branch scope, inclusive dashboard dates, missing demographics, empty states, independent failures/retry, record/report export filters, service lifecycle controls and responsive chart layouts.
- Existing regression fixtures now navigate the existing Attendance tabs, optional headcount disclosure and event action menu, and declare the existing module entitlements/event-list grant needed by those flows. Application permissions are unchanged.
- Mock-data previews are saved outside the repository at `/tmp/belivrhq-attendance-previews/` (desktop/mobile and dark views, check-in, records, services, service form, service detail and reports). These are local test fixtures, not live church data.

## Release

Web release commit `754c89b` is on `main`. The existing Vercel Git integration reports a successful deployment: https://vercel.com/pappycoders-projects/church-os-web/Edre4DqGyB4J36hescFgRYvckStF . No API deployment, migration, subscription changes or live church-data writes are needed. Subsequent local changes are test-fixture and validation-documentation updates only.
