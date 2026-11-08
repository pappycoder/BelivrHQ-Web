# Manage action confirmations

Direct writes from Manage controls require a confirmation before calling the mutation. The modal names the affected record and action. Cancel, Escape and dismissal do not execute the callback. While saving, the modal blocks duplicate submissions and dismissal. Errors stay in the modal for correction/retry; successful actions retain their existing cache refresh and notification behavior.

The shared `RowActions` accepts `confirmation: { subject, title?, description?, destructive? }`. Its `onSelect` must return the mutation promise (normally `mutateAsync`) so errors and pending state remain observable. Actions that already open a delete/review/edit dialog retain that existing flow. Navigation, viewing and copying links continue directly. Bulk management retains its existing named batch confirmation and per-record failure reporting.

Standalone controls use `useManageConfirmation`. Keep the hook and its rendered `dialog` outside dismissible dropdown content; the intended record and callback are captured when confirmation opens. Status selectors capture the new value before opening the modal, so controlled-input resets cannot change the intended update.

Coverage includes member/visitor/household archive and restore, service counting/archive/restore, departments and cell groups, giving funds and schedules, assets and categories, asset QR generation, forms and answer approval, template publishing/archive/restore, scheduled-send cancellation, provider credential checks, inbox management and manual notification management. Visitor follow-up selectors and board moves confirm their status changes. Existing permanent-delete, deactivation, intake review and bulk confirmation dialogs remain in place. Event-register archive/restore/delete actions use the same confirmation contract.

Automatic read receipts during navigation and ordinary filter/view changes retain their existing behavior. Existing permissions and server validation remain authoritative. No API, schema or environment changes are required.
