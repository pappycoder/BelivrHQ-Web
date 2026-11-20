# Component uniformity audit — 20 November 2026

Implementation follow-up: the nine finding groups below have been addressed. See the [changes and verification results](component-uniformity-implementation-2026-11-20.md). This document and its original route matrix retain the audit baseline.

The application has a consistent outer navigation shell, but equivalent inner pages still use different presentation systems. The clearest inconsistencies are duplicated page headers, competing register/table controls, different pagination, and form controls that do not align with their neighbours.

This is an audit, not a styling implementation. No application source, account preferences or business records were changed.

## Scope and evidence

- Inventoried all **88 Paper route files**: 87 functional pages and the notifications redirect. Inspected shared components and the conditional/embedded components reachable from those pages.
- Visited all **68 navigation destinations**, plus visitor import, 12 record detail pages and three editors: **84 distinct functional URLs** in the authenticated Network workspace. These visits checked page shells and rendered component styles; they were not exhaustive interaction tests of every tab, dialog, permission or data state.
- Detail examples covered members, visitors, families, events, services, departments, cell groups, forms, sermons, team profiles, roles and locations. Editors covered events, forms and sermons.
- Measured desktop styles at 1280 × 900. Also checked asset creation, asset loans and visitor import at 390 × 844. Reset the viewport and left the original categories page open.
- Asset detail/edit were source-reviewed only: the asset register has no records. Form filling and the notifications redirect were source-reviewed only. Paid-event populated tiers, populated loan/maintenance pagination, subsequent import stages, inactive detail tabs, modal states, dark mode and other mobile routes need follow-up visual verification.
- Two initial observations captured a still-loading shell (ticket tiers and sermon detail). Both were revisited and their headings verified; neither is reported as a missing-heading defect.

The companion [route matrix](component-uniformity-route-matrix-2026-11-20.csv) lists every route, review coverage, reachable table/pagination implementations and finding IDs. Reachability includes dialogs and conditional tabs; it does **not** mean a component is the route's primary visible layout. An unflagged row is not a guarantee that every state is uniform.

Raw measurements and screenshots are kept locally in `/tmp/belivrhq-ui-audit-2026-11-20/`. Live record names and identifiers are omitted from the committed report and route matrix.

## Findings

| ID | Priority | Mismatch | Confirmed examples / affected family |
| --- | --- | --- | --- |
| U01 | High | Two page titles and duplicate navigation context on one page | Member import, visitor import, asset loans, asset maintenance |
| U02 | High | Equivalent registers use different table shells, controls and selection language | Paper registers versus loan/maintenance worklists; older tables also remain in embedded histories/previews |
| U03 | Medium | Two pagination formats and different zero-result behaviour | Paper lists versus asset worklists and the cell-group embedded legacy pagination path |
| U04 | Medium | Card headings, padding and surface treatment differ | Paper SectionCard versus UI Card/TableCard on imports, sermon editors and asset worklists |
| U05 | Medium | Equivalent filter controls use different heights and shapes | Giving filters, member branch/sort filters and asset worklist status filter |
| U06 | Medium | Form dropdowns do not fill their field columns | Asset create form; edit shares the same form implementation |
| U07 | Medium | Detail-page title and action placement lack a common contract | People, event/service, team, role and other detail pages |
| U08 | Medium | The same import workflow has two progress-step designs | Member import versus visitor import |
| U09 | Medium | Date presentation varies across comparable record fields | Raw member timestamps, numeric visitor dates and formatted event dates |

### U01 — Remove nested page-level headers

The loan and maintenance routes render a Paper PageHeader and then AssetWorklist renders another WorkspaceHeader. Both imports similarly render an outer Paper header and an inner PeopleImportPage header. PeopleHeader wraps the older shared PageHeader, so the member variant also duplicates the heading.

On loans, the browser shows “Borrowed out, expected back.” followed by “Asset loans”, then another breadcrumb. Visitor import shows the editorial title followed by “Import Visitors” and another breadcrumb. At desktop these heading styles measure 30.72px/600 and 31.875px/700. On mobile the extra header pushes the working controls substantially down the page.

