# Follow-on UI consistency audit — 21 November 2026

Three further issues were confirmed. This pass changed no application code.

1. **Form-response badge presentation remains inconsistent.** The live submission register renders Pending as a filled semantic gold Tag, with a sans-serif font. Its detail dialog uses an outlined Badge with a different fixed yellow foreground and inherits the dialog heading's serif font. Measured list font: Inter Tight/Inter; detail font: Fraunces/Georgia. The mismatch was reproduced on desktop and mobile in light and dark mode. Relevant code: `src/components/forms/submissions-register.tsx:411`, `src/components/forms/submission-detail-dialog.tsx:49`, `src/hooks/use-forms.ts:57`. Badge typography should be explicit rather than inherited from a surrounding heading, including shared badges used in other dialogs.
2. **Some timestamp metadata still bypasses the standardized formatter.** The live notification detail rendered `Sunday, October 25, 2026 at 1:30 PM`, while the shared record timestamp convention is `25 Oct 2026, 13:30`. Notification detail uses a browser-locale-dependent full-date formatter at `src/components/notifications/notification-detail-dialog.tsx:67`. Reproduced at desktop/mobile in both themes using an already-read notification. Source inspection also found locale-dependent timestamp metadata in `src/components/settings/integration-settings-tab.tsx:529` and `src/components/offline/offline-workspace.tsx:518`; those populated states were not reproduced in this pass and remain source-audit candidates for the same formatter cleanup. Contextual chart/relative-time labels are a separate intentional presentation.
3. **Shared gold text on gold badges is too faint in light mode.** A live Pending badge computes foreground `rgb(169,126,38)` on background `rgb(242,230,200)`, giving approximately **2.97:1** contrast. Its text is 12.75px, weight 500. The normal-text minimum is **4.5:1** under [W3C's contrast criterion](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). These colors come from the shared gold/gold-soft tokens and Tag palette (`src/app/paper-tokens.css:47`, `src/components/paper/stat.tsx:11`), so the correction should address the shared light palette rather than only one page. This finding concerns the measured default light palette, not every possible theme override.

## Verification

- Live form-response list/detail comparison: 1280px and 390px, light and dark mode.
- Live notification detail timestamp: 1280px and 390px, light and dark mode. The notification was already Read before opening; no mark-read/unread action was used.
- Gold contrast computed from the actual browser foreground/background values using relative luminance. W3C's criterion was checked against its official documentation.
- Neither detail dialog showed horizontal overflow in the checked states. No duplicated required-field marker was found.
- No test/build rerun was needed for this read-only audit. These targeted checks are not proof of every role, dataset or interaction throughout the app.

Evidence:

- [Badge color measurements](/tmp/belivrhq-ui-last-audit-badges.json)
- [Gold badge font and color measurements](/tmp/belivrhq-ui-last-audit-gold.json)
- [Notification timestamp measurements](/tmp/belivrhq-ui-last-audit-timestamps.json)
- [Submission detail, mobile dark](/tmp/belivrhq-ui-last-audit-submission-dark.png)
- [Notification detail, mobile light](/tmp/belivrhq-ui-last-audit-notification-mobile-light.png)
- [Form-response list, desktop light](/tmp/belivrhq-ui-last-audit-form-list.png)

The app remains running and open on the populated form-response page in light mode, with the normal viewport restored. No business records, statuses, payments, messages or security settings were changed.
