# BelivrHQ support with tawk.to

Navigation follow-up: [floating chat and workspace help](HELP-AND-SUPPORT-NAVIGATION-2026-10-19.md) documents the floating chat and standalone Help Centre with session-aware return navigation.

The administrator account menu and Plan & Billing screen link to `/support`.
Church administrators and super administrators can open the supplied tawk.to
widget. Other staff see a message to contact their administrator; no support SDK
is requested for them. Support is independent of paid feature capabilities.

The SDK loads only after **Chat with support** is clicked. The screen includes a
direct chat link if loading fails or a content blocker prevents the embed.
Leaving the screen, ending the session or changing the church/profile scope hides
the widget, ends chat, calls the provider logout API and shuts down its connection.
An in-flight load cannot display a conversation after that teardown.

This initial integration uses anonymous visitor sessions. It does not send
BelivrHQ access tokens, profile details, church metadata, member records or payment
data to tawk.to. Verified user identity and account-linked conversation history
are not enabled: those require a server-generated signature using the property's
private API key. Do not place that key in public frontend configuration.
Anonymous browser history and retention remain controlled by tawk.to; this is not
a BelivrHQ authenticated support inbox.

## Provider setup and rollout

- Widget property: `6ad5c1c809d49434c8f515a2`, widget: `1k59fptu4`.
- The identifiers are public embed identifiers supplied by the owner.
- Configure support agents, availability, pre-chat/offline forms and notification
  delivery in the tawk.to dashboard. BelivrHQ does not claim 24-hour staffing.
- A knowledge base and a separate ticket portal are not configured by this change.
- No backend migration or package installation is required; deploy the web app.
- Real agent delivery, offline follow-up and provider browser behavior require a
  short acceptance chat after deployment. Automated browser tests mock the SDK
  and do not send messages to the live support team.

API reference: https://developer.tawk.to/jsapi/

## Validation

- Production build, TypeScript and targeted ESLint passed.
- Existing unit suite: 14 files / 311 tests passed.
- Four mocked browser checks passed: lazy admin access and teardown, staff
  exclusion, blocked-script recovery, and sign-out while loading.

The later [Help Centre rollout](HELP-CENTRE-2026-10-19.md) adds a public, application-owned article library at `/help` and labels the support screen Contact support. The tawk.to-hosted knowledge base remains separate and is not required.
