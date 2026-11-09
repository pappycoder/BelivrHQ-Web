# BelivrHQ legal pages — implementation and review notes

Prepared 24 October 2026 for the BelivrHQ website. These are product-specific drafts for the operator to adopt after appropriate Nigerian legal and operational review. Publishing text does not establish regulatory compliance, complete a provider contract, appoint a DPO or make every proposed clause enforceable.

## Operator details supplied by the owner

- Operator: **PappyCoder Technologies Limited**, based in **Nigeria**.
- Designated privacy, legal and contractual email: **lucasdeekay98@gmail.com**.
- Registered-office address and registration number were not supplied. Neither has been invented. Confirm any required corporate disclosures and physical/formal-service details before external reliance.
- The owner expressly designated the Gmail address. A personally named mailbox can be used operationally as the designated company contact, but ensure reliable access, monitoring, multi-factor authentication, continuity and appropriate handling of requests. Use a company-controlled mailbox when available. The website does not claim that this mailbox is a DPO appointment or certification.

## Published page content and boundaries

| URL | Document | Scope |
| --- | --- | --- |
| `/privacy-policy` | Privacy Policy | Controller/processor roles; religious and children's data; collection, lawful purposes, provider categories, sharing, AI, scoring, storage, transfers, retention and rights |
| `/terms-of-service` | Terms of Service | Organisational subscription contract; orders, manual renewal, fees, provider costs, payments, refunds, duties, processing terms, IP, confidentiality, suspension, termination, indemnity, liability and disputes |
| `/terms-and-conditions` | Website Terms and Conditions | Public website, product descriptions, branding, use restrictions, enquiries, links, public church activities and public-site responsibility |

The documents have 69 numbered sections in total, approximately 14,000 words including headings and review metadata. Terms of Service govern platform purchases; Website Terms supplement public use; the privacy notice is not treated as blanket consent. Separately signed applicable agreements and mandatory law take priority on the relevant subject. Three independent copies of the same contract were deliberately avoided so their refund, liability and data provisions do not conflict.

Company information and email live in `src/lib/legal/company.ts`. Document content lives in adjacent typed modules and renders through a shared accessible server component, with a table of contents, contact link, responsive tables and print/PDF styles. Static legal paths are publicly accessible without a session and have public metadata/canonical URLs and sitemap entries. Marketing, authentication, Help Centre and checkout surfaces link to the documents. Root private-page metadata is overridden for the public documents; preview deployments keep the existing noindex rules.

`npm run legal:export` generates the reviewable Markdown files in this directory directly from the same source used by the website. Edit the source, not an exported copy. Regenerate after changing the operator/contact. A substantive policy or contract revision requires an appropriate version/date change, preservation of the previous text and any legally necessary notice, consent or renewed agreement.

## Agreement at registration

The final registration step requires an initially unchecked agreement box identifying age/authority and linking the Terms of Service and Website Terms. Privacy Policy acknowledgment is distinguished from marketing or other processing consent. A prominent notice specifically flags payment/refund rules, customer responsibility, customer indemnity and liability limits, with a direct link to sections 24–25 before signup.

The web request supplies `termsAccepted: true` and `acceptedTermsVersion`. The API validates the declared pair before calling Supabase. It adds a server-generated timestamp and document versions to registration auth metadata and the existing registration audit event. This requires deploying the API before or alongside the updated web registration; older API validation would reject the new properties. No schema migration is required.

Older clients omitting both fields remain compatible. **Omission is not logged as acceptance.** Existing users have not automatically reaccepted the new documents, and mobile/older clients are not certified to present this agreement flow. The records are evidence of the submitted declaration, not a claim of an immutable signature service: ordinary audit retention and the mutability/administration of auth metadata must be considered. Decide on a durable agreement-evidence and renewal/reacceptance process with counsel if stronger proof is required. Existing account records were not backfilled and no legal-notice emails were sent.

## Legal basis consulted

Original contract and notice wording was drafted for this product. The following official materials informed the identified legal constraints; this is not a representation that all laws or a regulator's complete framework have been exhaustively audited.

