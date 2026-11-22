# Follow-up UI fixes — 21 November 2026

Implementation for the seven findings in [the follow-up audit](./ui-discrepancy-follow-up-2026-11-21.md).

## Changes

1. **Form cards:** the title and status share a flexible heading row; management actions have their own wrapping row. The title wraps instead of being squeezed by every action icon, and the answer/date footer wraps when needed. Permission checks and actions are preserved.
2. **Report Studio:** its grid and sidebars can shrink within the viewport. The desktop centre track uses `minmax(0,1fr)`; the palette scrolls inside its own panel on small screens. Report padding and summary columns adapt to narrow phones. Block titles and move/remove actions use a wrapping layout instead of overlapping absolute positions.
3. **Appearance:** semantic colour swatches use two columns on phones, three from the small breakpoint and six on larger screens. Every swatch remains visible without widening the page.
4. **Form sorting:** the trigger has a semantic “Sort forms” label and enough bounded width for “Recently updated”, its sort icon and chevron.
5. **Trend axes:** a shared formatter retains fractional compact values, including `1.5k`, `2.5k` and `7.5k`, rather than rounding distinct values to duplicate whole thousands. It supports signed numbers and larger units. Exact tooltip values and count-axis behaviour are unchanged.
6. **Count captions:** form cards, detail/fill views, builder summaries/previews, response registers, giving summaries/donor counts and analytics/report captions use the shared singular-label helper. One question, answer, field, response, gift, service, branch, member or transaction uses singular wording; zero and multiple results remain plural.
7. **Age labels:** member analytics maps all API age bands to readable names, including Under 18, 18–30, 31–45, 46–60, Over 60 and Not specified. The same mapped data feeds the donut chart, tooltip and legend. Unknown labels receive a readable fallback.

## Automated validation

- **756 tests across 66 files passed**, including six new formatter/age-label regressions and the existing collection-label tests.
- Standalone TypeScript and scoped ESLint passed.
- UI contract inventory passed: 104 pages, 464 links, 865 controls and 61 navigation entries; no issues.
- `git diff --check` passed.

The production build passed, including all 114 static pages. No check was skipped or weakened.

## Live browser validation

All **62 page/control combinations** passed against the rebuilt app:

- **48 page checks:** 12 pages at 1280×900 and 390×844, each in light and dark mode. These covered Forms cards, Appearance, Report Studio, Giving overview, Giving statements, Giving analytics, Member analytics, Analytics overview, a populated form detail/response register, its editor, the new-form builder and its member fill page.
- **Eight control checks:** in all four size/theme combinations, changed Forms sorting and restored “Recently updated”, switched Table → Cards, and added/reordered/removed a report block. Form-table overflow remains inside its scroll container. Report changes were confined to the local preview.
- **Six additional 320×720 checks:** Forms, Appearance and Report Studio in both themes. The previously measured page overflow is now **0px** for all three layouts at both phone widths.

Every sampled page had zero page-level horizontal overflow, no clipped selected dropdown labels, no detected incorrect one-item captions and no raw age-band keys. Data-dependent views were awaited explicitly: populated form/response content, giver captions, readable age bands, chart labels and both default report blocks. The Giving overview now renders `0, 500, 1k, 1.5k, 2k`; monthly charts retain `2.5k` and `7.5k`. Populated form views show “1 question”, “1 answer”, “1 field” and “1 matching response”; the empty builder retains “0 questions”.

Visual review confirmed readable light/dark surfaces, all six phone colour swatches, the full form title and management actions, and report settings within the viewport. The checks cover these changes and the tested states, rather than every permission/data combination in the app.

Evidence:

- [All browser measurements](/tmp/belivrhq-seven-fixes-browser-checks.json)
- [Final desktop Forms](/tmp/belivrhq-seven-fixes-final-desktop.png)
- [Desktop dark-mode Forms](/tmp/belivrhq-seven-fixes-forms-desktop-dark.png)
- [Phone dark-mode Forms](/tmp/belivrhq-seven-fixes-forms-mobile-dark.png)
- [Phone dark-mode palette](/tmp/belivrhq-seven-fixes-palette-mobile-dark.png)
- [Desktop report](/tmp/belivrhq-seven-fixes-report-desktop-light.png)
- [Phone report settings](/tmp/belivrhq-seven-fixes-report-mobile-dark.png)
- [320px report](/tmp/belivrhq-seven-fixes-report-320-dark.png)

The frontend and API remain running. Light mode and the normal browser viewport were restored; the existing browser tab remains open on Forms. No business record, response, message, payment, credential or permission was changed. No commit or hosted deployment was performed.
