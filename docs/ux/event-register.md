# Event register

`/gatherings/events/list` is available through **Events → View events**, immediately below Calendar. Authorized calendar users also have a View events shortcut in the calendar header. The register links back to Calendar and offers New event when creation is permitted.

The page follows the Services/people register presentation with summary cards, search, type and upcoming/past filters, archived records, HQ branch selection, sorting and server pagination. It uses the existing `/events` API and returned total. Column selection includes all public event fields, with extra fields hidden initially; visible rows support selection, export and applicable bulk actions.

From/To filters explicitly use `picker="native"`. They filter event start dates, converting the user's local beginning/end of day to ISO timestamps so the To date includes the whole day. Other list/report/notification/meeting date selectors likewise explicitly retain native controls. Form fields continue to opt into wheels.

Viewing requires the existing `events:all:read` register grant and `events:list:read` API grant; calendar-only readers cannot access the register. Mutations preserve existing event create/update/delete permissions. Archive, restore and permanent deletion require confirmation, including bulk actions. Existing API dependency checks prevent deleting events with registrations or attendance history and show their actionable errors.

No API migration, permission seed or environment change is required.
