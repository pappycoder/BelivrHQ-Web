# Follow-up UI audit — 21 November 2026

Seven additional presentation issues were confirmed in the running local app. This was an inspection; application source and business records were not changed.

## Confirmed findings

| Priority | Surface | Finding | Evidence / implementation location |
| --- | --- | --- | --- |
| High | Library → Forms, cards | The non-wrapping status/action row squeezes the desktop card title to “Pe…”, while the metadata breaks into narrow lines. On a 390px phone, the card actions and footer extend off-screen, creating 83px of page overflow; at 320px this increases to 153px. | `src/app/(paper)/library/forms/page.tsx:393`; [desktop screenshot](/tmp/belivrhq-followup-forms-desktop-light.png), [phone screenshot](/tmp/belivrhq-followup-forms-card-mobile-dark.png) |
| High | Insights → Report studio | The block palette determines the intrinsic width of the grid instead of scrolling within the phone width. The palette, preview and settings become wider than the screen. Page overflow is 294px at 390px and 364px at 320px. Desktop fits. | `src/app/(paper)/insights/reports/page.tsx:239`; [screenshot](/tmp/belivrhq-followup-reports-mobile-dark.png) |
| Medium | Settings → Appearance | The six semantic colour swatches remain in one flex row with minimum content widths. Rose and Ink run beyond the phone viewport. Overflow is 64px at 390px and 134px at 320px. Desktop fits. | `src/app/(paper)/settings/appearance/page.tsx:148`; [screenshot](/tmp/belivrhq-followup-appearance-palette-mobile-dark.png) |
| Medium | Library → Forms, sort filter | The default “Recently updated” value is clipped on desktop and mobile in both themes. Its text span has 100px available but requires about 112px on desktop and 121px on mobile. The earlier sort-width repair targets labelled Sort controls; this trigger has no aria-label and retains `w-44`. | `src/app/(paper)/library/forms/page.tsx:272`; visible in both Forms screenshots |
| Medium | Giving charts | Shared trend axes round thousands to whole k values: the Giving overview displays `0, 500, 1k, 2k, 2k`, so 1,500 and 2,000 receive identical labels. Other charts also round 2,500 and 7,500 to 3k and 8k. This needs a precision-preserving compact formatter. | `src/components/paper/charts.tsx:148`; DOM chart text captured in the measurements file |
| Low | Form cards/details/edit preview; giving and analytics captions | Local captions still hardcode plurals outside the shared pagination component: “1 questions”, “1 answers”, “1 fields”, “1 matching responses” and “1 gifts”. Analytics also uses “1 services ahead” and “1 branches counting”. | `src/app/(paper)/library/forms/page.tsx:401`, `:411`; form detail/edit preview; `src/app/(paper)/giving/statements/page.tsx:358`; `src/app/(paper)/insights/analytics/giving/page.tsx:141` |
| Low | Insights → Members, age breakdown | Internal keys appear directly in the legend: `under_18`, `age_18_30`, `age_31_45`, `age_46_60`, `age_60_plus`. These should be readable labels such as “Under 18” and “18–30”. | `src/app/(paper)/insights/analytics/members/page.tsx:104`; reproduced on desktop and mobile in both themes |

The responsive overflow findings reproduce in both light and dark mode. No additional dark-mode-specific contrast defect was confirmed in this pass; that is not a guarantee for every possible state.

## Scope and verification limits

- Inspected 53 distinct routes, principally at 390×844 in dark mode, spanning people, pastoral care, giving, communication, gatherings, library, analytics, administration and settings. Included populated event, service, department, cell-group and form details, the existing form editor, and member/event/sermon create forms.
- Cross-checked five affected pages — Forms, Appearance, Report studio, Giving overview and Members analytics — at 1280×900 and 390×844 in both light and dark mode (20 focused page/theme/size combinations).
- Also checked the three overflowing layouts at 320×720 in dark mode.
- Opened the giving date-range popover and its nested calendar on mobile in light mode and at 320px in dark mode. The calendar fits and uses the upgraded shared picker. No dates were applied.
- Measurements distinguish page-level overflow from intentionally scrollable register tables. Table minimum widths alone are not reported as defects.
- Waited for page headings and loading skeletons before reading content. Animated statistics can still be mid-animation in immediate screenshots; their intermediate values are not reported as data defects.
- This does not certify every tab, permission state, validation error or possible record length. No business submissions, message sends, payment actions or permission changes were performed. No new unit test or build run was necessary for this read-only audit.

[Browser measurements](/tmp/belivrhq-followup-ui-review.json) contain the route readings, the focused four-mode matrix and the 320px measurements. The prior fixes report remains at [ui-discrepancy-fixes-2026-11-21.md](./ui-discrepancy-fixes-2026-11-21.md).

Light mode and the normal viewport were restored. The app remains open on Members.

## Resolution

All seven findings were subsequently fixed and verified. See [implementation and verification results](./ui-follow-up-fixes-2026-11-21.md) for the 756 passing unit tests, production build and 62 desktop/mobile/light/dark browser checks.
