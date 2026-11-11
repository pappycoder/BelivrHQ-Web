# Workspace typography audit

Reviewed 294 workspace and shared component templates. The scan found 1,360 uses of extra-small type or fixed 8–13px text; 187 templates were normalized alongside shared styles and primitives.

| Role | Standard | Typical rendered size at the existing root scale |
| --- | --- | --- |
| Main copy, table values, labels, controls, form guidance | `text-sm` / 0.875rem | 15px |
| Captions, status tags, column labels, compact metadata | `text-xs` / 0.75rem | 13px |
| Section and card headings | `text-lg` / 1.125rem | 19px |
| Page headings and summary numbers | Existing responsive display scale | 24px and above |
| Mobile editable controls | Native-control minimum | 16px |
| Chart tick labels | Minimum 12px | 12px |

The changes cover workspace routes and reusable attendance, giving, people, groups, forms, settings, notices, navigation, table and modal components. Native controls and inherited headcount/table CSS were checked separately so their computed styles follow the same hierarchy. Rem-based text respects the browser's configured font scale and zoom.

Animated register wrappers now forward layout styles so subgrid columns retain their width; the giving source name no longer collapses into the selection-column width. Browser coverage checks its visible width as well as its font size.

Filter controls have more room for readable labels. Long date-range labels fit their containers while retaining full accessible names; bulk-action labels can wrap. The secondary ink token has stronger contrast in light and dark themes. Its contrast against the workspace/card surfaces is at least 4.8:1 in light mode and 5.7:1 in dark mode; this is a check of those tokens, not a full accessibility certification.

Validation uses computed font sizes on actual table values, labels, fields, card descriptions, dialogs and popovers, plus desktop/mobile layout and existing interaction regressions. No data, API, permissions, billing or attendance rules change.

Validation completed: production build, TypeScript and scoped ESLint passed. All four computed typography/layout checks passed (seven routes each, at 320px/1280px in light/dark mode), plus six giving/settings browser checks on the final build. An earlier production build passed 29 attendance/service interaction checks. Desktop/mobile screenshots were inspected. The unit suite passed 671 tests; one pre-existing loading-markup audit fails on four existing visible loading/checking messages, confirmed unchanged in HEAD.
