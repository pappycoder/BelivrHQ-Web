# App installation offer — 25 November 2026

The shared workspace now shows a compact floating bottom app-install banner with a short caption, one Install App action and a close icon. The account menu keeps an Install BelivrHQ entry when the app is not running in standalone mode, including after a native offer is declined.

A reserved bottom strip keeps page text out from behind the card. The bottom dock measures the mobile navigation and fixed form/permission action bars (including support error cards), floats above them, reserves matching space in the page and scroll padding (including the help shortcut) and lifts the support shortcut above the dock. The offer hides while text inputs are focused and in very short windows; the account-menu entry remains available. Existing page scrolling and form save handlers stay unchanged.

A root provider captures beforeinstallprompt across navigation and session restoration. Native prompts run only from the user action and each browser event is consumed once. Cancellation snoozes the banner for seven days; errors open installation help; appinstalled and standalone display mode hide installation offers. Restricted preference storage does not block the UI. Acceptance ends the current offer but is not reported as completed installation before appinstalled fires.

When a native prompt is unavailable, a compact dialog opens on the detected device's instructions, with iPhone/iPad, Android and desktop tabs. It explains Safari Add to Home Screen/Open as Web App, Chrome/Edge installation and Safari on Mac Add to Dock. It clearly requires an internet connection and does not enable the held offline workspace. Dialog focus starts at the title and returns to the opener.

The installed app starts at /home through the existing login/session gate, rather than the marketing landing page. Manifest identity, scope and icons stay unchanged, as do service-worker caching, sessions, permissions and paid-plan gates.

Visual verification used the real shared components and root providers in a temporary local fixture with data queries disabled; the fixture was restored afterward. Checked the final floating banner at 320/390px and 1280px desktop, light/dark rendering, overflow, the compact instructions, saved dismissal and the account shortcut/focus restoration. Evidence is in evidence/app-install-2026-11-25/.

Twelve browser regressions cover short-window fallback, floating dock clearance/reserved space at phone and desktop widths, session-gated launch routing, click-only native prompting, accepted/cancelled/error outcomes, single-use prompt events, persisted dismissal/reopening, both installed-mode detections, iPhone instructions and blocked preference storage. Native browser install events are simulated in tests; no app was installed on the user's device during development.

References: https://web.dev/articles/customize-install, https://support.apple.com/guide/iphone/bookmark-a-website-iph42ab2f3a7/ios, https://support.apple.com/en-ie/104996.
