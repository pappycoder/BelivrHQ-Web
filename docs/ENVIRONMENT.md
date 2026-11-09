# Environment configuration

Copy `.env.example` to `.env.local`. The example lists the hosted API origin, shared proxy-secret slot, monitoring credentials and optional verification settings. The web app uses backend authentication through its HttpOnly proxy; it does not need Supabase environment variables. Keep deployment-specific overrides and enabled integration credentials; leave defaults and disabled options out.

| Setting | Behavior when omitted |
| --- | --- |
| `API_URL` | Server-side proxy uses legacy `NEXT_PUBLIC_API_URL` if supplied, then `http://localhost:3001` |
| `NEXT_PUBLIC_SITE_URL` | Uses `VERCEL_PROJECT_PRODUCTION_URL`, then the retained public deployment origin |
| `SENTRY_DSN` | Server and edge monitoring use `NEXT_PUBLIC_SENTRY_DSN` |
| `NEXT_PUBLIC_SENTRY_DEBUG` | No client monitoring opt-in during development |
| `NEXT_PUBLIC_SENTRY_REPLAY` | Replay disabled |
| Search-engine verification tokens | No corresponding verification metadata |

Set the server-only `API_URL` on hosted deployments. The default localhost upstream is for local development. `NEXT_PUBLIC_API_URL` remains a compatibility fallback; configure only `API_URL` for new deployments rather than duplicating the origin.

Keep `NEXT_PUBLIC_SITE_URL` when a specific canonical origin is required. In particular, a deliberate local website origin differs from the production fallback and must not be removed just because the development server also uses port 3000.

Set one public Sentry DSN for browser/server/edge use. Add `SENTRY_DSN` only when the server intentionally uses a different DSN. Build uploads still require `SENTRY_ORG`, `SENTRY_PROJECT` and private `SENTRY_AUTH_TOKEN` when enabled. The identical token formerly in `.env.sentry-build-plugin` is retained in `.env.local`; the duplicate file was removed. Never prefix the auth token with `NEXT_PUBLIC_`.

`NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` were removed because no application or build code implements Web Push using them. In-app notifications are independent. Blank verification tokens, redundant DSN/API-origin entries and disabled flags were also removed.

The optional `INTERNAL_PROXY_SECRET` must match the backend when used. Supabase URL, anon key and service-role credentials remain backend configuration. The unused direct-Supabase web helpers and their environment entries were removed after checking that no application code imported them.

Retained active values were verified unchanged after dotenv parsing. Private originals were saved in the backend `.ops/env-cleanup-*` directory before editing. Hosted deployment settings were not changed by this cleanup.

## Production key slots

The active web file now explicitly includes `API_URL` and `INTERNAL_PROXY_SECRET` slots. Existing canonical-origin and Sentry values are retained. Fill the API origin on production hosting and use the same private proxy secret as the backend when enabled. Blank local API configuration continues to use the existing localhost default. No shared secret was generated or rotated. The example also shows optional verification tokens and default disabled monitoring flags; those flags do not need active-file entries.

If a direct browser Supabase integration is added later, its project URL and anon/publishable key can use `NEXT_PUBLIC_` names. Service-role and secret keys must remain server-only. No backend Supabase values were changed.
