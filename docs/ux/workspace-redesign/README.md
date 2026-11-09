# Workspace redesign

The authenticated BelivrHQ workspace uses a teal area rail, contextual module navigation, a task-led home and one shared presentation system. All 84 dashboard routes inherit it. Canonical URLs, API calls, query keys, permissions, plan checks, ownership rules and branch scoping stay intact. `contracts.json` records the route/navigation inventory and the source audit findings.

## Design

The eight areas are Home, People, Gatherings, Giving, Communication, Resources, Insights and Administration. Destinations are regrouped **after** existing permission and plan filtering. The most specific URL determines the active module, including deep links to families and record details. Area links open their first accessible destination. Desktop retains the area rail when the contextual panel collapses; tablet starts with the panel collapsed; mobile uses one labelled, focus-trapped drawer.

Inter, restrained borders, neutral surfaces and teal connect page headers, tables, details, editors, charts and body-level overlays. Light, dark and system modes remain available; saved custom accents are no longer read or applied. Public/authentication screens retain their own palette. Existing-account billing uses the shared workspace surfaces, while standalone subscription entry stays unchanged.

Directories use breadcrumb-first page headers, visible row actions and flat table surfaces. Member/visitor creation separates section explanations from fields on wide screens. Long member edits use a full-window dialog canvas, preserving the existing route, mutation, Escape behaviour and focus return. Dirty member edits now require confirmation before dismissal. Short contextual forms stay in dialogs. Other specialised calendars, imports, uploads, check-ins, form builders, asset and sermon editors retain their existing behaviour within the shared design system.

## Performance

Charts stay outside the shared shell and Home loads its chart section separately. Motion features load asynchronously through `LazyMotion`; pointer feedback uses short transforms. Reduced-motion mode suppresses transforms/transitions, and the workspace wrapper never remounts editors on navigation. Charts reserve a 216px content region across loading, empty, error and populated states. No queries were added for presentation-only totals, and server pagination remains intact.

Targets are LCP <= 2.5s, interaction latency <= 200ms and CLS <= 0.1 in controlled measurements. These are frontend acceptance targets, not claims about production traffic or backend latency. Validation results and measurement conditions are recorded in `validation.json` once completed.

## Review and release

Representative first-review previews are in `previews/`: desktop Members, dark Home, mobile Home, member creation and dark tablet Giving. Final verification covers shared shell behaviour, member/family management, permissions, plan boundaries, branches, payments, imports/uploads, exports, specialised workflows, public/auth surfaces and responsive light/dark layouts. Tests use isolated responses, not live church writes.

The baseline is the web repository HEAD preceding this change. Keep this frontend release together. No backend deployment or migration is required. Production publication is not part of this local implementation; reverting the frontend changes restores the previous UI. The retired personal accent storage entries remain inert, so rollback can still read them.
