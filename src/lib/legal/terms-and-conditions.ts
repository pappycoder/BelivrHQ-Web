import type { LegalDocument } from "./types";
import { LEGAL_COMPANY } from "./company";

export const termsAndConditions: LegalDocument = {
  slug: "terms-and-conditions",
  title: "Website Terms and Conditions",
  description:
    "Rules for using the BelivrHQ public website, product information, branding, links, enquiries and public-facing forms.",
  introduction: [
    `These Website Terms and Conditions ("Website Terms") govern use of the BelivrHQ public website and related public information supplied by ${LEGAL_COMPANY.name}, Nigeria ("Company", "BelivrHQ", "we", "us" or "our"). They explain permitted website use, intellectual property, third-party material, enquiries and the allocation of responsibility for public-facing interactions.`,
    "The subscription platform is governed by our separate Terms of Service and the applicable Order. Personal-information handling is described in the Privacy Policy. These documents serve different purposes and should be read together where an activity involves more than one of them. Mandatory law prevails over a conflicting provision.",
    "We make these rules available before account creation and through website links. Express agreement is obtained where required for the relevant transaction. Merely reading a privacy notice is not consent to every processing purpose, and these Website Terms do not claim that an unnoticed footer link alone creates every possible contractual obligation.",
  ],
  highlights: [
    "You may browse and use public information for lawful evaluation and legitimate enquiries. Restricted accounts and data require separate authorisation.",
    "Product previews and general descriptions are not guarantees of every plan, delivery date, service level or business outcome.",
    "Our brand, software and original website material remain protected. Customer and third-party content belongs to its respective owner.",
    "Limits on website liability preserve non-excludable consumer, privacy and other legal protections.",
  ],
  sections: [
    {
      id: "operator",
      title: "1. Operator, scope and document priority",
      paragraphs: [
        `The website is operated for BelivrHQ by ${LEGAL_COMPANY.name}, based in ${LEGAL_COMPANY.country}. Our designated legal and privacy contact is ${LEGAL_COMPANY.email}. This contact is available to visitors who do not have a BelivrHQ account.`,
        "These Website Terms cover public pages, product descriptions, Help Centre content, publicly available resources and ordinary enquiries. They do not independently grant access to a church workspace, a member record, an administrator function or a private download. An invitation or public link has only the scope the relevant feature actually permits.",
        "For subscribed platform activity, the Terms of Service and any applicable signed Order or processing addendum take priority on their subject. For a donation, event registration or church-created public form, the church’s separate relationship with the participant also matters. We do not acquire the church’s responsibilities as organiser or recipient simply by supplying the website or underlying software.",
      ],
    },
    {
      id: "eligibility",
      title: "2. Eligibility and lawful use",
      paragraphs: [
        "You may browse public information for a lawful purpose. Creating or administering a customer account, purchasing the Service or acting for an organisation requires the age, capacity and authority stated in the Terms of Service. If someone else uses a device you control, take reasonable steps to prevent them from accessing your private sessions or downloaded records without permission.",
        "You must comply with applicable law and respect the rights of the Company, customers, providers and other people. Do not misrepresent your identity, authority or affiliation. A church name, logo, domain reference or invitation is not evidence that the Company has endorsed the church’s doctrine, management, fundraising or events.",
      ],
    },
    {
      id: "permitted-use",
      title: "3. Permitted use of website material",
      paragraphs: [
        "You may view public pages, follow ordinary navigation, print or save reasonable extracts for personal use or an organisation’s internal evaluation, and refer people to publicly available pages. Preserve relevant ownership notices and do not alter an extract so that it misrepresents the original meaning, price, date or scope.",
        "A specific download or third-party item may carry its own licence or usage conditions. Those conditions apply to that item. Public access is not a licence to copy our whole website, redistribute paid resources, extract proprietary software or claim ownership of our original material.",
        "Use of our legal policies to understand your relationship with BelivrHQ is permitted. Their wording is specific to our product and processing; their publication is not an assurance that they are appropriate for an unrelated organisation or service.",
      ],
    },
    {
      id: "restrictions",
      title: "4. Prohibited activities and technical misuse",
      bullets: [
        "Do not interfere with website operation, overload infrastructure, introduce malware, disrupt another visitor or intentionally trigger abusive traffic.",
        "Do not attempt unauthorised access, credential attacks, interception, tenant-boundary probing or circumvention of protective controls, authentication, rate limits or payment restrictions.",
        "Do not scrape private information, harvest contact details, collect children’s or sensitive records without authority, or use public content to support spam, fraud, harassment or an unlawful purpose.",
        "Do not copy protected design, text, branding or software in a way that infringes rights, use deceptive lookalike pages or domains, or remove or falsify ownership notices.",
        "Do not submit unlawful, defamatory, threatening, exploitative, discriminatory or infringing material through enquiries, support or public features.",
        "Do not conduct penetration tests, load tests or vulnerability experiments against production services without a prior written authorisation defining targets, limits and permitted methods.",
        "Do not evade an access restriction or use an integration, bot or automated request pattern to obtain access beyond the ordinary scope offered to you.",
      ],
      paragraphs: [
        "We may take proportionate protective steps, investigate credible abuse, preserve appropriate evidence and report unlawful activity where permitted or required. Blocking a harmful request is not permission to pursue unrelated private information about a visitor. Authorised search indexing of public pages remains subject to applicable law and the access instructions published for the site.",
      ],
    },
    {
      id: "ownership",
      title: "5. Intellectual property and branding",
      paragraphs: [
        "The Company or its licensors own the rights in the BelivrHQ brand, original site content, interface assets, software and documentation, except for material clearly belonging to a customer or another rights holder. Copyright, trademark, software and other rights are reserved except for the permissions expressly granted.",
        "Do not use BelivrHQ or PappyCoder Technologies Limited branding to imply sponsorship, certification, partnership or official status without permission. You may make a truthful textual reference to the product where lawful, but must not mislead people about your relationship with us.",
        "A third-party logo on an integration page identifies a compatible or discussed service and does not by itself prove a formal partnership or endorsement. Third-party marks remain the property of their owners. Customer-uploaded church names, images, sermons and other material remain subject to their owners’ rights and permissions.",
      ],
    },
    {
      id: "product-information",
      title: "6. Product descriptions, previews and availability",
      paragraphs: [
        "Website content is intended to explain the product accurately, but general information can become outdated or contain an error. We may update or correct it. A screenshot, illustrative dataset, product preview or example workflow may not show the exact features, permissions, records or third-party settings available to a particular customer.",
        "Check the current plan information, service scope and applicable Order before purchasing. Access can depend on role, branch, subscription status, integration readiness and supported device or browser. A page visible in a demonstration does not grant a right to use a paid or restricted function.",
        "A roadmap, discussion or marketing example is not a binding promise of a future feature, launch date, guaranteed performance, unlimited storage or a particular business result unless expressly incorporated into the Order by an authorised representative. This qualification does not permit misleading advertising or remove remedies for an actionable representation or an expressly agreed commitment.",
      ],
    },
    {
      id: "prices",
      title: "7. Prices, quotations and purchases",
      paragraphs: [
        "Public starting prices, yearly savings and currency conversions describe the offers shown with them. They may depend on the plan, period, supported currency, quotation date and stated eligibility. The amount and currency you authorise at the applicable checkout or in an accepted Order control the purchase, subject to law and correction of an actual error.",
        "Third-party messaging, calling and payment processing can carry separate provider charges. A BelivrHQ software price does not automatically include a provider balance, donor transaction fee, message credit or custom implementation work. Enterprise scope must be separately agreed where the public offer says so.",
        "Subscriptions, activation, manual renewals, prorated upgrades, downgrades, cancellation and refunds are addressed in the Terms of Service. Do not send money to an unverified destination merely because a person claims to represent BelivrHQ. Use the identified checkout or a verified written arrangement, and report suspected impersonation.",
      ],
    },
    {
      id: "enquiries",
      title: "8. Enquiries, feedback and support communications",
      paragraphs: [
        "Provide accurate, relevant information in enquiries and do not send secrets, complete databases or unnecessary sensitive records. You must have authority to disclose material you send. An initial enquiry or unsolicited proposal does not by itself create a confidential advisory relationship, a professional retainer or a promise to adopt or pay for an idea.",
        "We may use ordinary product suggestions to improve our services without compensation unless a separate agreement says otherwise. That permission does not authorise unlawful personal-information processing or disclosure of information protected by a valid confidentiality obligation.",
        "Support channels are for legitimate product or service matters and are not emergency, legal, medical, financial or safeguarding services. Administrator live chat may require an eligible account. Visitors can use the designated email for legal or privacy matters without obtaining that account status. A support response does not amend a contract unless it records an authorised agreement to do so.",
      ],
    },
    {
      id: "public-forms",
      title: "9. Church forms, events, giving and uploaded material",
      paragraphs: [
        "A church may use BelivrHQ to publish a form, register participants, issue event tickets, distribute media, record giving or send a receipt. That church determines the activity’s purpose, the questions asked, the intended audience, eligibility and its own promises to participants. Read the church’s own information and contact it about the underlying activity.",
        "Do not submit information about another person without appropriate authority, unnecessary sensitive information or misleading details. Before supplying children’s information, the responsible adult and church must consider any required guardian authorisation and safeguards. A publicly reachable link should not be treated as a confidential private counselling channel.",
        "A generated ticket, receipt, confirmation or report is based on the relevant platform and customer records. It is not, merely because it bears software branding, a Company guarantee of an event, a verified charitable status, tax relief, refund entitlement or final provider settlement. The Company remains responsible for its own errors or legal duties to the extent required by the applicable agreement and law.",
      ],
    },
    {
      id: "external-services",
      title: "10. External links, embeds and providers",
      paragraphs: [
        "Links or embedded content can lead to payment processors, communications providers, social platforms, video hosts, regulator websites and other independent services. Those services can have separate terms, privacy practices, cookies, charges and account requirements. We do not control every external page or guarantee that it remains accurate, available or secure.",
        "An external link is not automatically an endorsement, and a provider’s use in the platform does not make it our agent for every purpose. Exercise appropriate care before providing information or paying on another service. We remain responsible for our own selection, representations and contractual or statutory duties where those apply.",
        "If you operate a site linking to BelivrHQ, link fairly to public pages and avoid deceptive framing, implied affiliation or presentation that obscures the source. Do not link in a way that facilitates unlawful access to private resources. We may request removal of a misleading or unlawful presentation where we have a legitimate basis.",
      ],
    },
    {
      id: "privacy",
      title: "11. Privacy, cookies and public disclosure",
      paragraphs: [
        "Our Privacy Policy describes the information we and churches may process, relevant legal roles, provider categories, browser storage, international processing, retention and rights. A church’s own privacy notice also applies to its collection and use. Acceptance of commercial conditions does not waive privacy rights or supply every consent required by law.",
        "Information voluntarily posted publicly, sent to an incorrect recipient or downloaded by an authorised person can leave the ordinary workspace controls. Do not publish private records or assume that removing a source link recalls every recipient’s copy. Use secure, proportionate channels for privacy requests and sensitive evidence.",
      ],
    },
    {
      id: "availability",
      title: "12. Website operation and no professional advice",
      paragraphs: [
        "The website may be unavailable or interrupted for maintenance, faults, security controls, capacity issues or events affecting infrastructure or providers. Public browsing does not include a service-level or uptime guarantee. Purchased platform commitments and mandatory service standards are governed separately and are not cancelled by this clause.",
        "Help articles, product explanations, assistant responses and general resources are informational. They are not a substitute for legal, tax, accounting, medical, safeguarding or other professional advice about your particular situation. Verify decisions and obtain appropriate advice where the activity requires it.",
        "We take reasonable care with published material, but do not promise that every public resource is complete, current or suitable for every country or organisation. We will not rely on this qualification to excuse fraud, gross negligence, a misleading claim or another non-excludable obligation.",
      ],
    },
    {
      id: "liability",
      title: "13. Liability and non-excludable rights",
      notice:
        "IMPORTANT: To the extent lawfully permitted, the Company excludes indirect or consequential loss arising only from use of free public website information. Mandatory consumer remedies, privacy rights and liability for fraud, wilful misconduct, gross negligence or any other non-excludable matter remain unaffected.",
      paragraphs: [
        "For paid Service claims, the specific liability provisions in the Terms of Service and applicable Order govern; this page does not create a second, lower cap or erase an agreed remedy. For public-site use, responsibility depends on the actual conduct, causation, relevant legal duties and any enforceable agreement.",
        "We are not automatically responsible for another person’s unlawful publication, a church’s event promise or an independent provider’s entire service. That statement does not exclude our own actionable contribution or a duty the law places on us. A visitor is responsible for their own unlawful acts; an ordinary visitor does not assume an unlimited indemnity merely by reading the website.",
        "Nothing in these Website Terms excludes a statutory guarantee, reverses a mandatory burden of proof, shortens a statutory claim period or prevents a complaint to a competent regulator or court. If a limitation is prohibited or unreasonable under the law that applies, it operates only to the lawful extent.",
      ],
    },
    {
      id: "complaints",
      title: "14. Complaints, security reports and rights-holder notices",
      paragraphs: [
        `Send a complaint or legitimate report to ${LEGAL_COMPANY.email}. Identify the relevant URL or feature, what happened, the approximate date, your relationship to the matter and a safe reply channel. For an intellectual-property claim, identify the protected work, the material complained about and your authority to act. For a payment issue, include the reference rather than secret credentials.`,
        "A responsible security report should describe the issue without exploiting it beyond permission, accessing another person’s data, causing disruption or making a public disclosure that unnecessarily increases harm. Acknowledging a report is not authorisation for further testing or a promise of a bounty, reward or immunity from applicable law.",
        "We may seek reasonable clarification, preserve proportionate evidence and restrict affected material while reviewing a credible issue. A report does not automatically establish wrongdoing or entitle a reporter to private customer information. Statutory reporting and data-subject rights remain available independently.",
      ],
    },
    {
      id: "law",
      title: "15. Applicable law and disputes",
      paragraphs: [
        "These Website Terms are governed by the laws of the Federal Republic of Nigeria, subject to mandatory protections that apply despite that choice. Disputes can be brought before courts of competent jurisdiction in Nigeria without depriving a person of a mandatory forum or remedy available elsewhere.",
        "We encourage a good-faith attempt to resolve concerns through the designated contact. This is not a requirement to abandon a regulatory complaint, urgent court application or protective filing. These Website Terms do not impose compulsory foreign arbitration, a class-action waiver or a prohibition on lawful criticism, protected disclosures or reports to authorities.",
      ],
    },
    {
      id: "changes",
      title: "16. Changes, severability and contact",
      paragraphs: [
        "We may revise these Website Terms as the website, services or relevant requirements change. The displayed version and date identify the published text. Material changes will be brought to attention where required or appropriate, and express renewed agreement will be requested where legally required rather than presumed from a notice alone.",
        "An invalid or unenforceable provision is limited or severed to the extent permitted, without automatically invalidating the rest. A delay in enforcement is not necessarily a waiver. No modification retroactively removes a mandatory right or an accrued remedy.",
        `Operator: ${LEGAL_COMPANY.name}. Country: ${LEGAL_COMPANY.country}. Designated BelivrHQ privacy, legal and contractual contact: ${LEGAL_COMPANY.email}. For registered-office or formal-service details required for a particular procedure, contact the Company through that address.`,
      ],
    },
  ],
};
