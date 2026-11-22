# Workspace page tours

The workspace has first-visit tours and a **Take a tour** replay control. Tours use Next, Previous, Finish, Skip tour and Escape. Finishing or dismissing a tour records it as seen for the current church/profile on this device; another profile has its own state.

## Coverage

All 68 live destinations in `PAPER_AREAS` are covered. Existing bespoke tours remain in their pages. The remaining routes are defined in `src/components/tours/navigation-tour-definitions.ts` and mounted through the shared Paper and workspace headers. Record pages with custom headings mount `NavigationPageTour` directly.

The registry also covers record and editor routes, including event details/editing, service details, department details and cell-group details. The visitors import page reuses the multi-stage import tour with visitor-specific wording: First Name is required and Last Name is optional. The notifications settings URL redirects to the toured Notifications page.

## Behavior

- Tours explain the controls already rendered for the current account. They do not grant permissions or reveal hidden tab panels.
- Detail-page tours explain the tabs. Close the tour, switch tabs and replay it to tour the visible workspace. Named check-ins and reported headcounts are described separately.
- Each page gets one replay control even when it contains another workspace header.
- Automatic starts wait for the page heading, pending data requests, visible loading placeholders and open dialogs. A tour does not open over an editor or confirmation dialog.
- Missing or hidden targets are omitted. Matching selects the first rendered element, including when a preceding match belongs to a hidden tab.
- All tour buttons are independent of business form submission. Tours do not create, change or delete church records.
- No information/question icons were added by this coverage pass.

## Maintenance

Keep the route-specific copy aligned with the actual data scope and controls. Use stable `data-tour-*` anchors or an existing accessible label for targets. Prefer headings and short toolbars over whole tall panels so the spotlight and instructions remain useful on phones.

Add new navigation routes to the coverage registry or the bespoke-route set. Exact routes must take precedence over dynamic detail patterns, and bespoke routes must not acquire duplicate detail tours.

## Validation

The route coverage regressions check every live navigation destination, completed-page exclusions, detail/editor matching and stable page identifiers. The full unit suite passes (700 tests), including import-field guidance and the analytics/risk request-contract regressions. Production build, scoped lint, standalone TypeScript and whitespace checks pass.

The visible browser pass covered all 50 destinations available under Community at 390 × 844, then all 18 remaining destinations under the active Network subscription on desktop and mobile. The 33 initially added accessible destinations also passed desktop walkthroughs at 1047 × 900 or 1280 × 900. Every checked page had one replay trigger and no tour-card overflow. Appearance, Billing, family details and visitor import were replayed after their final target/copy corrections.

Before the upgrade, all 18 restricted routes showed their plan/access gate and no tour control. Network activation was verified in Billing, and the previously hidden navigation areas became available. Testing exposed two existing request mismatches: aggregate analytics received trend-only query options, and Risk Radar requested more than the API's 100-row cap. The aggregate hook now sends only its date/branch scope; the radar reads complete API-capped pages and distinguishes load failure from an empty result. Existing permissions and backend validation remain unchanged.

The requested detail pages were exercised across their available tabs: event registrations/attendance/headcounts, service named attendance/headcounts, department overview/members/attendance/headcounts, and cell-group overview/members/attendance/headcounts/meeting giving. Additional existing record checks covered members, visitors, families, team members, roles, branches, sermons and forms, plus event/form/sermon editing. Household and visitor-import tours passed on desktop and mobile; the member-import regression also passed.

These are tour and read-only navigation checks. Asset records were empty, and the available event was free, so populated asset-detail and paid-ticket assignment flows were not exercised. No church records, access grants, provider settings or billing settings were saved by the tests. The subscription payment was completed by the user.
