# Follow-up UI audit — 22 November 2026

Follow-up: all three issue groups below were fixed and regression-tested. See the [fixes and verification report](ui-three-fixes-2026-11-22.md). Original findings are preserved below.

Three additional issue groups are confirmed. This was a read-only review; no application code was changed.

## 1. Sermon detail titles clip instead of wrapping

The sermon detail page uses a local H1 rather than the newly fixed shared heading. A valid 177-character synthetic title containing long unbroken text exceeds the heading's width in both themes. At 390px, the heading has a 302px client width and 769px scroll width; at 320px, these are 232px and 769px. Even desktop text exceeds its heading width (1065px versus 1114px). The surrounding card clips overflow, so document-level overflow checks alone miss this issue.

Source: `src/app/(paper)/library/sermons/[sermonId]/page.tsx:117`. The create form and backend create DTO require a nonempty title and do not reject this length.

[Measured bounds](evidence/ui-post-fixes-audit-2026-11-22/sermon-bounds.json) · [Mobile dark screenshot](evidence/ui-post-fixes-audit-2026-11-22/sermon-title-dark-mobile.jpg).

## 2. Failed requests still masquerade as empty, zero or missing data

The main asset-register error fix works, but the same failure/empty distinction remains missing elsewhere. Temporary read-only fixtures returned HTTP 503 for backend reads while retaining the normal authenticated profile and session. These are simulated failure states, not evidence that the real server is currently down.

The following affected routes were checked at 1280×900 and 390×844 in light and dark mode:

| Route | Misleading result after request failure |
| --- | --- |
| `/operations/assets/categories` | “No categories yet” and create-first guidance |
| `/giving/funds` | “No giving categories yet” |
| `/library/sermons/series` | “No series yet” |
| `/library/sermons/speakers` | “No speakers yet” |
| `/people/segments` | Zero/default summaries and empty-ledger guidance without a failure indicator |
| `/people/pastoral/engagement` | “Nobody in this view” and advice to change filters |
| `/people/pastoral/care` | “Nothing on the care horizon” |
| `/connect/appointments` | “Nothing booked” |
| `/gatherings/attendance` | Zero summaries, “Nothing recorded yet” and “No active services yet” |
| `/gatherings/attendance/reports` | Some sections acknowledge a failure, but the service section says “No services listed” and advises creating a service |
| `/library/media/folders` | “No folders yet” |
| `/admin/locations` | “One church, no branches yet” |
| `/admin/permissions` | “No roles to show” |
| `/admin/team` | “Nobody has a seat yet” |
| `/giving/statements` | “No gifts in this window” and advice to widen dates |
| `/home` | Empty/zero dashboard content, including no members, no gatherings and no recent activity |
| `/gatherings/events` | Empty calendar/coming-up content without failure feedback |
| `/admin/locations/[branchId]` | A server failure is described as a missing/deleted branch or old link |

This is one cross-app error-state consistency problem with multiple consumers. A fix should distinguish initial loading, failed reads, successful empty data and genuine 404 responses; failed reads should offer recovery instead of create-first/filter guidance. Dashboard slices should distinguish unavailable values from legitimate zeros.

For comparison, event registrations rendered an explicit “Couldn't load events” state with refresh/open-events recovery actions under the same fixture. Live giving categories and team pages separately rendered their existing records normally.

[Giving-category failure screenshot](evidence/ui-post-fixes-audit-2026-11-22/giving-failure-desktop.jpg).

## 3. Billing stays on skeletons after failure

`/settings/billing` remains on three loading placeholders after its billing request has failed. It provides no heading, failure explanation or retry control. Confirmed on desktop/mobile and light/dark, including a repeat visit after the other failure checks. The real billing page loads normally in all four combinations.

Source: `src/app/(paper)/settings/billing/page.tsx:69` uses `status.isLoading || !status.data` as its skeleton branch without a preceding error branch. A failed query with no data therefore continues to look like loading.

[Billing failure screenshot](evidence/ui-post-fixes-audit-2026-11-22/billing-failure-dark-mobile.jpg).

## Coverage and limits

[110 final observations](evidence/ui-post-fixes-audit-2026-11-22/views.csv): 80 failure-state observations across 20 routes, six long-sermon-title checks at desktop/390px/320px in both themes, and 24 normal/populated/public-header comparison observations. This follow-up emphasized the failure states and local headings not covered by the previous fix; it was not another exhaustive interaction test of all 104 templates, all roles or physical mobile browsers.

Document widths remained bounded in these observations, but the sermon H1's own bounds exposed clipping. No new baseline layout or theme discrepancy was confirmed in the normal comparison views. Public-header text, CTA and menu contrast remained correct in the sampled light/dark views. Existing account permissions were not changed; no transactions, records, messages or credentials were submitted.

Temporary fixtures were stopped. The browser was restored to the real asset register in light mode with its viewport override reset and kept open. The frontend and API remain running. The previous four fixes remain in place; the three issue groups above are additional findings.
