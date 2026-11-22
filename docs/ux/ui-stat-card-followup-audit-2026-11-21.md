# Further UI review — 21 Nov 2026

Read-only browser checks covered care calendar, security settings, populated issued tickets (three records) and notifications (87 total), at 1280px and 320px in light/dark mode: 16 baseline checks, plus six stat-header measurements at 1280/390/320px in both themes. Care has no upcoming life events, so populated care rows remain outside this pass. Security setup/password actions and notification read/delete actions were not used.

## One confirmed issue

Shared StatCard headers do not handle narrow widths well. On the care calendar at 320px, Acknowledged is 119.2px wide inside an approximately 87px content area; its right edge extends about 9.8px beyond the card and is clipped by overflow-hidden. Upcoming/Birthdays header icons shrink from 34px on desktop to 17px on 320px phones and intrude into card padding. At 390px the Acknowledged label fits, but the Birthdays icon still shrinks to about 22.3px. Both themes reproduce the same geometry. Source: src/components/paper/stat.tsx, StatCard header (label has no shrink/wrapping strategy, icon wrapper is shrinkable). Fix the shared header layout so labels can wrap and icons retain consistent dimensions/reflow. Do not claim an icon was clipped beyond the card: the measured icons remain inside the outer card, while the Acknowledged text is genuinely clipped.

## Other results

No page-level horizontal overflow or duplicated label asterisks in the 16 baseline cases. No additional visual layout/status/date inconsistency was confirmed in the checked security, populated issued-ticket or notification lists. No separate dark-palette defect was confirmed. These targeted checks are not proof of every route, role or data state.

No application code, security settings or business records changed. Light mode/default viewport restored; browser remains open on care calendar. No new build or test suite needed for this read-only pass.

Evidence: [16 view checks and six stat-header measurements](/tmp/belivrhq-stat-header-audit.json).
