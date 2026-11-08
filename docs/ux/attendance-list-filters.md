# Services and attendance record filters

Services and Records use the standard register toolbar: bounded search on the left, compact pill dropdowns and sort direction on the right, wrapping on narrow screens. Services has category, archived, HQ branch and day/name/date-added sorting. Records has gathering, category, HQ branch and check-in/date-added sorting. Clear filters preserves the chosen sort. Changing filters resets pagination.

Search is debounced and applied by the API before pagination and counting. Services searches names; Records matches all name terms across member names, linked visitor names and walk-in visitor names. Existing church and branch restrictions remain combined with search. Exports use the same record filters and sorting.

Records keeps native From/To date controls on a separate row, including the full selected end date in the browser's local timezone. Form-field wheels remain unchanged. Filter-option errors offer retry; list failures show a recoverable error state rather than an empty register.

Deploy the API search additions before the web changes. No migration, permission seed or environment change is required.

Validation: 620 web unit tests, 54 attendance API unit tests, five desktop/mobile toolbar browser scenarios and three existing service-confirmation/native-date browser regressions passed. TypeScript, scoped lint without autofix, isolated web production build and API production TypeScript compilation passed. Desktop and 320 px screenshots were inspected.
