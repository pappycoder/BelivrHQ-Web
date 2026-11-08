# Loading-state audit and fixes — 8 November 2026

Content fetching now uses skeletons shaped like its destination. Field labels and native/Select placeholders are italic throughout the application; entered values and selected values remain upright. Screen-reader loading labels remain available through `role="status"`, `aria-label`, `aria-busy` and visually hidden text.

Public member/visitor registration now follows the Paper design of church-created forms: church identity at the top, a coloured introduction panel, question/required counts, and a separate response card. Its loading state reserves those same regions with branding, heading, paragraph, pill and field skeletons. A church logo is never guessed while metadata loads.

## Pages and tabs changed

| Page or route | Loading area fixed |
| --- | --- |
| `/register/public/[token]` | Complete member/visitor public registration skeleton and redesigned loaded form |
| `/people/members` | Pending registrations tab |
| `/people/visitors` | Pending registrations tab |
| `/people/members/import` | Spreadsheet parsing prompt |
| `/people/visitors/import` | Spreadsheet parsing prompt |
| `/gatherings/attendance/check-in` | General attendance section |
| `/gatherings/attendance/services/[serviceId]` | General attendance section |
| `/gatherings/events/[eventId]` | General attendance section |
| `/gatherings/events/check-in` | General attendance section |
| `/gatherings/groups/[deptId]` | General attendance, individual meeting attendance and shared result-count badges |
| `/gatherings/groups/cell/[groupId]` | General attendance, individual meeting attendance and group giving |
| `/operations/assets` | Asset drawer: maintenance history, loan history and QR-code preview |
| `/operations/assets/[assetId]` | Asset drawer: maintenance history, loan history and QR-code preview |
| `/operations/assets/loans` | Asset selector, loan records and result-count badge |
| `/operations/assets/maintenance` | Asset selector, maintenance records and result-count badge |
| `/admin/channels` | Integrations cards |
| `/admin/team` | Create/edit staff dialog branch selector |
| `/subscription` | Account/access gates, subscription cards, payment quote, converted prices and exchange-rate metadata |
| Checkout popup opened from `/subscription` | Skeleton payment-page placeholder before the provider URL is ready |
| `/register` | Guest/session gate, converted plan prices and post-registration subscription hand-off |
| `/login` | Guest/session gate |
| `/accept-invitation` | Invitation form initialization |
| `/reset-password` | Form/Suspense fallback |
| `/help/contact-support` | Chat availability section |
| `/docs` | Legacy Help Centre redirect, retaining its fallback link |
| `/offline` | Workspace busy/content placeholder |
| `/` | Converted starting price, plan cards, annual billing notes and plan modal prices |

## Shared sections changed

- Assistant drawer: access context, incoming reply, scope and pending composer hint, wherever the assistant is mounted.
- Member-attendance roster and its load-more placeholder; the reusable church roster inherits these changes.
- Shared workspace count badges: a loading count is now a small skeleton rather than an ellipsis.
- `LoadingState`: default and legacy `spinner` callers now render skeletons. Added form and inline variants alongside table, cards and detail variants. Inline skeletons use phrasing markup and can safely appear inside buttons, captions and paragraphs.
- `SubscriptionPrice`: converted prices render an inline skeleton while the quote is pending. The pricing hook's internal string fallback is never used as visible loading copy; unavailable quotes retain the error state.

## Audit coverage

Searched all application TS/TSX for loading/fetching/searching/checking/calculating/parsing copy, inspected conditional loading branches, and followed shared components to their page hosts. A source-level regression test rejects bare loading paragraphs in application JSX. Existing skeletons in `/forms/public/[publicToken]`, private form fill/edit/detail pages, directory tables, charts and combobox results were retained.

Save/send/upload/export buttons keep their operation progress indicators. Persistent transaction states, such as a payment still awaiting provider confirmation, remain explanatory content. These are separate from content-fetch placeholders.

## Verification

Unit coverage checks every shared loading variant, screen-reader labels, hidden visual loading copy, converted-price pending/error handling and the JSX loading-copy audit. Browser coverage delays responses to inspect desktop/mobile registration skeletons, checks the redesigned ready form, verifies italic labels/placeholders with upright entered values, and exercises pending-registration and converted-price loading. Existing registration, public form, field-feedback and account-flow tests provide regression coverage.

Results: all 601 unit tests and 52 distinct focused browser checks passed, along with TypeScript, scoped ESLint without autofix and the production build. Desktop, 390 px and 320 px registration layouts were checked; desktop and 320 px screenshots were visually inspected.

Deploy the web app only. No API, database or environment changes are required.
