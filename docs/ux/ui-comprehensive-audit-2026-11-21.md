# Cross-app route, role and edge-state UI audit — 21 November 2026

Follow-up: all four findings below were fixed and regression-tested on 22 November. See the [fixes and verification report](ui-four-fixes-2026-11-22.md). The original audit results are preserved below.

## Result

Four confirmed issues remain. The application cannot yet be described as uniformly consistent across all tested states. This turn changed documentation only; it did not fix application code, commit, deploy or create business records.

| Finding | Reproduction and observed result | Relevant implementation |
| --- | --- | --- |
| Asset read failures masquerade as an empty register | Return HTTP 503 for asset reads and open `/operations/assets`. After loading finishes, the page says “The register is empty” and offers “Register the first asset.” Members, giving and forms show explicit error states under equivalent failures. Reproduced at desktop/mobile widths in both themes. | `src/app/(paper)/operations/assets/page.tsx:157` branches from loading directly to empty/data, without an error branch. |
| Long asset names overflow mobile detail/edit headings | Use a 189-character asset name containing long unbroken text; the accepted name limit is 200. At a 390px viewport, the detail page document grows to 886px and the edit page to 867px in both themes. The edit preview heading also clips/overflows. Normal list rows remain bounded. | Shared headings in `src/components/paper/section.tsx:5`, `:43`, `:98`; preview uses `src/components/shared/create-preview.tsx`. The confirmed repro is assets; other consumers of these headings need regression coverage when fixing. |
| Shared public navigation loses contrast in dark mode | Open `/privacy-policy` in dark mode, also visible on help, offline and payment-return pages. Header background remains `rgba(250, 251, 247, 0.94)`, while navigation foreground becomes `rgb(243, 238, 225)`. Logo text and mobile menu icon become nearly invisible; “Get started” has pale text on a pale button. Confirmed on desktop and mobile. | `src/components/shared/public-paper-shell.tsx` reuses `MarketingNavigation`; hardcoded header background in `src/components/marketing/landing.module.css:63` mixes with inherited dark Paper tokens. |
| Shared public navigation anchors point at the wrong document | On `/privacy-policy`, open mobile navigation and click Pricing. URL becomes `/privacy-policy#pricing`, heading remains Privacy Policy, and no `pricing` target exists. Desktop and mobile links for platform/network/pricing/FAQs use the same local fragments. These should navigate to the corresponding landing-page sections from other pages. | `src/components/marketing/landing-interactions.tsx:309` and `:337` use `#product`, `#enterprise`, `#pricing`, `#questions` inside a component also used outside `/`. |

Evidence:

- [Asset failure displayed as empty](evidence/ui-comprehensive-audit-2026-11-21/asset-error-desktop.jpg)
- [Long asset edit heading on mobile](evidence/ui-comprehensive-audit-2026-11-21/long-asset-edit-mobile.jpg)
- [Dark public header — mobile](evidence/ui-comprehensive-audit-2026-11-21/public-header-dark-mobile.jpg) and [desktop](evidence/ui-comprehensive-audit-2026-11-21/public-header-dark-desktop.jpg)
- [Computed public-header colors](evidence/ui-comprehensive-audit-2026-11-21/public-header-contrast.json)
- [Wrong anchor destination](evidence/ui-comprehensive-audit-2026-11-21/public-navigation-anchor.json)

## Route coverage

Inventoried **104 page templates**: **88 workspace routes** (70 static, 18 dynamic) and **16 public/auth/standalone templates**. Every template received initial route-rendering checks at **1280×900** and **390×844**, in **light and dark mode**. Dynamic workspace pages used existing records, including branch, role, team, service, event, department, cell group, form, sermon, asset, family, member and visitor detail/edit routes. The three legal-page values were checked separately.

[Per-template coverage CSV](ui-comprehensive-route-coverage-2026-11-21.csv) lists the concrete sample paths and four viewport/theme checks. A checked cell means the route/state rendered and was inspected; it does not mean all actions on that page were exercised.

