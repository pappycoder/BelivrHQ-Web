# UI follow-up after ticket fixes — 22 November 2026

**Resolved:** both findings were fixed and tested. See [the fix and verification report](ui-recent-ticket-fixes-2026-11-22.md).

Two additional discrepancies are confirmed in the tier page's **Recent tickets** section. No application code or records were changed in this review.

## 1. Recent-ticket attendee names disappear on small phones

On `/gatherings/events/tiers?event=7c6677bf-09fc-4e12-80f6-98c0f37698e9`, the existing three tickets have names, codes and Open badges. The recent-ticket rows use a single horizontal flex line, with the attendee name taking the remaining space after the code and status.

At 390px, the name cell has only **70px** for **75–77px** of text and truncates even these short names. At 320px, that cell shrinks to **0px** and all three attendee names disappear. The code and status remain visible. Confirmed in both light and dark mode; the document itself does not overflow. Desktop has sufficient room.

This section is a separate list from the issued-ticket register fixed previously. It needs a responsive arrangement that retains the attendee name alongside the code/status.

Source: `src/app/(paper)/gatherings/events/tiers/page.tsx`, recent-ticket row markup around lines 198–202.

[Measured bounds](evidence/ui-post-ticket-audit-2026-11-22/recent-row-bounds.json) · [320px dark screenshot](evidence/ui-post-ticket-audit-2026-11-22/recent-row-dark-320-focused.jpg).

## 2. A filter with no matching recent tickets renders a blank section

The same event has three unused tickets. Selecting **Used** removes every row but shows no empty-result explanation or clear-filter guidance. Only the section heading, filter buttons and static PDF/claims footer remain.

Confirmed at 1280px and 390px in both themes. Selecting All restores the records. The page checks `!ticketRows.length` before accounting for the active filter, so a nonempty source list with zero filtered matches skips the empty state.

Source: `src/app/(paper)/gatherings/events/tiers/page.tsx`, inline filter around line 196 and empty check around line 205. Render the filtered collection consistently and provide appropriate no-match feedback.

[Mobile dark screenshot](evidence/ui-post-ticket-audit-2026-11-22/used-empty-dark-390-focused.jpg).

## Coverage and limits

[48 recorded observations](evidence/ui-post-ticket-audit-2026-11-22/views.csv): 40 normal views across members, assets, inbox, giving records, attendance records, team, sermons, forms, profile and ticket tiers (1280px/390px × light/dark); four Used-filter views at those same combinations; and four recent-ticket measurements at 390px/320px × light/dark. Additional focused screenshots illustrate the findings.

The sampled normal views had their expected headings and themes, no document overflow, settled screenshots, no remaining skeletons and no duplicate required markers. No further discrepancy was confirmed in those comparison views. Document bounds alone do not detect the recent-ticket name clipping, which was measured separately.

This is a follow-up sample using the existing signed-in role and available records, not a fresh exhaustive certification of every route, role, public page, dialog and failure state. The previous ticket-failure fixes were not changed. No business mutations, downloads, payments or permission changes were performed. No temporary fixture was needed. The browser was restored to the selected issued-ticket register in light mode with its viewport override reset and retained open; local services remain running.
