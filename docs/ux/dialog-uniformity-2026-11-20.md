# Add/edit dialog consistency

Standardized 45 dialog surfaces across 44 components using FormDialogContent. The shared FormSection uses an internal heading/divider and padded white card body, matching page forms. Fieldsets retain their disabled state and receive a unique accessible heading association. People/workspace/giving/visitor section adapters share this structure; their formerly transparent fallback sections now use the same card.

Compact dialog action cards use consistent padding, white backgrounds and borders. Mobile dialogs are bounded by the viewport, long dialogs scroll vertically, and action buttons stack at full width. The older footer band is now scoped to actual dialog content, so page-based asset actions do not receive modal negative margins.

Inline creation/editing dialogs are included: templates, broadcasts, text/email composition, giving categories, ticket tiers/manual booking, media uploads/visibility, attendance and member association forms, plus public registration-link creation and account settings forms. Existing fields, submit handlers, permissions, CAPTCHA and pending-state guards remain. Read-only previews, confirmations and pickers retain their established presentation.

## Verification

- All 721 tests across 62 files passed after the final changes. Standalone TypeScript, scoped ESLint, final production build and diff checks passed.
- Browser pass covered 25 flows at desktop and mobile sizes, including Add/Edit Member, registration links, Add/Edit Family, Visitor, Department, Cell Group, Branch, Invite User, Service, Asset Category, Giving, Recurring Giving, Appointment, Pastoral Note, Life Event, Add/Edit Template, Role, Giving Category, Text, Broadcast, Media Upload and Ticket Assignment.
- White section/card backgrounds and dividers, responsive bounds and action areas were inspected. The member dialog's footer was brought into view by keyboard on mobile.
- Mobile Record Giving exposed a 51px overflow: its giver-choice row could not wrap and the dialog grid could expand to a child's minimum width. The choice row now wraps and the shared dialog grid uses a shrinking column. Final browser retest confirmed zero horizontal overflow at 390px, with the dialog bounded to 356px and its three section cards and action area using the correct white surface.
- Dialogs requiring unavailable assets, loan/maintenance records or paid-event tiers were source-reviewed through their shared components; those populated live states were not exercised. No dark-theme or save-persistence certification is implied.
- Final browser evidence contains 50 passing checks across 25 desktop/mobile flows, with zero remaining overflow or viewport-bound failures. Initial loading snapshots and the superseded giving failure remain in the history for traceability.
- Opened and dismissed the member Gender dropdown with Escape, preserving its value. The shared member dialog was rechecked after the final grid fix.
- Verification opens/closes dialogs without creating, editing or deleting records, sending messages/invitations, uploading files, changing credentials, or initiating payments.
- Evidence: `/tmp/belivrhq-dialog-verification-final.json`; screenshot: `/tmp/belivrhq-dialog-uniformity-final.png`. The empty Add Member dialog remains open for review, with temporary viewport sizing cleared. Frontend/API remain running; the API was restarted with queue workers disabled after it stopped during the build.

## Updated components

- `src/components/appointments/appointment-form-dialog.tsx`
- `src/components/assets/asset-form-dialog.tsx`
- `src/components/assets/category-form-dialog.tsx`
- `src/components/assets/loan-form-dialog.tsx`
- `src/components/assets/maintenance-form-dialog.tsx`
- `src/components/assets/return-loan-dialog.tsx`
- `src/components/attendance/service-form-dialog.tsx`
- `src/components/attendance/general-attendance-panel.tsx`
- `src/components/branches/branch-form-dialog.tsx`
- `src/components/communication/template-form-dialog.tsx`
- `src/components/communication/broadcast-branch-dialog.tsx`
- `src/components/departments/cell-group-form-dialog.tsx`
- `src/components/departments/department-form-dialog.tsx`
- `src/components/departments/cell-group-member-dialog.tsx`
- `src/components/departments/cell-group-attendance-dialog.tsx`
- `src/components/departments/department-attendance-panel.tsx`
- `src/components/departments/department-detail-content.tsx`
- `src/components/email/compose-email-dialog.tsx`
- `src/components/events/register-attendee-button.tsx`
- `src/components/families/add-family-member-dialog.tsx`
- `src/components/families/family-form-dialog.tsx`
- `src/components/giving/record-cash-dialog.tsx`
- `src/components/giving/recurring-giving-dialog.tsx`
- `src/components/giving/cell-group-giving-panel.tsx`
- `src/components/members/member-form-dialog.tsx`
- `src/components/pastoral/life-event-form-dialog.tsx`
- `src/components/pastoral/note-form-dialog.tsx`
- `src/components/pastoral/member-scoring-dialog.tsx`
- `src/components/roles/create-role-dialog.tsx`
- `src/components/settings/change-password-dialog.tsx`
- `src/components/settings/general-settings-tab.tsx`
- `src/components/settings/integration-settings-tab.tsx`
- `src/components/users/user-form-dialog.tsx`
- `src/components/visitors/visitor-form-dialog.tsx`
- `src/components/visitors/convert-visitor-dialog.tsx`
- `src/app/(paper)/connect/templates/page.tsx`
- `src/app/(paper)/connect/messages/page.tsx`
- `src/app/(paper)/connect/broadcasts/page.tsx`
- `src/app/(paper)/gatherings/events/tickets/page.tsx`
- `src/app/(paper)/gatherings/events/tiers/page.tsx`
- `src/app/(paper)/giving/funds/page.tsx`
- `src/app/(paper)/library/media/page.tsx`
- `src/app/(paper)/people/segments/page.tsx`
- `src/components/intake/intake-register.tsx`