- [Nigeria Data Protection Commission: Act overview and official materials](https://ndpc.gov.ng/ndp-act-2023/) and [regulator FAQs](https://ndpc.gov.ng/faqs/): Nigerian data-protection scope, sensitive information, rights and transfer considerations.
- [NDPC General Application and Implementation Directive 2025](https://ndpc.gov.ng/wp-content/uploads/2025/07/NDP-ACT-GAID-2025-MARCH-20TH.pdf): the implementing framework was identified from official indexed materials. The PDF endpoint returned access restrictions to the browsing tool; do not describe that as a complete clause-by-clause verification of the directive.
- [Federal Competition and Consumer Protection Act 2018, official FCCPC publication](https://fccpc.gov.ng/wp-content/uploads/2022/07/FCCPA-2018.pdf), particularly sections 128–130: draw onerous provisions to attention; preserve non-excludable rights and gross-negligence liability; account for statutory service remedies. These provisions informed the conspicuous notices and the express exceptions, rather than an absolute “no liability/no refunds” approach.
- [FCCPC complaint information](https://fccpc.gov.ng/about-us/faqs/): private support procedures must not be presented as extinguishing access to the regulator or courts.

## Product facts checked in the repository

- Platform subscriptions currently renew manually; renewal reminders do not authorise auto-debits. Recurring church giving is a separate feature and mandate.
- New platform subscription checkout uses Flutterwave; historical Paystack verification and church-selected Paystack/Flutterwave accounts remain distinct.
- Churches configure their own communications/payment accounts and incur their provider costs. Platform authentication and company notifications use their separate organisation email path.
- Auth/data/file operations use the configured Supabase/PostgreSQL/hosting infrastructure; deployment caching can use Redis/Upstash. Provider options are identified conditionally, not as a representation every provider receives all records.
- Tawk.to can load for eligible active administrators on supported workspace/help pages. No universal cookie preference manager is currently claimed.
- Optional assistant synthesis sends questions, recent question context, references and verified access facts to OpenAI, with `store: false`. That flag does not establish zero retention of every provider operational record. The feature is product guidance, not unrestricted record access or an agent that changes data.
- Pastoral scoring can generate indicators from church activity. The notice distinguishes these administrative indicators from significant decisions and identifies the need for human review.
- Principal session cookies are HttpOnly with configured browser persistence up to 30 days; token validity/revocation can differ.
- The current maintenance processor uses approximately 365 days of inactivity for certain member cleanup and approximately two years for audit cleanup. No unsupported 30-day account erasure, guaranteed backup deletion, certification, universal data residency or uptime commitment was invented.

## Matters requiring company/legal review

1. Confirm registered-office and registration disclosures, the company-controlled notice process, and who is authorised to approve these documents. Confirm whether a DPO or registration as a controller/processor of major importance is required; the pages make no unsupported claim that these steps are complete.
2. Review the actual controller/processor allocation and the processing terms in section 16, including required written provider arrangements, processor-change notices, incident handling, rights assistance and lawful international transfer instruments. Actual production locations/contracts were not independently verified by this task.
3. Review the proposed commercial choices: 12-month affected-service fee cap subject to exceptions; specified organisational customer indemnity; qualified refunds; convenience-termination unused-fee treatment; Nigeria governing law subject to mandatory protections; and absence of forced arbitration or a blanket consumer waiver.
4. Confirm operational ability to meet notices, support, return/deletion and refund commitments. These are contract provisions the company must be ready to honour, not proof of automated workflows. No live refund, cancellation, data-export/deletion or notice process was executed.
5. **Retention needs a specific operational review.** The existing nightly cleanup treats old inactive members as deletion candidates and deletes linked records, including some financial records. Its source comments incorrectly describe a universal regulatory grace period. The policy explicitly calls these application settings rather than statutory periods. The worker has not been changed by this task; assess legal holds, financial-record preservation, customer instructions, inactive versus erased status and backup lifecycle before relying on housekeeping as a compliance strategy.
6. Assess prior-consent and withdrawal requirements for optional chat, embeds or tracking in relevant markets. The policy accurately describes the current automatic administrator widget; the signup agreement is not a cookie consent manager or marketing opt-in. A notice alone cannot supply controls a particular law requires.
7. Confirm sensitive religious/pastoral processing conditions, parental/guardian procedures, public-form disclosures, profiling explanations and human-review arrangements. A customer's agreement is not automatically every member's or child's valid consent.
8. Have qualified Nigerian counsel review final adoption and any applicable international requirements. No document can lawfully immunise the company from fraud, gross negligence, mandatory consumer/data-protection duties or regulatory enforcement.

## Deployment and validation

Deploy API and web together (API first is compatible with the old web); no database migration. The work is prepared locally and does not itself publish the site, email users, send provider messages, change live settings or manufacture historical agreement evidence. Validation results are recorded in the project changelog after automated and browser checks finish.

### Completed checks

- Backend: 46 authentication/registration tests passed, including matching metadata/audit versions and server timestamps, no invented acceptance for older clients, rejection before signup for false/missing/stale declarations, and rejection of boolean-like strings/numbers even with implicit DTO conversion.
- Web: 30 focused unit checks passed for public navigation, SEO boundaries and the existing secure registration-session boundary.
- Browser: 26 existing registration/subscription/authentication checks passed, plus 9 legal-page checks (35 total). The legal checks cover all three documents at 390px and 1440px, unauthenticated access, working section anchors, designated email contact, no page overflow or public-page chat load, canonical paths, print visibility, footer links and blocked registration without an explicit agreement.
- Backend and web production builds, TypeScript checks, targeted ESLint and `git diff --check` passed. Mobile screenshot reviewed. Markdown export regenerated from the current source.

Browser checks use local fixtures; they do not prove inbox placement, provider retention, live legal-notice delivery or regulatory compliance.
