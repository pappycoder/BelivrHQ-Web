# Using integrations

Open **Integrations** directly from the administration sidebar (`/admin/integrations`) as a church admin or super admin. The same editor remains available under **Church Settings → Integrations**. The direct page requires `integrations:read`; saving/checking/testing requires `integrations:update`, with no additional church-settings permission needed for the direct page.

1. Add a named provider account using the provider-specific fields.
2. Click **Check credentials** and read the result. Limited inspection requires a controlled channel test; it is not proof of authentication or delivery.
3. In Email, WhatsApp, SMS, Live calls or Payments, choose the checked account and save its sender settings. Compatible services can share an account; email providers require their own credentials.
4. Email supports sender email, sender name and reply-to. SMS and WhatsApp have separate sender numbers/device IDs even when they share a provider account.
5. Send a controlled message/call test and confirm actual receipt. Tests incur normal provider charges. Payment checks do not charge a card; use test-mode checkout to test payment settlement.

**Live calls:** Staff with calling and member-read permissions use **Call member** on member details, then confirm **Call my phone**. Twilio calls the staff profile's saved phone first and connects the member using the church caller number. This is a live phone bridge, not browser calling or an automated spoken message. Calls are limited to ten minutes; hang up to end sooner.

Keys are encrypted on the backend, never returned by the API, cleared from the form after save attempts and never persisted as browser drafts. To rotate a key, add/check a replacement account, switch services, and archive the old account after pending payments settle. Integration settings are permission-gated and do not create additional provider-key requirements for staff reading operational pages.

Saving an account alone does not activate it. For each service, change **Account source** to **Choose provider account**, select the saved account and click **Save … settings**. Every service defaults to **disabled**; platform mode is no longer offered or accepted. Church deliveries and new online payments use only the selected church-owned credentials. Payments keep the original merchant account reference for historical settlement. Platform authentication emails remain independent, using organization environment credentials; internal inbox messages, notifications, manual giving and free event registration remain available.

Deploy the API, persistent worker and frontend together with backend migration `20261018230000_church_owned_integrations_only`. It disables old platform bindings and adds database defaults/constraints, while preserving existing church-owned accounts and historical merchant references. Legacy provider-only credentials must be connected through the current provider-account/channel editor to activate external services.

Strict-default checks on 2026-10-18 passed: frontend/backend production builds, scoped lint, 307 frontend and 1,495 backend unit tests, 55 isolated PostgreSQL/HTTP checks and ten browser workflows. Browser checks verify all five services default to disabled and offer no platform selection. Automated provider calls use fixtures.

If an administrator cannot see the tab or sidebar entry on an existing deployment, apply backend migration `20261018220000_provider_integration_permissions` and deploy the updated API. Earlier provider migrations created tables without their permission catalog entries. The repair adds the canonical integration grants idempotently for global administrator templates; cache namespace `perms:v26` discards the old catalog immediately on the updated API. Refresh the session after deployment. `npm run prisma:seed-perms` remains available for a full reference-catalog refresh. The API and persistent worker also need the configured integration encryption key.

Integrations is also linked from the account menu when `integrations:read` is present, including when the sidebar is collapsed. The permission gate is the same for all navigation entry points and the page itself; no role-based frontend bypass was added. The repair was verified twice against a fresh temporary PostgreSQL database and preserved unrelated/non-administrator grants.

Backend deployment, master keys, callback paths, provider restrictions and verification: [Provider integration guide](../../BelivrHQ-Backend/docs/PROVIDER-INTEGRATIONS.md).

Production-browser tests: `npx playwright test test/browser/messaging-settings.e2e.ts` after a production build. Tests use API/provider fixtures and never place real calls, send messages or charge cards.

Rechecked on 2026-10-18: production build and scoped lint passed; 307 frontend unit tests, 87 backend integration/messaging/permission tests and nine production-browser workflows passed. Browser coverage includes both administrator roles reaching the direct sidebar page, direct reload without church-settings permissions, HQ staff denial without configuration requests, the legacy Settings tab, provider forms, independent/shared channel assignments, read-only controls and live-call confirmation. These checks use fixtures and do not certify deployed provider delivery or settlement.

Verified locally on 2026-10-16: production build, 312 frontend unit tests and 16 Chromium workflows passed (five integration/live-call workflows plus eleven existing read-only regressions). Backend validation passed 1,374 unit tests and 54 PostgreSQL/HTTP checks, with all 53 migrations applied to a disposable database. Provider calls used fixtures; actual delivery, phone conversations and test-mode payment settlement remain deployment acceptance steps.
