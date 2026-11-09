# Events visual refresh — 2026-10-29

## Calendar and agenda

The Events home keeps the calendar primary, with a selected-day agenda beside it on wide screens and below it on smaller screens. Month/week/day, Today, period navigation, the compact jump-to-date input and agenda share one selected date. Date selection continues to prefill quick creation. Busy-day overflow focuses the full day agenda; event previews retain edit/delete permissions and confirmations, with a neutral header and vertical-dot management menu. Service links respect their destination permission.

A shared projection preserves loaded-event start-day and local recurring-service time semantics. Sunday (`dayOfWeek: 0`) now appears, and recurring services cover adjacent-month days displayed in the calendar. Events and services share projection logic with the agenda. Soft, labelled type colors distinguish entries in both modes; colorful series remain independent of the saved personal button accent.

The existing 100-event/100-service fetch limits and visible loaded-coverage caption remain. This is not a complete church calendar aggregate. Independent source errors offer targeted retries while available entries remain visible. Existing query permissions, church/branch isolation and API contracts remain unchanged.

## Directories, details, forms and tickets

Events-scoped presentation reuses the refined Members primitives without global styling changes. The event directory removes three statistic-only requests/cards and uses its filtered result count. Search, branch and type remain visible; archive/sort/reset sit in More filters with an active-secondary-filter count. Tables retain existing pagination, selection and export behavior. Event types and operational states use readable labelled badges in light/dark modes.

Details use a neutral information panel, compact operational figures, existing Registrations/Attendance tabs, and a labelled Event management vertical-dot menu with existing edit/tier/archive/restore/delete handlers and confirmation focus return. Named check-ins and reported headcounts stay separate. Free-event registration, paid-event restrictions, contact/roster actions and destination grants are unchanged.

Create/edit and calendar quick-create fields use restrained section panels. Ticket/tier tables use explicit NGN labels, right-aligned amounts and quiet management menus; tier dialogs restore focus to the originating row. Assignment/claim forms group existing event/ticket/holder inputs. Ticket and tier read failures remain distinct from empty results, with retry actions. Self-ticket access, ticket generation/downloads, capacity checks, conditional pricing, payment handling, payloads, validation, unsaved-change protection and confirmation behavior remain intact. Check-in retains the existing roster and walk-in handlers with a clearer labelled mode selector.

## Verification

- 456 unit tests passed, including Sunday/adjacent-month projection, exclusion of inactive/unspecified schedules, agenda ordering and existing start-day semantics. The final run used two Vitest workers to avoid CPU contention with browser rendering.
- 58 unique browser scenarios passed across full/focused runs. These cover calendars/coverage/empty/error/retry, HQ/branch controls, missing permissions, create-date defaults, keyboard menus and focus, read-only/archived details, registrations, conditional free/paid forms and payloads, attendee rosters, general attendance, tickets/claim availability, exports and pagination.
- Targeted lint, TypeScript, whitespace checks and the production web build passed.
- Mock fixtures now include required ticket plan features, complete session identity, exact tier selectors and disabled PWA registration for intercepted-network tests; runtime-error assertions remain enabled.

Fixture-only previews are captured in `/tmp/belivrhq-events-previews/` for calendar, directory, details, forms, registrations, check-in, tiers and tickets at 390/768/1440px in light/dark modes with a saved violet accent.

## Release boundaries

Web-only through the existing Git/Vercel integration. No backend, database, subscription, permission-seed, payment-processing or public-checkout changes. No live events, registrations, tickets, visitors or attendance records are created by these checks.
