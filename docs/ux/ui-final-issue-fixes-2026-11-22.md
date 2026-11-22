# Three UI issue groups — fixes and verification, 22 November 2026

## Changes

Resolved the three groups identified in the [route/role/edge-state review](ui-final-route-role-edge-audit-2026-11-22.md).

- **Four populated registers:** Departments, Sermons, Recurring giving and Billing payment history retain readable minimum widths inside the existing focusable horizontal table scroller. Toolbars and pagination retain their shared layout. Billing’s enclosing grid also permits its content to shrink to the viewport. Recurring-giving names and badges wrap within their column, sermon series truncate within their badge, media icons retain their size, and the payment amount column reserves enough room for the large test amount.
- **Thirteen detail/edit/fill templates:** a shared record failure screen provides a contextual heading, back navigation and the existing session-aware full-page retry. Only explicit HTTP 404 failures use the existing missing-record guidance. Other request/transport failures show recovery feedback; HTTP 403 explains access denial. Raw server diagnostics are not rendered. Failed reads take precedence over stale record data.
- **Two editors:** Event edit and Role permissions handle request failures and genuine missing records before waiting for local form/selection initialization. Their successful forms still hydrate existing data, and permission checks remain in place.

The affected templates are listed in [the route matrix](evidence/ui-final-issue-fixes-2026-11-22/cases.json). No backend, permission, subscription or stored record was changed.

## Browser verification

**220 distinct settled views** were checked using the authenticated local app and GET/HEAD-only response fixtures. Desktop was 1280 × 900; mobile was 390 × 844, with the four tables also checked at 320 × 844. Each scenario used light and dark mode.

| Scenario | Templates | Views | Result |
| --- | ---: | ---: | --- |
| HTTP 503 primary-record failures | 15 | 60 | Contextual retry screen; no misleading deleted/old-link guidance or persistent skeleton |
| HTTP 404 primary-record failures | 15 | 60 | Existing missing-record guidance and back navigation retained |
| Actual Try again → healthy record | 15 | 60 | Reload recovered the existing detail/form; no error alert or stuck skeleton |
| HTTP 403 representative detail/edit/fill/role failures | 4 | 16 | Access denied feedback rather than missing-record guidance |
| Populated tables at three widths | 4 | 24 | Readable inner columns, bounded document and no collapsed text or badge overflow |

Both previously stuck editors loaded their existing data after retry; the event title and the role permission matrix were checked explicitly. No form or permission change was submitted. All four table scroll regions are focusable and responded to ArrowRight at 320px in dark mode. Tables preserve inner widths of 840px (Departments), 1100px (Sermons), 1040px (Recurring giving) and 800px (Billing).

Departments and Sermons used existing populated records. Recurring giving and Billing used synthetic read responses, including a long giver name, Active and failed-charge badges, and a 9,876,543,210 amount. No charge, schedule or payment was created. The billing parent-grid overflow found during verification was corrected and retested; initial failed captures were replaced by settled post-fix results. A transient stopped fixture preview was restarted and excluded from application findings.

[220-view matrix](evidence/ui-final-issue-fixes-2026-11-22/views.csv) · [Detailed observations](evidence/ui-final-issue-fixes-2026-11-22/observations.json) · [24 table measurements](evidence/ui-final-issue-fixes-2026-11-22/table-measurements.json) · [Retry outcomes](evidence/ui-final-issue-fixes-2026-11-22/retry-results.json) · [Keyboard checks](evidence/ui-final-issue-fixes-2026-11-22/keyboard-checks.json) · [Editor hydration](evidence/ui-final-issue-fixes-2026-11-22/editor-hydration.json).

## Automated validation

- Full Vitest suite: **867 tests passed across 78 files**.
- Focused billing/error regressions after the billing layout adjustment: **13 tests passed**.
- Scoped ESLint clean; the final production build also passed lint, TypeScript and all 114 generated pages.
- `git diff --check` clean.

[Unit tests](evidence/ui-final-issue-fixes-2026-11-22/unit-tests.log) · [Focused regressions](evidence/ui-final-issue-fixes-2026-11-22/billing-error-regression.log) · [Production build](evidence/ui-final-issue-fixes-2026-11-22/production-build.log).

## Screenshots and scope

[Departments, dark mobile](evidence/ui-final-issue-fixes-2026-11-22/departments-dark-mobile.jpg) · [Sermons, dark mobile](evidence/ui-final-issue-fixes-2026-11-22/sermons-dark-mobile.jpg) · [Recurring giving, dark mobile](evidence/ui-final-issue-fixes-2026-11-22/recurring-dark-mobile.jpg) · [Billing amount, dark mobile](evidence/ui-final-issue-fixes-2026-11-22/billing-dark-mobile.jpg) · [Recurring giving, desktop](evidence/ui-final-issue-fixes-2026-11-22/recurring-desktop.jpg).

[Role failure, dark mobile](evidence/ui-final-issue-fixes-2026-11-22/role-failure-dark-mobile.jpg) · [Role missing, dark mobile](evidence/ui-final-issue-fixes-2026-11-22/role-missing-dark-mobile.jpg) · [Event editor failure, desktop](evidence/ui-final-issue-fixes-2026-11-22/event-editor-failure-desktop.jpg) · [Recovered event editor, desktop](evidence/ui-final-issue-fixes-2026-11-22/event-editor-recovered-desktop.jpg).

This verifies the requested issue groups, not every possible role, record shape, physical device or browser engine. The earlier broader review retains its documented role-testing limits. Selected screenshots are archived here; the complete working captures are under `/tmp/belivrhq-final-fixes/screens`.

No real data, messages, permissions or payments were submitted, and no deployment was performed. Temporary fixture services were stopped after verification. The original local tier page remains open in light mode with its viewport override reset; app port 3000 and API port 3001 remain running.
