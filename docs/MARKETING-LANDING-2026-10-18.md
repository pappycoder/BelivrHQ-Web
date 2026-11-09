> Current pricing: USD $10/$20/$40 monthly and $108/$216/$432 annually, with a shared currency selector and server-locked converted payment quotes. See [Subscription currencies](../../BelivrHQ-Backend/docs/SUBSCRIPTION-CURRENCIES-2026-10-19.md); this supersedes the original NGN pricing examples below.

# Public BelivrHQ landing page

The public `/` route now presents BelivrHQ with a warm cream, deep teal and lime visual identity, editorial typography, an interactive illustrative workspace, product features, branch/HQ information, provider integrations, proposed pricing and FAQs. Existing registration and sign-in routes remain the destinations for account actions.

The landing page links published plans to registration and the organization-owned subscription checkout described in AUTH-ONBOARDING-AND-BILLING-2026-10-18.md. Enterprise pricing, billing terms and rollout scope are negotiated directly with the BelivrHQ team, with no advertised amount or fixed-price checkout. Member/staff limits are not enforced by this page.

## Recommended launch packages

| Plan | Monthly | Yearly | Proposed capacity | Additional features |
| --- | ---: | ---: | --- | --- |
| Essentials | ₦10,000 | ₦108,000 | 100 members, one location, two staff | Directory, services/attendance, visitor follow-up, permission-based access |
| Community | ₦20,000 | ₦216,000 | 300 members, one location, five staff | Giving/receipts, events/registrations, departments/cell groups, forms/reports, email provider |
| Network | ₦40,000 | ₦432,000 | 1,500 members, three locations, 15 staff | Branch/HQ workspaces, SMS/WhatsApp, tickets/check-in, pastoral care, assets, administrator analytics |
| Enterprise | Negotiated | Negotiated | Agreed member/location/team limits | Network rollout, HQ oversight, provider/payment integrations, scoped onboarding and support |

Essentials, Community and Network yearly plans save 10% against twelve monthly payments. Effective monthly rates are ₦9,000, ₦18,000 and ₦36,000 respectively; full yearly totals appear beside them. Enterprise pricing and billing terms are negotiated, with no listed minimum or automatic yearly discount. Third-party usage/transaction charges are excluded. Taxes, final limits, support terms and availability require confirmation during onboarding. Validate hosting, storage and support costs before commercially committing to these proposals.

Initial pricing research used the official [Churchplus pricing page](https://churchplus.co/pricing/) and [Planning Center pricing page](https://www.planningcenter.com/pricing). The current packages follow the user's revised ₦10,000 monthly minimum and request for modest yearly discounts. All free-plan wording has been removed. On 2026-10-19, the user increased Essentials from 50 to 100 members while retaining its prices, one location and two staff accounts. Backend entitlement enforcement is planned in `../../BelivrHQ-Backend/docs/SUBSCRIPTION-ENTITLEMENTS-PLAN-2026-10-19.md` and is not implemented by this display change.

## Implementation boundaries

- The root page renders its content on the server; navigation, preview tabs and pricing/dialog interactions are small client components. No new runtime packages, external fonts or remote images are required.
- Both unauthenticated AuthProvider path checks explicitly allow `/`. Protected routes retain existing middleware and permission guards. No private backend requests are needed to render the landing page.
- All product-preview names/counts are illustrative and labelled as example data. There are no invented customer endorsements, compliance badges, security certifications or uptime guarantees.
- The pricing/features data lives in `src/components/marketing/plans.ts`. It is intentionally independent of authorization and billing.
- The landing stylesheet is scoped to the marketing components and remains light regardless of the application theme. Responsive layouts support 320px upward; reduced-motion preference, keyboard tabs, skip navigation and accessible dialogs are supported.

## Verification

Production build and scoped ESLint passed, along with all 298 existing frontend unit tests and all nine focused Playwright tests. The browser suite covers public access after the session check, no private API fetches, protected-route redirects, keyboard preview tabs, pricing calculations/dialog links and focus restoration, FAQ/anchor links, mobile navigation and layouts at 320/390/768/1440px. Desktop, full-page, pricing and mobile screenshots under `/tmp/belivrhq-landing-*.png` were visually reviewed. The existing UI contract audit reported no issues across 87 pages and 433 links.

This change is local; it does not publish or deploy the website.
