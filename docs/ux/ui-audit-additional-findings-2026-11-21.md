# Additional UI audit — 21 November 2026

This read-only pass found five remaining areas to address. The earlier seven fixes were not changed.

## Findings

### 1. Mobile permission matrix alignment

**Priority: medium.** On `/admin/permissions/church_admin`, action headings and checkbox columns shrink independently. At 390px, the measured horizontal offsets between corresponding header/checkbox centres were approximately `19, 15, 9, −2, −5px`; at 320px, `12, −6, −26, −51, −68px`. Header text also crowds together and clips within the matrix at 320px, while resource names break across narrow lines. Both light and dark modes reproduce the issue. Desktop 1280px offsets are all zero.

The fix should give headings and rows identical column widths and a shared horizontal scroll area rather than letting each flex row shrink differently. Inspect `src/components/roles/permission-matrix-editor.tsx:99` and the corresponding row/cell markup. No checkbox was toggled and no permissions were saved during the audit.

- [320px light screenshot](/tmp/belivrhq-third-audit-matrix-320-light.png)
- [320px dark screenshot](/tmp/belivrhq-third-audit-matrix-320-dark.png)

### 2. Engagement chart labels and zero-data presentation

**Priority: low.** Analytics overview exposes `highlyEngaged`, `moderatelyEngaged` and `lowEngaged` as legend labels. These need readable display names. With the current all-zero distribution, it also draws an empty donut area with a separate “4 active” centre count; a clear no-engagement-scores state would explain the missing chart more effectively. The zero distribution does not establish that the active-member total is incorrect.

`src/app/(paper)/insights/analytics/page.tsx:75` passes storage keys through unchanged. Its chart visibility check uses array length rather than whether any segment has a positive value.

- [Phone dark screenshot](/tmp/belivrhq-third-audit-engagement-mobile-dark.png)

### 3. Remaining singular captions outside the repaired forms views

**Priority: low.** Confirmed visible examples include:

- Media folders: **“1 files”** (`src/app/(paper)/library/media/folders/page.tsx:240`, also the folder title at line 261).
- Sermon speakers: **“1 messages on record”** (`src/app/(paper)/library/sermons/speakers/page.tsx:39`).
- Sermon series: **“1 messages”** (`src/app/(paper)/library/sermons/series/page.tsx:43`).
- Global search result for Person Draft Form: **“1 questions · 1 answers”** (`src/app/(paper)/search/page.tsx:178`). The main form cards/detail/editor captions repaired in the last round already use the shared helper; this is a separate search-result renderer.

Use the existing `collectionLabel` helper for these renderers too. Folder/speaker/series examples reproduced on desktop and mobile in both themes; the populated search caption was confirmed on phones in light and dark mode.

- [Search light screenshot](/tmp/belivrhq-third-audit-search-mobile-light.png)
- [Search dark screenshot](/tmp/belivrhq-third-audit-search-mobile-dark.png)

### 4. Inaccurate or unfinished user-facing copy

**Priority: low, with the Giving claim worth correcting promptly.**

- Giving analytics says it operates **“without displaying donor names”**, yet the same authorized finance view displays a named-giver list. The description should accurately explain this view. This audit did not establish unauthorized access or change donor visibility. See `src/app/(paper)/insights/analytics/giving/page.tsx:63` and its donor list.
- Roles overview still says its editor opens in a **“classic surface while the Paper version matures”**. The editor now uses the workspace styling; this is stale implementation language. See `src/app/(paper)/admin/permissions/page.tsx:367`.
- Sermon aggregate sorting says **“Most speakers” / “Most series”**, while it sorts by sermon/message counts; its **“Speaker counted” / “Series counted”** summary also sums message counts. Labels should identify the thing being counted. See `src/components/sermons/sermon-aggregate-browser.tsx:160`, `:191` and the corresponding export label at line 109.
- Member and visitor import instructions visibly join **“to”** to the following noun: **“tomember” / “tovisitor”**. Restore the missing space in the shared import upload instructions.

- [Giving description and named list](/tmp/belivrhq-third-audit-giving-copy-desktop-light.png)

### 5. Event picker loading/empty/error feedback

**Priority: medium.** Ticket tiers repeatedly showed a picker containing only “Choose an event…” while the panel instructed the user to pick an event. The Events register showed two existing records in the same session. The interface gives no explanation or recovery when the picker has no choices. Similar initial picker states were observed on registrations and event check-in.

The tier screen checks tier/ticket loading after an event is selected, but the event-list selector itself does not distinguish loading, error, no available events or a disabled query. Inspect `src/app/(paper)/gatherings/events/tiers/page.tsx:60` and `:111`, then review the sibling pickers. Add appropriate feedback and recovery; diagnose why this selector has no candidates rather than assuming records should be created. The precise query/data cause was not established during this UI-only audit, and a populated paid-tier state was not verified in this pass.

## Scope and limits

- Reviewed 12 additional routes at 1280×900 and 390×844 in light and dark mode: member/visitor import, media folders, sermon speakers/series, form submissions landing, service/event check-in, event registrations, asset categories, roles overview and support.
- Added permission-editor measurements at desktop, 390px and 320px in both themes, plus focused populated-search, giving-copy and engagement-chart inspections.
- No page-level horizontal overflow was detected in these additional views. The matrix issue is internal column alignment/crowding, which a page-width check alone does not detect.
- Some secondary check-in panels loaded asynchronously beyond the initial geometry sample. No data-total correctness or post-upload import flow is certified. No files were imported, forms submitted, permissions toggled, payments made or messages sent.
- No new dark-mode-specific contrast defect was confirmed. The mobile matrix and remaining labels/copy affect both themes. This does not certify every route, permission, content length or transient state.
- This inspection did not change application source, so no new build or unit-test run was required. The previous build/test results belong to the earlier fixes report.

[Browser measurements and targeted readings](/tmp/belivrhq-third-ui-audit.json) accompany the screenshots. Light mode and the normal viewport were restored, and Forms remains open in the existing browser tab.

## Resolution

All five areas were subsequently fixed and tested. See [the implementation and verification report](./ui-additional-fixes-2026-11-21.md) for the changes, 766 passing tests, production build and desktop/mobile/light/dark checks.
