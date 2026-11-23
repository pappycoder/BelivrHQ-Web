# Approved next workspace enhancements — 23 November 2026

The user approved integration of the six interactive proposals at localhost:3101. That prototype remains available for comparison. The app uses real records, current permission checks and existing mutation/confirmation handlers; prototype names and amounts are not copied into app data.

## Integrated scope

- Guided member creation/editing, asset create/edit pages and event create/edit pages: section navigation, required-field progress, retained mounted fields, a live preview, final review and linked field errors. Existing custom fields, images, branches, households, native/schema validation and discard/save handlers remain available.
- Inbox: chronological linked conversations, sender/recipient reading bubbles, reply entry point and account/conversation-scoped browser drafts. Keep draft survives closing/reopening; discard and successful send clear the draft. Failed sends retain it. No new outbound channel is introduced.
- Event/service detail workspaces: editorial overview hero, actual event capacity, Overview/People/Preparation sections, real check-in/ticket/edit actions and private browser preparation checks. Existing attendance, registration, giving and tier panels remain under People.
- Asset details: combined loan, return, scheduled maintenance and completed maintenance timeline, activity filters, inspector and upcoming maintenance/return dates. Existing overview, QR, separate loan/maintenance history and depreciation stay accessible. Failure states do not claim there is no upcoming work.
- Report studio: personal saved setups, built-in Board meeting pack and People & presence starters, separate section choice/order controls with 44px move buttons, and 80–130% page zoom. Restored sections/branches are constrained by current permissions. Preview and complete exports retain the same real report projection.
- Shared touch controls: mobile row menus display action text, preserve confirmations and provide 44px targets; checkbox hit areas expand while their visual size stays compact. Existing desktop row actions remain available.

## Data and access boundaries

Personal draft/preset/preparation keys and conversation query-cache keys include both church and profile IDs. Account-key transitions cannot write a previous account's state under a new key. Corrupt browser data is parsed and bounded; storage failure keeps the current screen usable and reports that persistence is unavailable.

The new `GET /api/v1/email/:messageId/thread` route requires `emails:read`. Every ancestor and descendant query is church- and participant-scoped. Traversal stops at inaccessible parents, detects cycles, bounds depth/results and does not mark linked messages read. Reply creation validates access to its parent. Recipient/sender projection is batched rather than queried per message, and the selected message stays visible when a wide conversation hits the 200-message limit. No database migration is required because `reply_to_id` already exists. Sent-message detail now returns the sender's actual recipient IDs without marking recipient copies read.

## Validation

- Final frontend full suite: **92 files / 903 tests passed**. The repository-wide JSX loading audit used a 15-second test allowance during concurrent build verification. Final actions remain mounted and hidden until review; native selects count toward progress, Cancel links stay compact, and review dates use the shared formatter without changing submitted values.
- Backend email service: 32 passing tests, including participant/church isolation, inaccessible-parent boundaries, chronological traversal, read-state preservation, recipient privacy, batched projection, bounded-result selection and sent-recipient projection.
- Scoped lint, frontend TypeScript and UI contract audit: clean (104 pages, 465 links, 906 controls).
- Browser matrix: 58 distinct desktop/phone/theme layouts checked with no page overflow, including populated event/service People panels, asset timeline, asset and event create/edit pages and the guided member dialog. Linked member and native event errors focus the correct field and step. Native event progress includes Branch, the preset name has one required marker, and review labels ignore unrelated empty label IDs. Real report PDF generation returned its success message. Draft close/reopen recovery, preset save/restore/removal, timeline filter/inspector, keyboard tabs and 44px mobile hit areas were verified.

The live inbox is empty. Populated thread rendering, escaped plain text, history failure recovery and reply permission suppression use fixtures; church/participant access and projection use backend unit tests. No live conversation was created merely to test the design.

Evidence: `/tmp/belivrhq-approved-workspaces/layout-checks.json` and representative screenshots in that directory.

No deployment, branch push, payment, message send or business-record save is part of this validation.

Both optimized builds passed. Scoped lint, framework type checking and final whitespace checks passed. Local app and API remain running on loopback ports 3000/3001; the reference preview remains at 3101.

Final rebuilt-app smoke check confirmed Branch is labelled correctly in populated event review, all three required event fields count toward progress, the native Branch error link focuses the calendar section, and preset naming has one required marker. The logged-in app and unchanged reference preview remain open.
