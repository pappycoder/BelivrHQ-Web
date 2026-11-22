# Remaining UI discrepancies — 21 November 2026

This is an audit, not an implementation change. No application code, records, messages or payment state was changed. The browser was returned to light mode, its temporary viewport override was cleared and the logged-in workspace was left open.

## Confirmed findings

### 1. Selected filter chips lose contrast in dark mode

**Priority: high visual/accessibility impact.** Members, Events and Templates demonstrate the shared problem: the active “All” chip has nearly black text on a dark background, unlike the readable inactive chips and view toggles.

`FilterChip` uses the outline Button with `bg-ink text-paper`, but the Button retains `dark:bg-input/30`. On the active Event “All” button, computed text colour is `rgb(20, 19, 15)` and the background is `oklab(0.330911 0.00175928 0.0182633 / 0.3)`. The intended inverse light background is overridden while its dark text remains. This affects desktop and mobile.

Locations: `src/components/paper/primitives.tsx:353`, `src/components/paper/primitives.tsx:362`, `src/components/ui/button.tsx:30`.

Fix direction: give the active FilterChip an explicit matching dark background/text/hover pair without changing all outline buttons globally.

Evidence: [desktop dark filters](/tmp/belivrhq-ui-audit-dark-filters.png).

### 2. The dashboard Calendar action opens a 404

**Priority: functional navigation.** The Calendar action inside the dashboard’s Next up card links to `/events`. Clicking it in the live browser displayed “404 — This page could not be found.” The calendar page is `/gatherings/events`.

Location: `src/app/(paper)/home/page.tsx:311`.

Evidence: [Calendar 404](/tmp/belivrhq-ui-audit-calendar-404.png).

### 3. “Next up” includes a completed one-time event

**Priority: misleading dashboard content.** On 21 November, the Next up card includes Youth Conference 2026 dated 1 November. The source filters only archived records, sorts by original start date and takes four. Its help text even warns that past gatherings may appear, which conflicts with the heading.

Locations: `src/app/(paper)/home/page.tsx:296`, `src/app/(paper)/home/page.tsx:308`.

Fix direction: exclude finished one-time events and calculate the next occurrence for recurring gatherings; simply discarding every event with a past original start would also discard ongoing recurring events.

Evidence: [dashboard](/tmp/belivrhq-ui-audit-dashboard.png).

### 4. The member sort value is clipped

**Priority: control readability.** “First name” is visibly cut off in the Members sort selector in both themes and at both tested widths. Its selected text needs approximately 67px on desktop and 72px on mobile but receives only 51px. The injected prefix icon, padding and chevron consume the remaining width.

Location: `src/app/(paper)/people/members/page.tsx:388`; shared field presentation also contributes.

Fix direction: reserve enough space for the selected label and account for the prefix icon, while retaining mobile wrapping.

### 5. Placeholder text can produce misleading field icons

**Priority: visual semantics.** The New template dialog’s Name field shows a clock icon. The resolver combines the label and placeholder, then matches “time” from the example “First-time guest welcome” before matching Name. The Content field also picks up a person icon from the `first_name` placeholder example.

Locations: `src/components/shared/field-feedback.tsx:175`, `src/lib/field-feedback.ts:53`, `src/app/(paper)/connect/templates/page.tsx:307`.

Fix direction: prioritize the actual field type and semantic label; use placeholder examples only as a fallback. Existing explicit icon overrides should remain supported.

Evidence: [New template mobile fields](/tmp/belivrhq-ui-audit-template-icons.png).

### 6. Single-record captions retain plural wording

**Priority: minor copy consistency.** The populated Templates page displays “1 records on this page” and “Showing 1–1 of 1 templates.”

Locations: `src/components/shared/register-table-toolbar.tsx:39`, `src/components/shared/list-pagination.tsx:45`, `src/app/(paper)/connect/templates/page.tsx:296`.

Fix direction: support singular/plural record and collection labels consistently in the shared toolbar and pagination.

### 7. Membership count charts show fractional person ticks

**Priority: minor data presentation.** The dashboard Membership growth axis displays ticks such as 0.75, 1.5 and 2.25 for member/visitor counts. The shared TrendChart leaves fractional Y-axis ticks enabled.

Locations: `src/app/(paper)/home/page.tsx:237`, `src/components/paper/charts.tsx:140`.

Fix direction: provide an integer-count axis option for member/visitor series without forcing integer ticks on currency or other continuous-value charts.

## Review coverage

The fully loaded browser matrix contains **32 combinations**: eight views at desktop **1280×900** and mobile **390×844**, each in light and dark mode:

- Members register.
- Event register.
- Ticket tiers.
- Asset loans.
- Asset maintenance.
- Add asset.
- Templates.
- Inbox.

The review also included dashboard navigation/content, visitor and asset registers, member/event creation, Billing, New template and the populated asset Return dialog. Dialogs were inspected and dismissed without submission. Assets/loans use the existing labelled UI-test records; no new records were created.

All 32 matrix combinations had **no page-level horizontal overflow**. Member sort truncation reproduced in all four Members combinations. The inspected creation and return controls had the expected themed card surfaces. The mobile Return dialog fit within the viewport; its date and textarea backgrounds matched the card. The New template dialog had no horizontal overflow and matching 42.5px action heights, with its longer form available through vertical scrolling.

These findings do not mean every route, permission role, empty/error state and populated record has been visually certified.

## Automated inventory and evidence

`npm run audit:ui` passed its existing contract checks: 104 pages, 464 links, 865 controls, 61 navigation entries and no reported issues. This is not a substitute for live navigation: the dynamic `[legalPage]` route makes the inventory treat `/events` as potentially valid, although the page rejects it at runtime.

Browser measurements: [32-combination matrix](/tmp/belivrhq-ui-audit-2026-11-21-browser.json).

No build or application test suite was rerun because no implementation code changed. The local frontend and API remain running.

## Resolution

The implementation and validation for these findings are tracked in [Remaining UI fixes](ui-discrepancy-fixes-2026-11-21.md).