Sources: `src/components/assets/asset-worklist.tsx:129`, `src/components/shared/people-import-page.tsx:473`, `src/components/members/people-presentation.tsx:39`, `src/components/shared/page-header.tsx:30`, plus their four Paper route wrappers.

Use one page-level header owner. Embedded workspaces should expose their actions/counts to that owner or use a section-level heading. Do not merely hide the second h1 with CSS.

### U02 — Give registers one table contract

Most Paper registers use `ListTable`, a grid with table roles. Loans and maintenance use TableCard plus the native UI Table. The latter has an inset bordered table surface, mixed-case column headings and a Table options menu for density/width. Paper registers use their own integrated surface and uppercase headings. Selection wording differs too: “Clear rows” versus “Clear selection”.

The discrepancy is visible between Members and Asset loans. It is architectural as well as cosmetic: two renderers independently implement columns, selection, bulk actions and export placement. Embedded previews and histories may need native table markup, but should still share the visual and interaction contract.

Sources: `src/components/shared/list-table.tsx:79` and `:390`, `src/components/ui/table.tsx:135` and `:260`, `src/components/shared/table-card.tsx:48`, `src/components/assets/asset-worklist.tsx:144`. Source reachability also finds native tables in cell-group detail, asset depreciation and import previews; inspect the active state before replacing them.

Standardize toolbar order, row density, heading case, selection wording, column controls, export placement, empty/error states and row actions. Preserve permitted features rather than removing them to make screenshots match.

### U03 — Unify pagination, including empty results

Paper ListPaginationFooter uses a pill-shaped native selector, “Prev”, and “1 / 1”. TablePagination uses a Radix selector, “Previous”, and “Page 1 of 1”, with different spacing and button sizing. TablePagination returns nothing at zero results; Paper's footer supports “Showing 0–0 of 0”. Loans visibly omit the footer in the current empty state.

Sources: `src/components/paper/primitives.tsx:527`, `src/components/shared/table-pagination.tsx:26`. The route inventory reaches the older footer from loans, maintenance and cell-group detail.

Adopt a single footer contract, including labels, size options, loading behaviour and whether empty lists show pagination. Source confirms the populated legacy difference; live populated legacy pagination remains unverified because those worklists are empty.

### U04 — Normalize cards and section headings

Paper SectionCard renders a serif h2 at 19.125px/600 in the current 17px root scale, with a separated header and p-5 body. Default UI CardTitle is a div with heading semantics and inherits 17px/600, so it also misses the Paper h1–h4 display-font rule. The loan card title visibly uses this smaller sans-serif treatment. UI Card additionally supplies its own vertical padding/gap/shadow; TableCard nests another rounded bordered surface.

Sources: `src/components/paper/section.tsx:50`, `src/components/ui/card.tsx:5` and `:32`, `src/components/shared/table-card.tsx:48`, `src/app/paper-tokens.css:112`.

Use consistent section title typography, padding, header dividers, border and elevation. The measured outer radii are already close (17px versus 17.6px); this tiny difference is lower priority than the heading and nesting differences.

### U05 — Standardize comparable filters

Member branch/sort filters are approximately 38px high and pill-shaped. Giving's native category/branch selectors use h-8 and measure 34px. Asset status is approximately 38px high but uses the older 11.6px rounded rectangle and an external Status label. Asset search also differs from Paper SearchField's radius.

Sources: `src/app/(paper)/giving/donations/page.tsx:337`, `src/components/assets/asset-worklist.tsx:166`, `src/components/paper/primitives.tsx` (SearchField/FilterChip). These are equivalent register filters, unlike a large global search field or a compact pagination selector, which can legitimately have separate size variants.

Define a shared register toolbar and explicit filter-size variants; align height, radius, label treatment, wrapping and reset placement within that family.

### U06 — Align asset form controls

At desktop the Asset Name input occupies about 528px while Category occupies only 153px in an equally wide field column. At mobile the input is about 302px while the dropdown remains 153px. Other assignment dropdowns have the same content-width behaviour. This leaves fields in the same grid looking incomplete and inconsistently aligned.

The shared SelectTrigger defaults to `w-fit`; AssetFormDialog uses it without a full-width override. Sources: `src/components/ui/select.tsx:27`, `src/components/assets/asset-form-dialog.tsx:283`, `:395`, `:425`, `:489`, `:621`. Asset edit shares this form but was not populated in the browser.

