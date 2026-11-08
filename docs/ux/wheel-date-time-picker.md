# Date and time scroll wheels

The measuring-tape-style picker is reserved for date, time and local date-time **form fields**. Form inputs explicitly use `<Input picker="wheel" type="date" />` (or `time` / `datetime-local`). Shared `Input` defaults to the native picker so filters, report ranges, notification filters and navigation controls keep their previous behavior. Do not opt these controls into wheels.

Form coverage includes public/private/generated/offline form responses, intake review, member fields, event/service/group schedules, broadcasts, appointments, pastoral life events, sermons, asset purchase/loan/maintenance/return fields, cash/group giving and attendance data-entry forms. Shared RHF/settings form-field helpers also opt in. Table meeting-date selectors and general-attendance record-range filters remain native.

Check-in desks use the previous calendar-grid popover, with non-occurrence dates disabled, previous/next occurrence controls and Jump to today. The main calendar view keeps its month/year navigation.

The picker uses a slim 20rem dialog and 160px wheels, with straight sides and perspective-tilted labels that curve vertically and shrink toward the top and bottom. A large, unboxed output sits above the wheels: dates use `Dec 25, 2026`; date-time values show the date first with the local time below it. Submitted values retain their native ISO/local format.

Each borderless vertical ruler has a fixed central selection position, measurement ticks, top/bottom fading, native touch/mouse momentum and scroll snapping. The selected value uses text emphasis without coloured outlines or selection bars. Keyboard focus underlines the column label instead of drawing a border. Selection scales and fades subtly during scrolling. Reduced-motion users keep the static wheel shading and edge fade without the animated transitions. Long year rulers are virtualized, with years 1–9999 available without mounting thousands of rows.

Click a date/time field, or press Enter, Space or Alt+Down to open it. Each focused wheel supports Up/Down, Page Up/Down and Home/End. Time uses a clearly labelled 24-hour format. Seconds appear when the field's step or existing value requires them. Apply commits the draft through the original input/change contract. Cancel, Escape and dismissal preserve the original field; optional fields also offer Clear. Focus returns to the original input, including when the picker opens inside another dialog.

Original native fields, refs, names, manual keyboard entry, required/min/max/step constraints and React Hook Form bindings remain intact. Changing month/year clamps impossible days, including leap years. Local date/time strings retain their local components without UTC conversion. Check-in calendars disable dates that do not match the gathering’s schedule.

The input labels, italic placeholders, icons and error feedback continue to use the shared field presentation. No backend, migration or environment changes are needed.

Validation: all 610 unit tests and 28 focused browser checks passed, along with TypeScript, scoped ESLint without autofix and the production build. Browser checks cover month/leap-year changes, Apply/Cancel/Clear, focus restoration, mouse scrolling and settled rail alignment, min/max/step constraints, nested-dialog time/seconds, desktop and 320 px date-time layouts, reduced motion and check-in occurrence restrictions. Desktop and mobile screenshots were visually inspected.

Compact/curved refinement validation: 610 unit tests, six focused wheel browser checks, TypeScript, scoped lint without autofix and an isolated production build passed. Browser checks assert the exact `Dec 25, 2026` date, large transparent output above the controls, compact width, perspective labels and reduced motion, along with the existing value/constraint/settling checks. Desktop and 320px screenshots were visually inspected. An isolated copy avoided contention with another local Next.js build.

Form-only scoping supersedes the earlier all-input rollout and check-in wheel coverage described in the historical validation notes above.

Form-only scope validation: 619 unit tests and eight production-browser checks passed, along with TypeScript, scoped lint without autofix and an isolated production build. Browser coverage retains form date/time/date-time wheels (constraints, keyboard, nested dialogs, mobile/reduced motion) while verifying native attendance/donation filters and the restored check-in calendar’s disabled days, valid selection, previous/next occurrence and Jump to today. The remaining eleven literal native date inputs were audited as filters/selectors.

Event-register follow-up: the new `/gatherings/events/list` From/To filters use explicit native date inputs, as do the eleven existing filter/selector controls. Event filters include the complete local end date. Event/calendar browser checks cover native controls and the absence of wheel dialogs on the register.
