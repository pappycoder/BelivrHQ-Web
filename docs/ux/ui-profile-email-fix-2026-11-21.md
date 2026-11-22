# Profile header email wrapping — 21 Nov 2026

The profile header email uses overflow-wrap:anywhere so long addresses stay within their identity column. The avatar/header layout and profile data are unchanged.

Validation: scoped ESLint, non-incremental TypeScript, diff whitespace check and fresh production build (114 pages) passed. Six browser checks cover 1280px, 390px and 320px in light and dark mode. All six have email scrollWidth equal to clientWidth, computed overflow-wrap:anywhere and no page-level horizontal overflow. At 320px the existing email wraps to two lines (43px high) inside its 155px column, instead of overflowing by 20px; at 390px/desktop it stays on one line. The browser initially served stale profile code after a development restart; only measurements taken after the fresh production build showed the new class and count as final verification.

No form was submitted or account data changed. Light mode/default viewport restored; the real profile preview and frontend/API remain running. No deployment performed.

Evidence: [six final checks](/tmp/belivrhq-profile-email-fixed-checks.json), [320px dark screenshot](/tmp/belivrhq-profile-email-fixed-320-dark.png).
