# Remaining read-state UI inconsistencies — 22 November 2026

**Resolved:** all five affected pages were fixed and tested. See [the implementation and verification report](ui-read-state-fixes-2026-11-22.md).

One additional cross-app issue group is confirmed: **failed reads still appear as empty results or zero summaries on five pages**. No application code or business records were changed in this review.

## Confirmed affected pages

A temporary GET/HEAD-only local proxy returned HTTP 503 for the relevant data reads while forwarding authenticated profile/session and unrelated requests normally. These are simulated failures, not evidence that the live API is currently down.

| Page | UI after failed reads |
| --- | --- |
| `/notifications` | “Everything is quiet” / “Nothing needs you”, without error feedback or recovery. The normal account has existing notifications. |
| `/connect/messages` | “No messages here” and four zero metrics, including delivery failures, when the messages and communication analytics requests fail. |
| `/giving/schedules` | “No standing gifts yet” and zero schedule/projection/paused summaries after the recurring-giving read fails. |
| `/people/pastoral/life-events` | “No milestones recorded” and Add the first guidance after the life-events read fails. |
| `/search?q=Chioma` | “0 results shown” and “Nothing answers to ‘Chioma’”, with advice to change the term/scope, after the search rails' underlying reads fail. The same search normally returns one member. |

All five reproductions were checked at **1280px and 390px in light and dark mode**, after loading skeletons had settled. None displayed a failure alert. They should distinguish failed, pending, successful-empty and populated reads, show retry/recovery feedback, and avoid converting unavailable counts into zeros. Search should retain valid results from healthy categories while identifying failed categories rather than treating failure as zero matches.

Sources: each corresponding `src/app/(paper)/…/page.tsx`. Notifications, messages, life events and schedules branch from loading directly to an empty-data check. Search's member/visitor/event/sermon/form rails report `rows.length` after loading and omit errors from the combined settled/count state. Communication analytics has its own failure state and should not imply zero delivery failures when unavailable.

## Other checks and limits

**64 observations:** 40 normal page views across Notifications, Messages, Recurring giving, Life events, Search, Appearance, Asset loans, Asset maintenance, Church settings and Support (1280px/390px × light/dark); 20 failure-state views above; and four New message dialog observations (same viewport/theme combinations).

The normal comparison views had expected headings/themes, no document overflow, no remaining skeletons and no duplicate required markers. The sampled dialog fit the viewport with no internal horizontal overflow. No additional baseline layout or dark-mode styling problem was confirmed in these checks. The recent-ticket fixes remain intact.

This is another targeted follow-up using the existing signed-in role and available records, not an exhaustive certification of every route, role, record shape and interaction. The dialog was opened and cancelled without entering or sending a message. No notifications were marked read/deleted, no schedules or records were created, and no payment or permission actions were performed. No accent settings were changed. The temporary proxy was stopped. The browser was restored to the selected tier page in light mode with its viewport override reset and retained open; frontend and API remain running.

## Evidence

[60 page observations](evidence/ui-wide-followup-2026-11-22/views.csv) · [Four dialog measurements](evidence/ui-wide-followup-2026-11-22/dialog-checks.json)

[Notification failure](evidence/ui-wide-followup-2026-11-22/notification-failure-desktop.jpg) · [Message failure](evidence/ui-wide-followup-2026-11-22/message-failure-desktop.jpg) · [Schedule failure](evidence/ui-wide-followup-2026-11-22/schedule-failure-mobile.jpg) · [Life-event failure](evidence/ui-wide-followup-2026-11-22/life-event-failure-mobile.jpg) · [Search failure](evidence/ui-wide-followup-2026-11-22/search-failure-mobile.jpg) · [Same search succeeding](evidence/ui-wide-followup-2026-11-22/search-success-mobile.jpg)
