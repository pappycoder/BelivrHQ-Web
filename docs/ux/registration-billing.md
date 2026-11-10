# Registration checkout

Anonymous registration billing at `/subscription` uses `AuthShell` and `AuthFormWrapper`, matching registration and sign-in. Signed-in users retain the existing workspace billing screen.

`RegistrationCheckout` is a presentation component: three plan choices, billing period and supported payment currency, an exact server quote and one payment action. It also renders pending verification, failed verification recovery, held/revoked access, checkout closure, quote errors and unavailable payment providers. Pending payments retain their original plan, period, currency and amount until explicitly closed. Payment and refund disclosures and support links remain available. Narrow screens stack the selects and payment total; light/dark themes use the existing auth styles.

Payment queries, capability credentials, checkout initialization, trusted provider URLs, quote expiration, verification, cross-tab hints and verified return to sign-in remain in the existing subscription page. Dashboard billing uses that same engine and its existing UI. The auth route shell still waits for session restoration before mounting checkout, preserving callback parameters across layout selection. Registration never establishes a workspace session.

Changes are isolated on `feat/registration-billing-auth-layout`, based on web `main`. No backend, database, environment or hosted deployment changes are required. Browser verification uses simulated providers and registration data; no live payment or account is created. Final verification results are recorded in `AGENTS.md`.
