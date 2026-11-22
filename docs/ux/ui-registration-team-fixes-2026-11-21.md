# Event registration and team sign-in fixes — 21 Nov 2026

Event detail registration rows now put attendee names on their own grid row below 640px, with quantity, tier, payment and check-in badges wrapping underneath. Names and unbroken tier labels wrap within available width; ticket codes retain their existing small-screen visibility. Desktop retains an inline layout.

Team list tables and cards use the shared formatRecordDateTime formatter, including year and viewer-local time. Missing dates consistently say Never signed in; invalid dates use Not available. Card footers wrap and card-grid tracks/items are bounded to prevent long names widening the mobile page. CSV values, permissions, API values and mutations are unchanged.

## Validation

- Five shared record-date unit tests passed. Scoped ESLint and standalone TypeScript passed; the final production build also passed lint/types and generated all 114 pages.
- All 24 final browser checks passed at 1280px, 390px and 320px in light and dark themes: 12 populated team table/card cases, six synthetic registration cases and six real registration cases.
- Synthetic team records cover populated timestamps, UTC/local year rollover, null and invalid dates. Exact output matches between table and cards: 21 Nov 2026, 00:30; 1 Jan 2026, 00:45; Never signed in; Not available.
- Synthetic registrations cover long names, an unbroken name/tier label, four payment states, arrival states, quantities and ticket codes. Names/metadata fit and mobile metadata is below names. Three existing real registrations also fit all viewport/theme combinations.
- No page-level horizontal overflow remained. Team tables retain intentional internal scrolling.

The synthetic responses came from a temporary GET/HEAD-only loopback proxy of the actual compiled frontend. The proxy rejected writes and logged only fixture reads. No church/account/registration data was created or changed. The proxy was stopped, light mode/default viewport restored, and the real app remains open on event registrations. No deployment was performed.

Evidence: [24 final measurements](/tmp/belivrhq-registration-team-final-checks.json), [real registrations at 320px dark](/tmp/belivrhq-registration-fixed-320-dark.png), [populated team cards at 320px dark](/tmp/belivrhq-team-signin-fixed-320-dark.png).
