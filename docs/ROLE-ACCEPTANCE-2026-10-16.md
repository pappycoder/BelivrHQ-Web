# Deployed role acceptance — 16 October 2026

**Latest follow-up:** [Go-live verification](GO-LIVE-VERIFICATION-2026-10-16.md) now confirms 51/51 matching migrations, the invalid trigger physically absent and the production login helper removed. Seeded privileged authentication still works, and health/worker readiness remains unverified; these remain go-live requirements.


## Outcome and release status

Tested the user-supplied deployment, https://church-os-web.vercel.app/, using **16 existing demo accounts representing all ten built-in roles**. Each account was checked against its actual stored effective permissions and `is_admin_hq` value. All **1248 dashboard route/account combinations** were evaluated: **1244 passed**, **4 record-dependent cases remain unverified**, and **0 unexpected route/action failures** were observed. Passing includes correctly denied pages, not just allowed pages. The shared sidebar supplied **912 grant/link checks**, with no mismatches.

This is not a production all-clear. The checks found defects with tested local fixes:

1. Form lifecycle/submission operations did not consistently enforce the parent form's branch. Central lookups now enforce it. Branch clones retain branch ownership; HQ form creation validates branch/church membership.
2. A legacy database trigger references the nonexistent `form_submissions.updated_at` column, breaking authorized approval. Backend migration `20261016090000_fix_form_submission_update_trigger` removes it. A read-only inspection confirmed that trigger is still enabled in the configured cloud database; the database environment behind a specific deployment is not inferred from this metadata alone.
3. Families statistics requested limit 200 against an API maximum of 100, producing deployed HTTP 400 responses. The local query now uses 100.
4. The Families list hook included the selected branch in its cache key but omitted it from its API request. The local hook forwards `branchId`, with a request-level regression covering branch, pagination, search, archive filters and abort signal.
5. Service details fetched giving transactions without checking the separate transaction-read grant, producing HTTP 403 for secretary viewers. The fetch-all hook now requires `giving:records:read`; the service giving total/breakdown panels use the same grant while service and attendance remain readable. Query and browser regressions cover the independent grants. Giving reports use this transaction-backed hook and also require access to the underlying records; report-only custom-grant combinations are not certified by this default-role acceptance.

**No live business mutations, deployments, permission reseeds or schema migrations were performed.** Login/logout used real sessions; all browser business writes were blocked both before service-worker interception and at the network boundary. Apply the migration and release backend/web fixes before accepting these issues as fixed on the deployment.

The user confirmed that the deployment contains real church data and that seeded accounts are temporarily retained for testing. The live public helper exposes working privileged demo credentials, making account retirement a release blocker. The local login helper now renders only under `NODE_ENV=development`; production builds omit it. Inspection of 220 production client JS/source-map artifacts found neither the shared demo password nor the super-admin demo email. This still requires deployment. Existing seeded authentication accounts must be disabled/removed and their credentials retired as part of the user’s planned cleanup, alongside test-record cleanup. No authentication accounts were disabled or deleted during this audit.

## Actual account matrix

| Account label | Stored roles | Actual scope | Grants | Routes passed | Unverified |
|---|---|---|---:|---:|---:|
| Lekki · Secretary | secretary | branch | 132 | 77 | 1 |
| Lekki · Treasurer | treasurer | branch | 75 | 77 | 1 |
| Lekki · Usher | usher | branch | 102 | 77 | 1 |
| Lekki · Department Head | department_head | branch | 32 | 78 | 0 |
| Lekki · Cell Leader | cell_leader, member | branch | 34 | 78 | 0 |
| Lekki · Member | member | branch | 22 | 78 | 0 |
| HQ · Super Admin | super_admin | HQ | 383 | 78 | 0 |
| HQ · Senior Pastor | senior_pastor | HQ | 346 | 78 | 0 |
| HQ · Church Admin | church_admin | HQ | 383 | 78 | 0 |
| HQ · Treasurer | treasurer | HQ | 75 | 78 | 0 |
| HQ · Usher | usher | HQ | 102 | 78 | 0 |
| HQ · Secretary | secretary | HQ | 132 | 78 | 0 |
| HQ · Department Head | department_head | HQ | 32 | 78 | 0 |
| HQ · Member | member | branch | 22 | 78 | 0 |
| HQ · Cell Leader | cell_leader, member | HQ | 34 | 78 | 0 |
| Lekki · Branch Pastor | branch_pastor | branch | 346 | 77 | 1 |

Labels do not define authorization: the account labelled “HQ · Member” is actually branch-scoped. Cell-leader accounts also hold the member role, so their effective grants are a union. No profile roles or HQ flags were changed to manufacture coverage. All ten roles with **both** HQ values were exercised separately in the isolated PostgreSQL suite.

## What the live browser checks establish

