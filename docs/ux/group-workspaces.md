# Department and cell-group workspaces

Gatherings → Groups now labels its department register **Departments**. The route and permission keys are unchanged.

Both registers use shared search, compact filters, sort selection/direction, reset controls and List/Card switches. Search covers names, descriptions/addresses, branch and leadership names across the complete API result before local pagination. HQ users can filter the branches present in their readable results. Both lists filter assigned/unassigned leadership and archived records; cell groups also filter meeting day. Name, date-added and leadership sorting share deterministic tie ordering.

List views support the existing column selector, selected exports, checkboxes and confirmed bulk archive/restore/delete where authorized. Cards retain their management actions. Table/card pagination resets after filters and clamps after mutations.

Department and cell-group details share Paper headers, summary cards, overview metadata, member rosters and attendance tabs. Reported totals retains its existing permission gate. The cell group's existing giving ledger is in a separate Giving tab, loaded only when opened. Department giving is not introduced: no existing department giving ledger/API is available. URL tabs support deep links and browser history.

Rosters share search, paging, column choices, export, member links and confirmed individual/bulk removals that retain church membership/history. Meeting attendance uses the shared table grammar, search/status filters, pagination and a native meeting-date selector. Data-entry dialogs keep wheel date fields. Loading uses skeletons and failed roster/attendance queries offer retry.

Existing ownership restrictions remain in force for department heads and cell leaders. Cell-group roster/attendance requests and tabs require `cell_groups:details:read`; financial readers can open Giving without requesting those datasets. Archived records cannot accept roster/attendance/giving writes. No API, schema, permission seed or environment change is required for this redesign.

Validation: 624 unit tests, ten production-browser scenarios, TypeScript, scoped ESLint without autofix and the isolated production build passed. Browser coverage includes both registers and list/card views on desktop/320 px, filters/search/sort/archive, detail tab bounds, native dates, finance/read-only permissions and confirmed/cancelled individual and bulk roster removal. Desktop/mobile screenshots were inspected. Retired `/departments` browser suites were not run; the new suite targets the current `/gatherings/groups` routes.
