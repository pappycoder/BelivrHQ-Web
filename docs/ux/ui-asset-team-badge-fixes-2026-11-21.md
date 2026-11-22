# Asset and team badge consistency — 21 Nov 2026

## Changes

- Asset status, condition, maintenance and loan badges now render the shared Paper Tag, with semantic theme colors, status dots, workspace body typography and consistent dimensions.
- The asset register and loan/maintenance worklists use the same badge component as the asset detail drawer. Worklists use the existing display labels, fixing lowercase raw status captions. Archived asset labels and the worklist overdue calculation are preserved.
- Team table, cards and profile sidebar use one UserStatusBadge, with consistent Active/Paused labels and moss/rose colors. The profile badge group can wrap at narrow widths.

## Validation

- Production build passed, including lint/type checks and all 114 generated pages.
- Standalone TypeScript passed after restoring the AssetStatus import needed by the register filter.
- Scoped ESLint, UI contract audit and git diff whitespace checks passed.
- Existing shared badge/contrast regression suites: 19 tests across 3 files passed.
- Live browser: 36 populated view checks at 1280px and 390px in light and dark themes. Covered team table/cards/detail, asset register/overview/maintenance/loans, and maintenance/loan worklists.
- All 24 corresponding badge comparisons matched exactly for label, tone, colors, font, size, weight, height, line height, radius and padding. No page or inspected detail region overflowed horizontally. Wide tables keep their intentional internal scroll regions.
- Live statuses available for inspection: Active, Good, Scheduled, Borrowed and Returned. Other states use typed exhaustive tone maps and the tested shared palette; no business records were changed to manufacture states.

Evidence: [measurements and comparisons](/tmp/belivrhq-badge-fixes-browser.json), [desktop dark asset drawer](/tmp/belivrhq-badge-assets-desktop-dark.png), [mobile light team detail](/tmp/belivrhq-badge-team-mobile-light.png), [mobile dark loan drawer](/tmp/belivrhq-badge-loans-mobile-dark.png).

Light mode and the default viewport were restored. The app browser and local frontend/API remain open/running. No business writes, account access changes, commits or deployments were performed.
