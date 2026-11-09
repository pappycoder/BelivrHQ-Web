# Shadcn Admin UI migration

BelivrHQ-Web now uses the Shadcn Admin sidebar, theme foundation, typography and component conventions, adapted from https://github.com/satnaing/shadcn-admin. The upstream MIT notice is retained in `licenses/shadcn-admin-MIT.txt`. Inter is bundled locally under `src/assets/fonts` with its OFL notice in `licenses/Inter-OFL.txt`.

## Scope

- Replaced the SmartHR stylesheet and navigation shell with the Shadcn inset sidebar, collapsible groups, collapsed-menu dropdowns, sticky header, account menus and mobile Sheet navigation.
- Added permission-filtered navigation search with Ctrl/Cmd+K and the upstream Ctrl/Cmd+B sidebar shortcut. Sidebar expansion persists in the `sidebar_state` cookie; light/dark mode uses next-themes.
- Retired SmartHR layout, sidebar/topbar color, gradient, card and density modes. Old stored values are ignored. The former floating appearance panel and auth accent selector are removed.
- Adopted the upstream light/dark palette, local Inter typography, compact buttons and controls, bordered cards, table states, page headings, settings navigation/forms and split authentication layout. Shared primitives carry these changes across all existing routes.
- Standardized analytics bars, histograms and donut charts on the shared ChartContainer; retained data/units/currency formatters and empty/loading states. Dashboard and report charts use theme colors, quieter grids and shared tooltips. Gradient IDs in reusable trends are unique across instances; a sixth palette color is defined.
- Kept Next.js routing, existing backend APIs, authentication/2FA, effective permissions, branch scoping, exports and offline storage/sync. This is a UI migration, with no database or backend changes.

## Verification

Run `npm test`, `npx tsc --noEmit`, `npm run audit:ui`, `npm run build`, then `npm run test:e2e`.

`test/browser/shadcn-admin.e2e.ts` uses isolated browser API fixtures and checks desktop/sidebar navigation, permission-filtered search, persistence, light/dark mode, charts, 375px and 768px layouts, mobile dismissal and navigation. Existing browser regressions cover read-only permissions, forms, giving, department attendance, integration settings, offline workflows and modal notifications.

The source audit now inventories the single sidebar instead of counting duplicate horizontal menu entries. No live business writes or deployment are part of this migration.

## Verified on 2026-10-17

- Production build, including TypeScript and ESLint checks: passed.
- Unit suite: 288/288 passed.
- Browser suite against the production build: 37/37 passed, including mobile navigation, collapsed menu hit targets, navigation search, dark-mode hydration/persistence and chart rendering.
- UI permission/link audit: 86 pages, 57 navigation entries, 728 controls, no issues.
- Mobile (375px), tablet (768px) and desktop dark-mode screenshots are emitted by the browser suite under `test-results`.

The offline and ticket-toast fixtures now explicitly model active accounts, as required by the existing permission resolver. The offline navigation assertion opens the collapsible Events group before inspecting its authorized children.
