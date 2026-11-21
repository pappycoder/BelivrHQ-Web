# Required-field UI fixes — 21 November 2026

The live public form reproduced two generated asterisks beside Full name before the change. FormFieldsRenderer rendered an explicit RequiredIndicator and also asked Label to generate one.

## Fixes

- The shared field renderer now delegates its single decorative required marker to Label. Optional fields remain unmarked.
- Label normalizes trailing legacy asterisks, including text split across React children and trailing whitespace, before rendering its own marker. It does not add a second marker when required metadata is also present.
- The department Branch label no longer adds a conditional manual asterisk on top of FormField's required metadata.
- Public form and registration introductions no longer repeat the required-field instruction already provided by ValidatedForm.
- Native/custom required semantics and invalid-field feedback are preserved. RequiredIndicator remains hidden from assistive technology.

## Validation

- **806 tests across 69 files passed**, including 14 marker regressions covering all eight field types, optional fields, required validation and legacy string/composite labels.
- Standalone TypeScript, full ESLint, the UI contract audit and production build passed. All 114 static pages generated. `git diff --check` passed.
- The actual shared renderer was checked in isolated desktop/mobile light/dark fixtures. Every required field had one marker, while optional fields and checkbox choices had none. Submitting empty fixture fields still flagged all eight required controls. The 320px light/dark checks had no page overflow.
- The shared calendar opened correctly with the application TooltipProvider present. An initial isolated harness omitted that provider; the harness was corrected and the calendar was rechecked. This was not reproduced in the app.
- Live checks covered the public form at 1280px, 390px and 320px in both themes; member creation, populated asset editing, the department creation dialog and the existing form's respondent preview at desktop/mobile in both themes. No duplicate markers or page-level horizontal overflow were found. The department Branch label and public Full name label each had exactly one marker, and public forms showed one required-field instruction.

Source inspection also checked Label/FormLabel usages for manually supplied markers. No further reproducible UI discrepancy was found in this pass; this is scoped to the inspected components and rendered states, rather than every possible role/data combination.

## Evidence

- [Live marker measurements](/tmp/belivrhq-required-markers-live.json)
- [All-field fixture measurements](/tmp/belivrhq-required-markers-fixtures.json)
- [Public form, desktop light](/tmp/belivrhq-required-markers-public-desktop-light.png)
- [Public form, mobile dark](/tmp/belivrhq-required-markers-public-mobile-dark.png)
- [Department dialog, mobile light](/tmp/belivrhq-required-markers-department-mobile-light.png)

Logs: `/tmp/belivrhq-required-markers-{focused,tests,types,lint,contracts,build}.log`.

The local frontend/API remain running, with the public form open in the existing browser tab, light mode restored and the viewport override cleared. The fixture tab/server were closed. No business form was submitted or saved, and no payment, message, permission, commit or deployment was created.
