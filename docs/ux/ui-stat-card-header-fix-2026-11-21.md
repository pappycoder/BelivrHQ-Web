# Shared stat-card header fix — 21 Nov 2026

StatCard headers now wrap flex children when space is limited. Labels have a flexible 7rem preferred width, min-width zero and overflow-wrap:anywhere, so long words remain inside the content area. Icon wrappers use shrink-0 to preserve their existing size. Narrow cards place icons below their labels when needed; desktop headers remain inline. Values, captions, permissions and theme palettes are unchanged.

Validation: scoped ESLint and diff whitespace check passed. Fresh production build passed including lint/type validation and all 114 generated pages. Eighteen browser cases cover care calendar, team register and asset register at 1280px, 390px and 320px, in light/dark mode. All 72 card labels fit their header content without horizontal text overflow. All 24 measured icon wrappers remain 34×34px at every width and fit within their header padding. No page-level horizontal overflow. Acknowledged wraps to two lines at 320px instead of clipping. Desktop icon/label headers remain inline; mobile icons reflow below labels.

Existing team/asset records were read; care has no upcoming records, but its stat headers still exercise the original long-label case. No records or settings were saved. Light mode/default viewport restored and the real care calendar remains open. No deployment performed.

Evidence: [18 measurements](/tmp/belivrhq-stat-headers-fixed-results.json), [fixed care stat headers, 320px dark](/tmp/belivrhq-stat-headers-fixed-care-320-dark.png).
