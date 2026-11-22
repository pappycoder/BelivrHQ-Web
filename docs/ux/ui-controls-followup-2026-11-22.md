# Layout and date-control follow-up — 22 November 2026

**No additional UI discrepancy was confirmed in this review.** No application code was changed.

## Coverage

**56 observations:** 44 normal page views at 1280px/390px in light/dark, plus 12 date-control observations at 1280px/390px/320px in both themes.

The eleven sampled routes were Home, Analytics overview, Report studio, Giving analytics, Attendance analytics, Member analytics, Security, Add asset, Create event, Giving records and the populated Youth Conference event edit page.

The page views had their expected headings/themes, settled screenshots, no document overflow, no remaining loading skeletons and no duplicate required markers. Representative saved screenshots were visually reviewed for card/form surfaces, heading and action wrapping, statistic layout, chart text and create/edit structure.

The giving-records date-range popover and its nested From date calendar were opened at all three widths in both themes. Both portal surfaces remained within the viewport, with no internal horizontal overflow. Escape dismissed the calendar and outer filter without applying dates.

The create-event Starts date/time dialog was opened at the same six viewport/theme combinations. Its bounds remained within the viewport, and its content width matched its client width. The calendar, time controls and Cancel/Apply actions remained visible at 320px. Each dialog was cancelled without changing a field.

## Limits and environment

This complements the prior [86-view verification of the five read-state fixes](ui-read-state-fixes-2026-11-22.md). It is a targeted follow-up using the current signed-in role and available records, not a fresh exhaustive certification of every route, role, data shape, physical device and interaction. Failure injection was not repeated in this review; the previous fixes were not changed.

No form, security setting, date filter or business record was submitted or saved, and no report was exported. No credentials were entered. No temporary proxy was required. The browser remains open on the original selected tier page in light mode with its viewport override reset; local frontend and API remain running. No deployment was performed.

## Evidence

[44 page observations](evidence/ui-controls-followup-2026-11-22/views.csv) · [Six nested date-popover measurements](evidence/ui-controls-followup-2026-11-22/date-popover-checks.json) · [Six date/time-dialog measurements](evidence/ui-controls-followup-2026-11-22/date-dialog-checks.json)

[Date/time dialog at 320px, dark](evidence/ui-controls-followup-2026-11-22/date-dialog-dark-320.jpg) · [Compact date filter at 320px, light](evidence/ui-controls-followup-2026-11-22/date-popover-light-320.jpg) · [Report studio desktop dark](evidence/ui-controls-followup-2026-11-22/reports-desktop-dark.jpg) · [Add asset mobile light](evidence/ui-controls-followup-2026-11-22/asset-form-mobile-light.jpg) · [Event edit mobile dark](evidence/ui-controls-followup-2026-11-22/event-edit-mobile-dark.jpg)