The reusable `scripts/audit-live-role-access.mjs` performs real authentication, reads the current profile, checks every dashboard route against the permission contract, verifies sidebar destinations, clicks available sidebar links and opens representative permitted create dialogs/pages without submitting. It verifies absence of those primary actions for readers lacking create grants. Record-detail tests use IDs obtained through authorized read requests. Returned branch fields are checked against the actor's branch where available. Final accepted runs recorded no unexpected branch-scope failures or page exceptions.

There were **84 primary-action visibility checks** and **54 successful permitted form/page openings**. This is distinct from the source audit's 715 controls: every button was not individually clicked against deployed business data. Form submission, sending messages, payment operations, uploads, deletes and other business writes were deliberately not executed live.

Missing readable records are not permission failures and are not passing workflow tests. They require controlled fixtures in a staging environment:

- **Lekki · Secretary**: `/attendance/services/[serviceId]`.
- **Lekki · Treasurer**: `/attendance/services/[serviceId]`.
- **Lekki · Usher**: `/attendance/services/[serviceId]`.
- **Lekki · Branch Pastor**: `/attendance/services/[serviceId]`.

The harness was corrected during the run to support service workers, cancel opened draft dialogs before the next navigation, use valid fixture-query DTOs, capture fetch responses handled by service workers, and avoid overlapping sessions for the same demo identity (logout invalidates its other sessions). The reusable runner now serializes each identity across audit processes with a temporary lock. Earlier instrumentation errors were excluded; final reports use corrected follow-ups for affected cases. API failures observed on Families and the secretary service-giving request remain reported as real deployed defects even though the pages themselves render.

## Local mutation and regression evidence

The backend has **33 passing PostgreSQL HTTP workflow tests** using production controllers, DTO validation, permission guards, services and request context for members, visitors, forms, assets, families and attendance services. All ten roles run with both HQ values, verifying persisted authorized changes, rejected writes, own/foreign branch boundaries and foreign-church boundaries. Additional cases cover read-only HQ, form lifecycle/clone/submission boundaries and actual persisted submission approval. Test-only identity middleware replaces JWT verification in that isolated server; actual login verification is provided by the deployed browser checks.

The database was a new disposable local PostgreSQL instance, migrated from the repository and removed after the tests. No deployed records or notification recipients were used. Backend detail: `../BelivrHQ-Backend/docs/ROLE-ACCEPTANCE-2026-10-16.md`.

- Backend: **1,325 unit tests / 69 suites passed**, 33 database workflow tests passed, production build and changed-file lint passed.
- Frontend: **312 tests / ten suites passed**, production build and changed-file lint passed; eleven read-only/security browser regressions passed against the production build with mocked API responses.
- Source UI audit: **85 pages, 78 dashboard routes, 445 link references, 70 nav leaves and 715 controls**, with zero static issues. See [UI-ACCESS-AUDIT-2026-10-16.md](UI-ACCESS-AUDIT-2026-10-16.md).

## Performance and limits

The Families fixes avoid an invalid request and its retries and make branch selection reach the server. Existing permission-index reuse, compiled route matching, deferred pickers, authorization cache isolation and read-only reference queries remain covered by the earlier [frontend audit](FRONTEND-AUDIT-2026-10-15.md). The Families statistics still summarize a bounded sample for its two derived cards; this change does not introduce server-wide aggregate statistics.

This acceptance exercise is not a load test, penetration test or proof of peak performance. Browser timings include instrumentation waits, concurrent audit tabs and remote networking and must not be treated as user latency benchmarks. Ownership, church/branch scoping and intentional respondent/self-service workflows remain necessary alongside action permissions; HQ broadens scope without granting missing actions.

## Reproduce safely

```sh
BELIVRHQ_AUDIT_DEMO_LOGINS=true \
BELIVRHQ_AUDIT_URL=https://church-os-web.vercel.app \
npm run audit:live-roles
```

The runner only uses existing `@belivrhq.dev` demo accounts. It reads the existing development helper configuration; an optional `BELIVRHQ_AUDIT_PASSWORD` can supply the password in memory. Do not put secrets in a committed command or report. Cookies are in memory, contexts are logged out/closed, and no storage state, screenshots, response bodies or tokens are saved. Reports contain sanitized account labels, roles, scope, permission counts, route templates and statuses; the default output is `/tmp/belivrhq-live-role-access.json` with mode 0600.

Use `BELIVRHQ_AUDIT_ACCOUNTS` for a comma-separated demo-account subset, `BELIVRHQ_AUDIT_DETAILS_ONLY=true` for record/detail follow-ups, `BELIVRHQ_AUDIT_ROUTES` for exact route templates, and `BELIVRHQ_AUDIT_OUTPUT` for a separate report path. These live checks are explicitly opt-in and are not part of ordinary CI tests.
