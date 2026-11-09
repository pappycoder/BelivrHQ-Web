# Tables and form responses

## Shared tables

Every record table uses the shared Table primitive. The first two visible record columns remain anchored during horizontal scrolling; selection checkboxes and action columns do not consume those positions. Identifying columns remain available while additional columns can be hidden or scrolled. Actual header widths are measured and remeasured after resizing, visibility changes or new rows, with matching body offsets and opaque backgrounds in both themes. Pinned cells use bounded widths on smaller screens so other columns remain reachable.

Desktop mouse users see row actions while hovering a row, focusing a control in the row, or leaving its menu open. Keyboard controls remain focusable. Touch devices and narrower layouts retain visible actions. Header controls, sorting and selection remain available.

Billing history now identifies payments by reference and plan before dates and amounts. Forms identify records by title and form reference. Existing collections keep their ordered identifying columns; no tenant permissions or action grants are added.

## Form detail and responses

Opening a form displays its actual description, status, audience, template flag, response count/capacity, required question count, timestamps, questions, field types/options and deduplication label. Share-link controls and management actions remain permission gated. The fill screen includes that form's title, description, question count and required count.

Both form detail and the submissions collection share a schema-driven response table. Each row starts with its submission reference and configured unique answer, name, email, or first question. Other answers, status, signed-in/public source, submission time and attachment count follow. Missing values remain explicit; arrays, zero and false remain distinguishable. Full references remain available in tooltips and keyboard-accessible response controls. Clicking a reference opens its response details; review remains limited to the existing permission and pending status.

Form changes replace answer columns and rows. Submissions stay paginated. Exports retain visible fields and the existing export scope. Readers without submission access do not request responses. Counts describe the opened form, not filtered-page totals or fabricated analytics.

## Verification

Validation passed: production build, TypeScript, scoped lint, 319 unit tests and 39 browser checks. One resize assertion was made tolerant of the asynchronous layout measurement and passed on focused rerun; the other 38 checks passed initially. Desktop and mobile screenshots were visually reviewed. Browser coverage exercises response identity and fields, form switching, protected response access, pinned header/body alignment while scrolling/resizing/hiding columns, desktop hover/focus, touch visibility and mobile overflow. Provider/backend data is mocked for browser checks; no live record is written.

## Follow-up: display controls, bulk actions and public forms

The fixed-column shadow is conditional on horizontal overflow and a nonzero horizontal scroll position. Returning to the start or removing the overflow clears it. Selection checkboxes stay anchored alongside the two record identifiers.

**Table view** controls row spacing and column width independently. Compact body text uses ellipses; headings retain their font, padding and full labels. Numeric/currency columns keep their measured widths, including zero and formatted currency. **Column actions** selects multiple columns for show/hide or compact/expand; fixed identifiers cannot be hidden. These display choices stay local to the mounted table.

Existing bulk actions in member/attendance and other module-owned selection remain intact. Collections that already allow export additionally support selecting visible rows and exporting only that selection, with the currently visible columns. No default export is enabled for restricted setup collections. Selection is scoped to the visible page. Form response lists have explicit selection, selected-row exports and permission-gated bulk approval/rejection of pending responses. Confirmation shows the response references; rejection requires a shared reason. Existing scoped status endpoints process batches with concurrency at most three and at most 100 unique responses. Successful items are deselected and failures remain selected; retry does not repeat successful reviews. No new permission bypass or bulk backend endpoint is introduced.

The public `/forms/public/[publicToken]` page has its own branded, responsive layout with the actual form title/description, question counts, required-question completion and progress. It provides loading, invalid/closed-link retry, validation, success and send-failure states; failed sends retain entered answers. Changing tokens remounts the response state. Metadata uses the same-origin API proxy instead of a browser URL defaulting to localhost. Only GET `forms/public/:token/meta` and POST `forms/public/:token/submit` omit account authorization at the proxy; private or differently shaped requests retain authentication. Server validation, deduplication, rate limits and submission ownership remain authoritative. Public metadata does not include church branding, so the page uses BelivrHQ identity rather than inventing a church name or logo.

Anonymous and expired-session visitors remain on the public form page during background session restoration. This exception is restricted to public help and the exact public form page shape; staff form detail/fill and management routes remain protected. Public form metadata and in-progress answers are held in the page rather than the account query cache, so account-cache teardown cannot reset the form. Sending is guarded against duplicate in-flight submissions independently of account query state.

Follow-up validation passed: production build, TypeScript, scoped ESLint, 340 unit tests across 17 suites, and 75 browser checks across table/forms, public forms, read-only access, export branding, attendance rosters/headcounts, Help Centre and subscription entitlements. Public send-retry expectations use the API client's normalized 503 message. Billing fixtures now stub the external Tawk embed; its failed network request had paused the quote query in the restricted browser environment, and all four billing checks passed on rerun. Public desktop/mobile screenshots were visually reviewed. Browser APIs are mocked; no live submissions, billing changes or support messages were sent.
