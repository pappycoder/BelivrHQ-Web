# Web security audit — 16 November 2026

Branch: `fix/project-security-audit`. Source changes await review and deployment.

- Error/tracing telemetry strips public-link credentials, query/fragment/userinfo, exception text, frame variables, trace/span data and breadcrumb bodies. Request fields and user identity are allowlisted. Three synthetic privacy regressions pass. Static trace lifecycle keeps transaction hooks active; dynamic-sampling names are also scrubbed in envelope headers. An actual installed-SDK in-memory transport regression verifies serialized output; server/edge/browser configuration regressions verify lifecycle and hook wiring. The opt-in Replay pipeline and provider access logs need separate verification.
- Login responses on the live and test sites lacked browser security headers. Added same-origin framing protection (`frame-ancestors` and X-Frame-Options), same-origin base URI/referrers and nosniff. Same-origin document previews remain allowed. This is not a complete script CSP. Compiled browser verification is recorded below.
- CI tokens explicitly request contents:read. Private environment files remain ignored; existing hidden-secret/empty pull behavior is unchanged. No hosted secrets were rotated or uploaded.
- Replaced four bare attendance/check-in loading states with the existing accessible component, repairing the pre-existing loading audit failure.

Full unit suite: 53 files / 679 tests pass. Route/permission audit reports no issues. Production build and TypeScript pass. Full and production npm dependency scans report zero advisories at audit time. This is not proof of absence of unknown vulnerabilities.

Backend findings, hosted maintenance-function permission repair, dependency caveats, coverage/recovery and release gaps are recorded in the backend companion `docs/PROJECT-SECURITY-AUDIT-2026-11-16.md`. The backend source fixes remain on its production-readiness branch. No worker hosting is activated. Git deployments remain independent of CI gates. Repository branch protections and secret-scanning settings could not be verified with available access.

Two compiled Chromium tests pass: pages/session responses carry all four headers, foreign framing is blocked and same-origin login framing renders successfully. No external provider/backend traffic leaves the browser fixtures.

## CI-gating follow-up

The operator requested CI-controlled deployment for both projects, then narrowed active deployment credentials to the primary BelivrHQ organization. Current release documentation supersedes the earlier Git-enabled rollout notes above: backend `BACKEND-RELEASE.md`, web `CI-RELEASE.md`.

Verified hosted primary Git auto-deployment is disabled, both repositories enforce required checks on main/staging (including administrators), and secret scanning/push protection are enabled. The supplied non-expiring token was verified and transferred to both primary environment secrets in each repository; temporary plaintext was removed. No token value appears in receipts. Legacy deployment is on hold.

Full real-engine Docker export/image/runtime checks now pass, as do PostgreSQL 16 integration and recovery smoke checks. Tooling glob/minimatch advisories were patched; deepmerge's advisory was withdrawn. The sole active audit exception is the exact publisher-patched Node adapter backport, with bounded review and fail-closed tests. Web full tests now total 687 and the compiled security/permission suite passes 18 checks. Backend unchanged coverage thresholds still fail (lines 64.76%); hosted backup/restore, capacity and alert/provider verification remain unresolved. This pass does not certify all loopholes closed or authorize bypassing the failed gate.
