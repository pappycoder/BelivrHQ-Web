# List columns and bulk actions

The existing table and card views remain the defaults. The **Columns** menu offers the existing columns plus additional fields from the public record DTO and fields present in the returned records. Extra columns start hidden, including optional fields without values. Custom answer keys are separate choices; pending registration definitions supply their configured labels, including unanswered fields. Nested values and arrays display readable summaries. Credential fields are excluded.

Search the menu, toggle individual columns, show all, or reset the original defaults. The identifying column and Manage column remain fixed. Choices survive paging and filtering within the current page; newly encountered custom fields start hidden. Extra columns scroll inside the table on small screens. Card views are unchanged.

Checkboxes select visible records on the current page. Selected export includes only selected rows and visible data columns. Available bulk management actions are the intersection of the selected records' existing permission-gated actions. Confirmation names the records; successful records are deselected, and individual failures remain selected where visible with their errors. Batches use existing single-record endpoints and do not roll back earlier successes.

## Registers covered

- People: members, visitors, both pending registration queues, families, visitor follow-up, and import error rows.
- Administration: locations, team, and roles register. Permission matrices remain matrices.
- Gatherings: attendance records, general attendance sessions, department meeting attendance, departments, cell-group registers and member rosters, the event register, event registrations, and tickets.
- Giving: donations, recurring schedules, and cell-group meeting giving.
- Connect: broadcasts.
- Library: forms, response tables/inbox, media folders, sermons, series, and speakers.
- Operations: assets, asset worklists, loans, maintenance, and depreciation detail tables.
- Settings/account: billing history and subscription payment history.

Pending queues share the members register's row grammar, avatar/contact presentation and Manage column. **Approve**, **Decline**, and **View** open the existing review/confirmation flows. Bulk review confirms once for the named selection; decline explicitly warns that answers are permanently deleted. Name, email, phone, branch and submission-date sorts run on the server before pagination.

Management batches cover archive/restore and supported deletion/deactivation in people/admin/assets, attendance undo, scheduled-broadcast cancellation, recurring-giving pause/resume/cancellation, form archive/restore/deletion, group-roster removal, and response/intake review. Read-only lists offer selected export. Actions that navigate to editors or require different per-record input remain individual actions.

No new database migration, permissions or environment variables are required. Deploy the API sorting/field-metadata update with the web changes.

## Pending-tab layout

Member and visitor pending tabs use the same register spacing and compact rounded toolbar controls as the main lists. Search sits on the left with the shared name/email/phone hint; the HQ branch selector, sort selector and direction button form the trailing control group and wrap on narrow screens. Search and branch filters can be cleared together without resetting the selected sort. Summary cards show the pending count for the current branch scope, rows on the current page and the branch name. Pending counts and page counts use skeletons while loading; branch-list failures provide a retry action. The queue error state uses the shared Paper empty-state presentation. Verification: 12 list-management browser scenarios passed, with six pending-tab checks rerun after the final icon/label refinement; TypeScript, scoped lint and production build passed. Desktop and 320 px screenshots were visually inspected.

## Verification

619 frontend unit tests passed with two workers and a 20-second test timeout (the source-wide JSX audit can exceed its default timeout alongside a build). The 27 production-browser checks cover both intake kinds and entry points, all response columns, search/show-all/reset, selected exports, read-only access, named confirmations, partial failures, draft preservation after validation errors, branding and 390/320 px layouts. TypeScript, scoped lint without autofix and both production builds passed. API validation includes 17 unit tests and 9 PostgreSQL integration tests; the disposable local test database was removed afterwards. Browser/build validation used a private temporary web copy to avoid interfering with the running development project.
