import type { LegalDocument } from "./types";
import { LEGAL_COMPANY } from "./company";

export const termsOfService: LegalDocument = {
  slug: "terms-of-service",
  title: "Terms of Service",
  description:
    "The subscription agreement governing ChurchOS accounts, customer responsibilities, payment, data processing, service availability and allocation of risk.",
  introduction: [
    `These Terms of Service ("Terms") govern access to the ChurchOS hosted platform and related account, support and subscription services supplied by ${LEGAL_COMPANY.name}, Nigeria ("Company", "ChurchOS", "we", "us" or "our"). "Customer" or "you" means the church, ministry or other organisation subscribing to the service; an individual user must also comply with obligations applicable to that user.`,
    "An authorised representative accepts these Terms when expressly agreeing during registration or another acceptance process. A person acting for an organisation represents that they have authority to bind it. If you do not have that authority, do not create or purchase a workspace on its behalf. Access by invited users is subject to the customer’s valid agreement and each user’s applicable obligations.",
    "These Terms include provisions on payment, customer responsibility, suspension, customer indemnity, warranty qualifications and limits of liability. Those provisions allocate commercial risk and should be read before acceptance or payment. They do not exclude any right, duty or remedy that cannot lawfully be excluded.",
  ],
  highlights: [
    "Subscriptions currently renew manually. Review the plan, billing period, currency and exact checkout amount before authorising payment.",
    "The customer remains responsible for lawful collection and use of church records, staff access, communications and connected provider accounts.",
    "Liability limitations and the customer indemnity appear in sections 24 and 25, subject to express exceptions for non-excludable liability.",
    "Donations and church event payments are separate from ChurchOS subscription fees. ChurchOS is a software provider, not the recipient church or a bank.",
  ],
  sections: [
    {
      id: "definitions",
      title: "1. Definitions and contract structure",
      paragraphs: [
        "‘Service’ means the ChurchOS hosted software and related functions made available under the selected plan. ‘Workspace’ means the customer’s church environment, including its branches and authorised users. ‘Customer Data’ means records, files, messages, form responses, personal information and other material submitted to or generated for the customer through the Service. ‘Authorised User’ means a person the customer validly permits to access its workspace. ‘Order’ means a checkout, accepted quotation or separately signed order identifying the service, plan, term, price or additional scope.",
        "The Order identifies commercial selections; these Terms supply the general service conditions. Our Website Terms and Conditions govern public website use and supplement the acceptable-use rules. Our Privacy Policy explains personal-information practices. It is not an unrestricted licence to process personal information or a substitute for a required controller–processor agreement.",
        "If documents conflict, mandatory law prevails. A separately signed agreement or processing addendum controls the subject it expressly addresses. An Order overrides these Terms only for its expressly stated commercial scope or identified exceptions. The data-processing provisions in section 16 control processor activities; these Terms otherwise control the Service over general Website Terms. The Privacy Policy does not reduce statutory privacy rights.",
      ],
    },
    {
      id: "eligibility",
      title: "2. Eligibility, authority and permitted customers",
      paragraphs: [
        "An account holder must be at least 18, legally capable of contracting and authorised for the access they request. Information supplied at registration must be accurate and kept reasonably current. You must not impersonate a church, administrator, provider, donor or another person, register using an identity you do not control, or misrepresent authority over an organisation.",
        "The Service is offered for lawful church, ministry and related organisational administration. You must determine whether your intended activity is lawful and suitable in each relevant location. Access is not permitted where prohibited by applicable sanctions, export controls or another binding restriction. We may reasonably request information needed to verify an account, resolve competing ownership claims or satisfy legal obligations.",
        "A person acting only as an employee or volunteer does not automatically become personally responsible for the customer’s subscription debt solely by being invited. That person remains responsible for their own unlawful acts, misuse of credentials and obligations expressly applicable to individual users.",
      ],
    },
    {
      id: "licence",
      title: "3. Access licence and reserved rights",
      paragraphs: [
        "Subject to the Order, payment where required and compliance with these Terms, we grant the customer a limited, non-exclusive, non-transferable right during the authorised service period to let its Authorised Users access the Service for the customer’s internal lawful activities. This is access to hosted functionality, not a sale of the platform, source code, infrastructure, underlying models or intellectual property.",
        "You may not resell, sublicense, lease or commercially provide shared access to unrelated organisations without our written agreement. A multi-branch plan permits the locations and organisational scope allowed by that plan; it does not permit an undisclosed hosting or resale business. Technical access to an endpoint does not expand the licence or override permissions, quotas or plan restrictions.",
        "Rights not expressly granted remain with their owner. We may use technical controls to protect subscription entitlements, tenant boundaries, service integrity and authorised access, subject to applicable law and the commitments in these Terms.",
      ],
    },
    {
      id: "accounts",
      title: "4. Accounts, administrators and access security",
      paragraphs: [
        "The customer appoints its administrators and remains responsible for inviting suitable users, selecting branches, assigning roles, reviewing permissions and removing access promptly when employment, volunteering or other authority ends. HQ access permits broader organisational scope where the product allows it; it is not a substitute for individual permissions or a right to access another customer’s workspace.",
        "Use individual accounts, strong unique credentials and appropriate multi-factor authentication. Keep recovery codes and provider keys confidential, protect devices and email accounts, and notify us promptly of suspected compromise. Do not share credentials to evade staff limits, allow an unauthorised person to use a session, or test another customer’s access boundaries.",
        "Actions performed through a valid account may be treated as authorised for ordinary service administration unless we know or reasonably ought to know otherwise. This allocation does not make the customer responsible for an incident caused by our own failure to meet a non-excludable duty. We may require verification or temporarily restrict access where a credible compromise, ownership dispute or unauthorised instruction is suspected.",
      ],
    },
    {
      id: "plans",
      title: "5. Plans, limits and feature entitlements",
      paragraphs: [
        "The selected plan governs available features, member or staff capacity, locations, roles, storage or other limits shown in the applicable Order and product billing information. Permissions and the customer’s settings can further restrict a feature. Buying a plan does not automatically grant every user access to all features included in it.",
        "Current Essentials, Community and Network offerings have different staff, location and role capabilities; custom roles are restricted to eligible higher plans. Enterprise scope must be agreed. The plan description presented at purchase and any express Order terms control the purchased scope, rather than an assumption based on another customer’s configuration or an old screenshot.",
        "If you downgrade or a subscription expires, additions, particular roles, exports or other paid functionality may be restricted. Existing records are not a guarantee of continued editing, creation or access under a lower entitlement. You must review limits and make necessary arrangements before a downgrade or expiry. We will not treat an entitlement reduction as permission to disclose customer records to another organisation.",
      ],
    },
    {
      id: "billing",
      title: "6. Fees, billing periods, quotes and currency",
      paragraphs: [
        "You agree to pay the amount, currency and billing period you authorise in the Order. Standard plans may be offered monthly or annually; an annual payment purchases the stated annual period rather than twelve separately cancellable monthly instalments unless the Order says otherwise. Enterprise fees, implementation work or additional services require a separate agreement where not included in the displayed offer.",
        "Displayed conversions or starting prices are informational until confirmed by an applicable quote or checkout. The checkout may use a supported charge currency different from a display currency. Review the exact amount and currency before paying. Your bank or provider may impose conversion, processing, cross-border or other fees under its own agreement; ChurchOS does not set those third-party charges merely by displaying a converted estimate.",
        "A quote can expire. A pending checkout may preserve the amount and currency recorded when it was created, even if a later display or quote changes. Review any resumed payment before authorisation. Do not create duplicate payments because a return page is delayed; use the available verification process or contact us with the payment reference.",
        "Fees exclude taxes only where clearly stated. Applicable taxes, withholdings and any required supporting documents will be treated according to law and the Order. We do not impose a tax gross-up or hidden surcharge merely through a general clause in these Terms. We may correct an obvious pricing error before accepting a new Order, provide the corrected information and let you decline it; we will not silently substitute a higher amount after payment approval.",
      ],
    },
    {
      id: "activation",
      title: "7. Payment authorisation, activation and verification",
      paragraphs: [
        "The payer must be authorised to use the selected payment method. Payment processing is performed by the provider identified at checkout. Access activation depends on verified payment and successful application to the relevant church subscription, not only a browser redirect, screenshot, debit alert or unverified client message.",
        "A pending, failed, disputed, reversed, duplicated or mismatched transaction may need reconciliation. We may request a reference and limited evidence needed to investigate. Never send a banking password, payment PIN, card security code or full secret payment credentials to support. A provider’s fraud screening or settlement delay is not a promise that we have received cleared payment.",
        "If payment is received but cannot be applied correctly, we will investigate and provide an appropriate correction or refund where due. We may suspend unpaid or fraudulently obtained access while a genuine payment issue is resolved, subject to mandatory rights and reasonable handling of evidence. We will not intentionally charge twice for the same verified service period.",
      ],
    },
    {
      id: "renewals",
      title: "8. Manual renewals, upgrades and downgrades",
      paragraphs: [
        "Standard ChurchOS subscription renewals are currently manual. Selecting a plan, entering a payment method at a one-off checkout or receiving a reminder does not itself authorise recurring platform subscription debits. A future automatic-renewal arrangement would require appropriate disclosure and payment authorisation before it applies.",
        "The customer must renew in time to avoid interruption. Reminder delivery is not guaranteed, and a missed reminder does not by itself extend a paid period. The dates and status shown by the verified subscription record determine the applicable period, subject to correction of errors and any express Order terms.",
        "An eligible mid-period upgrade may use the prorated calculation shown in the quote and retain the existing renewal date. A downgrade may be scheduled for the next renewal and does not necessarily create an immediate refund or credit. The confirmed quote and resulting subscription record control the specific change; the interface’s displayed action must be reviewed before confirmation.",
        "Recurring giving is different from platform subscription renewal. A donor’s authorisation to a church and that church’s payment provider may permit recurring donations according to the donor’s separate mandate, even while the church’s ChurchOS software subscription renews manually.",
      ],
    },
    {
      id: "cancellation",
      title: "9. Cancellation, refunds and billing disputes",
      paragraphs: [
        "You may stop renewing the standard subscription. To request earlier account closure, assistance with cancellation or a refund review, contact our designated email and identify the church and relevant payment. Do not assume there is a self-service cancellation, refund or complete database-deletion button where the product does not provide one.",
        "Except where the Order or mandatory law provides otherwise, a voluntary decision to stop using an otherwise properly supplied paid service does not automatically entitle you to a refund for the unused portion. This qualification does not exclude remedies for defective or misdescribed services, duplicate or unauthorised charges, a failure to deliver an agreed service, or any statutory cancellation or refund right.",
        "We will assess genuine billing complaints and provide the remedy required by the circumstances and law, which may include correction, re-performance, a reasonable partial refund or another appropriate outcome. If we permanently discontinue a prepaid service for our convenience and do not provide a reasonably equivalent agreed alternative, we will refund the unused prepaid portion attributable to the discontinued service, subject to any more favourable mandatory right.",
        "Raise a suspected billing error promptly with the reference, date, amount, currency and reason for dispute. A request for prompt notice is not a contractual waiver of a statutory claim period. A chargeback is not a substitute for an unsupported allegation, and you must not knowingly initiate a fraudulent dispute; equally, these Terms do not prohibit a genuine payment dispute or a lawful remedy through your bank, provider, regulator or court.",
        "Provider reversal and settlement times vary. We cannot promise an exact bank posting date or recover fees retained by an independent provider unless our agreement or law requires it. Approved refunds will ordinarily follow the original payment route or another verified lawful arrangement.",
      ],
    },
    {
      id: "price-changes",
      title: "10. Future price and product changes",
      paragraphs: [
        "We may change prices, plan packaging or functionality for future Orders or renewal periods. We will make material commercial changes clear before you authorise the affected payment. A general right to update the product is not permission to charge a higher amount during an already paid fixed term without an agreed basis.",
        "We may make maintenance, security, legal and product improvements during a term. If a change materially removes an expressly purchased core function during an unexpired paid period, we will consider an appropriate alternative or remedy rather than relying only on a broad variation clause. Roadmaps, illustrative previews, beta screens and informal discussions are not binding delivery commitments unless expressly included in the Order.",
      ],
    },
    {
      id: "customer-duties",
      title: "11. Customer responsibilities and record accuracy",
      paragraphs: [
        "You are responsible for the lawfulness, accuracy, relevance and permitted use of Customer Data and instructions supplied by your organisation. Obtain necessary notices, consents, licences and authority before uploading personal information, photographs, sermons, copyrighted material, financial details or confidential records. Maintain appropriate procedures for member corrections, data-subject requests, safeguarding and staff changes.",
        "Check dates, currencies, branch assignments, donor or member selections, account names, recipient destinations, import mappings and generated reports before relying on them. A receipt records information associated with the relevant transaction; it is not automatically a bank confirmation, a tax-deductibility certificate, an independent audit or proof that a provider has settled funds.",
        "You must maintain appropriate reconciliation, accounting, audit and record-preservation processes. Review exports, retain necessary independent copies and arrange continuity for critical church operations. These responsibilities do not relieve us of our own agreed service duties or legal obligations.",
        "The customer must supply an operational contact and ensure important notices can reach an authorised decision-maker. A dispute between church officers, branches, denominations, employees or volunteers does not authorise us to transfer control without reasonable evidence or to act as an arbiter of religious governance.",
      ],
    },
    {
      id: "acceptable-use",
      title: "12. Acceptable use and prohibited conduct",
      bullets: [
        "Do not use the Service for unlawful fundraising, money laundering, terrorist financing, fraud, identity theft, harassment, threats, exploitation, unlawful discrimination or the distribution of unlawful or infringing material.",
        "Do not collect or disclose sensitive information without a lawful basis, bypass a safeguarding duty, publish private pastoral material without authority, or misuse the platform to target vulnerable people.",
        "Do not send spam or unauthorised bulk communications, upload purchased lists without a lawful permission, evade suppression or opt-out requests, or impersonate a sender.",
        "Do not bypass permissions, authentication, rate limits, quotas or plan restrictions; share paid seats improperly; probe another tenant; scrape restricted information; or introduce malicious code.",
        "Do not run load, penetration, vulnerability or other disruptive tests without prior written authorisation defining scope and safeguards. A public sign-up or ordinary API access is not such authorisation.",
        "Do not reverse engineer or extract proprietary elements except to the extent a mandatory law permits it, remove ownership notices, or misrepresent ChurchOS as endorsing your organisation or campaign.",
        "Do not use the platform as an emergency response, regulated medical decision, autonomous financial decision or other safety-critical system that its agreed functionality does not support.",
      ],
      paragraphs: [
        "We may investigate credible misuse, preserve proportionate evidence and take the measures described in section 21. We do not undertake to pre-screen every record or message or to act as the customer’s compliance officer. The Website Terms contain additional public-site use rules.",
      ],
    },
    {
      id: "donations",
      title: "13. Giving, ticketing and payment-provider relationships",
      paragraphs: [
        "ChurchOS supplies software for recording giving, producing receipts, managing events or tickets and connecting supported payment services. Unless a separate written agreement expressly says otherwise, we are not the receiving church, fundraiser, donation beneficiary, event organiser, bank, insurer, custodian, escrow service, payment institution or financial adviser.",
        "The relevant church is responsible for its merchant/provider account, bank details, beneficiary information, authority to collect funds, event delivery, donor communications, cancellations and applicable tax treatment. Payment providers control their own onboarding, authorisations, fraud screening, processing, chargebacks, settlement and provider fees. An integration or generated receipt is not an endorsement of a church’s activities or a guarantee of settlement or refund.",
        "A donor or ticket holder’s dispute about the underlying donation, event, recurring mandate or church promise should ordinarily be raised with the receiving church and relevant provider. We can assist with platform records where authorised or legally required. This allocation does not excuse a platform error or unlawful act for which we are responsible.",
        "Manual cash or bank records depend on information entered by authorised users and may not be independently verified by a connected provider. A customer must not issue a misleading receipt, imply tax relief we have not verified, or represent a recorded amount as settled money without checking the appropriate evidence.",
      ],
    },
    {
      id: "integrations",
      title: "14. Communications, integrations and external providers",
      paragraphs: [
        "Church-selected email, SMS, WhatsApp, calling, payment and webhook services generally require the customer’s own compatible provider accounts, enabled settings and appropriate credentials. Provider charges, recipient restrictions, sender approvals, message-template rules and service availability are separate from the ChurchOS subscription unless an Order expressly includes them.",
        "You authorise processing and transmission reasonably necessary for the integrations you enable and remain responsible for the legality of those instructions. Keep provider accounts funded where required and credentials current. Platform account emails may use our organisation’s providers even when a church’s own broadcast integration is disabled.",
        "Queueing, API acceptance or a ‘sent’ processing status does not guarantee inbox placement, device delivery, call completion, WhatsApp approval, payment settlement or a recipient’s response. External services can filter, delay, reject, change or discontinue functionality. We will handle our own integration duties with reasonable care but do not control an independent provider’s entire service.",
        "Disabling or removing an integration does not necessarily undo completed deliveries, recall information, cancel a provider contract or revoke a donor mandate. You must take any additional steps required with that provider. We may disable a connection that is insecure, unlawful, incompatible or credibly abusive, subject to proportionate handling and applicable rights.",
      ],
    },
    {
      id: "data-ownership",
      title: "15. Customer Data, intellectual property and confidentiality",
      paragraphs: [
        "As between the parties, the customer and its licensors retain their rights in Customer Data. You grant us only the rights reasonably needed to host, copy, transmit, process, display, secure, maintain and support that data for the Service, the agreed instructions and our lawful obligations. This licence does not transfer ownership of member information or permit an unrelated advertising use of identifiable church records.",
        "The Company and its licensors retain rights in the platform, brand, interface, software, documentation, templates we provide, know-how and improvements. Customer-authored content is not converted into our intellectual property simply because the platform stores or renders it. Third-party materials remain subject to their owners’ licences.",
        "You may provide suggestions voluntarily. We may use general product feedback without an obligation to pay or attribute, but this permission does not authorise disclosure of your confidential information, infringement of another person’s rights or processing contrary to the Privacy Policy and applicable law.",
        "Each party must protect non-public confidential information received from the other using reasonable care, use it for the relationship and restrict disclosure to people with a legitimate need and appropriate obligations. Information independently developed, lawfully obtained without restriction, already lawfully known or made public without breach is not confidential under this clause. Required legal disclosure is permitted to the necessary extent, with notice where lawful and practical.",
        "Uploading or publishing material represents that you have authority for the requested use. Report an alleged infringement with enough detail to identify the rights holder, work, relevant material and authority to complain. We may restrict material while a credible complaint is examined; a notice does not itself determine ownership or automatically require release of private records.",
      ],
    },
    {
      id: "processing-addendum",
      title: "16. Customer Data processing terms",
      notice:
        "This section applies where the customer is controller and the Company processes personal information on its behalf. It does not reduce either party’s statutory duties or replace an additional agreement required for a specific regulated use or international transfer.",
      paragraphs: [
        "16.1 Scope. Processing concerns operation, hosting, security, maintenance, support, communications, reporting and other enabled functions of the church management service. It can involve collection, organisation, storage, retrieval, use, transmission, correction, restriction and deletion. Data subjects can include staff, volunteers, members, visitors, family members, children, donors, event participants and form respondents. Data categories include those described in the Privacy Policy, with sensitive religious or other information where lawfully supplied.",
        "16.2 Instructions. The customer determines its purposes, lawful bases and authorised settings. We will process processor-held personal information on documented lawful instructions, including the agreed Service and authorised configuration, unless law requires otherwise. We may question, suspend or refuse an instruction we reasonably consider unlawful or unsafe and inform the customer where legally permitted. Additional work outside normal functionality requires agreement on scope and reasonable charges; statutory assistance duties remain unaffected.",
        "16.3 Confidentiality and safeguards. We will restrict authorised processing access appropriately, require relevant confidentiality obligations and maintain technical and organisational safeguards appropriate to the processing risks. The customer must apply its own access, device, consent and operational controls. No clause promises absolute security, end-to-end encryption of every record, a particular certification or a guaranteed recovery point that has not been expressly agreed.",
        "16.4 Other processors. We may use providers needed for the Service, including the categories identified in the Privacy Policy. We will use appropriate written obligations for processing on our behalf and remain responsible to the extent required by law for our engagement of those processors. We will provide information and notification concerning new processors as legally required and address a reasonable, specific privacy objection in good faith. If an essential provider cannot reasonably be replaced and the objection cannot be resolved, the parties will discuss the affected service and appropriate termination or unused-fee treatment rather than presume unlimited access to the provider’s systems.",
        "16.5 Requests and incidents. Taking account of the processing and information available to us, we will provide assistance reasonably required by applicable law for rights requests, security incidents, impact assessments and regulatory enquiries. We will notify the customer of a qualifying breach of processor-held personal information without undue delay after awareness and provide information in phases where necessary. The customer remains responsible for its own controller assessments and notices; we will not prevent a required direct notification by the Company.",
        "16.6 Compliance information. On a reasonable request, we will provide information needed to demonstrate our applicable processor obligations, subject to confidentiality, security, other customers’ rights and the law. A proportionate independent review, documentation or agreed assessment can be used before invasive access. There is no general permission for unsupervised testing or inspection of unrelated tenant information. Regulatory powers and mandatory audit rights are not contracted away.",
        "16.7 Return and deletion. At the end of authorised processing, we will address the customer’s lawful choice of return or deletion as required by law and the applicable agreement, except for information lawfully required to be retained. Standard exports, where available, can support return; bespoke migration is not automatically included. Backup handling, necessary retention and any transition assistance must be addressed realistically for the relevant deployment. There is no automatic right to indefinite free hosting after termination.",
        "16.8 International processing. The customer acknowledges the use of geographically distributed providers, but acknowledgement alone is not a lawful transfer safeguard. Transfers must meet applicable legal requirements. Any required additional transfer instrument, residency restriction or enterprise arrangement must be established for the relevant processing; we do not promise local-only storage under a standard plan.",
      ],
    },
    {
      id: "ai",
      title: "17. AI assistance, scoring and human review",
      paragraphs: [
        "Ask ChurchOS provides product guidance from references and, where enabled, AI-generated explanations. It can be unavailable, incomplete or wrong. It does not independently verify every screen, record, entitlement balance or provider status, and it does not obtain authority to change accounts, inspect unrelated records, issue payments or send messages merely because a user asks.",
        "Do not enter secrets or unnecessary identifiable or sensitive records into assistant questions. Review the applicable privacy information before using external synthesis. Budgets, rate controls, model availability and plan settings may limit responses. Product guidance is not legal, tax, financial, medical, safeguarding or professional advice.",
        "Reports and engagement or risk indicators are aids to administration, not determinations of faith, conduct, diagnosis or entitlement. The customer must provide appropriate human review, test relevant facts and explain or correct use of such indicators where required. Do not make a legally or similarly significant adverse decision solely from an automated output without satisfying the applicable legal conditions and safeguards.",
      ],
    },
    {
      id: "availability",
      title: "18. Availability, maintenance and support",
      paragraphs: [
        "We aim to operate the Service with reasonable care and skill. Access may be affected by maintenance, deployments, capacity limits, security controls, faults, internet connectivity and provider incidents. Standard plans do not include a guaranteed uptime percentage, support response time, service credit, backup retention schedule or disaster-recovery objective unless expressly agreed.",
        "We may schedule maintenance and apply urgent security or legal changes when necessary. We will provide reasonable notice of material planned interruption where practical, taking account of security and operational needs. Support availability can vary, and an unanswered live chat is not an emergency or out-of-hours service commitment.",
        "The customer should retain workable continuity procedures for important attendance, giving and administrative activities. A benchmark, demonstration or historical performance result is not a warranty of capacity for every tenant, workload or concurrent-user count.",
      ],
    },
    {
      id: "beta",
      title: "19. Beta features, trials and interoperability",
      paragraphs: [
        "A feature expressly identified as preview, beta, experimental or trial can be changed or withdrawn and may have additional limits. Use it only where appropriate for its stated maturity and keep necessary copies of material you need. A beta label does not excuse fraud, concealment, gross negligence or another non-excludable duty.",
        "Only supported browsers, file types, integrations and workflows are within the ordinary service scope. Spreadsheet calendars, embedded media and downloaded documents can behave differently in third-party applications. We do not warrant compatibility with every device or external software version, but remain responsible for an expressly agreed compatibility commitment or mandatory service standard.",
      ],
    },
    {
      id: "records",
      title: "20. Exports, retention, closure and administrator disputes",
      paragraphs: [
        "Use available exports while access is active and verify their completeness and suitability for your records. An export is not automatically a full infrastructure backup, a copy of every audit or provider record, or a ready-made migration to another vendor. Specialist extraction or transition assistance requires agreement where not included, and must respect other people’s rights.",
        "Archiving, deactivation, deletion of a login, removal of a branch and permanent deletion of a business record are distinct actions. Some records may be retained to preserve transaction or audit history, while applicable maintenance jobs may remove inactive information. The Privacy Policy explains current retention considerations; inactivity must not be treated as a guaranteed permanent archive.",
        "Before closing a workspace, the customer must identify an authorised decision-maker, address export and legal preservation needs, cancel or update independent provider arrangements and issue clear lawful instructions about personal information. We may verify authority, suspend a disputed destructive instruction and require resolution between the relevant parties or a binding legal direction.",
        "We are not required to adjudicate internal church leadership, employment, doctrinal or denominational disputes. We will not intentionally transfer a workspace or disclose its data to an unverified claimant. A reasonable temporary protective restriction is not a finding about which person ultimately owns the organisation.",
      ],
    },
    {
      id: "suspension",
      title: "21. Suspension and protective restrictions",
      paragraphs: [
        "We may restrict affected functionality or access where reasonably necessary to address an expired or unpaid entitlement, credible security incident, material breach, unlawful instruction, fraud, provider suspension, binding legal demand or material threat to the Service or another person. Measures should be proportionate to the issue rather than used as an unrestricted discretion to confiscate data or avoid a valid obligation.",
        "Where lawful and practical, we will give notice, explain the issue and provide an opportunity to remedy it. Immediate action may be necessary for urgent harm, compromise, legal prohibition or a serious threat; we may withhold detail that would undermine security or violate law. The customer should cooperate in a reasonable investigation and promptly address matters within its control.",
        "A restriction does not automatically erase an outstanding legitimate charge or entitle the customer to free service. Equally, it does not remove a mandatory refund, data-return, privacy or dispute right. We will consider safe access or assistance for necessary records where practical and legally appropriate.",
      ],
    },
    {
      id: "termination",
      title: "22. Termination and consequences",
      paragraphs: [
        "Either party may end the arrangement as allowed by the Order or these Terms. The customer may stop renewal or request closure. We may terminate for a material breach not remedied within a reasonable stated period after notice, or immediately for a breach that cannot reasonably be remedied, serious unlawful conduct, a binding prohibition or urgent material risk.",
        "If we end an otherwise compliant prepaid service for our own convenience, we will ordinarily provide at least 30 days’ notice where feasible, appropriate information about transition and the unused-fee remedy described in section 9. A security or legal necessity may require a shorter period, but will not eliminate an applicable mandatory remedy.",
        "On termination, the access licence ends, legitimate amounts already due remain payable, and data return, deletion or lawful retention must be handled as described in sections 16 and 20. You must stop representing that you have active authorised access and must not use retained credentials to bypass closure. Clauses that by their nature should survive (such as accrued payment, ownership, confidentiality, applicable data handling, liability, indemnity and dispute provisions) continue to the extent necessary and lawful.",
      ],
    },
    {
      id: "warranties",
      title: "23. Service standards and warranty qualifications",
      notice:
        "Nothing in this section excludes mandatory standards of service, remedies for a failure to meet them, liability for gross negligence, fraud or wilful misconduct, or another duty that applicable law makes non-excludable.",
      paragraphs: [
        "Subject to those mandatory protections and any express Order commitment, the Service is supplied in its available form. We do not warrant uninterrupted or error-free operation, protection from every attack, a particular religious, fundraising or business outcome, the accuracy of customer-entered records, third-party delivery or settlement, or suitability for an undisclosed specialised purpose.",
        "No informal support statement or assistant answer creates a new service-level agreement or changes the contract unless an authorised representative expressly agrees it in the required form. This does not erase an actionable pre-contract representation or other protection that the law preserves.",
        "Report a material service defect with sufficient information for reasonable investigation. We will address a valid failure according to the applicable agreement and mandatory law. A general disclaimer is not intended to make reasonable paid-service obligations meaningless.",
      ],
    },
    {
      id: "liability",
      title: "24. Limitations of liability and mandatory exceptions",
      notice:
        "IMPORTANT LIMITATION OF LIABILITY: Subject to the exceptions below and to the extent permitted by law, the Company’s aggregate contractual and other liability connected with the affected Service is capped at the fees paid or payable to the Company for that affected Service during the 12 months immediately before the event giving rise to the claim.",
      paragraphs: [
        "24.1 Scope of the cap. The cap applies in aggregate to related claims arising from the same event or connected events and across legal theories, to the extent such limitation is lawful. It is based on ChurchOS software fees, not the total giving, ticket sales, payment-provider balance or other funds recorded or processed through a church’s activities. It does not apply to a separate liability that law prevents us from limiting.",
        "24.2 Excluded loss categories. Subject to section 24.3 and only where legally permitted, we are not liable for indirect, consequential, exemplary or punitive losses, or loss of anticipated profit, revenue, opportunity, goodwill or expected savings. A loss will not be called ‘indirect’ merely to avoid a remedy the law gives for a direct and proven service failure.",
        "24.3 Non-excludable matters. No disclaimer, cap, indemnity, suspension right or other provision excludes or restricts liability for fraud, fraudulent misrepresentation, wilful misconduct, gross negligence, death or personal injury where the relevant liability cannot lawfully be limited, or any other liability, statutory right, privacy right, regulatory duty or remedy that cannot lawfully be excluded or capped. The applicable mandatory rule prevails to that extent.",
        "24.4 Responsibility and mitigation. Liability should reflect causation and legally applicable responsibility. We are not responsible for a customer’s independent unlawful instruction, incorrect record, unauthorised recipient choice or provider act solely because the Service was involved, but remain responsible for our own actionable contribution. Each party must take reasonable steps to mitigate a known loss where the law requires it. You cannot recover the same loss twice under different descriptions.",
        "24.5 Commercial basis. These limits reflect the nature and price of a standard hosted software subscription and are intended to be conspicuous before agreement. A customer requiring a different allocation, committed service levels or enhanced controls should agree them in a separate written Order rather than assume they are included. Their inclusion is not a representation that every limitation is enforceable in every jurisdiction.",
      ],
    },
    {
      id: "indemnity",
      title: "25. Customer indemnity for specified third-party claims",
      notice:
        "IMPORTANT CUSTOMER OBLIGATION: Where legally permitted, the organisational customer must indemnify the Company against reasonable third-party claims and resulting losses caused by that customer’s unlawful Customer Data or instructions, infringement of another person’s intellectual-property rights, or material misuse of the Service in breach of these Terms.",
      paragraphs: [
        "This indemnity applies only to the extent a claim is attributable to the customer or people acting under its authority. It does not require the customer to pay for the Company’s fraud, wilful misconduct, gross negligence, breach of a non-excludable duty or other loss that the law prevents us from shifting. It does not make an invited staff member personally guarantee the organisation’s indemnity merely by using an individual account.",
        "We must give reasonably prompt notice of a claim, provide reasonable cooperation and take proportionate steps to limit recoverable loss. A delay reduces the obligation only to the extent it prejudices the defence. Defence and settlement arrangements must be reasonable; no settlement may admit the customer’s liability or impose a non-monetary obligation on it without its reasonable consent. Recoverable costs must be reasonable, supported and legally recoverable, not an automatic unlimited charge.",
        "If a claim alleges infringement by unmodified Company-supplied functionality, notify us so we can investigate. We may procure continued use, modify or replace affected functionality, or discontinue it with an appropriate unused-fee remedy where due. This remedial option does not exclude an express indemnity in a signed Order or a mandatory remedy for our own conduct.",
      ],
    },
    {
      id: "force-majeure",
      title: "26. Events outside reasonable control",
      paragraphs: [
        "A party is not liable for delay or non-performance to the extent caused by an event beyond its reasonable control that it could not reasonably prevent or mitigate, such as a major public infrastructure failure, natural disaster, war or binding government restriction. Ordinary lack of funds, avoidable under-resourcing or a failure to apply reasonable security measures is not automatically such an event.",
        "The affected party should notify the other where practical and use reasonable efforts to mitigate the effect and resume performance. Accrued payment obligations and mandatory data, security or legal duties remain subject to applicable law. A prolonged inability to supply a prepaid service will be addressed with appropriate termination or fee treatment rather than an unlimited right to retain payment without performance.",
      ],
    },
    {
      id: "disputes",
      title: "27. Complaints, governing law and dispute resolution",
      paragraphs: [
        `Send a service or contractual complaint to ${LEGAL_COMPANY.email}, identifying the organisation, relevant transaction or issue, supporting details and remedy sought. The parties should first attempt a good-faith resolution. Either party may propose mediation, but mediation or a private support process is not a barrier to a regulator, a mandatory consumer remedy, a limitation-period protective filing or urgent court relief.`,
        "Subject to mandatory laws that apply regardless of a choice-of-law clause, these Terms are governed by the laws of the Federal Republic of Nigeria. Courts of competent jurisdiction in Nigeria may determine disputes, without depriving a person of a forum or protection that a mandatory law gives them elsewhere. These Terms do not impose compulsory foreign arbitration or a class-action waiver.",
        "Nothing prevents a complaint to the Nigeria Data Protection Commission, the Federal Competition and Consumer Protection Commission or another competent body. We do not shorten a statutory claim period or require confidentiality that prevents a lawful report, protected disclosure or cooperation with authorities.",
      ],
    },
    {
      id: "notices",
      title: "28. Notices and electronic communications",
      paragraphs: [
        `The Company’s designated ChurchOS privacy, legal and contractual notice email is ${LEGAL_COMPANY.email}. The customer’s notice contact is its administrator or another authorised address it supplies. Keep that contact up to date and identify the relevant church clearly when sending a notice.`,
        "We may send routine service and contractual communications electronically, including through a reasonably prominent account notice where appropriate. A bounced or rejected email is not automatically effective delivery of a legal notice. Rules for formal court service, regulatory notices and any mandatory delivery method prevail over this general electronic-notice clause. Request the Company’s appropriate physical-service details where required.",
        "The published contact can be updated. A change does not invalidate a notice already properly delivered to the previous designated address. We may need reasonable verification before acting on a notice seeking data release, account transfer, a refund to a new destination or permanent deletion.",
      ],
    },
    {
      id: "changes",
      title: "29. Changes to these Terms",
      paragraphs: [
        "We may revise these Terms for future use and Orders. We will identify the updated version and give appropriate notice of material changes. Where a change requires renewed agreement or another form of consent, continued use alone will not be treated as a substitute for that requirement.",
        "We will not use an update to retroactively remove an accrued remedy or silently change the price or core commercial commitment of an existing prepaid fixed term. A customer that does not agree to a material proposed renewal term can decline renewal, subject to agreed transition and mandatory rights. Legally required or urgent protective changes may apply sooner to the necessary extent, with appropriate notice where possible.",
      ],
    },
    {
      id: "general",
      title: "30. General legal provisions",
      paragraphs: [
        "Each party is an independent contractor. These Terms do not establish a partnership, employment relationship, fiduciary relationship, religious endorsement or authority for one party to bind the other beyond an express agreement. A customer must not imply that its fundraising or organisational claims have been certified by ChurchOS.",
        "The customer may not assign its account or agreement to an unrelated organisation without reasonable written approval. We may assign the service agreement as part of a legitimate corporate reorganisation or transfer of the business, subject to applicable privacy law, appropriate continuity and any mandatory customer rights. Assignment is not permission to materially expand the use of personal information without a lawful basis.",
        "If a provision is unlawful or unenforceable, it will apply only to the lawful extent or be severed where permitted, while the remainder continues if workable. A failure to enforce a provision immediately does not automatically waive it. No clause removes a mandatory third-party or data-subject right.",
        "These Terms and the applicable agreed documents describe the service agreement, but do not exclude fraud, actionable misrepresentation or a statutory promise that cannot be excluded. A change or special commitment must be made by an authorised representative in a form that reasonably records the agreement. Keep the version and Order relevant to your subscription.",
      ],
    },
    {
      id: "contact",
      title: "31. Company details",
      paragraphs: [
        `Service and brand: ChurchOS. Operator: ${LEGAL_COMPANY.name}. Country: ${LEGAL_COMPANY.country}. Designated privacy, legal, billing-dispute and contractual contact: ${LEGAL_COMPANY.email}.`,
        "The designated mailbox may be used without a ChurchOS account. Administrator live chat is an additional support channel and is not the exclusive way to give a legal notice or exercise a privacy or consumer right. For registered-office details or information needed for a formal procedure, contact the Company through the designated address.",
      ],
    },
  ],
};
