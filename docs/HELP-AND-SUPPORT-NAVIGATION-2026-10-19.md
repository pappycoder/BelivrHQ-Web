# Help, support and session navigation

## Floating administrator support

Every active signed-in workspace user automatically loads the owner-supplied tawk.to embed when entering workspace screens, Plan & Billing or help articles. Tawk.to displays its own floating chat bubble, using the widget appearance and placement configured in the Tawk dashboard. The custom BelivrHQ floating **Chat with support** button has been removed. Automatic initialization shows the native bubble without maximizing the conversation; users click the native bubble to open it. Existing account-menu, contextual-help, article and billing **Contact support** actions open this same widget.

The app verifies the session and active profile before loading the SDK. All staff roles are eligible; inactive profiles and anonymous visitors do not load it. No BelivrHQ token, profile, church details or verified identity is sent to Tawk. A failed automatic load offers a retry and a direct-chat fallback. Navigation across workspace/help screens preserves the widget; sign-out, session expiry, identity/church changes and leaving the workspace close/disconnect it. Delayed loads cannot reopen the widget after teardown. The old `/support` URL redirects to `/help/contact-support` for bookmarks.

Current chat-only support/branding: [administrator in-app chat and branding](TAWK-BRANDING-AND-TICKETS-2026-10-19.md), including the prepared Tawk brand kit and remote settings that still need applying.

## Help navigation and layout

`/help` and all articles use the standalone Help Centre layout for everyone. Dashboard sidebar, account and contextual-help links navigate directly to `/help`; guides are not embedded in the dashboard. Verified signed-in readers see **Back to dashboard**, while public readers see **Back to home**. The footer follows the same session-aware destination. Search, topic navigation and small-screen expandable topics remain available. Content and metadata stay server-rendered and readable without JavaScript.

Legacy `/docs` bookmarks redirect to `/help` without mounting a dashboard help screen. Search parameters are preserved and recognized old section anchors go to the corresponding published article. The redundant dashboard help hub and dashboard frame's public-content bypass have been removed.

## Widget startup correction

Loading begins automatically for verified administrators, using the SDK's normal `autoStart: true` connection. Initialization shows the native widget without maximizing it. Opening anonymous chat no longer calls `logout`, which is intended for a logged-in tawk.to identity and can interfere with a new connection. Initialization and menu-triggered opens wait for `onLoad` before showing/maximizing. If the loaded SDK was shut down, reopening calls `start` and waits for its render/status callback; offline status is valid because administrators can use the leave-a-message form. Teardown still invalidates pending opens, hides/ends chat and shuts down the connection. See the [tawk.to JavaScript API](https://developer.tawk.to/jsapi/).

Regression fixtures model asynchronous startup and ignore premature maximize calls. They assert a visible chat panel on the original URL, reconnection after leaving/returning, and no opening after session teardown. This replaces the old synchronous mock, which could pass even if startup had not completed.

## Authentication entry pages

`/login` and `/register` wait for backend session restoration. An already verified signed-in visitor is redirected with `replace` to `/dashboard`. A cookie alone never establishes authentication. Expired sessions keep sign-in accessible. Visitors who entered as guests stay in the existing login/registration flow: successful login retains permission-checked `returnTo`, subscription activation and MFA/recovery handling. Forgot/reset-password and subscription routes are not subject to the guest-only guard.

## Verification and rollout

Validation passed: production build, TypeScript, lint, 319 unit tests and 47 focused browser checks. Browser coverage uses mocked session/profile responses and intercepts the widget script; it does not contact real support agents or process payments. Checks cover admin/staff visibility, automatic native-bubble display without an app launcher or auto-expansion, failures, delayed loads after logout, navigation persistence, help return links, desktop/mobile widths, public no-JavaScript articles and authenticated/expired entry redirects. Deploy the web application to release; no migration or backend/provider change is required. A real provider chat remains a post-deployment acceptance check.

A read-only check of the supplied public widget URL returned HTTP 200. Direct live-widget rendering from the local browser could not be verified: its embed request failed with `net::ERR_FAILED`, including through the environment proxy. No support message was sent. Provider rendering on the deployed origin remains to be checked.
