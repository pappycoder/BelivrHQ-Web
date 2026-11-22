# Populated ticket-view follow-up — 22 November 2026

**Resolved:** both findings were fixed and verified. See [the implementation and test report](ui-ticket-fixes-2026-11-22.md).

Two additional discrepancies are confirmed. This was a read-only review; no application code or ticket records were changed.

## 1. Issued-ticket columns collapse on mobile

On `/gatherings/events/tickets` with the populated Youth Conference event selected, the six-column register compresses to the mobile container instead of reflowing or retaining a readable table width inside a horizontal scroller. Holder names and ticket codes become nearly unreadable, headings run together, and status badges overlap issue dates.

At 390px, the first holder's visible name has only **3px** available for **77px** of text. The status cell has **25px** for a **54px** badge; the date cell has **20px** for at least **31px** of content. At 320px, the name has **0px**, status has **11px**, and the date has **9px**. These results are the same in light and dark mode. Desktop rows have sufficient space.

The document and table scroll widths remain bounded, so document-level overflow checks miss the internal clipping and overlap. The view needs a mobile row layout or the same bounded, readable horizontal-table treatment as comparable registers.

Source: `src/app/(paper)/gatherings/events/tickets/page.tsx`, the table header and record-row grid templates around lines 147–157. They use six fractional columns without an appropriate mobile layout/minimum width.

[Measured bounds](evidence/ui-ticket-followup-2026-11-22/ticket-row-bounds.json) · [390px dark screenshot](evidence/ui-ticket-followup-2026-11-22/tickets-dark-390.jpg) · [320px light screenshot](evidence/ui-ticket-followup-2026-11-22/tickets-light-320.jpg).

## 2. Ticket/tier read failures still produce empty guidance

With event selection loading normally, a GET/HEAD-only fixture returned HTTP 503 specifically for ticket and tier reads. Both ticket pages omit query-error branches:

| Page | Misleading result |
| --- | --- |
| `/gatherings/events/tickets?event=…` | Zero ticket summaries, “No tickets issued yet,” and first-assignment guidance even though the request failed. The normal event has three existing tickets. |
| `/gatherings/events/tiers?event=…` | Zero tier summaries, “No tiers yet. The first one sets the price of entry,” and “No tickets issued for this event yet” in the recent-ticket section. The normal paid event has an existing tier. |

These states were reproduced at desktop and 390px in both themes. They should distinguish failed reads from successful empty results, provide recovery feedback, and avoid presenting unavailable summaries as zero. The recent-ticket query on the tiers page needs its own failure handling as well as the tier query.

Sources: `src/app/(paper)/gatherings/events/tickets/page.tsx` checks `tickets.isLoading` and then `rows.length` without an error branch. `src/app/(paper)/gatherings/events/tiers/page.tsx` similarly checks loading/data for both tiers and recent tickets. The event picker itself succeeds in these reproductions.

[Issued-ticket failure on desktop](evidence/ui-ticket-followup-2026-11-22/ticket-error-desktop.jpg) · [Tier failure on mobile](evidence/ui-ticket-followup-2026-11-22/tier-error-mobile.jpg).

## Coverage and environment

[18 distinct viewport/theme/state combinations](evidence/ui-ticket-followup-2026-11-22/views.csv): six populated issued-ticket checks at 1280/390/320px in light/dark, four normal paid-tier checks at desktop/mobile in both themes, and eight targeted ticket/tier failure checks. The initial desktop/mobile baseline observations were not counted again. This was a targeted follow-up to the prior broad reviews, not another exhaustive interaction test of every route and role.

Both local services were stopped at the beginning, so the browser initially displayed the offline fallback. The existing production frontend and API were restarted before reviewing the live layouts. That initial offline state was not counted as an application UI defect.

No PDF, ticket assignment, registration, payment or deletion action was submitted. The temporary failure fixture was stopped. The browser remains open on the original selected issued-ticket page in light mode with its viewport override reset. The frontend and API remain running; previous fixes remain in place.
