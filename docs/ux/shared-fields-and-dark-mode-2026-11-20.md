# Shared fields and dark-mode consistency

## Changes

- Shared textareas use fixed field sizing and a four-row default; explicit row counts remain supported. Dialog control sizing no longer overrides textarea minimum heights. Existing inbox 240px sizing is preserved.
- Broadcast Audience, Branch and Gender filters stack below the small breakpoint and retain three columns on larger screens.
- Appointment contact and visitor triggers forward field IDs and accessible attributes. FormControl now wraps the active attendee picker instead of its Tabs container. The New Visitor label targets the first-name input.
- Family and visitor pickers expose named combobox triggers with expanded state and controlled-list IDs. The Household label now belongs to the family field’s FormItem.
- Shared FormItem grids use a shrinking single-column track so long picker placeholders cannot force controls outside their cards. Picker triggers can shrink; appointment attendee tabs fit all three choices in an auto-height row.
- Contact, visitor, family and denomination picker hover colours use the theme's muted colour. The denomination placeholder uses the muted foreground colour. The readonly member field in pastoral note editing uses themed border, background and foreground colours.
- Replaced the pastoral sidebar's outdated feature-roadmap copy with permission-aware links to existing care, life-event, risk, engagement and visitor follow-up workspaces.

## Validation

All 721 tests across 62 files passed after the shared FormItem and picker changes. TypeScript, scoped lint, diff checks and the final production build passed. The final tab-height-only override was checked by the build and browser boundary assertions.

Browser verification passed 40 workspace combinations (10 views × desktop/mobile × light/dark), plus four real-component denomination-picker checks. Workspace coverage includes template Content, broadcast filters, all three appointment attendee modes, pastoral page/add/edit forms, Add Member/Household and inbox composition. Desktop was 1280×900; phone was 390×844. Final records have no horizontal overflow or out-of-viewport dialogs. All attendee tabs fit inside their parent in both themes/sizes; long appointment triggers stay within their field track. Intermediate measurements taken during viewport/layout transitions were recaptured after settling.

The five-row template Content field now measures about 125px on desktop and 133px on mobile, with fixed field sizing. The inbox remains 240px in all four combinations. Broadcast audience filters have full-width phone tracks. Appointment labels open/name the correct picker; the Household label resolves to its family control.

Dark hover controls retain readable themed foreground/background colours. The populated pastoral edit member field uses rgb(36,33,26) with rgb(243,238,225) text in dark mode, rather than a hard-coded light background.

The authenticated browser redirects away from signup. The denomination picker was therefore checked in a temporary Vite page importing the actual component and the exact CSS links from the built registration HTML. This isolates the component check from account creation; it is not a full registration-flow test. The temporary browser tab was closed after verification, preserving the user's original tabs.

Evidence: `/tmp/belivrhq-remaining-ui-verification.json`, `/tmp/belivrhq-remaining-broadcast-dark-mobile.png`, `/tmp/belivrhq-remaining-appointment-dark-mobile.png` and `/tmp/belivrhq-remaining-denomination-dark-mobile.png`. Light mode was restored and viewport overrides reset; the normal preview remains open.

A clearly labelled standard UI-test pastoral note, tagged `ui-test`, was saved against the existing mock member Jane Garcia to verify the populated edit state. The note remains available for review. It contains only layout-test text. No messages or appointments are submitted.
