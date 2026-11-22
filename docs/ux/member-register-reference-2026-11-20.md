# Member register as the list-page reference

The member register is the concrete reference for list pages. Earlier uniformity work shared individual controls but left some pages with a different overall structure and transparent form sections.

## Layout contract

1. Page heading and collection actions, including exports where already supported.
2. Domain-specific summary cards.
3. An external ListToolbar: bounded search, primary record filters together, and scope/sort/direction/view controls grouped to the right. Controls wrap within the page on small screens.
4. A card surface containing only the selection/column toolbar, table and pagination. Loading, error and empty states follow the member register's separate-state layout.

Pages retain their supported filters and actions. This does not invent server-side search, sorting or view modes where those features do not exist.

## Implementation

- Added `ListToolbar` and migrated the common registers, reusable communication/group/submission/intake controls, attendance filters and sermon aggregates to it. Event registration summary cards now precede the filter bar. Sermon sorting uses a selector, and series/speaker navigation belongs with page actions.
- Rebuilt loans and maintenance with the same ListTable renderer as Members. Their stats, search, status chips, exports, empty/loading/error states, row actions and pagination follow the member structure. Return/update permission and archived-record guards remain in place.
- Moved TableCard headings/actions and optional filters outside its table surface. Embedded native tables retain native semantics and sticky columns, but use the member register's header background, typography, spacing and divider treatment.
- Standardized grid-table header/body spacing to the existing member values rather than each page's previous padding/gap variant.
- Added `FormSection`, an explicit card-backed fieldset. Asset form sections and shared people/workspace sections use it. Asset page actions also have a card surface. Related asset/detail panels and the remaining billing card use the same card background.
- Form controls use the existing card colour in workspace forms and their dialog/sheet portals. The page canvas keeps its existing background, and disabled/validation states retain their own treatment. Theme tokens provide the light card surface and corresponding dark surface.

The light card surface is `var(--card)` (`#fdfbf6` in the current Paper theme), matching Members. It is deliberately shared with existing cards instead of hard-coding a second white colour.

## Verification

- Production build, TypeScript, lint and `git diff --check` passed.
- All 709 tests across 60 files passed. New regressions cover worklist action permissions and pagination extraction while preserving record keys and row references.
- Browser review covered 28 list routes, Billing, and five create pages on desktop, plus eight representative mobile routes. No page-level horizontal overflow, filters nested in tables, or pagination nested in the column scroller were found. Billing was checked again after loading.
- Members selection selected all three visible records and cleared correctly. Populated event registrations retain the reference search width (340px), header padding (10.625px / 21.25px), body padding (12.75px / 21.25px) and 17px column gaps in the current theme.
- Mobile Templates: keyboard scrolling moved the table horizontally from 0 to 80px; pagination stayed at x=17px and width=346px outside the scroller. The page did not overflow.
- Asset creation's four sections and member/event/form-builder sections use `rgb(253, 251, 246)`. Sermon content cards use the same surface; its outer disabled-state fieldset remains a transparent layout wrapper. Shared member dialog sections were also checked.
- Browser evidence: `/tmp/belivrhq-member-reference/browser-verification-final.json`. Screenshot: `/tmp/belivrhq-member-reference/asset-form-final.png`. The browser remains open on Add asset with its viewport override cleared.

No business records were created or changed during verification. Loans/maintenance had no populated live rows; populated action states are covered by source review and synthetic regression tests. Dark theme and every data-dependent state were not visually tested. Both local services remain running.
