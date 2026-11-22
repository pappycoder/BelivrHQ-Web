# Recent-ticket layout and filters — 22 November 2026

Both findings in [the post-ticket audit](ui-post-ticket-audit-2026-11-22.md) are fixed locally.

## Changes

The tier page's Recent tickets rows use a two-column mobile grid: attendee name on the first line, ticket code and tier/date details underneath, and the status badge beside the name. Names and other long text can wrap on mobile. Desktop retains a compact horizontal row.

The list now uses one filtered collection for both rendering rows and deciding whether to show an empty state. A zero-match Used or Not used filter explains that there are no matching tickets in the recent list and offers **Show all tickets**. A genuinely empty event retains its original no-tickets guidance. Failed requests retain the existing retry panels and unavailable metrics.

Only `src/app/(paper)/gatherings/events/tiers/page.tsx` application code changed for this follow-up; the prior ticket-failure fixes remain in place. The recent-list limit and backend queries are unchanged.

## Verification

- **32 final viewport/theme/state observations:** populated and no-match filtered views with normal unused tickets and synthetic used tickets/long names at 1280px, 390px and 320px in light/dark (24); successful empty and failed reads at 1280px/390px in light/dark (8).
- All 12 filter scenarios restored three records through Show all tickets. The corresponding matching filter retained all three records, covering both Used and Not used behavior.
- Normal attendee names now have **228px at 390px** and **158px at 320px**, versus the previous 70px/0px. All three names remain visible. Long unbroken names wrap, with no row or document overflow. Desktop rows remain aligned.
- Successful empty responses show no unnecessary reset control. HTTP 503 responses display errors and unavailable metrics, without no-match or no-tickets guidance.
- The final recorded views had correct viewport/theme settings, settled screenshots and no remaining skeletons or document overflow. An initial desktop observation made during loading was repeated after data arrived and excluded from the final matrix.
- **857 unit tests across 76 files passed**, including existing ticket/tier failure-state regressions. Scoped ESLint, the UI contract audit and the production build (including lint/type validation) passed. The existing full-source scan used a 20-second test timeout while the build ran concurrently.

Normal reads used the existing authenticated records. Used-status, long-name, empty and failed responses came from a temporary GET/HEAD-only local proxy that rejected writes. No ticket, tier, payment or other business record was changed. The proxy was stopped afterward. The browser remains open on the real selected tier page in light mode with its viewport override reset; frontend and API remain running. No deployment was performed.

## Evidence

[Final view matrix](evidence/ui-recent-ticket-fixes-2026-11-22/views.csv) · [Normal filter checks and measurements](evidence/ui-recent-ticket-fixes-2026-11-22/unused-live-checks.json) · [Long-name/used-ticket checks](evidence/ui-recent-ticket-fixes-2026-11-22/used-long-checks.json)

[Mobile dark rows](evidence/ui-recent-ticket-fixes-2026-11-22/mobile-dark-final.jpg) · [Mobile empty filter](evidence/ui-recent-ticket-fixes-2026-11-22/mobile-dark-empty-filter.jpg) · [Desktop light rows](evidence/ui-recent-ticket-fixes-2026-11-22/desktop-light-final.jpg) · [Long name at 320px](evidence/ui-recent-ticket-fixes-2026-11-22/long-name-dark-320.jpg) · [Successful empty list](evidence/ui-recent-ticket-fixes-2026-11-22/empty-light-390.jpg) · [Failure state](evidence/ui-recent-ticket-fixes-2026-11-22/failure-dark-390.jpg)
