> Follow-up: [Members reference implementation](member-register-reference-2026-11-20.md) records the later structural fixes and supersedes the earlier retained-worklist layout.

# Component uniformity implementation — 20 November 2026

This follows the [component audit](component-uniformity-audit-2026-11-20.md). Paper's current visual language is the reference for corresponding components. Calendars, inboxes, analytics and editorial views retain their specialized layouts.

## Changes

| Finding | Implementation |
| --- | --- |
| U01: duplicate headers | PeopleImportPage and AssetWorklist own one Paper header, with their existing route-specific title, context and actions passed into it. The old shared header now delegates to the same Paper component. |
| U02: competing tables | Native Table and Paper ListTable use RegisterTableToolbar for selection counts, clear selection, bulk actions, exports, column selection and Table options. Both retain their rendering semantics and existing record handlers. Native headings use the Paper register typography; TableCard no longer nests an inset bordered table. Asset worklists use the shared empty state. |
| U03: pagination | TablePagination is a compatibility adapter over ListPaginationFooter. Empty collections show an honest zero count, disabled navigation and the same page-size selector. Existing page-size choices and callbacks remain supported. |
| U04: cards | Card, CardHeader, CardTitle, CardContent and CardFooter follow the same surface, section heading, divider and spacing grammar as SectionCard. Explicit authored variants remain available. |
| U05: filters | Native pill filters use the standard register height. Asset worklists use SearchField, pill status selectors and the common reset-button treatment. |
| U06: form alignment | Asset field selects fill their grid columns. Form-context select triggers fill their field width, and editable fields use the shared editor height/radius. Toolbar and pagination controls keep compact sizing. |
| U07: detail pages | DetailNavigation puts the back link, available actions and tour in one row. Administrative record titles use DetailHeading; the larger sermon reading hero remains an editorial variant. Inbox, report studio and life-events headers use PageHeader with integrated actions. |
| U08: import progress | Both import workflows use PeopleImportProgress, including its responsive grid and completion state. The existing workflow state, validation, preview and submission handlers remain in place. |
| U09: dates | Record calendar dates use formatRecordDate; scheduled event instants use formatRecordDateTime. The existing shared media date helper and administrative account metadata delegate to these formatters too. Calendar days retain the recorded date; scheduled instants use the viewer's timezone or an explicit timezone. Missing/invalid values have a safe fallback. Export schemas, raw transport values and date input values remain unchanged; human-readable dates using the shared helper follow the common format. |

## Shared components

- `src/components/shared/register-table-toolbar.tsx`: controls shared by both table renderers.
- `src/components/shared/list-pagination.tsx`: canonical pagination, re-exported from Paper primitives and used by the legacy adapter.
- `src/components/paper/section.tsx`: PageHeader, DetailHeading, DetailNavigation and SectionCard.
- `src/components/ui/card.tsx`: shared card/section defaults.
- `src/lib/record-date.ts`: display date formatting; unit regressions cover invalid dates, leap days, offset preservation and timezone day boundaries.

No API, schema, subscription, permission or business-record changes are part of this work.

## Verification

- Production build, standalone TypeScript, scoped ESLint and whitespace checks passed.
- **703 unit tests passed across 58 files**, including the new date regressions.
- **85 functional desktop URLs checked**, covering all 68 navigation destinations, both import pages, 12 populated record detail types, three editors and form filling. Each had one main h1 and zero page-level horizontal overflow after loading completed. The notifications redirect was also verified separately.
- **11 representative mobile URLs checked at 390 × 844**: asset creation, loans, maintenance, both imports, member register, event detail, service detail, department detail, cell-group detail and team detail. Each had one main h1 and zero page-level horizontal overflow. The temporary viewport was reset afterward.
- Asset input/select dimensions match: approximately 528 × 42.5px on desktop and 302 × 42.5px on mobile, with the same radius. Both imports render one heading and the same four-step progress component.
- Tested selecting all visible members, selection counts, clearing selection, opening table options, compact/comfortable rows, compact/expanded columns and closing menus. Row height changed from 69px to approximately 64px in compact mode, then returned to the comfortable view. The mobile table-options popover stayed within the viewport.
- Checked empty worklist pagination, page-size changes, disabled selection/navigation on empty results, visible search labels, the cell group's empty meeting-giving footer and import-tour Next/Previous/Escape behaviour. Business-changing actions were not submitted.
- Runtime headings that were first observed while loading were revisited and verified. Measurements are page/layout checks, not exhaustive tests of every permission, modal or data state.

The [verification matrix](component-uniformity-verification-2026-11-20.csv) maps this coverage back to all 88 route files. Raw local screenshots and measurements are under `/tmp/belivrhq-uniformity-fix/`; live record names and identifiers are omitted from the committed matrix.

Asset detail/edit use the updated shared components and pass compilation/type checks, but populated visual verification remains unavailable because the register is empty. Populated loans/maintenance, paid tiers, subsequent import stages and dark-mode visual verification also remain data/state-dependent follow-up coverage. No test business records were created. Source colours continue to use the existing theme tokens.

The local web service and API were left running, with the updated loans register open in the browser. No deployment was performed.
