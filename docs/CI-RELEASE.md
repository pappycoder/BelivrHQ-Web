# CI-controlled web releases

Only the main BelivrHQ project is enabled. The primary Vercel project reports automatic Git deployment disabled; `vercel.json` also disables it in source. The operator selected one non-expiring deployment token shared by the two primary projects. Legacy deployment remains on hold; the primary workflow does not require or use legacy credentials.

Lint, full unit tests, UI/permission contracts, TypeScript, production build, Chromium security/read-only/offline checks and the full dependency audit must pass. `Required web checks` rejects failed, skipped or cancelled validation. Main/staging protection enforces this check for administrators as well; secret scanning and push protection are enabled. GitHub action revisions are pinned to immutable official tag commits and Dependabot updates npm/actions weekly.

Only checked main/staging pushes prepare candidates. Preflight verifies the branch head, reviewed project/team, token access and disabled hosted Git auto-deployments. Candidates are uploaded without canonical domains. A separate promotion job waits for all enabled preparations, verifies the current run's nonsecret manifest, rechecks identity/readiness/branch head, then promotes Production or aliases only `staging.belivrhq.com`. Active releases are serialized and are not automatically cancelled by later pushes. Deployment credentials are step-scoped and are absent during dependency installation.

`/api/health/ready` checks the configured backend's existing `/api/v1/health` endpoint with a five-second bound, no caching and no redirects. It exposes only success/status and public site/backend origins; errors return a sanitized 503. The release gate verifies both origins match the reviewed target. This preserves compatibility with the current API health endpoint.

Production secrets are restricted to main and staging secrets to staging. Feature branches and PRs cannot access these deployment environments.

Production and staging GitHub environments need VERCEL_PROJECT_ID/VERCEL_ORG_ID variables and VERCEL_TOKEN secrets. The token's access to both primary projects and lack of expiration were verified. Vercel identifies it as account-scoped; workflow target pins limit automatic releases to the reviewed projects. Temporary plaintext was removed after transfer. Secrets never receive NEXT_PUBLIC_ names.

Validation: 687 unit tests, 18 compiled Chromium checks, production build/types, lint, 23 release/workflow regressions and three audit-policy regressions pass. Fixed separately surfaced UI issues: asset/giving links obey destination permissions; ticket-tier create/update/delete controls use their distinct backend grants; submission-only readers can use the existing authorized form lookup without unrelated directory access. Browser tests use current routes and prevent external network traffic.

No application deployment or main/staging merge was performed. The backend still fails its unchanged coverage gate and its hosted recovery/operational verification remains incomplete. See the backend companion `docs/BACKEND-RELEASE.md` and `docs/PROJECT-SECURITY-AUDIT-2026-11-16.md` for rollout boundaries. Workers remain on hold.
