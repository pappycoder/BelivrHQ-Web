# Populated asset and ticket UI review

## Changes

- Renamed Passes to Issued tickets, including navigation, breadcrumbs, page copy, pagination and tours. Routes and permissions remain unchanged.
- Inbox composition now starts with eight rows and a 240px minimum height on desktop and mobile. Explicit inline minimum-height and fixed field sizing override the shared dialog/textarea rules, preserving a useful empty height and vertical resizing.
- Constrained event selectors to the available width so long event titles cannot overflow mobile ticket and tier pages.
- Paid-tier cards show price and capacity beneath the description at mobile breakpoints; desktop columns remain.
- Fixed optional loan/return conditions sending an empty enum value. Blank conditions are omitted, matching the API's optional contract.

## Test data

Clearly labelled records were created through the application for the requested populated-state review:

- Asset: UI TEST — Portable projector (`UI-TEST-20261120`, ID `8e707c73-4cb7-4a5a-9dee-0d24b2ddbccd`).
- Loans: UI TEST borrower (returned 20 November 2026) and UI TEST optional condition (borrowed, expected return 20 December 2026). Both were saved with the condition omitted during the return/new-loan regressions.
- Maintenance: Preventive check, UI TEST technician, scheduled 20 November 2026.
- Paid event: UI TEST — Ticket layout review (ID `ac16a691-63a5-4f4b-afec-53e58fbdcce5`).
- Tier: UI TEST — Standard admission, ₦1,000, 20 seats.

No tickets were purchased or assigned, no payments were made and no external messages were sent. Test records remain available for review.

## Verification

Verification covers populated asset register/details/edit, embedded maintenance and loan history, loan register/return dialog, maintenance register/editor, paid-tier register/editor and inbox composition at desktop/mobile sizes in light/dark themes. Final verification passed 52 desktop/mobile and light/dark combinations across 13 views: asset register/details/edit, embedded maintenance and loan history, loan list/return dialog, maintenance list/editor, paid-tier list/editor, Issued tickets and inbox composition. There were no horizontal-overflow failures, out-of-viewport dialogs, duplicate field IDs or detached submit controls in the completed matrix.

The populated tier page initially exposed 30px mobile overflow from its long event selector; the final selector and mobile price/capacity display passed the recheck. The inbox initially remained one line because shared CSS overrode utility sizing. Its final inline minimum-height and fixed field-sizing correction was measured at exactly 240px on desktop and mobile in both themes, with vertical resizing retained. Measurements taken during the dialog opening animation were replaced after it settled. First-visit tours were dismissed before final page measurements.

Both live save regressions passed: returning the first test loan with Condition After blank, and creating a new test loan with Condition Before blank. The worklist shows one returned and one borrowed record. No messages were sent and no tickets were assigned or purchased.

All 721 tests across 62 files passed; a subsequent focused run passed all 10 asset/tour tests. TypeScript, scoped lint, diff checks and the final production build passed. The final style-only sizing correction was checked by TypeScript/lint/build and the browser measurements above. The frontend was stopped before the final rebuild and restarted after completion.

Evidence: `/tmp/belivrhq-populated-ui-review.json`, `/tmp/belivrhq-final-inbox-desktop.png`, `/tmp/belivrhq-final-inbox-dark-mobile.png`, `/tmp/belivrhq-final-paid-tiers-mobile.png`, `/tmp/belivrhq-final-populated-loans.png`.

The renewed signed-in browser was left open on the inbox composer in light mode with its temporary viewport override reset. Frontend/API ports 3000/3001 remain running.
