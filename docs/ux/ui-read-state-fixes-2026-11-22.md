# Five-page read-state fixes — 22 November 2026

The remaining failure/empty inconsistencies in [the wider follow-up audit](ui-wide-followup-2026-11-22.md) are fixed locally.

## Changes

- **Notifications, Recurring giving and Life events:** failed primary reads render the shared page error heading and Try again control. Empty-state guidance, unavailable summaries and stale record actions are hidden on failure. Notifications uses neutral copy while loading; data-dependent schedule/life-event statistics use loading skeletons.
- **Messages:** conversation and delivery-analytics reads have independent error panels and unavailable metrics. Healthy conversations remain visible if analytics fails; valid delivery totals remain visible if messages fail. Pending metrics use skeletons; successful empty responses retain their existing guidance and legitimate zero totals.
- **Search:** each permitted category reports pending, successful or failed status. Failed categories show their own shared recovery state, retain no stale rows and do not contribute a zero-match result to the combined search. Healthy matches remain visible alongside failed categories. No-match advice appears only after all current categories succeed with no matches. Aggregation is keyed by query and scope; categories outside current scope/permissions are ignored.

The five page files changed, plus a small search-state helper and five focused regressions. Existing shared error, session-aware full-page retry and stat-card components are reused. No backend or permission policy was changed.

## Browser verification

**86 final viewport/theme/state observations** against the production build:

| Coverage | Observations |
| --- | ---: |
| Normal reads on all five pages, 1280px/390px × light/dark | 20 |
| Successful empty reads on all five pages, same combinations | 20 |
| Failed reads on all five pages, same combinations | 20 |
| Search and Messages failures at 320px × light/dark | 4 |
| Partial Search: valid member result plus four failed categories, desktop/mobile × light/dark | 4 |
| Messages with failed analytics and healthy populated conversation, same combinations | 4 |
| Failed messages with healthy delivery totals, same combinations | 4 |
| Healthy populated message fixture, same combinations | 4 |
| Actual Try again recovery on all five pages in mobile/dark, plus Notifications in desktop/light | 6 |

Every final view had the expected viewport/theme, a settled screenshot, a page heading, no document overflow and no remaining loading skeletons. Failed reads showed recovery feedback without misleading empty guidance or numeric zero summaries. Message-only, analytics-only and partial-search failures retained the expected healthy data. Search returned its matching member after retry and debounce settled.

Four additional scope interactions (People, Gatherings, Library and All) confirmed that partial search preserves the member only in applicable scopes and does not replace failed searches with no-match guidance. The focused unit tests also cover pending/unreported categories, successful-empty results, stale failed counts and categories excluded from scope/permissions.

The first proxy observations hit the existing session's permission-loading failure before the target pages mounted. The session recovered through the normal local app and all affected checks were repeated; those initial observations are excluded from the final matrix. The temporary proxy also stopped once during verification and was restarted before repeating the interrupted populated-message check. Neither interruption was counted as an application UI finding.

## Automated verification and environment

- **862 unit tests across 77 files passed**, including five new search-state tests.
- Scoped ESLint passed without warnings; the production build passed compilation, full lint/type validation and static page generation.
- The UI contract audit reported no issues; `git diff --check` passed.
- The full test suite used a 20-second test timeout for the existing source-wide scan while the build ran concurrently.

Failures, empty results and synthetic conversations/delivery totals came from a GET/HEAD-only local proxy that rejected writes and forwarded session/profile reads normally. No notifications were marked read or deleted, no messages were sent, no schedules/life events were saved, and no payment or permission action was performed. Try again retained the valid signed-in session. The proxy was stopped after verification. The browser remains open on the original selected tier page in light mode with its viewport override reset. Frontend port 3000 and API port 3001 remain running. No deployment was performed.

## Evidence

[86-view matrix](evidence/ui-read-state-fixes-2026-11-22/views.csv) · [Mobile retry checks](evidence/ui-read-state-fixes-2026-11-22/retry-checks.json) · [Desktop retry](evidence/ui-read-state-fixes-2026-11-22/desktop-retry.json) · [Search scope checks](evidence/ui-read-state-fixes-2026-11-22/scope-checks.json)

[Notifications mobile dark](evidence/ui-read-state-fixes-2026-11-22/notification-retry-mobile-dark.jpg) · [Schedules desktop light](evidence/ui-read-state-fixes-2026-11-22/schedule-retry-desktop-light.jpg) · [Life events mobile dark](evidence/ui-read-state-fixes-2026-11-22/life-event-retry-mobile-dark.jpg) · [Search at 320px](evidence/ui-read-state-fixes-2026-11-22/search-retry-320-light.jpg)

[Partial Search mobile dark](evidence/ui-read-state-fixes-2026-11-22/partial-search-mobile-dark.jpg) · [Partial Messages mobile dark](evidence/ui-read-state-fixes-2026-11-22/partial-messages-mobile-dark.jpg) · [Healthy analytics with failed messages](evidence/ui-read-state-fixes-2026-11-22/partial-analytics-desktop-light.jpg) · [Successful empty Search](evidence/ui-read-state-fixes-2026-11-22/empty-search-mobile-light.jpg) · [Recovered Notifications](evidence/ui-read-state-fixes-2026-11-22/recovered-notifications-desktop-light.jpg)
