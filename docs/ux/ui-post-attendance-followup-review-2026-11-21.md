# Follow-up UI review — 21 Nov 2026

This read-only pass included the source UI-contract inventory (104 page sources, 465 links, 867 controls, 61 navigation entries; no contract issues) and 24 browser measurements. Browser coverage included team table/cards, event registrations, populated asset register, inbox empty state/compose dialog and asset creation/preview. Viewports were 1280px and 390px with targeted 320px registration checks, in light and dark modes. This is targeted verification, not exhaustive coverage of all routes, roles, datasets or interactions. No application source or business records changed.

## Confirmed issue

Event detail registration rows squeeze names excessively at 320px in both themes. Chioma Eze and Ladi Samuel each have only 20px, against natural text widths of 77px and 79px. Jane Garcia has 59px against 77px. The rows remain one flex line containing avatar, name, quantity, payment and arrival badges. At 390px these existing free-event records fit; desktop also fits. The registration rows should reflow metadata below the name on narrow screens, as the attendance rows now do. Source: src/app/(paper)/gatherings/events/[eventId]/page.tsx:233.

## Source-only candidate

Team last-sign-in cells/cards still use a custom day/short-month formatter without a year and use different empty captions (never / never signed in), rather than the shared record metadata convention. Current accounts both have null lastSignInAt; the dated populated state was not reproduced, so this is a source-only follow-up, not a claimed live date failure. Source: src/app/(paper)/admin/team/page.tsx:239 and :272.

## Other observations

No page horizontal overflow was found in measured team, asset, inbox or create-form cases. Compose fits both viewports and themes, retains a 238px message field, and has no duplicated required markers. Asset create labels also have no duplicated required markers. Asset preview DOM values good/active are visually capitalized by CSS and are not a confirmed lowercase-caption issue. No new dark-mode-specific defect was confirmed in these views.

Light mode and the normal viewport were restored; the application remains open. No message was sent, no form saved, and no account or attendance record changed.

Evidence: [24 browser measurements](/tmp/belivrhq-ui-followup-review-checks.json), [320px event registration screenshot, dark](/tmp/belivrhq-ui-review-registration-320-dark.png).
