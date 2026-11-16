# Web environment sync

Edit the private, Git-ignored `.env.vercel.json` in **BelivrHQ-Web**. It uses the same three-section format as the backend:

```json
{
  "shared": {
    "NODE_ENV": "production",
    "INTERNAL_PROXY_SECRET": "",
    "NEXT_PUBLIC_SENTRY_DSN": "",
    "SENTRY_AUTH_TOKEN": ""
  },
  "preview": {
    "API_URL": "",
    "NEXT_PUBLIC_SITE_URL": ""
  },
  "production": {
    "API_URL": "",
    "NEXT_PUBLIC_SITE_URL": ""
  }
}
```

The full placeholder template is `config/vercel/env.example.json`. The runtime `.env.local` is separate and unchanged. A scoped assignment overrides a shared assignment even when explicitly empty. Do not put `API_URL`, `NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_SITE_URL` in shared.

## Commands

Run from `BelivrHQ-Web`, not the backend:

| Command | Action |
| --- | --- |
| `npm run env:vercel:init` | Create/validate the private single-file config |
| `npm run env:vercel:migrate` | Archive any old three-file deployment settings and consolidate them |
| `npm run env:vercel:keys` | Ensure the shared server-only proxy-secret slot exists; never generate an independent proxy key |
| `npm run env:vercel:split` | Explicitly fill missing assignments from `.env.local`; existing assignments, including empty values, remain unchanged |
| `npm run env:vercel:pull` | Pull both web environments |
| `npm run env:vercel:pull:preview` | Pull Preview only |
| `npm run env:vercel:pull:production` | Pull Production only |
| `npm run env:vercel:plan` | Review both targets without networking or values in output |
| `npm run env:vercel:plan:preview` | Review Preview only |
| `npm run env:vercel:plan:production` | Review Production only |
| `npm run env:vercel:push` | Push both web environments |
| `npm run env:vercel:push:preview` | Push Preview only |
| `npm run env:vercel:push:production` | Push Production only |
| `npm run env:vercel:sync-backend` | Explicitly match proxy secrets and API/site origins from the backend's private JSON |
| `npm run env:git:check` | Check that no private env files/cache/backup paths are tracked |
| `npm run env:git:install` | Install private-env commit/push guards in this clone |
| `npm run env:test` | Run isolated env-sync regression tests |

`sync-backend` accepts an optional path after `--` when the backend checkout is elsewhere. Its default source is `../BelivrHQ-Backend/.env.vercel.json`. It copies only these effective values per target:

| Backend setting | Web setting |
| --- | --- |
| `PUBLIC_API_URL` | `API_URL` |
| `WEB_URL` | `NEXT_PUBLIC_SITE_URL` |
| `INTERNAL_PROXY_SECRET` | `INTERNAL_PROXY_SECRET` |

A common backend proxy secret is stored once in web shared. Differing backend proxy secrets remain target-specific. Backend encryption keys, database/Redis credentials and payment credentials are never copied. No key is generated. The command is explicit and never runs automatically during pull, so hidden Secrets stay empty after pulling until you deliberately prepare replacement values.

## Link the web project

Use an authorized Vercel account and CLI 65.9+:

```sh
vercel login
vercel link
npm run env:vercel:pull
npm run env:vercel:sync-backend
npm run env:vercel:plan
```

Choose **belivrhq-web**, not the backend. Per-directory and repository-link metadata are supported, with exact directory matching. All remote calls use the linked web project and organization explicitly. No push or deployment happens during ordinary builds, initialization, pull or backend matching. Push updates hosted settings but does not deploy. Redeploy after changing environment settings; browser public variables are inlined at build time.

## Public and private values

Config includes `API_URL`, site/API public origins, modern public Sentry DSNs, Sentry organization/project/release names, browser debug/replay flags, supported public widget identifiers and search-verification values. Secret includes `INTERNAL_PROXY_SECRET`, `SENTRY_AUTH_TOKEN` and unknown nonempty server settings. A legacy server Sentry DSN containing a private component remains Secret. Empty values are readable Config because there is no secret content.

`NEXT_PUBLIC_` values are browser-visible regardless of whether Vercel stores them as Secret. The tool rejects nonempty unapproved `NEXT_PUBLIC_` names and private components in public Sentry DSNs. Backend-only credentials, including service-role keys, encryption keys, database/Redis URLs and provider API keys, are rejected before web push. Keep the proxy key server-only and match it with the corresponding API deployment. Its previous-key verification list belongs only on the backend; the web sender needs the current value only.

## Pull and empty-value behavior

Metadata comes from `vercel env list --json`; readable values come from a supported decrypted `vercel env pull` into a fresh private temporary file. Encrypted storage values in metadata are never treated as plaintext. Temporary exports are removed after parsing. Export failures, missing readable fields and encrypted-envelope exports abort before replacement.

Hidden/unreadable Secrets become empty local assignments, never local `.env.local` or JSON fallbacks. Explicit readable empty values remain empty too. Pulling a common hidden proxy key for both targets clears its shared value and obsolete overrides. Local-only settings absent from hosted metadata remain. Branch-specific Preview overrides and Vercel-managed values are not imported into default target sections. Private backups are created before replacement.

An empty local assignment is uploaded as empty when explicitly pushed, so review the plan and fill the intended replacement values first. An empty representation for a hidden Secret does not prove the hosted value itself is empty. Removing an assignment does not delete a hosted variable. Pulling again blanks hidden values again; run `sync-backend` explicitly afterward when preparing matching proxy/origin settings for deployment.

## Private storage and checks

Actual env files, exports and `.ops` backups are Git-ignored and excluded from deployment uploads; private files use mode 0600. Only placeholder examples should be committed. Installed hooks block private env filenames in commits and outgoing Git history, including force-added files committed then deleted. CI also runs the tracked-env check and regression suite. Hooks are per clone; deliberate `--no-verify` bypass and secrets pasted into unrelated source filenames are outside filename-based protection.

The helper is standalone in the web repository, with local dev dependencies for dotenv parsing and TypeScript execution. It does not load backend code at runtime. Backend matching reads only the explicitly selected private JSON file.

References: [Vercel env commands](https://vercel.com/docs/cli/env), [Next.js environment variable behavior](https://nextjs.org/docs/app/guides/environment-variables).

## Validation and current setup

17 isolated env regressions, full application/scoped script TypeScript, scoped ESLint, alias help, Git ignore/guard, private permissions and diff checks passed. A real pull from the linked web project succeeded for Preview and Production; hidden Secrets became empty. The explicit backend matching command was then applied and verified to match both target API/site origins and the new server-only proxy secret. The private web JSON is mode 0600, while runtime `.env.local` is unchanged. No hosted push, deployment or database operation was performed.
