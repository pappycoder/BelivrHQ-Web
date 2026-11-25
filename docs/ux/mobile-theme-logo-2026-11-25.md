# Mobile workspace theme and logo — 25 November 2026

Branch: `fix/mobile-theme-and-logo-2026-11-25`, created from current main.

The mobile context bar rendered a literal letter placeholder and the sole workspace theme switch lived in the desktop-only rail. It now uses the shared official emblem on a contrasting tile and exposes a 44px light/dark switch in the mobile header. The switch uses the existing theme provider and persisted preference, labels the destination theme, and waits for hydration before accepting input. Desktop keeps its existing rail switch.

Visual checks used the real ContextBar and NavRail under the normal root theme provider in a temporary local component fixture with data queries disabled. No account login, business-record changes, permissions or API changes were needed. The fixture was removed after verification.

Verified 320px and 390px phone widths, 767/768px breakpoint behavior and 1280px desktop; light/dark rendering; loaded emblem; no horizontal overflow; a 44px-or-larger theme touch target; saved dark mode after reload; keyboard activation; and the existing desktop switch. Screenshots: [light](evidence/mobile-theme-logo-2026-11-25/mobile-light.jpg), [dark](evidence/mobile-theme-logo-2026-11-25/mobile-dark.jpg).

Two authenticated-fixture browser regressions cover logo loading, theme switching/persistence, keyboard access, overflow and the desktop control. Their API requests use the existing read-only fixture. Local unit suite: 903 passed. Scoped lint passed. Final type/build and hosted browser results are checked separately before reporting completion.