Across baseline routes and extra role/edge scenarios, **570 deduplicated observations** have matching requested/observed viewport and theme. Two extra anonymous-redirect captures requested dark but landed in light; these are excluded from that count. Direct login rendering was separately checked in both themes. Earlier captures that caught stale viewport/theme paint were rechecked; screenshots are supporting evidence, not an automated guarantee of pixel-level consistency.

Checks included page-level horizontal overflow, heading presence, required-label duplication, visible error/denial states, action availability and screenshot review of shared list, detail, form and public layouts. All 352 baseline workspace observations had bounded document widths; none contained duplicate required asterisks or unexpected visible error states in their final DOM observations. The four overflow observations belong to the synthetic long-asset detail/edit reproductions above. Tables can intentionally scroll inside their own containers.

## Roles and plan states

The real signed-in account supplied the Church Admin/HQ baseline. Isolated read-only proxies substituted frontend profile/permission responses for representative role checks; they did not change accounts, permissions or server authorization.

| Frontend role fixture | Allowed representative route | Restricted representative route |
| --- | --- | --- |
| Secretary | Members | Roles |
| Treasurer | Giving records | Members |
| Usher | Services | Roles |
| Department Head | Departments | Giving records |
| Cell Leader | Cell groups | Giving records |
| Branch Pastor | Members | Billing |
| Senior Pastor | Pastoral notes | Integrations |
| Church Admin, branch scope | Branches | HQ baseline covered separately; no extra denied-route browser case |

These representative states were rendered in all four viewport/theme combinations. Restricted routes showed access-denied states. Read-only permissions and a subscription-read-only profile retained asset viewing while hiding create/edit/delete controls. The Essentials fixture displayed the asset plan gate. The subscription-read-only check is a profile flag test, not an actual expired-billing lifecycle test.

Source inspection produced [704 role/route expectations](evidence/ui-comprehensive-audit-2026-11-21/role-route-expectations.json), eight default roles × 88 workspace route templates. This is a source-derived matrix, **not 704 browser sessions or backend authorization requests**.

The focused permission/navigation/plan suites passed: **372 tests in 8 files**. [Test output](evidence/ui-comprehensive-audit-2026-11-21/permission-tests.log).

## Edge cases exercised

- Synthetic API failures for assets, members, giving and forms. Asset failure handling is the confirmed exception above.
- Empty asset/member lists; long member/asset list text; long asset detail/edit/preview titles; missing asset/member records.
- Blank asset form validation: required name, tag and branch errors appeared without duplicate asterisks or document overflow. No asset was created.
- Anonymous protected-route redirect to sign-in with a return destination.
- Anonymous and authenticated subscription entry; payment-return page without a transaction reference. No checkout or payment was submitted.
- Sign-in, first registration step, forgot-password, missing-token reset/invitation states, legal pages, help list/article/contact pages, docs redirects and offline-unavailable state.
- Public form and member-intake layouts using synthetic valid metadata, without submissions.

The proxy blocked every non-GET/HEAD request. Its log recorded two blocked auth-refresh requests and no attempted business-record writes. Theme changes were reversible; the original workspace was returned to the signed-in dashboard in light mode with its viewport override reset. Temporary audit proxy ports were stopped; the application and API were left running, and the browser was kept open.

## Limits

This establishes broad route/layout coverage, not proof that every combination of data, control, dialog, custom theme or role assignment is defect-free. Visual review used the browser's responsive viewport; it was not a physical iOS/Android or cross-engine test.

Frontend role fixtures do not prove backend permission enforcement, tenant isolation or record ownership. Those need separate real-account/API authorization tests. Credential changes, successful invitation/reset flows, CAPTCHA completion, actual payment/renewal flows, offline cache/unlock workflows and consequential create/update/delete/send actions were not exercised end-to-end. Public token-bearing forms used synthetic metadata; reset/invitation pages used missing-token states.

No additional app-wide consistency claim should be made until the four findings are fixed and their affected shared components are regression-tested.
