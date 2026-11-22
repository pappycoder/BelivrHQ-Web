# Account metadata consistency — 21 Nov 2026

- My Profile now uses the shared UserStatusBadge, matching the team account status presentation and Active/Paused captions.
- Linked-member status text is humanized for display without changing stored values or member-status semantics.
- My Profile Since uses formatRecordDate, matching the team Joined date (22 Oct 2026) and inheriting the shared missing/invalid-date fallback.
- Team detail Admin HQ uses the same sky Paper Tag as My Profile. The explanatory hover title is preserved; its inline-flex wrapper keeps badge heights aligned.

## Validation

Standalone TypeScript, scoped ESLint, UI contract audit and diff whitespace checks passed. Existing date and badge-contrast suites passed: 15 tests across two files.

The updated pages were tested on the local development server: both pages at 1280px, 390px and 320px in light and dark mode (12 views). All 12 corresponding Active/Admin HQ badge comparisons matched for label, tone, colors, font, size, weight, padding, line height and height. Both dates read 22 Oct 2026, linked-member status reads Active, and no page overflow occurred.

[Browser measurements](/tmp/belivrhq-account-polish-browser.json), [profile desktop light](/tmp/belivrhq-account-polish-profile-desktop-light.png), [team desktop light](/tmp/belivrhq-account-polish-team-desktop-light.png), [team 320px dark](/tmp/belivrhq-account-polish-team-320-dark.png).

Light mode and the default viewport were restored. The browser remains open on My Profile. Frontend development server remains on port 3000; the API remains running. No production build or deployment was run for this small presentation-only change, and no account or business record was saved.
