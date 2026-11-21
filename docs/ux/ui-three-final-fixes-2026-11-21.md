# Three UI fixes — 21 November 2026

## Resulting behaviour

1. **Public-form contrast:** public forms, registration forms and respondent previews share a deep accent panel that retains readable white text when the workspace accent becomes bright in dark mode. Description, progress and privacy copy use solid white. The public form submit button uses the shared theme foreground instead of forcing white text. The existing responsive layouts, form fields, validation and browser verification remain in place.
2. **Billing payment summary:** the summary uses the newest payment-history entry and shows its amount, status, date and reference. The API's `latestPayment` field is an unfinished checkout, not a completed charge; it no longer controls this card or its empty state. Pending and failed entries are labeled as such under “Latest payment.” Empty history retains a no-records message. No backend or payment processing behaviour changed.
3. **Billing heading:** the column containing success, failed and pending values is now labeled **Status**.

## Automated verification

- **792 tests across 68 files passed**, including six new billing render regressions: recorded history without an unfinished checkout, a separate unfinished checkout, pending and failed history records, empty history and the status heading.
- Standalone TypeScript, full ESLint and production build passed. All **114 static pages** generated.
- UI contract inventory reported no issues; `git diff --check` passed.

Logs: `/tmp/belivrhq-three-fixes-{focused,tests,types,lint,contracts,build}.log`.

## Browser verification

| Surface | Viewports | Themes | Checks |
| --- | --- | --- | --- |
| Populated Billing | 1280×900, 390×844, 320×720 | Light and dark | 6 |
| Live public form | 1280×900, 390×844, 320×720 | Light and dark | 6 |
| Existing form's embedded respondent preview | 1280×900, 390×844 | Light and dark | 4 |

The rebuilt Billing page displayed the actual NGN 12,013 payment from 20 November, with success status, matching the first ledger record. The **Status** heading was present and the false no-payments message was absent at every size/theme. All 16 live checks had no page-level horizontal overflow.

The shared registration frame was additionally rendered in isolation with its real component and stylesheet: six ready-state size/theme combinations, two bright-custom-accent checks and a narrow dark loading state. These nine fixtures made no business requests. Computed base-panel text contrast measured approximately **11.55:1 in light mode**, **7.09:1 in dark mode**, and **5.15:1 with a white custom accent**. This measures the panel foreground against its computed background; it is not a claim of an exhaustive accessibility audit.

The public form's dark-mode submit control now computes a dark foreground (`rgb(7,37,31)`) on the bright accent. It remained disabled pending normal browser verification; no verification was bypassed and no response was sent.

Evidence:

- [Billing measurements](/tmp/belivrhq-three-fixes-billing.json)
- [All contrast measurements](/tmp/belivrhq-three-fixes-contrast.json)
- [Shared-frame fixture measurements](/tmp/belivrhq-three-fixes-fixtures.json)
- [Public form, desktop light](/tmp/belivrhq-three-fixes-public-desktop-light.png)
- [Public form, mobile dark](/tmp/belivrhq-three-fixes-public-mobile-dark.png)
- [Billing, mobile dark](/tmp/belivrhq-three-fixes-billing-mobile-dark.png)
- [Billing, desktop light](/tmp/belivrhq-three-fixes-billing-desktop-light.png)

Light mode and the normal viewport were restored. The existing browser tab remains open on Billing, with the local frontend and API running. The temporary fixture tab/server were closed. No forms were saved, payments initiated, business data modified, commit created or hosted deployment performed.
