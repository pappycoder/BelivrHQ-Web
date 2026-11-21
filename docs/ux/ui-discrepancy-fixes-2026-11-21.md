# Remaining UI fixes — 21 November 2026

## Final behavior

- Selected `FilterChip` controls have explicit matching background, text and hover colours in dark mode. Their inverse treatment matches the existing view controls instead of inheriting the outline Button's translucent dark background.
- The dashboard Calendar action opens `/gatherings/events`.
- Next up omits completed one-time gatherings, retains an ongoing one-time gathering until its explicit end, and orders recurring gatherings by their next scheduled occurrence. The displayed day/date is the projected occurrence rather than the original start. The panel refreshes its time reference every minute. It uses the existing calendar/check-in occurrence rules and never writes event records.
- Member sorting and corresponding custom list sort controls reserve 12rem for their icon, complete label and chevron, with viewport limits and wrapping preserved. Existing leading icons are recognized, preventing a second automatic prefix. A neighbouring field is not mistaken for a decorative prefix.
- Field icon inference prioritizes the native input type and actual field label. Placeholder examples are used only when no semantic label exists. Template Name now uses the name icon and Content the message icon; explicit icon overrides remain supported.
- Shared record captions and collection pagination use singular wording for one result, including irregular/compound collection labels such as person, family, branch and cell group. An explicit singular override is available for unusual nouns.
- Member and attendance count charts use integer axes across the dashboard, corresponding analytics and report views. The chart option defaults to the existing continuous axis for monetary/other values.

## Validation

- All **750 tests across 65 files** passed with two workers. The first concurrent run hit the existing source-inventory test's five-second timeout; the complete suite was rerun without skipping tests or changing the timeout.
- Eight recurrence tests also passed with `TZ=Africa/Lagos`. Coverage includes finished/ongoing one-time events, weekly dates already passed, future starts, recurrence end windows, multi-day schedules, malformed dates, ordering and source immutability.
- TypeScript and scoped ESLint passed. UI inventory checks passed with no reported issues; the dashboard link was additionally followed in the browser rather than relying on the static inventory's dynamic-route matching.
- Actual-component preview checks confirmed integer chart labels, appropriate template icons, singular pagination, strong selected-chip colours and an unclipped longest member sort label inside the shared toolbar's real CSS scope.

The final production build passed, including TypeScript validation and all 114 static pages. Business records, payments, messages and credentials were not modified by this verification.


## Live browser results

All **44 page/control combinations** passed against the rebuilt local app:

- **32 fully loaded page combinations**: Home, Members, Templates, Events register, Add asset, Loans, Maintenance and Inbox at 1280×900 and 390×844, each in light and dark mode. Populated tables were awaited explicitly before recording results.
- Four New template dialog checks confirmed a visible user icon for Name, a message icon for Content, no horizontal overflow and viewport-fitting dialog bounds.
- Four longest-label member sort checks confirmed that Member since remains fully visible and uses the existing sort prefix rather than a duplicate background icon.
- Four extra 320×720 phone checks covered the same sort label and template dialog in both themes.

There was no page-level horizontal overflow, clipped selected control text or unreadable active-chip combination in the final matrix. Measured enabled selected-chip contrast was approximately **16:1** in both themes. All four Home cases showed only the future December UI-test gathering, the correct calendar destination and integer membership ticks (0, 1, 2, 3, 4). All four Templates cases showed “1 record on this page” and “of 1 template.” The Calendar action was followed again on the final build and opened `/gatherings/events` successfully.

Evidence:

- [Browser measurements](/tmp/belivrhq-ui-fixes-browser-review.json)
- [Desktop dark mode](/tmp/belivrhq-ui-fixes-desktop-dark.png)
- [Desktop light mode](/tmp/belivrhq-ui-fixes-desktop-light.png)
- [Mobile dark mode](/tmp/belivrhq-ui-fixes-mobile-dark.png)
- [Corrected mobile template icons](/tmp/belivrhq-ui-fixes-template-mobile-dark.png)

Light mode was restored, the temporary viewport override cleared and the app left open on Members. The temporary component-preview tab/server were closed; the normal frontend and API remain running. No commit, hosted deployment or business submission was performed.
