# CI-controlled web releases

Only the main BelivrHQ project is enabled. The primary Vercel project reports automatic Git deployment disabled; `vercel.json` also disables it in source. The operator selected one non-expiring deployment token shared by the two primary projects. Legacy deployment remains on hold; the primary workflow does not require or use legacy credentials.

Lint, full unit tests, UI/permission contracts, TypeScript, production build, Chromium security/read-only/offline checks and the full dependency audit must pass. `Required web checks` rejects failed, skipped or cancelled validation. Main/staging protection enforces this check for administrators as well; secret scanning and push protection are enabled. GitHub action revisions are pinned to immutable official tag commits and Dependabot updates npm/actions weekly.

Only checked main/staging pushes prepare candidates. Preflight verifies the branch head, reviewed project/team, token access and disabled hosted Git auto-deployments. Candidates are uploaded without canonical domains. A separate promotion job waits for all enabled preparations, verifies the current run's nonsecret manifest, rechecks identity/readiness/branch head, then promotes Production or aliases only `staging.belivrhq.com`. Active releases are serialized and are not automatically cancelled by later pushes. Deployment credentials are step-scoped and are absent during dependency installation.

`/api/health/ready` checks the configured backend's existing `/api/v1/health` endpoint with a five-second bound, no caching and no redirects. It exposes only success/status and public site/backend origins; errors return a sanitized 503. The release gate verifies both origins match the reviewed target. This preserves compatibility with the current API health endpoint.

Production secrets are restricted to main and staging secrets to staging. Feature branches and PRs cannot access these deployment environments.

Production and staging GitHub environments need VERCEL_PROJECT_ID/VERCEL_ORG_ID variables and VERCEL_TOKEN secrets. The token's access to both primary projects and lack of expiration were verified. Vercel identifies it as account-scoped; workflow target pins limit automatic releases to the reviewed projects. Temporary plaintext was removed after transfer. Secrets never receive NEXT_PUBLIC_ names.

Validation: 687 unit tests, 18 compiled Chromium checks, production build/types, lint, 23 release/workflow regressions and three audit-policy regressions pass. Fixed separately surfaced UI issues: asset/giving links obey destination permissions; ticket-tier create/update/delete controls use their distinct backend grants; submission-only readers can use the existing authorized form lookup without unrelated directory access. Browser tests use current routes and prevent external network traffic.

No application deployment or main/staging merge was performed. The backend now passes its unchanged coverage gate; hosted recovery/operational assurance remains incomplete. See the backend companion `docs/BACKEND-RELEASE.md` and `docs/PROJECT-SECURITY-AUDIT-2026-11-16.md` for rollout boundaries. Workers remain on hold.


## Preview CLI compatibility — 2026-11-17

Vercel CLI 65.9.0 accepts `--skip-domain` only for Production. Preparation retains that flag for Production and uses the exact checked SHA in a detached checkout for Preview. The pinned CLI reports that snapshot's Git branch as `HEAD`, so it cannot claim the canonical domain bound to `staging`.

Before any migration or upload, Preview preflight verifies the detached checkout, the canonical staging domain's branch binding, absence of a domain bound to `HEAD`, and standard Preview variables without branch overrides. Both primary projects were checked read-only and satisfy this configuration. The checks run again immediately before upload. Explicit aliases or branch-metadata overrides in `vercel.json` are refused. Standard Preview variables supply the candidate; branch-specific overrides require a separate reviewed release design.

Candidate identity, target, checked SHA, readiness and the separate domain-promotion phase remain required. Error output identifies the command phase and exit status without printing CLI output, tokens or environment values. Actual pinned-CLI dry runs from a disposable detached checkout reproduced the old flag failure and accepted the corrected Preview arguments without creating a deployment.
