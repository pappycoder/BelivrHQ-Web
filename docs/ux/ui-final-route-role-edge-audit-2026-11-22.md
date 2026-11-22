# Full route, role and edge-state UI review — 22 November 2026

## Result

**Resolution:** All three issue groups were subsequently fixed and verified. See the [fix and verification report](ui-final-issue-fixes-2026-11-22.md). The findings below describe the original pre-fix review.

The broader review confirmed **three remaining issue groups**. The app cannot yet be described as consistent across all tested states. This review changed documentation only; no application code was fixed, committed or deployed.

### 1. Four populated tables collapse on mobile

Departments, Sermons, Recurring giving and Billing payment history compress their columns into the phone viewport instead of retaining readable widths inside the shared table scroller. Headers overlap and important row values disappear or overlap adjacent cells. Confirmed at **390px and 320px in both themes**; desktop rows have sufficient space.

| Register | Measured effect |
| --- | --- |
| `/gatherings/groups` — Departments | At 390px, the department name and leader name each have **0px** visible width; the branch name has about **14px**. |
| `/library/sermons` — Sermons | At 390px, speaker/series fields have about **14px/12px**; the scripture label has about **1px**. |
| `/giving/schedules` — Recurring giving | Giver name has **0px** at both mobile widths. Fund has **21px at 390px / 9px at 320px**. At 320px, the amount cell has **8px** for **62px** of content; the Active badge exceeds its cell. |
| `/settings/billing` — Payment history | At 320px, the Success badge needs about **77px** in a **30px** cell; the amount has **6px** for **86px** of content. At 390px those cells remain insufficient at 45px and 19px. |

All four inner tables shrink to their 344px/274px mobile scroll-region widths, leaving no useful horizontal table scrolling. The document remains bounded, so document-overflow checks alone miss the defects. The corresponding `ListTable` declarations lack a readable minimum width, unlike the member and issued-ticket registers. Fix the four consumers with the established bounded-table treatment or an equally readable responsive row layout, including status and amount containment.

Departments and Sermons used existing populated records. Recurring giving and payment history used synthetic GET-only response data; no schedule or payment was created.

[Measurements](evidence/ui-final-route-role-edge-audit-2026-11-22/table-measurements.json) · [Departments](evidence/ui-final-route-role-edge-audit-2026-11-22/gatherings-groups-1-collapsed-dark-320.jpg) · [Sermons](evidence/ui-final-route-role-edge-audit-2026-11-22/library-sermons-1-collapsed-dark-320.jpg) · [Recurring giving](evidence/ui-final-route-role-edge-audit-2026-11-22/giving-schedules-1-collapsed-dark-320.jpg) · [Billing](evidence/ui-final-route-role-edge-audit-2026-11-22/billing-collapsed-dark-320.jpg).

### 2. Thirteen detail/edit templates misclassify server failures as missing records

A GET-only fixture returned HTTP 503 while authenticated profile/session reads remained healthy. These pages then said that a record could not be found and might have been deleted, removed, archived or reached through an old link. They offered back navigation rather than the shared failure/retry state.

| Affected template(s) | Count |
| --- | ---: |
| `/admin/team/[profileId]` | 1 |
| `/gatherings/attendance/services/[serviceId]` | 1 |
| `/gatherings/events/[eventId]` | 1 |
| `/gatherings/groups/cell/[groupId]` | 1 |
| `/library/forms/[formId]`, `/edit`, `/fill` | 3 |
| `/library/sermons/[sermonId]`, `/edit` | 2 |
| `/operations/assets/[assetId]/edit` | 1 |
| `/people/families/[familyId]` | 1 |
| `/people/members/[memberId]` | 1 |
| `/people/visitors/[visitorId]` | 1 |

All thirteen were reproduced at **1280px and 390px in light/dark**. Genuine 404 responses were separately compared on branch, event, form, visitor and asset detail routes. Missing-record guidance should remain available for genuine missing records; a temporary server failure must not imply deletion or an old link. Failed reads need clear recovery feedback while preserving authorization behavior.

Sources are the corresponding page error branches. Member detail uses `src/app/(paper)/people/members/[memberId]/member-detail.tsx`. The recurring pattern is `isError || !data` entering the same missing-record fallback regardless of response status.

**Not findings:** branch details distinguishes server failures from missing records. Asset details shows an explicit load error with Try again. Department details acknowledges the load failure and has a Retry control; the earlier commentary describing it as back-navigation-only was incorrect, and it is excluded here.

[All 18 dynamic-template failure results](evidence/ui-final-route-role-edge-audit-2026-11-22/detail-failures.csv) · [Form detail after HTTP 503](evidence/ui-final-route-role-edge-audit-2026-11-22/form-detail-failure-light-desktop.jpg).

### 3. Two editors remain on skeletons after failure

| Page | Cause |
| --- | --- |
| `/admin/permissions/[roleName]` — Role editor | `role.isLoading || !selectedIds` returns skeletons before the error branch. A failed read never initializes `selectedIds`. Source around line 125. |
| `/gatherings/events/[eventId]/edit` — Event editor | `!form` returns skeletons before `event.isError`. A failed read leaves `form` uninitialized. Source around line 112. |

