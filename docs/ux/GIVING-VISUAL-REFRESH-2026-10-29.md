# Giving visual refresh — 2026-10-29

## Dashboard and reports

The Giving dashboard contains only a successful-giving trend and category bars, with compact branch/currency controls and permission-controlled task links. The fixed 30-calendar-day range includes today through 23:59:59.999Z. NGN is the default; currency choices match the existing Giving Analytics choices without requiring Analytics access. HQ may narrow its permitted scope; branch viewers remain pinned. Both charts use the complete existing `/giving/dashboard/charts` aggregate, retaining Uncategorized data and keeping currencies separate. Removed KPI/recent-list queries are no longer made.

Reports retain detailed filters and derive the trend, category bars, method donut, compact amount/count caption and exports from the same fetch-all successful-transaction dataset. Selected currencies are never combined or converted. Existing 5,000-row/incomplete-page protections remain, including visible errors and filters for narrowing the result. Category charts display every returned category, scrolling within the card when needed.

Chart surfaces have compact tooltips, monetary axes and explicit currency captions, with loading/empty/error/retry states. Shared trend/donut primitives add opt-in money formatting/value-axis props with unchanged defaults for other modules.

## Directories and forms

Giving-scoped presentation wrappers inherit the neutral workspace and saved personal accent. Records keep branch/date/status visible, with category/method/service/reset under More filters and an active-secondary-filter count. Currency-labelled amounts are right-aligned with tabular numerals; semantic labelled badges distinguish Success, Pending, Failed and Reversed.

Categories and recurring schedules use small directory counts, quieter badges and vertical-dot administration menus. Existing category create/edit/deactivate/archive/restore and recurring creation/pause/resume/cancel handlers, confirmation text, availability and payment authorization remain. Recurring confirmation cancellation returns focus to its originating trigger.

Record Giving and recurring dialogs accept an optional presentation class for Giving page callers; embedded cell-group giving is unchanged. Recording fields are grouped into gift details, giver/context and additional information. Cash/bank recording is explicitly labelled NGN, matching the existing backend default even when the dashboard is viewing another currency. Inputs, defaults, branch/member/service/event linking, inline category creation and submission payloads remain intact. Existing validation-error retention and cancel/reopen reset behavior are preserved; no new persistent drafts were introduced.

## Verification

- 453 unit tests passed; targeted lint, TypeScript, production build and whitespace checks passed.
- 32 unique browser scenarios passed across full/focused runs: 30 Giving/download/cell-group cases plus two Attendance chart compatibility cases.
- Coverage includes dashboard-only access without Analytics, denied access/entitlements, HQ/branch requests, inclusive dates, empty/error/retry states, currency separation, multi-page report/export accuracy, recording cash/bank and refreshing charts, recording NGN while viewing USD, input/selection retention, receipt PDF/email controls, category lifecycle, recurring authorization and actions, read-only views and existing form reset behavior.
- Reviewed mock-data desktop/mobile and light/dark previews with a saved violet accent at `/tmp/belivrhq-giving-previews/`. These contain fixture data only.

## Release

Web-only through the existing Git/Vercel integration. No backend, database, subscription, permission-seed, receipt-generation, payment-processing, provider or dedicated Analytics changes. No live gifts, charges, category/schedule mutations or receipt deliveries were performed during validation.
