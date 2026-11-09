# Media and Visitors visual refresh — 2026-10-29

## Media

The library keeps a compact preview grid with image thumbnails, restrained file-type tints/icons, readable names, size/date metadata, and labelled folder/access badges. Card action menus use visible, keyboard/touch-accessible vertical dots. Preview/play actions, authenticated media URLs, Copy URL, Open Original, permission changes and delete confirmations keep their existing handlers and grants; dialogs return focus to their originating card control.

The filtered result count replaces the large statistics cards and their statistic-only file query. Folder reads remain for folder controls. Search/type/folder/existing branch controls stay visible; access filtering, sorting and reset sit under More filters with a secondary-filter count. Media passes an additive page-size-options prop to shared pagination so its existing 12-file default has a visible option; other callers retain their defaults. Library read failures retry in place. Folders have a compact count/table and keyboard-accessible browse links, with names retained for folder-only readers who cannot browse the library.

The upload page has a smaller drop zone and neutral queue presentation. Folder controls, limits, image optimization, direct non-image transfers, prepare/complete authorization, completed-transfer reuse, progress, retry and successful-file handling are unchanged.

## Visitors

The directory uses a filtered result count instead of the four statistics cards and their dedicated aggregate read. Search/status remain visible; archive/sort/reset move under More filters. Existing assignee reads, branch scope, filters, pagination, selection/bulk deletion and complete filtered exports remain. Stable ID-based avatar colors are shared across directory, detail and follow-up cards. Labelled status badges consistently distinguish New (blue), Contacted (teal), Scheduled (amber), Interested (violet), Converted (green) and Dropped off (gray), with a separate archive indicator.

Details use a compact identity header and a labelled Visitor management vertical-dot menu. Existing edit/conversion/lifecycle grants, converted eligibility, confirmations, contact information, assignment/status controls, notes, custom fields, member-profile destination access and visit-history tabs remain. Dialog focus returns to the originating control; edit completion also handles the existing detail-query removal/refetch cycle. Add Visitor remains primary, Quick Add secondary, and directory administration uses vertical-dot menus.

Create/edit, Quick Add and conversion use grouped fields through opt-in presentation props. Existing schemas, defaults, branch rules and mutation payloads are unchanged, including shared callers outside Visitors. The Follow-Up board retains existing columns, drag handles, status dropdown alternatives, optimistic rollback and paging/search behavior. Its caption explicitly identifies the current loaded directory page of up to 100 visitors; column counts are not church-wide aggregates. Styling uses neutral compact cards and restrained header accents.

Visitor importing opts into compact headers/progress and scoped presentation. Shared importer defaults, member importing, templates, parser/worker behavior, preview/dry-run validation, duplicate checks, batches and source-row errors remain unchanged.

## Verification and release

459 unit tests and 40 browser scenarios passed, along with targeted lint, TypeScript, whitespace checks and the production build. Coverage includes default/custom accents, preview/focus/copy/access/delete actions, restricted media and folder-only access, scope/filter forwarding, statistic-read removal, 12-file page-size display, direct upload completion retry without retransferring bytes, visitor branch/create/edit payloads, selection clearing, edit focus after query refresh, conversion/navigation, visit history, board dropdown failure rollback and grip drag/drop, empty/error/retry states, visitor import mapping/review/completion, 100-row batches/source-row errors and member-import compatibility. 37 fixture previews were captured. Mock-data desktop/mobile and light/dark previews, including import stages and upload retry/completion, are stored under `/tmp/belivrhq-media-visitors-previews/` with a saved violet accent. Existing regressions also exercise the default accent and shared embedded dialogs.

Web-only through the existing Git/Vercel process. No API contracts, backend/database changes, subscription or permission-seed changes, new record workflows, or live media/visitor/member writes. Public pages and unrelated workspace styling remain unchanged.
