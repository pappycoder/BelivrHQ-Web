# Additional UI fixes — 21 November 2026

All five areas in [the additional audit](./ui-audit-additional-findings-2026-11-21.md) were addressed.

## Resulting behaviour

1. **Permission matrix:** headings and rows share the same six grid columns. Action columns retain their width inside one horizontally scrollable, keyboard-focusable region; narrow screens no longer shrink headers and checkboxes differently. Both matrix sections measured **0px alignment offsets** on desktop, 390px phones and 320px phones in light and dark mode. Search and protected/disabled grants retain their existing behaviour.
2. **Engagement:** bucket names are readable, including Highly engaged, Moderately engaged and Low engagement. Unknown keys receive a readable fallback. An all-zero distribution shows “No engagement scores yet” rather than an empty donut; positive values retain the chart. Legend labels can wrap instead of truncating on narrow phones.
3. **Captions:** media folder cards/storage labels, sermon speaker/series cards and global form search results now use the existing singular-label helper: “1 file”, “1 message”, “1 question” and “1 answer”.
4. **Copy:** Giving analytics accurately describes authorized donor activity; donor visibility and permissions were not changed. Roles explains reviewing/saving permissions without the old implementation language. Sermon totals, sorting and export headings identify sermons as the counted item. Import instructions separate “to” from “member”/“visitor”.
5. **Event selection:** tier, issued-ticket, registration and check-in pages share a picker and an explicit first-page/all-events query. The rebuilt app now offers both existing events, including the past free conference and future paid event. Loading, restricted access, failed requests and genuinely empty results have distinct feedback. Empty/error states provide refresh and calendar navigation where permitted; refreshing preserves existing usable choices. A check-in workspace is not displayed without an available active event. Existing permission gates and backend enforcement remain in place.

The explicit all-events request resolved the missing choices in the tested signed-in session; this does not attribute the previous behaviour to a particular backend validation or authentication fault. Past-event access was verified without changing event records.

## Automated validation

- **766 tests across 67 files passed**, including new event-picker feedback/query-scope tests and engagement-label regressions. The full suite was rerun after the final edits.
- Standalone TypeScript, scoped ESLint and the production build passed. All **114 static pages** generated successfully.
- UI contract inventory passed with 104 pages, 465 links, 867 controls and 61 navigation entries; no issues were reported.
- `git diff --check` passed.

## Browser validation

The affected pages were checked at **1280×900** and **390×844**, each in light and dark mode: permission editor, analytics overview, media folders, sermon speakers/series, populated form search results, Giving analytics, Roles overview, member/visitor import, ticket tiers, issued tickets, event registrations and event check-in. This covers **56 page/theme/size combinations**. Relevant populated content and picker choices were awaited; hidden skeletons inside inactive attendance tabs were excluded from visible loading checks.

Eight additional **320×720** checks covered the matrix, engagement card, event tiers and populated search in both themes. There was no page-level horizontal overflow or detected remaining bad caption/internal label in the checked states. Event choices were exercised through the actual controls, not just by inspecting their source. The real event pages loaded with the existing past/free and future/paid events; no tier, ticket, registration or attendance was created.

The event picker was also tested in isolation using the actual component and simulated data: five states (loading, empty, error, restricted and populated) at desktop/320px in both themes, plus refresh-to-ready and selection checks in each combination. These **24 fixture checks** made no business requests. The temporary preview tab and server were closed afterward.

Final matrix keyboard testing at 320px reached the right edge (`scrollLeft: 263`, `clientWidth: 230`, `scrollWidth: 493`) while preserving all five header/checkbox alignments. Filtering and clearing the matrix search produced no unsaved permission changes; no checkbox was toggled or permission saved.

An automation runtime timeout interrupted evidence collection after the main page matrix. The browser and app stayed open; the final narrow-screen measurements and screenshots were repeated and saved. The file below contains those final focused measurements, rather than a raw export of every earlier check.

Evidence:

- [Final focused browser measurements](/tmp/belivrhq-five-fixes-final-browser-checks.json)
- [Aligned desktop matrix](/tmp/belivrhq-five-fixes-matrix-desktop-light.png)
- [320px dark matrix](/tmp/belivrhq-five-fixes-matrix-320-dark.png)
- [320px engagement state](/tmp/belivrhq-five-fixes-engagement-320-dark.png)
- [Corrected mobile search result](/tmp/belivrhq-five-fixes-search-mobile-light.png)
- [Isolated picker error/recovery UI](/tmp/belivrhq-five-fixes-picker-error-320-dark.png)

Light mode and the normal viewport were restored. The existing browser tab remains open on the permission editor, and the frontend/API remain running. No business records, permissions, credentials, payments or messages were changed. No commit or hosted deployment was performed.
