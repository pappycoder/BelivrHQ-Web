# Badge, contrast and timestamp fixes — 21 November 2026

## Changes

- **Form-response badges:** table, cards, legacy table and detail dialog use one SubmissionStatusBadge. Pending is gold, Approved moss and Rejected rose, with a neutral fallback for unknown statuses. The obsolete fixed text-color mapping was removed.
- **Typography:** shared Paper tags declare the workspace body font and reset inherited letter spacing, capitalization and italics. Dialog headings retain their display font; badge labels do not inherit it.
- **Contrast:** the shared light gold foreground is `#76551a`. Measured gold text contrast improved from approximately 2.97:1 to **5.49:1**; dark gold remains **7.05:1**. Verification also found marginal contrast in other accent badges, so brand/sky/rose badge text receives a darker light-mode treatment while retaining existing dark colors and overall theme accents. All six standard badge tone pairs measured above 4.5:1 in both themes, against [W3C's normal-text criterion](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). This verifies the standard palette, not every arbitrary custom accent override.
- **Timestamp metadata:** notification detail, integration Last checked and offline Last refreshed use formatRecordDateTime. The live notification now reads **25 Oct 2026, 13:30**; its ISO datetime attribute is preserved. Viewer timezone handling and invalid/missing-value fallbacks remain in the shared formatter.

## Automated checks

**832 tests across 73 files passed.** New tests cover response badge statuses and contrast from the actual CSS tokens/rules in both themes. Existing date tests cover missing/invalid values and timezone boundaries.

Standalone TypeScript, full ESLint, UI contract audit and production build passed. All **114 static pages** generated. `git diff --check` passed.

Logs: `/tmp/belivrhq-gold-badge-time-{focused,tests,types,lint,contracts,build}.log`.

## Browser checks

- **14 fixture checks:** all three response statuses at desktop/mobile in both themes, plus 320px Pending checks. Reference and detail badges matched in color, font family, size, weight, spacing, line height, radius and padding. No page/dialog horizontal overflow occurred.
- **12 palette/theme pairs:** all six standard tones were measured in the browser. Minimum measured contrast was approximately 4.89:1; gold measured approximately 5.49:1 light and 7.05:1 dark.
- **10 live response checks:** table and card views on desktop/mobile in both themes, plus 320px table checks. Badge styles matched the detail dialog exactly, including the real Inter Tight/Inter font variables. No horizontal overflow occurred. The original list view was restored.
- **6 live notification checks:** desktop, 390px and 320px in both themes. An already-read notification showed **25 Oct 2026, 13:30**, kept its ISO datetime and remained Read. The unread count stayed at 48. No horizontal overflow occurred.
- Integration/offline populated timestamp branches were type/source checked against the tested shared formatter; no account or offline workspace was created just to populate them.

Evidence:

- [Response fixtures](/tmp/belivrhq-gold-badge-time-fixtures.json)
- [Palette measurements](/tmp/belivrhq-gold-badge-time-palettes.json)
- [Live response measurements](/tmp/belivrhq-gold-badge-time-live-responses.json)
- [Live notification measurements](/tmp/belivrhq-gold-badge-time-live-timestamps.json)
- [Response dialog, desktop light](/tmp/belivrhq-gold-badge-time-response-desktop-light.png)
- [Response dialog at 320px, dark](/tmp/belivrhq-gold-badge-time-response-320-dark.png)
- [Notification at 320px, dark](/tmp/belivrhq-gold-badge-time-notification-320-dark.png)

The fixture tab/server were closed. Light mode, list view and the normal viewport were restored. The existing app tab remains open on the response page, and the frontend/API remain running. No response was approved/rejected, no notification read state changed, and no business record, payment, message, security setting, commit or deployment was created.
