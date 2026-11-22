# Issued-ticket layout and loading failures — 22 November 2026

Both findings from [the ticket follow-up review](ui-ticket-followup-2026-11-22.md) are resolved locally.

## Changes

- The issued-ticket register retains a 960px minimum table width inside the shared, bounded horizontal scroll region. Its toolbar and pagination stay outside that region. Names, codes, status badges, issue dates and PDF actions no longer compress into overlapping mobile columns. Status content can wrap, and issue dates stay on one line.
- Issued tickets, ticket tiers and recent tickets each distinguish pending, failed, successful-empty and populated reads. Failed metrics show **Unavailable** rather than zero, with the shared **Try again** recovery control. A failed section does not hide healthy sections.
- Assignment requires valid event and ticket data, plus tier data for paid events. Tier creation, editing and deletion require valid event/tier data. The mutation handlers also enforce this readiness, including dialogs opened before a read failure. Failed tier reads no longer imply flat-price pricing.

Source changes are confined to the two event ticket pages. The existing shared table, error-state, session-aware retry and stat-card components are reused.

## Browser verification

The rebuilt production frontend and existing API were used for **48 viewport/theme/state checks**:

| Coverage | Checks |
| --- | ---: |
| Populated issued tickets at 1280px, 390px and 320px, light/dark; existing paid tier at 1280px/390px, light/dark | 10 |
| Ticket-only, tier-only and combined HTTP 503 failures on both pages at 1280px/390px, light/dark | 24 |
| Successful empty results on both pages at 1280px/390px, light/dark | 8 |
| Long attendee and tier names on issued tickets at 1280px/390px, light/dark | 4 |
| Actual Try again recovery: issued tickets on desktop/light and tiers on mobile/dark | 2 |

All recorded views had the requested width/theme, settled screenshots, no document overflow, no remaining loading skeletons and no duplicate required markers. Failed sections displayed the expected error and unavailable summaries, while successful-empty sections retained their guidance. Retry reloaded the page, restored the data and retained the valid session.

At both mobile widths, the table stayed 960px wide within a 344px/274px scroll region. Holder cells were 229px, status cells 143px and issue-date cells 114px. Keyboard arrow scrolling moved the region from 0 to 616px at 390px, bringing PDF controls into view while retaining the toolbar and pagination. Long names used normal truncation without expanding the document.

Failures, empty responses and long text were provided through a temporary **GET/HEAD-only** local proxy; all writes were rejected. Normal authenticated event/profile reads were forwarded unchanged. No ticket assignment, tier mutation, registration, payment, deletion or PDF download was submitted. The test proxy was stopped afterward.

## Automated verification

- **857 tests passed across 76 files**, including 10 new ticket-page regressions covering independent failures, stale-data rejection, pending/empty states and action gating. The full suite used a 20-second timeout because the existing whole-source loading scan exceeded its default 5-second timeout while the build ran concurrently.
- Scoped ESLint and standalone TypeScript checks passed.
- UI contract audit reported no issues.
- Production build passed.

The browser remains open on the original selected issued-ticket page in light mode with its viewport override reset. Frontend port 3000 and API port 3001 remain running. This verifies the two requested fixes; it is not a new exhaustive certification of every route and role. No deployment was performed.

## Evidence

[48-view matrix](evidence/ui-ticket-fixes-2026-11-22/views.csv) · [Table measurements](evidence/ui-ticket-fixes-2026-11-22/table-bounds.json)

[Desktop light](evidence/ui-ticket-fixes-2026-11-22/desktop-light-final.jpg) · [Mobile dark table](evidence/ui-ticket-fixes-2026-11-22/mobile-dark-table.jpg) · [Mobile rightmost actions](evidence/ui-ticket-fixes-2026-11-22/mobile-dark-scrolled.jpg) · [320px dark](evidence/ui-ticket-fixes-2026-11-22/ticket-320-dark.jpg)

[Desktop ticket failure](evidence/ui-ticket-fixes-2026-11-22/ticket-error-desktop-light.jpg) · [Desktop tier failure](evidence/ui-ticket-fixes-2026-11-22/tier-error-desktop-dark.jpg) · [Mobile recent-ticket failure](evidence/ui-ticket-fixes-2026-11-22/mobile-dark-ticket-error.jpg) · [Paid tier mobile](evidence/ui-ticket-fixes-2026-11-22/paid-tier-mobile-light.jpg) · [Successful empty tiers](evidence/ui-ticket-fixes-2026-11-22/empty-tiers-mobile-light.jpg)
