# Approved workspace enhancements — 23 November 2026

The user approved integrating all ten proposals from the isolated design preview.

## Integrated behavior

1. List summaries use one compact strip; phones show two metrics and an expandable Summary control.
2. ListToolbar keeps search visible and moves page-specific filters/scope/sort/display into a shared drawer. Named views save primitive filter state on this browser, separately for each church, account and route. Applying a view resets pagination. Storage failures do not block lists.
3. CreatePreviewSidebar and FormActions provide a live preview dialog and a mobile action bar above workspace navigation. Existing validation and save handlers remain authoritative. Compact dialog footers stay sticky within the dialog.
4. ListTable and native Table pin selection and the primary name/title column while wide tables scroll inside their own region.
5. The gatherings calendar defaults to Agenda on phones. It uses the same permission-scoped data, occurrence projection, month navigation and record destinations as Month.
6. Form creation/editing uses Details, Questions, Rules and Preview steps, with validation returning to the relevant step. Questions support native handle dragging and keyboard-accessible move buttons. Respondent preview never submits answers.
7. Report studio defaults to a print layout using the same ordered sections/data/period/scope as exports. Charts & order remains available. Export waits for selected blocks and is blocked on failed loads. XLSX includes each selected section rather than only each block’s first section. PDF retains its existing pagination engine; a long report can span pages.
8. Notifications are grouped by local Today/Yesterday/Earlier calendar days. Existing read/category filtering, selection, details and confirmed mutations remain available.
9. The phone help launcher is icon-only and opens quick answers plus the help centre and authorized live chat. Background provider startup failures do not interrupt work; failures after a requested chat retain retry and fallback links.
10. Payment cards distinguish pending, applied, failed, missing-reference, review, revoked and closed outcomes. Applied comes only from the existing server-verification engine; callback query statuses never activate a subscription.

## Scope

The shared list design covers people, team, locations/permissions, events/issued tickets/tiers/registrations, giving/funds, forms/submissions, media/sermons, assets/loans/maintenance, departments/cell groups, communications and pastoral card registers. Existing check-in workflow controls remain inline; they are working desks rather than list filter drawers. Inbox/search navigation choices remain inline while using the same surface styling. Read-only payment history retains its existing billing layout and shared table behavior.

Existing access and branch scope, required-field validation, confirmations, subscription grants and provider verification remain in place. No backend, schema, credential, external message, real payment or deployment changes are part of this work.

## Validation

- Unit coverage includes saved-view account/page isolation and malformed storage, local day grouping, report section ordering/data and payment-state truthfulness, in addition to the existing ticket failure/permission and payment verification regressions.
- Browser verification uses existing populated records and unsaved drafts. No member/form/payment is created to demonstrate the UI.
- All 85 test files / 885 tests pass (`npm test -- --maxWorkers=2 --testTimeout=15000`). The optimized production build passes. Scoped ESLint passes with zero warnings. UI audit reports zero issues across 104 pages, 466 links and 877 controls.
- Browser checks recorded 76 observations across 39 routes, with desktop and phone checks in light and dark themes for the shared lists and principal enhanced workflows. Existing populated assets, loans, maintenance, members, team, giving and group records were included; issued-ticket emptiness is not claimed as populated coverage.
- Functional checks include filter drawer focus restoration, private saved views (including restoring Paid + Still out event registration filters on the final production build, then removing the disposable local view), unsaved mobile form previews, question ordering/respondent preview, actual calendar occurrences, report block reordering and successful PDF/XLSX exports. No real notifications were marked/deleted, chat messages sent, business records saved or payments attempted.
- Saved views include page-specific event payment/check-in criteria, service weekday, date ranges, inbox folders and view choices; action/dialog/draft state is intentionally excluded.
- Screenshots and browser observations are saved in `/home/pappy-coder/.codex/visualizations/2026/11/20/01a1f7cd-a8ab-7e53-862e-4aae31b09ff8/ui-enhancements-integrated/`.


## Preview fidelity follow-up

The integration was compared directly with the original `ui-upgrade-preview/app.jsx`, stylesheet and screenshots after the user reported visual drift.

- Shared registers: pinned checkbox and identity cells inherit the row's opaque animated background, including hover, focus and selection. Every register with a layout switch starts in table/list mode. Existing saved views can still explicitly restore another layout.
- Search: existing search controls remain outside the drawer, including older registers that supplied them among filters. Added working searches to roles, categories, pastoral notes/life events, schedules, statements, issued tickets/tiers, inbox and notifications. APIs without search support use explicitly labelled loaded-page searches; this does not imply a cross-page search.
- Filters/display: compact single-choice groups become labelled dropdowns with their original query/reset handlers. Independent boolean toggles remain independent. Sort order visibly shows Ascending/Descending; layout buttons consistently say List view / Card view alongside their icons. The compact drawer has a short header, scrollable body and reachable reset/results footer. Existing page queries remain live while it is open.
- Report studio: restored one content/settings panel beside an editorial paper preview, three initial authorized sections, recorded summary metrics, giving bars and expandable export breakdowns. Ordering and export failure/access checks remain authoritative. Full tables and all export formats remain available, while charts mount only when viewed.
- Notifications: restored the preview heading, one timeline surface, coloured category icons/tags, unread accents, period/count headings and aligned timestamps. Existing selection, confirmation, detail, read/unread and pagination flows remain available.
- Form builder: added Previous/Continue navigation and the ordered question summary/preview entry alongside the existing details/questions/rules/respondent preview and accessible drag/move controls.
- Payment presentation: restored the centred receipt card, outcome caption, coloured status symbol and verification progress. Progress never treats a checkout return or reference as verified payment.
- The compact summaries, private saved views, pinned identities, mobile form preview/actions, calendar agenda and quick-help entry were rechecked against the corresponding proposals. Sample figures and names are replaced by existing scoped application data; provider/payment/permission behavior is not simulated in the real app.

Follow-up validation: 86 test files / 888 tests pass; scoped ESLint has zero warnings. The final optimized production build passes. Browser verification covered desktop/390px phone views in light/dark themes for the revised drawer, reports and notifications. Dropdown filtering/reset, descending member order, labelled card selection, gift search (3 → 0 → 3 records), notification search (3 matching updates), builder Previous/Continue and a successful report PDF export were exercised. At 390 × 844 the layout controls end at 696px, above the footer at 762px, with no horizontal overflow. The checkbox and pinned name cells have the same computed background as the row. No business records, payments or notification read states were changed by these checks. Screenshots and observations are under `ui-preview-corrections/` beside the original preview evidence.