Use a full-width form-field variant while retaining compact width for toolbar selectors. Avoid changing every SelectTrigger globally, which would also affect filters and pagination.

### U07 — Establish a detail-header and action contract

Many details mount Take a tour in a separate right-aligned row before the back link and main record card. Shared PageHeader integrates it with the page actions. The standalone row was added during the recent tour work and should be consolidated with the detail header.

Comparable record titles also vary: team detail measured 21.25px, visitors/families 25.5px and member/service/department/cell details about 30.72px. A sermon reading hero can reasonably be larger; the audit does not propose forcing editorial heroes to the same dimensions as administrative profiles.

Sources: `src/app/(paper)/people/members/[memberId]/member-detail.tsx:128`, `src/app/(paper)/people/visitors/[visitorId]/page.tsx:108`, `src/app/(paper)/people/families/[familyId]/page.tsx:85`, `src/app/(paper)/gatherings/events/[eventId]/page.tsx:119`, `src/app/(paper)/gatherings/attendance/services/[serviceId]/page.tsx:93`, `src/app/(paper)/admin/team/[profileId]/page.tsx:25`, `src/components/users/user-detail-sidebar.tsx:59`.

Introduce a detail-header variant with consistent title scale, back navigation and action placement. Keep domain-specific metadata and permitted actions. Department and cell-group details already use Paper headers; treat them as references, not pages needing wholesale replacement.

### U08 — Reuse one import progress component

Members use PeopleImportProgress: a bordered responsive grid with numbered circles, state styling and “Complete”. Visitors use plain inline text with arrows and “Done”. Both are the same Upload → Map → Review → completion workflow, inside the same shared component.

Sources: `src/components/shared/people-import-page.tsx:509`, `src/components/members/people-presentation.tsx:201`. Use one responsive stepper and one set of stage labels for both. This is independent of removing their duplicate page headers.

### U09 — Normalize displayed dates by meaning

The member register prints `memberSince` directly, which currently displays a full ISO timestamp. Visitors slice first-visit dates to YYYY-MM-DD; events use a localized date/time label. Related record metadata therefore mixes raw transport values with presentation formats.

Sources: `src/app/(paper)/people/members/page.tsx:473` and `:510`, `src/app/(paper)/people/visitors/page.tsx:394` and `:429`, `src/app/(paper)/gatherings/events/list/page.tsx:83`.

Use shared date-only and date-time formatters, with explicit timezone rules. Date-only fields, scheduled times and relative notification times can remain distinct semantic variants. Export formats should follow export requirements rather than blindly copying display labels.

## Why the older components diverge

The live affected pages have **one `[data-paper-root]` and zero `[data-workspace-root]` elements**. Older normalization rules in `src/app/workspace-theme.css:112–144` require `[data-workspace-root]`; they therefore do not normalize those embedded legacy headers, cards, tables and tabs. Paper tokens cover its own components and some portals, but do not replace every older component rule.

This explains part of the divergence. Simply adding the old root selector to the whole app would activate many historical overrides and could disrupt the newer design. Prefer explicit shared component contracts and a controlled migration.

## Recommended implementation sequence

1. Set Paper's current list/detail grammar as the reference. Define the allowed register, editor, detail and editorial variants rather than making every page identical.
2. Fix the four duplicate-header routes and share the import stepper.
3. Consolidate table/toolbars and pagination, including embedded group/history tables. Preserve columns, bulk actions, row opening, exports, permissions and sorting/filter behaviour.
4. Normalize section cards, filter sizing and form-field widths through shared variants.
5. Consolidate detail headers/tour actions and date presentation.
6. Verify each changed family with populated, empty, loading, error and permission states; test mobile, desktop and both themes. Use targeted behavioural checks for changed table/form interactions and visual checks for style-only changes.

Keep specialized calendars, inboxes, report builders, analytics and editorial sermon views specialized. Share typography, surfaces, controls and spacing where their components correspond; do not convert every page into a register.

The source inventory and live measurements identify migration candidates; they do not certify every component state. No build or unit tests were rerun for this documentation-only audit.
