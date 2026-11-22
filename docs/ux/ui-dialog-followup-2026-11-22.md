# Dialog and custom-control follow-up — 22 November 2026

Follow-up: all three findings were fixed and tested. See the [fixes and verification report](ui-dialog-fixes-2026-11-22.md). Original observations are preserved below.

Three additional discrepancies were confirmed during a focused review of shared dialog headings and less common form controls. This review did not change application code.

## 1. Long names clip inside dialog titles

Opening **Record return** on a loan with a valid 189-character asset name produces a 196-character “Return …” heading. The shared `DialogTitle` does not wrap unbroken text. The heading clips and the form dialog develops horizontal scrolling on desktop and mobile, in both themes.

| Viewport | Heading client/scroll width | Dialog client/scroll width |
| --- | --- | --- |
| 1280px, light/dark | 393 / 585px | 478 / 611px |
| 390px, light | 268 / 585px | 344 / 607px |
| 390px, dark | 270 / 585px | 346 / 607px |
| 320px, light/dark | 198 / 585px | 274 / 607px |

Source: `src/components/ui/dialog.tsx` (`DialogTitle`) and `src/components/assets/return-loan-dialog.tsx` (dynamic asset name). The page-heading wrapping fixes do not apply to this shared dialog heading. Other consumers of dynamic dialog titles should be regression-tested when fixing the shared component; they are not all independently confirmed failures here.

[Bounds](evidence/ui-dialog-followup-2026-11-22/return-dialog-bounds.json) · [Mobile dark screenshot](evidence/ui-dialog-followup-2026-11-22/return-dark-390.jpg).

## 2. Custom denomination Add text has poor dark-mode contrast

On registration step 1, open Denomination → Type a custom denomination and enter synthetic text without adding or submitting it. The enabled **Add** button uses white text (`rgb(255,255,255)`) on the light dark-mode primary color (`rgb(94,213,190)`), a calculated contrast ratio of approximately **1.79:1**. Other primary controls use the theme's contrasting primary-foreground color. This discrepancy is present at desktop, 390px and 320px in dark mode; light mode uses the darker teal background.

Source: `src/components/shared/denomination-combobox.tsx` hardcodes `text-white` while setting the background to `var(--primary)`. This is a shared component; the browser reproduction was registration.

[Computed colors](evidence/ui-dialog-followup-2026-11-22/denomination-colors.json) · [Desktop dark screenshot](evidence/ui-dialog-followup-2026-11-22/denomination-dark-1280.jpg).

## 3. Custom denomination popover exceeds small-phone width

At a fresh **320px** viewport, the same custom-denomination popover is **389px** wide despite an available width of **310px** and a trigger width of **262px**. Its right edge is approximately 391px; the Add button extends to approximately 377px and disappears beyond the viewport. The document's width remains bounded, so a document-overflow-only check misses the clipped portal content.

Confirmed in both themes during responsive checks, with a separate fresh-load reproduction in dark mode. The popover has `w-[--radix-popover-trigger-width]` without an effective viewport cap, and the custom-input row also needs to shrink within its available width.

[Fresh-load measurements](evidence/ui-dialog-followup-2026-11-22/denomination-small-fresh.json) · [320px screenshot](evidence/ui-dialog-followup-2026-11-22/denomination-small-fresh.jpg).

## Coverage and scope

Thirteen focused observations: six return-dialog checks (1280/390/320px × light/dark), six custom-denomination checks with the same combinations, and one fresh 320px dark-mode reproduction. This complements the previous 198-state verification; it is not another exhaustive interaction audit of every route and role.

The long asset name came from a GET/HEAD-only loopback fixture. Registration used an anonymous read-only preview with synthetic input text. No loan return, custom denomination, registration, credentials, agreement or other record was submitted or saved. The user's authenticated session was retained.

Both temporary fixtures were stopped. The browser remains open on the real asset register in light mode with its viewport override reset. The frontend and API remain running. The previous fixes remain in place.
