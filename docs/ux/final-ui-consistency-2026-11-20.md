# Remaining UI consistency fixes

The follow-up audit identified inline editor actions placed inside field cards, mobile grids that stayed at three columns, inconsistent preview-action dimensions, and field labels without explicit control associations.

## Changes

- Added FormActions for the shared preview action stack across Member/Event/Asset/Sermon/Form create and edit editors. Buttons use the same height, radius and spacing; existing cancel guards and save-stage handlers are retained.
- Moved eleven inline editor action areas to DialogFooter, preserving native form ownership, conditional rendering and pending-state fieldsets. Added Cancel where these editors previously offered only a submit action. Existing close callbacks remain in use.
- Template, broadcast and segment grids stack on mobile.
- Connected raw labels and controls with React useId-based instance IDs. Multi-control sections use labelled groups; existing implicit labels remain intact. Member and recipient pickers now forward caller-provided accessibility attributes to their actual trigger buttons.
- Default identity artwork has a dark-mode background variant.

## Validation

- TypeScript and scoped ESLint passed; diff checks passed.
- All 721 tests across 62 files passed with two workers. The initial source-scanning loading test timed out under concurrent checks and passed on rerun; the complete suite subsequently passed.
- Production build passed, including all 114 static pages.
- Browser verification passed 88 combinations across 22 representative views: desktop (1280×900) and mobile (390×844), each in light and dark mode. Coverage includes ten dialog flows, eight create/edit pages and four empty/data-dependent views.
- All completed browser checks had visible page/dialog headings, no horizontal overflow, no out-of-viewport dialogs, no duplicate field IDs and no submit controls without form ownership. Preview/footer action dimensions were consistent. Label targeting and picker accessible names were checked directly.
- Screenshots: `/tmp/belivrhq-ui-light-desktop.png`, `/tmp/belivrhq-ui-dark-desktop.png`. Matrix evidence: `/tmp/belivrhq-final-ui-review.json`. Loading-shell snapshots were replaced with checks after page content became visible.
- Light mode was restored, the temporary viewport override was reset and the browser preview was left open. Frontend and API services remain running.

Live populated asset/loan/maintenance and paid-ticket-tier states were unavailable in the current account; their empty states were reviewed without creating business records. Existing automated form tests cover populated asset defaults and pending-state guards. Browser checks verify presentation and control structure; they do not submit messages, uploads or business mutations.

Business records, invitations, messages, uploaded media, credentials and payments are not changed during browser verification. Controls are opened, inspected and dismissed; temporary form input is restored before leaving.
