# Calendar month and year navigation

The calendar at `/gatherings/events` offers separate month and year selectors, previous/next month arrows, previous/next year arrows, and Today. Year options span a rolling century on either side of the displayed year (within years 1–9999). Selecting a year keeps the displayed month; selecting a month keeps the year. Month arrows cross December/January correctly. Navigation normalizes to the first of the month to avoid month-end and leap-day rollover.

The visible grid reprojects the existing readable events and recurring services. Today returns to the current month and selects the current local day; other navigation retains the existing selected-day behavior. Permissions, filters and source-loading coverage are unchanged. Navigation remains available to calendar-only readers. Compact controls wrap on narrow screens and announce the displayed month/year to screen readers.

Web deployment only; no API, migration or environment changes.

Validation: 23 calendar/recurrence unit checks, three production-browser checks, TypeScript, scoped lint without autofix and production build passed. Browser checks cover desktop/320 px controls, December/January rollover, leap/non-leap February, service reprojection, Today, read-only access and no writes. Desktop/mobile screenshots were visually inspected. Validation ran in a private temporary copy to preserve the running development workspace.

## Date hover emphasis

Hovering a date gently lifts its contents by 3px, scales them to 104% and increases their font weight to 650, with a soft shadow under the cell. Keyboard focus receives the same emphasis. Only the contents transform, preserving grid and click-target positions. Fine-pointer detection avoids sticky touch hover; reduced motion removes transforms and transitions. CSS parsing and direct source-CSS Chromium checks verified emphasis, reset, stable bounds, keyboard, touch and reduced-motion behavior.
