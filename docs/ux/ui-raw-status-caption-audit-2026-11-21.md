# Remaining status-caption audit — 21 Nov 2026

## Confirmed finding

One systemic presentation inconsistency remains: several pages still render raw status values rather than readable display labels. The shared Tag deliberately preserves the supplied text, so these values appear lowercase.

Live examples:

- Members: active in the register versus Active in the linked-member account panel.
- Forms: Published on the list versus published on the same form detail page.
- Giving: success in the transaction feed.
- Billing: success, failed and pending in payment history, alongside title-case subscription status.

## Source-confirmed affected locations

- people/members/page.tsx: inspector, table and card status tags.
- people/members/[memberId]/member-detail.tsx: header status, Status metadata and giving ledger status.
- library/forms/[formId]/page.tsx: header form status; the form list already uses FORM_STATUS_LABELS.
- search/page.tsx: member metadata, form status and visitor follow-up text (underscores replaced, capitalization still raw).
- giving/overview/page.tsx and giving/donations/page.tsx: transaction status tags.
- settings/billing/page.tsx: payment history and latest-payment tags.
- components/departments/meeting-attendance-table.tsx: attendance status.
- gatherings/events/tickets/page.tsx: used/raw ticket status.
- gatherings/events/tiers/page.tsx: used/open ticket state.

Display labels should be normalized at their domain presentation components/maps. Keep API values, query filters, provider states and mutation payloads unchanged. Avoid globally capitalizing arbitrary Tag contents, since tags also contain names and user-authored text.

## Verification scope

Read-only source scan across workspace pages and shared components, plus 24 live view checks: six routes at 1280px and 390px in light and dark themes (members, form list, populated form detail, giving transactions, billing and issued-ticket empty state for the existing test event).

No page-level horizontal overflow or duplicate required indicators occurred in these views. Inspected card backgrounds switched from the light card token to the dark card token. The UI contract audit reports zero issues across 104 pages; it does not detect raw-status caption discrepancies. No additional dark-mode contrast defect was confirmed; this is not a certification of every state or custom palette.

The selected test event has no issued tickets, so ticket-row captions and group attendance/search branches were source-checked rather than manufactured through business writes.

[Measurements](/tmp/belivrhq-cross-app-status-audit.json). No application code changed. Light mode, the original event selection and default viewport were restored. The browser and local frontend/API remain running.

## Resolution

The status-caption finding has been fixed. See [implementation and verification](./ui-status-caption-fixes-2026-11-21.md).