Both remain on two placeholders, without a page error or recovery control, in all four desktop/mobile and light/dark combinations. These eight observations remain classified as defects, not discarded as initial loading. Error and genuine-missing handling must precede checks for form/selection initialization.

[Role editor, mobile dark](evidence/ui-final-route-role-edge-audit-2026-11-22/role-editor-failure-dark-mobile.jpg) · [Event editor, desktop light](evidence/ui-final-route-role-edge-audit-2026-11-22/event-editor-failure-light-desktop.jpg).

## Coverage

**736 distinct viewport/theme/state observations** have matching requested/observed widths, themes and settled screenshot dimensions:

| Coverage | Observations |
| --- | ---: |
| All 88 workspace templates, 1280px/390px × light/dark | 352 |
| All 16 public/auth/standalone templates, same combinations | 64 |
| Two additional legal-document values, same combinations | 8 |
| 35 representative allowed/denied cases across nine role fixtures, same combinations | 140 |
| Read-only permissions, subscription-read-only, no-permission and Essentials-plan states: two routes each | 32 |
| Synthetic populated recurring-giving and billing tables, desktop/mobile × light/dark | 8 |
| HTTP 503 reads on all 18 dynamic workspace templates, same combinations | 72 |
| Long asset detail/edit, sermon title and member name, same combinations | 16 |
| Genuine 404 states on five detail routes, same combinations | 20 |
| Focused checks of the four affected tables at 1280px/390px/320px × light/dark | 24 |

The 104-template baseline includes real record-backed event, service, department, cell-group, member, visitor, family, asset, form, sermon, role, branch and team details/edits. Public forms/intake used synthetic metadata, without submission. The normal baseline had no document overflow or duplicate required markers; the additional cell measurements exposed the four table defects.

Long text included 189-character asset names, a 177-character sermon title and a 141-character combined person name. Their documents stayed bounded in both themes. Calendar month-cell truncation was inspected separately: selecting 1 November exposed the full event title in a 344px-wide entry button, so that month-grid truncation is not classified as the collapsed-table defect.

Initial Usher check-in and platform-role captures made while requests were still loading were repeated after data arrived. The final deduplicated observations use those settled states. The persistent editor skeletons remain in the findings. Scanner matches on ordinary permission-help text were visually/source reviewed and excluded.

[Per-template coverage](evidence/ui-final-route-role-edge-audit-2026-11-22/template-coverage.csv) · [736-view matrix](evidence/ui-final-route-role-edge-audit-2026-11-22/views.csv) · [Observation details](evidence/ui-final-route-role-edge-audit-2026-11-22/observations.json).

## Roles, plans and validation limits

The actual signed-in Church Admin/HQ account supplied the baseline. Isolated read-only previews substituted frontend profile/permission responses for Secretary, Treasurer, Usher, Department Head, Cell Leader, Branch Pastor, Senior Pastor, branch-scoped Church Admin and locked platform administrator. The eight church-role fixtures used current expanded seed grants; the platform fixture used the source's complete locked grant set. Normal profile reads otherwise retained the current account's data.

All **140 representative role views** matched expected frontend allowed/denied outcomes and stayed bounded. Read-only/subscription-read-only samples retained viewing and hid sampled write controls. A no-permission profile could open shared Home but was denied Members. Essentials displayed the asset plan gate while retaining Giving overview.

There are also **792 source-derived role/route expectations**: nine role profiles × 88 workspace templates. These are not 792 browser sessions or backend authorization requests. **376 focused permission/navigation/plan tests across nine files passed**, and the current UI source-contract inventory reported no issues.

**These role checks are UI fixtures, not real separate-user sign-ins.** The underlying read requests still used the authorized admin session. They establish rendering/action/route-gate behavior for the supplied frontend permissions, not real multi-account tenant isolation, ownership enforcement, customized effective grants or server authorization under each role. Physical-device/cross-engine behavior and every possible form action/data shape are not certified. No additional color/contrast defect was confirmed in the sampled screenshots; the table and failure-state issues occur in both themes.

[Role cases](evidence/ui-final-route-role-edge-audit-2026-11-22/role-cases.json) · [140 role view results](evidence/ui-final-route-role-edge-audit-2026-11-22/role-checks.json) · [792 source expectations](evidence/ui-final-route-role-edge-audit-2026-11-22/role-route-expectations.json) · [Permission tests](evidence/ui-final-route-role-edge-audit-2026-11-22/permission-tests.log) · [Access denied example](evidence/ui-final-route-role-edge-audit-2026-11-22/role-denied-dark-mobile.jpg) · [Plan-gate example](evidence/ui-final-route-role-edge-audit-2026-11-22/plan-gate-light-mobile.jpg).

## Environment and safety of the review

Temporary previews accepted GET/HEAD only and rejected writes. They provided synthetic profile, populated-table, long-text, missing-record and failed-read responses without changing real roles, permissions, subscriptions or business records. No messages, forms, imports, notifications, registrations, payments, exports or security settings were submitted. No credentials were entered and the user was not logged out.

All temporary preview ports were stopped. The original selected tier page remains open in light mode with its viewport override reset; frontend port 3000 and API port 3001 remain running. Selected screenshots are archived with this report; full working captures remain under `/tmp/belivrhq-final-coverage/screens`. No deployment was performed.
