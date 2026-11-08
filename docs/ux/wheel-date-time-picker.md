# Date and time scroll wheels

All shared date, time and local date-time inputs open a measuring-tape-style picker. Raw donation and notification date filters now use the same shared input. The check-in date popover also uses these wheels while preserving its previous/next occurrence controls and jump-to-today action.

Each vertical ruler has a fixed central selection rail, measurement ticks, faded edges, native touch/mouse momentum and scroll snapping. Selection scales and fades subtly during scrolling. Reduced-motion users keep the static rail and edge fade without the animated transitions. Long year rulers are virtualized, with years 1–9999 available without mounting thousands of rows.

Click a date/time field, or press Enter, Space or Alt+Down to open it. Each focused wheel supports Up/Down, Page Up/Down and Home/End. Time uses a clearly labelled 24-hour format. Seconds appear when the field's step or existing value requires them. Apply commits the draft through the original input/change contract. Cancel, Escape and dismissal preserve the original field; optional fields also offer Clear. Focus returns to the original input, including when the picker opens inside another dialog.

Original native fields, refs, names, manual keyboard entry, required/min/max/step constraints and React Hook Form bindings remain intact. Changing month/year clamps impossible days, including leap years. Local date/time strings retain their local components without UTC conversion. Check-in dates that do not match the gathering's schedule cannot be applied.

The input labels, italic placeholders, icons and error feedback continue to use the shared field presentation. No backend, migration or environment changes are needed.

Validation: all 610 unit tests and 28 focused browser checks passed, along with TypeScript, scoped ESLint without autofix and the production build. Browser checks cover month/leap-year changes, Apply/Cancel/Clear, focus restoration, mouse scrolling and settled rail alignment, min/max/step constraints, nested-dialog time/seconds, desktop and 320 px date-time layouts, reduced motion and check-in occurrence restrictions. Desktop and mobile screenshots were visually inspected.
