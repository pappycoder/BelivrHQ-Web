import { helpArticles, type HelpSlug } from "./catalog";
export interface HelpSection {
  id: string;
  title: string;
  paragraphs?: string[];
  steps?: string[];
  bullets?: string[];
  note?: string;
}
/** Public product guidance only. Keep operational secrets and API examples outside this library. */
export const helpContent: Record<HelpSlug, HelpSection[]> = {
  "set-up-your-church": [
    {
      id: "before-you-start",
      title: "Before you start",
      paragraphs: [
        "Choose one person to create the church administrator account. Have your church name, administrator email and preferred subscription plan ready. A member directory record does not create a login account.",
      ],
    },
    {
      id: "create-your-workspace",
      title: "Create your workspace",
      steps: [
        "Choose Create account from the BelivrHQ sign-in page and enter your church’s details.",
        "Enter the administrator’s name and email, then choose a strong password. Each staff member should have their own account.",
        "Compare the monthly or yearly plans. You can change the display currency before reviewing your selection.",
        "Review your details and create the account. Sign in and follow Plan & Billing to complete activation through an available payment provider.",
      ],
    },
    {
      id: "prepare-for-your-team",
      title: "Prepare for your team",
      steps: [
        "Review the church information in Church settings if that option is available to you.",
        "Prepare the member directory using the import template or add people individually.",
        "Invite staff into the right roles and locations. Confirm each person can see the pages needed for their work.",
      ],
      note: "BelivrHQ subscriptions renew manually. Creating an account does not itself confirm payment or enable a paid subscription.",
    },
  ],
  "sign-in-and-account-recovery": [
    {
      id: "sign-in",
      title: "Sign in to your own account",
      steps: [
        "Open the BelivrHQ sign-in page and enter the email associated with your staff account.",
        "Enter your password. If prompted, use the code from your authenticator app or the available recovery-code option.",
        "Check the name and church shown in your workspace before entering records.",
      ],
    },
    {
      id: "reset-password",
      title: "Forgotten your password?",
      steps: [
        "Choose Forgot password on the sign-in page and enter your account email.",
        "Check your inbox and spam folder. Follow the recovery link, choose a new password and sign in again.",
        "If the link has expired, request a new one. Use the newest recovery email.",
      ],
      note: "The recovery screen does not disclose whether an email has an account. If no email arrives, ask your church administrator to confirm your account details.",
    },
    {
      id: "still-unable-to-sign-in",
      title: "Still unable to sign in?",
      bullets: [
        "For a lost authenticator, use an unused recovery code if you have one. Do not share recovery codes in chat.",
        "A church administrator should check whether your staff account is active and has an assigned role.",
        "An expired church subscription needs action from a church administrator in Plan & Billing.",
      ],
    },
  ],
  "invite-staff-and-manage-access": [
    {
      id: "before-you-invite",
      title: "Before you invite someone",
      paragraphs: [
        "Check your staff allowance in Plan & Billing. Active staff accounts and pending invitation reservations use that allowance. Directory members are separate records and do not need logins.",
      ],
      note: "Only people with the appropriate staff-management access can invite or change users. Administrative billing screens are reserved for church administrators and super administrators.",
    },
    {
      id: "invite-a-colleague",
      title: "Invite a colleague",
      steps: [
        "Open Users from the workspace administration menu.",
        "Choose the invitation action and enter the colleague’s email and requested details.",
        "Select an appropriate staff role and location. Choose the narrowest access needed for the person’s work.",
        "Submit the invitation and follow the result shown on screen. Correct any allowance or email error before retrying.",
      ],
    },
    {
      id: "review-access",
      title: "Review access when responsibilities change",
      bullets: [
        "Review a user’s role, status and location from their detail page.",
        "Use Roles & Permissions when you need to manage a role and your account is allowed to do so.",
        "HQ access, location scope and feature availability still apply. A role name alone does not guarantee access to every page.",
        "Do not invite ordinary directory members solely to keep them in the directory. There is no member login role.",
      ],
    },
  ],
  "add-and-update-members": [
    {
      id: "check-before-adding",
      title: "Check for an existing record",
      paragraphs: [
        "Search the member directory by the details you already know before creating another record. When your access is limited to a location, you may not see records belonging to other locations.",
      ],
    },
    {
      id: "create-or-update",
      title: "Create or update a directory record",
      steps: [
        "Open Members and choose the add-member action if it is available.",
        "Enter the required personal details and review the selected location. Cross-location administrators should choose the intended location carefully.",
        "Save the record and check the member detail page.",
        "To make a correction, open the existing record and use its edit action. Save only the changes you intend to make.",
      ],
    },
    {
      id: "archived-members",
      title: "Understand archived members",
      paragraphs: [
        "Archiving preserves a record while removing it from the active directory. Restoring a record adds it back to the active member allowance, so restoration can be blocked when the allowance is full.",
      ],
      note: "A directory record is not a staff login. Adding, editing or restoring a member does not grant access to BelivrHQ.",
    },
  ],
  "import-members": [
    {
      id: "prepare-the-file",
      title: "Prepare the import template",
      steps: [
        "Open the member import page from Members. If the option is missing, ask your administrator to review your import access.",
        "Download the current template from that page rather than reusing an old spreadsheet format.",
        "Copy your records into the template, keeping the column headers and required fields in the expected format.",
        "Review email addresses, phone numbers and possible duplicates. Confirm that the selected location is correct.",
      ],
    },
    {
      id: "import-and-review",
      title: "Import and review the result",
      steps: [
        "Choose the prepared file and follow the import screen’s validation and submission steps.",
        "Review the result and any row-level errors. Keep the source spreadsheet until you have checked the directory.",
        "Correct rejected records before retrying. Avoid resubmitting successful rows without checking whether those records already exist.",
      ],
    },
    {
      id: "allowance-or-validation-error",
      title: "If the import is blocked",
      bullets: [
        "Check that your file follows the current template and satisfies required fields.",
        "Check the member allowance with your church administrator. Imports are subject to the same allowance as individual additions.",
        "If a connection fails after submission, review the directory and the import result before submitting the same file again.",
      ],
    },
  ],
  "organise-families": [
    {
      id: "use-existing-records",
      title: "Start with individual members",
      paragraphs: [
        "A family groups related directory records; it does not replace them. Add or find the individual people first so you can link the right records.",
      ],
    },
    {
      id: "create-a-family",
      title: "Create or update a family",
      steps: [
        "Open Families from the Members area.",
        "Use the available family creation or editing action and enter the household details.",
        "Choose the existing members who belong to the household and review any relationship or household-head choices shown in the form.",
        "Save and check the family detail view to confirm the people were linked correctly.",
      ],
    },
    {
      id: "correct-a-link",
      title: "Correct a household link",
      paragraphs: [
        "Use the family’s membership controls to correct a relationship. Do not delete a member’s directory record just to remove them from a family. If a person is not selectable, ask your administrator to check location scope and access.",
      ],
    },
  ],
  "welcome-and-follow-up-visitors": [
    {
      id: "record-a-visit",
      title: "Record a visitor",
      steps: [
        "Open Visitors or the visitor registration option available in the check-in workflow.",
        "Check for an existing record before adding another person.",
        "Enter the details you have permission to collect and confirm the visit or location information.",
        "Save and review the visitor record so the follow-up team can work from accurate information.",
      ],
    },
    {
      id: "follow-up",
      title: "Keep follow-up useful",
      bullets: [
        "Keep follow-up notes relevant to the visitor and your responsibilities.",
        "Review the existing record when a visitor returns instead of starting a new record every time.",
        "When the visitor is ready to join the member directory, use the available conversion workflow if your role permits it. Confirm the resulting member record before making another one.",
      ],
    },
    {
      id: "messages",
      title: "If a follow-up message is not delivered",
      paragraphs: [
        "A saved visitor record does not guarantee an external message was sent. Delivery depends on the church’s configured provider, selected channel, feature access and provider balance. Ask the church administrator to check those settings.",
      ],
    },
  ],
  "check-in-attendees": [
    {
      id: "choose-the-service",
      title: "Choose the correct service",
      paragraphs: [
        "Confirm the service, date and location before marking attendance. Named check-ins and general headcounts serve different purposes and can be recorded separately.",
      ],
    },
    {
      id: "use-the-roster",
      title: "Use the attendance roster",
      steps: [
        "Open attendance check-in and choose the intended service or session.",
        "Search the roster for the people you need to record.",
        "Select attendees using the available roster controls. You can work across searches when the page retains your selection.",
        "Save the selection and wait for confirmation. Review any records reported as unsaved before retrying.",
      ],
    },
    {
      id: "missing-attendee",
      title: "If someone is missing",
      bullets: [
        "Check your search and location filters.",
        "Use visitor registration when a first-time attendee does not yet have a record and that action is available to you.",
        "Ask your administrator to review your attendance access if the roster or save action is unavailable.",
        "If the network fails, check saved attendance before submitting the same selection again.",
      ],
    },
  ],
  "record-attendance-totals": [
    {
      id: "totals-and-check-ins",
      title: "Totals and named check-ins",
      paragraphs: [
        "Use general attendance totals for the overall headcount, including people who are not individually checked in. Named attendance identifies particular attendees. Record each measure deliberately; do not assume one automatically replaces the other.",
      ],
    },
    {
      id: "save-headcount",
      title: "Save a headcount",
      steps: [
        "Open the relevant service, event, department or cell-group meeting attendance workflow.",
        "Confirm the meeting date, session and location.",
        "Enter the required total headcount. Add adult/children or male/female breakdowns only when you have those figures.",
        "Review the form’s validation, save and check the recorded totals.",
      ],
    },
    {
      id: "unknown-breakdowns",
      title: "When a breakdown is unknown",
      paragraphs: [
        "Leave an optional breakdown blank when it was not collected. Zero means a known count of zero; it is different from an unknown figure. Correct the existing session’s totals rather than creating a second session for the same count.",
      ],
      note: "Meeting access may depend on group leadership as well as your role and location. Contact your administrator if the intended meeting is unavailable.",
    },
  ],
  "create-events-and-registrations": [
    {
      id: "prepare-an-event",
      title: "Prepare an event",
      steps: [
        "Open Events and use the creation action if your account can manage events.",
        "Enter the title, dates, location and other required event information.",
        "Review the event’s registration and ticket settings before sharing it with your team.",
        "Save the event, then reopen its details to check the published information.",
      ],
    },
    {
      id: "manage-registrations",
      title: "Manage registration records",
      bullets: [
        "Use the event’s registrations view to review or add registrations within your access.",
        "Check that the selected event and person are correct before saving.",
        "For paid registrations, check the confirmed payment state rather than relying on a browser return page or a verbal payment report.",
        "When changing event arrangements, preserve existing registrations and financial history. Follow any restrictions shown by the app.",
      ],
    },
    {
      id: "feature-access",
      title: "If event controls are unavailable",
      paragraphs: [
        "Event features require an eligible church plan and the corresponding staff permissions. Paid ticket features have their own plan requirements. Your church administrator can review the plan; an authorised staff manager can review your access.",
      ],
    },
  ],
  "manage-event-tickets": [
    {
      id: "before-selling",
      title: "Before taking ticket payments",
      paragraphs: [
        "Confirm the church plan includes paid tickets, the event is configured correctly and a church-owned payment provider is ready. Event payments belong to the church’s provider account; they are separate from the BelivrHQ subscription payment.",
      ],
    },
    {
      id: "ticket-tiers",
      title: "Prepare tiers and registrations",
      steps: [
        "Open the event’s ticket or tier management page.",
        "Enter the tier details and review prices, availability and any capacity settings shown in the form.",
        "Register the attendee against the intended event and tier.",
        "For a paid registration, wait for the confirmed payment state before treating the ticket as paid.",
      ],
    },
    {
      id: "at-the-door",
      title: "At the event entrance",
      steps: [
        "Open event check-in for the intended event.",
        "Scan or look up the ticket using the available controls.",
        "Review the validation result, including whether the ticket belongs to this event and has already been used.",
        "Confirm check-in only when validation succeeds. Investigate a rejected ticket rather than creating a duplicate payment or ticket.",
      ],
    },
  ],
  "departments-and-cell-groups": [
    {
      id: "find-your-group",
      title: "Find the team you manage",
      paragraphs: [
        "Departments and cell groups organise people around ministry work. Your visible groups depend on your location, permissions and any leadership assignment. Being a group leader does not automatically grant church-wide access.",
      ],
    },
    {
      id: "manage-a-roster",
      title: "Manage a group roster",
      steps: [
        "Open Departments or Cell groups and choose the intended group.",
        "Review its location and leader before changing the roster.",
        "Add or remove the appropriate existing members using the available controls.",
        "Save and confirm the roster. If a member cannot be selected, ask the administrator to check their location and your group access.",
      ],
    },
    {
      id: "meeting-records",
      title: "Record meetings and group giving",
      bullets: [
        "Use the group’s meeting attendance workflow to record the correct meeting date and attendees or totals.",
        "Group giving, where available, is recorded from the individual cell-group detail page.",
        "Review the meeting and group before saving a combined giving amount. Use individual giving records when you need to record an individual donor’s gift.",
      ],
    },
  ],
  "record-giving-and-receipts": [
    {
      id: "confirm-scope",
      title: "Confirm the record’s scope",
      paragraphs: [
        "Check the location, person, category, amount and date before saving a financial record. Your account must have the relevant finance access and the church plan must include giving features.",
      ],
    },
    {
      id: "manual-giving",
      title: "Record cash or bank giving",
      steps: [
        "Open the giving records page and choose the giving entry action.",
        "Enter the giver when required, the category, amount, date and payment method.",
        "Review the selected location and supporting reference details.",
        "Save once and check the resulting transaction. A manual bank record documents giving; it does not itself collect money from a bank account.",
      ],
    },
    {
      id: "receipts-and-exports",
      title: "Find a receipt or export",
      bullets: [
        "Open the relevant transaction and use its available receipt action.",
        "Use the collection’s export menu when it is available, after checking filters and the records being exported.",
        "If a gateway payment is still pending, review its verification state before recording a second manual transaction.",
        "Use authorised correction workflows for mistakes so the financial history remains traceable.",
      ],
    },
  ],
  "reports-and-analytics": [
    {
      id: "choose-a-report",
      title: "Choose the right report",
      steps: [
        "Open the reporting area available to your role, such as attendance or financial reports.",
        "Set the date range and location filters before reading the results.",
        "Check whether the result is based on named records, general totals or financial transactions.",
        "Use the report’s export action if offered and review the exported scope before sharing it.",
      ],
    },
    {
      id: "restricted-dashboards",
      title: "Why some dashboards are restricted",
      paragraphs: [
        "Analytics dashboards are reserved for church administrators and super administrators. Other reporting access depends on specific permissions and the church plan. HQ scope can extend location visibility within your access; it does not grant every reporting permission.",
      ],
      note: "Changing a display filter cannot grant access to another location’s records. Ask an administrator to review the intended reporting scope.",
    },
    {
      id: "different-totals",
      title: "When figures look different",
      bullets: [
        "Compare the same dates, location and archived-record filters.",
        "Distinguish named attendee counts from overall headcounts.",
        "Check payment status and the relevant transaction dates before comparing financial totals.",
      ],
    },
  ],
  "plans-and-allowances": [
    {
      id: "understand-allowances",
      title: "What each allowance counts",
      bullets: [
        "Members: non-archived member directory records. Directory members are not automatically authenticated staff users.",
        "Staff: active staff accounts with assigned roles, plus pending invitation reservations.",
        "Locations: non-archived locations, including the headquarters.",
      ],
    },
    {
      id: "compare-plans",
      title: "Compare the published plans",
      paragraphs: [
        "Essentials includes 100 members, 2 staff accounts and 1 location. Community includes 300 members, 5 staff accounts and 1 location. Network includes 1,500 members, 15 staff accounts and 3 locations. Enterprise limits and pricing are agreed directly with BelivrHQ.",
        "The published USD base prices are $10, $20 and $40 monthly, or $108, $216 and $432 yearly, respectively. Annual base prices save 10% against twelve monthly payments. Use Plan & Billing for current prices and currency quotes.",
      ],
    },
    {
      id: "when-you-reach-a-limit",
      title: "When you approach an allowance",
      paragraphs: [
        "Administrators can review usage in Plan & Billing and may receive allowance or renewal notifications. Reaching a limit blocks additions that would exceed it; upgrading is not automatic. Existing records are retained.",
      ],
      steps: [
        "A church administrator opens Plan & Billing and reviews current usage.",
        "Choose a larger plan for an immediate upgrade. Review the prorated quote for the remaining paid period; immediate upgrades keep the current cycle and renewal deadline.",
        "For a lower plan, save a renewal preference. The current plan continues until expiry, and the lower plan takes effect when you renew and pay for it.",
      ],
    },
  ],
  "subscription-currencies-and-payments": [
    {
      id: "display-currency",
      title: "Choose how prices are displayed",
      paragraphs: [
        "BelivrHQ uses USD base subscription prices. The currency selector converts those prices using the available exchange-rate data and rounds the total up to a whole currency unit. The annual total is converted once; local rounding can slightly change the effective discount.",
        "Your display currency is remembered in this browser. Historical payment records keep their original amount and currency.",
      ],
    },
    {
      id: "review-payment",
      title: "Review the currency you will actually pay",
      steps: [
        "Sign in as a church administrator and open Plan & Billing.",
        "Choose a plan, billing period and available payment provider.",
        "Check Payment currency. A provider can only charge currencies enabled for the BelivrHQ merchant account; the charge currency may differ from the display currency.",
        "Review the exact amount and quote expiry before choosing Continue to payment. A new quote is locked for 15 minutes.",
        "Complete the hosted payment and return to BelivrHQ. Wait for verification before treating the subscription as active.",
      ],
    },
    {
      id: "renewals",
      title: "Renewals and pending checkout",
      paragraphs: [
        "Renewals are manual, with no automatic subscription charges. Renew the same plan after the current paid period ends. An existing pending checkout keeps its stored amount and currency even after the original quote expires; review that pending amount before resuming it.",
      ],
      note: "BelivrHQ subscription payments are separate from donations and event payments collected through your church’s own provider accounts.",
    },
  ],
  "subscription-payment-problems": [
    {
      id: "pending-payment",
      title: "If you paid but activation is still pending",
      steps: [
        "Return to Plan & Billing using the same church administrator account.",
        "Review the pending payment and choose Check my payment if that option is shown.",
        "Allow time for the provider’s confirmation. Check the payment history and any message returned by verification.",
        "If the payment remains unresolved, contact BelivrHQ support with the payment reference, time and provider. Do not send card details, passwords or tokens.",
      ],
    },
    {
      id: "expired-or-changed-quote",
      title: "If the quote expires or another checkout exists",
      bullets: [
        "Refresh the quote and review the new amount before starting a new checkout.",
        "If another tab started a payment, refresh Plan & Billing and review the pending amount before resuming.",
        "Do not pay a second time simply because you closed a browser tab or missed a callback.",
        "If conversion is unavailable, try again later or review another available payment currency and provider.",
      ],
    },
    {
      id: "review-needed",
      title: "If a received payment needs review",
      paragraphs: [
        "A payment may be received after the subscription changed or the relevant upgrade period ended. BelivrHQ can mark it for review without overwriting the current subscription. Contact support with the payment reference and the message shown in billing history.",
      ],
    },
  ],
  "connect-provider-accounts": [
    {
      id: "prepare-provider",
      title: "Prepare your provider account",
      paragraphs: [
        "Church-owned email, SMS, WhatsApp, call and payment integrations use your church’s provider accounts. They start disabled until configured. Provider approvals, balances and usage or transaction charges are separate from the BelivrHQ subscription.",
      ],
      note: "You need integration-management access. The church plan must also include the feature you intend to use. Never include private API keys in support messages or screenshots.",
    },
    {
      id: "connect-and-route",
      title: "Connect an account and choose a channel",
      steps: [
        "Open Integrations from the administration or account menu if available to you.",
        "Choose a supported provider and enter the credentials and settings requested by the form.",
        "Review any credential-check result. A saved configuration alone does not prove that a real message or payment will succeed.",
        "Choose the account for the intended service channel, complete any sender or provider setup, and enable it when ready.",
        "Carry out a controlled delivery or payment check and review the result before relying on it for church operations.",
      ],
    },
    {
      id: "delivery-errors",
      title: "If delivery or collection fails",
      bullets: [
        "Check the selected channel, provider account state, sender requirements and available balance.",
        "Confirm the church plan and the initiating staff member’s access allow the action.",
        "Keep a provider reference or error message when contacting support, with secrets removed.",
      ],
    },
  ],
  "offline-work-and-reconnection": [
    {
      id: "what-to-expect",
      title: "What to expect offline",
      paragraphs: [
        "The offline workspace supports the workflows and records made available there. It is not a complete offline copy of every page. Open and prepare the available offline workspace while connected, and use a trusted device.",
      ],
      note: "You need offline-workspace access. Hosted payments, live chat and external provider actions require an internet connection.",
    },
    {
      id: "reconnect",
      title: "Reconnect and review pending work",
      steps: [
        "Keep the same browser and account while you have pending offline work.",
        "Reconnect and open the offline workspace or sync controls.",
        "Review which items were saved, which remain queued and which need attention.",
        "For a rejected item, correct the stated problem before retrying. An expired subscription or allowance limit can prevent a new record from syncing.",
        "Confirm the final record in the online workspace before discarding a draft or entering it again.",
      ],
    },
    {
      id: "preserve-drafts",
      title: "Protect unsaved work",
      paragraphs: [
        "Do not clear browser storage, reinstall the app or switch devices to resolve a sync error while important drafts remain on the original device. Ask your administrator for help and keep a note of the error without copying confidential records into a support chat.",
      ],
    },
  ],
  "get-help-and-report-a-problem": [
    {
      id: "find-an-answer",
      title: "Start with the Help Centre",
      paragraphs: [
        "These guides are public and can be shared without sharing church records or signing in. Search by the task you are trying to complete, such as importing members, checking in attendees or renewing a subscription.",
        "Inside the workspace, the Help Centre and the page’s help menu suggest relevant guides. A guide explains a feature; reading it does not grant permission to use that feature.",
        "Active staff can open Ask BelivrHQ in the workspace header for product guidance, navigation links and explanations of their verified access. Answers include references. The assistant cannot read church records or perform actions; do not enter personal records, passwords or secrets. Administrator-only live chat remains the channel for human BelivrHQ Support.",
      ],
    },
    {
      id: "contact-the-right-person",
      title: "Contact the right person",
      bullets: [
        "Staff: ask your church administrator about roles, location access, plan availability or church-owned provider settings.",
        "Active church administrators can use the floating chat bubble or Live chat in the account/help menu. Other staff should ask their church administrator to contact BelivrHQ Support on their behalf.",
        "If the support team is offline, use the available chat form to leave a message and reply email. Response availability depends on the team’s working hours.",
      ],
    },
    {
      id: "support-chat",
      title: "Start or continue a support chat",
      paragraphs: [
        "Church administrators can open Contact support in the dashboard or use the floating chat bubble. Live chat opens in the application, and previous conversations may remain visible in the widget.",
        "To start another chat session, open the widget menu, choose End this chat session, then start a new chat. If the team is offline, leave your message and a reply email in the widget.",
      ],
    },
    {
      id: "useful-report",
      title: "Send a useful problem report",
      steps: [
        "Describe the task, the page and what you expected to happen.",
        "Include the error text, approximate time and device/browser. For billing, include the payment reference.",
        "Explain whether the problem happens again and whether any record or payment already succeeded.",
        "Remove member details, private notes and credentials from screenshots or copied text. Never send passwords, authenticator codes, API keys or full payment-card details.",
      ],
    },
  ],
};
export function helpSearchIndex() {
  return helpArticles.map((article) => ({
    ...article,
    searchText: helpContent[article.slug]
      .map((section) =>
        [
          section.title,
          ...(section.paragraphs || []),
          ...(section.steps || []),
          ...(section.bullets || []),
          section.note || "",
        ].join(" "),
      )
      .join(" "),
  }));
}
