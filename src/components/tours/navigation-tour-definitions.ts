import type { TourStep } from "./page-tour";

export type NavigationTourDefinition = { page: string; introduction: string; steps: TourStep[] };
const step = (target: string, title: string, description: string): TourStep => ({ target: `#main-content :is(${target})`, title, description });
const section = (title: string, description: string) => step(`[data-tour-section=${JSON.stringify(title)}] h2`, title, description);
const search = (description: string) => step('[data-tour-search], input[placeholder^="Search"], [aria-label$="list filters"] input', "Find a record", description);
const filters = (description: string) => step('[data-tour-filter], select, [role="combobox"]', "Narrow this view", description);
const tabs = (description: string) => step('[role="tablist"]', "Choose a workspace", description);
const records = (description: string) => step('[data-list-table] > [data-export-ignore], [data-tour-records], .navigation-tour-records, [role="table"], table thead, [data-tour-empty]', "Read the results", description);
const actions = (description: string) => step('[data-tour-actions]:has(a, button:not([data-tour-trigger]))', "Page actions", description);
const summary = (description: string) => step('[data-tour-stat]', "Read the summary", description);
const fields = (description: string) => step('form:not(dialog form) input:not([type="hidden"]), form textarea, [data-tour-form]', "Complete the details", description);
const attendance = [
  step('[aria-label="Attendance method"]', "Names and room totals", "Choose Check in people for named attendance, or Record headcount for the room total. These are independent records and are never added together."),
  step('[aria-label="Headcount record filters"]', "Review reported totals", "Filter recorded headcounts by date and branch. Open Record headcount for a new session, or Edit headcount to amend an existing total. Review the gathering and date before saving."),
  step('[aria-label="Reported headcount"], [aria-label="Headcount entry"]', "Report a headcount", "Choose the gathering date, enter the total and add optional age or gender counts. Existing attendance opens read-only; use Edit attendance before changing it, then save or cancel."),
];

/** Exact routes take precedence over detail patterns; existing bespoke tours stay in their pages. */
export const NAVIGATION_TOURS: Record<string, NavigationTourDefinition> = {
  "/people/pastoral": {
    page: "Pastoral notes",
    introduction: "Keep a considered record of care conversations and follow-up.",
    steps: [
      actions("Create a care note when you have the required grant. Review the person, category and privacy before saving."),
      records("Read the care log. Open a note to review its details; notes may contain private information, so use the intended visibility."),
      section("Care at a glance", "Use these counts as a starting point, then read the actual notes for context.")
    ],
  },
  "/people/pastoral/care": {
    page: "Care calendar",
    introduction: "See upcoming care milestones and plan how to follow up.",
    steps: [
      filters("Switch the care window to see the milestones relevant to your next visits or calls."),
      records("Review each milestone and the person it belongs to. An empty view means nothing matches the current window.")
    ],
  },
  "/people/pastoral/life-events": {
    page: "Life events",
    introduction: "Record milestones so the church can respond with timely care.",
    steps: [
      actions("Mark an event to choose the member, milestone type and date. Review the details before saving."),
      summary("The calendar total and the upcoming count describe different windows; use the date on each milestone for planning."),
      filters("Filter by milestone type, and switch between upcoming and past dates."),
      records("Review milestones by date. Removing a milestone requires confirmation; it does not remove the member.")
    ],
  },
  "/people/pastoral/risk": {
    page: "Risk radar",
    introduction: "Use recorded signals to identify people who may benefit from a conversation.",
    steps: [
      summary("These counts summarize the available risk signals. Read the individual context before deciding how to respond."),
      search("Find a member by name before reviewing their signals."),
      filters("Choose the risk band to focus the view."),
      records("Review the person and their recorded signals. Treat a score as a prompt for care, rather than a conclusion about the person.")
    ],
  },
  "/people/pastoral/engagement": {
    page: "Engagement",
    introduction: "Understand how members are participating and where a personal invitation may help.",
    steps: [
      summary("Compare the engagement buckets, then use the list to see who is represented."),
      search("Search by name within the chosen engagement view."),
      filters("Switch engagement buckets to inspect a different part of the congregation."),
      records("Open a person’s record for context before planning follow-up.")
    ],
  },
  "/gatherings/attendance/check-in": {
    page: "Service check-in",
    introduction: "Record attendance for the right service and gathering date.",
    steps: [
      step('[aria-label="Choose service"]', "Choose the service", "Select the service first, then confirm the gathering date before recording attendance."),
      step('[aria-label^="Attendance date:"]', "Confirm the date", "Attendance is saved against this service and date. Changing the date opens a different attendance session."),
      ...attendance,
      step('[aria-label="Check-in category"]', "Choose the attendance category", "Choose Adult, Children or Mixed for the people you are checking in. Mixed can retain unspecified individual categories; confirm your choice before saving."),
      summary("Named check-ins apply to the selected service and date. Selected people are a draft until saved; the roster count describes the available member list."),
      search("Find a member, unlock editing when required, and select only the people who attended. Search does not save attendance."),
      records("Selections remain draft until you save. Cancel discards unsaved changes. Walk-in registration and headcounts have their own save actions."),
      section("Walk someone in", "Enter the visitor’s required details and review the selected service and date. Registering the visitor is a separate save action; cancel to leave without registering."),
      section("Confirmed arrivals", "Review the saved named check-ins for this service and date. Refresh reloads the list; it does not save draft selections.")
    ],
  },
  "/gatherings/attendance/records": {
    page: "Attendance records",
    introduction: "Review named check-ins and use filters to find the gathering you need.",
    steps: [
      search("Search attendance by person’s name."),
      step('[aria-label="Attendance record filters"]', "Scope the records", "Filter by gathering, category, branch, date range and sort order. Apply a valid date range before reading or exporting the results."),
      records("Inspect the displayed check-ins. Column choices and exports apply to this collection; undoing a check-in requires confirmation.")
    ],
  },
  "/gatherings/attendance/reports": {
    page: "Attendance reports",
    introduction: "Compare named check-ins and reported headcounts for the selected window.",
    steps: [
      filters("Choose a reporting period and branch. These controls scope the summary and trend; the service comparison is labelled separately."),
      summary("Read the named check-in totals for the selected window. Reported headcounts are shown independently."),
      section("Headcount over the window", "This chart shows the named check-in trend and its member/visitor breakdown."),
      section("The raised-hand numbers", "Reported room totals stay separate from named attendance. Do not add these figures to named check-ins."),
      section("Who carries the numbers", "Compare the listed services’ attendance counts. These are service totals, rather than a breakdown of the selected date window."),
      actions("Export the available trend rows using the format you need.")
    ],
  },
  "/gatherings/events/tiers": {
    page: "Ticket tiers",
    introduction: "Set event pricing and capacity, then review the issued tickets.",
    steps: [
      step('[aria-label="Event selector"]', "Choose an event", "Choose an event to see its tiers and issued tickets. Review price and capacity before saving a tier; deleting a tier requires confirmation."),
      actions("Use the available ticket actions for this event. Review the event and recipient before confirming any assignment."),
      records("Read the tiers or issued tickets for the selected event. If the view is empty, check the event selector before creating anything.")
    ],
  },
  "/gatherings/events/tickets": {
    page: "Issued tickets",
    introduction: "Review issued tickets and assign tickets to the intended event.",
    steps: [
      step('[aria-label="Event selector"]', "Choose an event", "Choose an event first. Check the member, tier and quantity before assigning a ticket; printing or viewing a ticket does not check the person in."),
      actions("Use the available ticket actions for this event. Review the event and recipient before confirming any assignment."),
      records("Read the tiers or issued tickets for the selected event. If the view is empty, check the event selector before creating anything.")
    ],
  },
  "/gatherings/groups": {
    page: "Departments",
    introduction: "Find the departments and teams that serve the church.",
    steps: [
      actions("Create a department when permitted. Assign its branch and leadership carefully before saving."),
      search("Search departments by the text supported in this view."),
      filters("Use branch, status and other available filters to focus the register. Switch between list and card views to suit your screen."),
      records("Open a department to see its details, member roster and meeting attendance. Management actions depend on your role and department ownership.")
    ],
  },
  "/gatherings/groups/cell": {
    page: "Cell groups",
    introduction: "Find small groups and open their own member and attendance workspaces.",
    steps: [
      actions("Create a group when permitted, choosing its branch, leader and meeting details before saving."),
      search("Search for a cell group, then clear the search to see all matching groups."),
      filters("Filter the register and choose list or card view. Archived groups are separate from active groups."),
      records("Open a group to see its meeting details, members and attendance. Group giving is available inside the group detail page when your role permits it.")
    ],
  },
  "/giving/overview": {
    page: "Giving overview",
    introduction: "Review the church\u2019s recorded generosity and open the ledger for individual gifts.",
    steps: [
      summary("Read the amounts with their time windows and comparison labels. A dashboard total is not a bank balance."),
      section("Recent gifts", "Review recent recorded gifts, then open Giving records for the searchable ledger."),
      section("Where giving is aimed", "Compare the categories assigned to recorded gifts."),
      section("The floor under the year", "Review the available recurring-giving summary separately from gifts already received."),
      actions("Use the available giving links to inspect records or record a gift when permitted.")
    ],
  },
  "/giving/donations": {
    page: "Giving records",
    introduction: "Find individual and general giving records in one ledger.",
    steps: [
      actions("Record giving when permitted. Confirm the giver or general source, amount, category, date and payment method before saving."),
      search("Search the giving ledger to find the record you need."),
      filters("Combine method, category and date filters. Apply your date range, then check the displayed results."),
      records("Inspect the ledger, choose columns or export visible records. Receipt and management actions apply to the chosen gift.")
    ],
  },
  "/giving/funds": {
    page: "Giving categories",
    introduction: "Organize the purposes used when recording gifts.",
    steps: [
      actions("Create a category with a clear name and purpose. Review the details before saving."),
      filters("Switch active and archived categories where available."),
      records("Use these categories when recording giving. Manage individual categories through their menu; destructive actions require confirmation.")
    ],
  },
  "/giving/schedules": {
    page: "Recurring giving",
    introduction: "Review standing gifts and their current status.",
    steps: [
      summary("Separate scheduled giving from transactions that have already been received."),
      filters("Choose a schedule status to focus the view."),
      records("Review amount, frequency and status. Cancelling a standing gift requires confirmation and affects future scheduling.")
    ],
  },
  "/giving/statements": {
    page: "Giving statements",
    introduction: "Review giving within a reporting window and prepare the available exports.",
    steps: [
      filters("Choose the period and category before reviewing or exporting statements."),
      summary("Read the totals for the selected window and filter scope."),
      section("Month by month", "Compare recorded giving over the selected period."),
      section("Where the season went", "See how giving is distributed between categories."),
      section("How it arrived", "Review the payment methods recorded against these gifts."),
      section("The most faithful givers", "Review the listed givers within this reporting scope."),
      actions("Export the available giving report after checking its period and scope.")
    ],
  },
  "/connect/inbox": {
    page: "Shared inbox",
    introduction: "Read and reply to the church\u2019s conversations from the shared inbox.",
    steps: [
      actions("Compose a message when permitted. Check the recipient, subject and message before sending."),
      step('[aria-label="Mailbox folders"]', "Inbox and sent messages", "Switch between received messages and sent messages. Selecting a conversation opens it for reading."),
      step('[aria-label="Mailbox"]', "Read a conversation", "Choose a message to read its contents and available reply actions. Sending a reply is a separate action after reviewing the recipient and text.")
    ],
  },
  "/connect/templates": {
    page: "Message templates",
    introduction: "Prepare reusable message wording for future communications.",
    steps: [
      actions("Create a template with its channel, content and supported variables. Saving a template does not send it."),
      filters("Switch the available channel or status filters to find an appropriate template."),
      records("Review template wording and variables before reusing it. Confirm destructive actions in the management dialog.")
    ],
  },
  "/connect/broadcasts": {
    page: "Broadcasts",
    introduction: "Prepare and track messages sent to an audience.",
    steps: [
      actions("Create a broadcast by choosing its template and audience. Review recipients and delivery details before confirming a send."),
      filters("Filter the register by the available broadcast states."),
      records("Review each broadcast’s audience, status and delivery figures. A draft is separate from a completed send.")
    ],
  },
  "/connect/messages": {
    page: "SMS and WhatsApp",
    introduction: "Inspect message delivery and prepare direct messages.",
    steps: [
      actions("Compose a message when permitted. Confirm the channel, destination number and message text before sending."),
      search("Search by phone number to find the relevant messages."),
      filters("Use the available channel and delivery filters to inspect the message stream."),
      records("Review direction, status and timestamps. Delivery status reports the provider’s result; it does not guarantee the person read the message.")
    ],
  },
  "/connect/appointments": {
    page: "Appointments",
    introduction: "Review bookings and make time for conversations.",
    steps: [
      actions("Create an appointment when permitted. Check its people, date, time and other details before saving."),
      search("Search appointment titles or people."),
      filters("Choose the appointment status or window you want to review."),
      records("Read booking dates and status. Use the management actions for the intended appointment and review any confirmation before applying it.")
    ],
  },
  "/library/sermons": {
    page: "Sermon library",
    introduction: "Find and revisit sermons by title, speaker or scripture.",
    steps: [
      actions("Open New sermon to prepare a message record when permitted."),
      search("Search titles, speakers or scripture references."),
      filters("Combine the available sermon filters, then choose list or card view."),
      records("Open a sermon to read its details and use the available audio or video. The icons show which media are attached.")
    ],
  },
  "/library/sermons/series": {
    page: "Sermon series",
    introduction: "Browse collections formed by sermons that share a series name.",
    steps: [
      search("Find a collection by name."),
      filters("Choose the available sort and view options."),
      records("Open a series to see its sermons. Series are formed from the series value entered on sermon records.")
    ],
  },
  "/library/sermons/speakers": {
    page: "Sermon speakers",
    introduction: "Find the messages associated with each recorded speaker.",
    steps: [
      search("Find a collection by name."),
      filters("Choose the available sort and view options."),
      records("Open a speaker to see their sermons. Speaker entries come from the names recorded on sermons.")
    ],
  },
  "/library/media": {
    page: "Media gallery",
    introduction: "Find images, audio and video stored in the church\u2019s library.",
    steps: [
      actions("Upload a file when permitted. Check its folder and visibility before confirming the upload."),
      search("Search filenames to find an existing file."),
      filters("Filter by media type, folder or visibility to narrow the gallery."),
      records("Open a file to inspect its details. Visibility controls determine how it can be used; deletion requires confirmation.")
    ],
  },
  "/library/media/folders": {
    page: "Media folders",
    introduction: "Browse files grouped by their folder names.",
    steps: [
      search("Search the folder names to find a collection."),
      records("Open a folder to view its files in the gallery. Folder counts describe the files available to this account."),
      actions("Return to the gallery to upload and organize files when permitted.")
    ],
  },
  "/library/forms": {
    page: "Forms",
    introduction: "Find forms, check their status and open their questions or responses.",
    steps: [
      actions("Open Form Builder to prepare a form. Building questions and publishing a form are separate steps."),
      search("Search forms by title."),
      filters("Filter by branch or status and choose the available view options."),
      records("Open a form to review its questions, status and response links. Closed or archived forms do not accept new answers.")
    ],
  },
  "/library/forms/submissions": {
    page: "Form submissions",
    introduction: "Read answers belonging to one selected form.",
    steps: [
      step('[aria-label="Form picker"]', "Choose a form", "Select the form whose responses you want to inspect. Each form has its own submission inbox."),
      records("Read the selected form’s answers and use its available filters and exports. Check the form selection before sharing an export.")
    ],
  },
  "/insights/analytics": {
    page: "Analytics overview",
    introduction: "Review the recorded trends across giving, attendance and membership.",
    steps: [
      filters("Choose the available period and branch controls before comparing figures. Different report blocks may require additional read grants."),
      summary("Read each figure with its date window and comparison label."),
      section("Giving by period", "Compare giving over time for the selected scope."),
      section("Where people are plugged in", "Review participation in the available groups and departments."),
      section("In the room: members and guests", "Compare named member and visitor attendance over time."),
      section("Membership growth", "Review membership growth using the recorded dates.")
    ],
  },
  "/insights/analytics/giving": {
    page: "Giving analytics",
    introduction: "Explore recorded giving by time, purpose and method.",
    steps: [
      filters("Choose the available period and branch controls before comparing figures. Different report blocks may require additional read grants."),
      summary("Read each figure with its date window and comparison label."),
      section("Monthly totals", "Compare recorded gifts over time."),
      section("Where it went", "Review the categories attached to these gifts."),
      section("How people give", "Compare recorded payment methods."),
      section("Most generous this period", "Review the leading recorded givers within this period.")
    ],
  },
  "/insights/analytics/attendance": {
    page: "Attendance analytics",
    introduction: "Explore attendance trends and their recorded sources.",
    steps: [
      filters("Choose the available period and branch controls before comparing figures. Different report blocks may require additional read grants."),
      summary("Read each figure with its date window and comparison label."),
      section("Total in the room", "Read the attendance trend for the selected scope."),
      section("How people were counted", "Compare attendance sources; named attendance and reported headcounts retain their own meanings."),
      section("Where the people are", "Compare attendance across services."),
      section("Gathering by location", "Review the available branch comparison.")
    ],
  },
  "/insights/analytics/members": {
    page: "Member analytics",
    introduction: "Explore the congregation\u2019s recorded growth and profile.",
    steps: [
      filters("Choose the available period and branch controls before comparing figures. Different report blocks may require additional read grants."),
      summary("Read each figure with its date window and comparison label."),
      section("Members over time", "Review membership growth using the recorded dates."),
      section("Congregation bands", "Compare the available age bands."),
      section("Where people stand", "Review the recorded membership statuses."),
      section("The mix in the room", "Review the gender distribution, including any unrecorded values.")
    ],
  },
  "/insights/reports": {
    page: "Report studio",
    introduction: "Build an export from the report blocks this account can read.",
    steps: [
      step('[data-tour-report-palette] > .rule-label', "Choose report blocks", "Add or remove blocks using this palette. Only blocks available to your role are offered."),
      step('[data-tour-report-settings] .rule-label', "Set the report scope", "Choose the reporting window, branch and output format. Review the preview before exporting."),
      step('[data-tour-report-preview] header', "Review the report", "Check the figures and use the move or remove controls to arrange the report. Draft layout changes do not alter source records."),
      actions("Export the report after its blocks have loaded. A failing block is shown in the preview so you can review it before exporting.")
    ],
  },
  "/operations/assets": {
    page: "Asset register",
    introduction: "Find church assets and review their custody and condition.",
    steps: [
      actions("Open Add asset to register an item when permitted."),
      search("Search asset name, tag or serial number."),
      filters("Filter by category or status, then choose the available list or card view."),
      records("Open an asset to inspect its assignment, value, maintenance and loan history. Check the asset identity before using management actions.")
    ],
  },
  "/operations/assets/categories": {
    page: "Asset categories",
    introduction: "Group assets by a clear, shared classification.",
    steps: [
      actions("Create a category when permitted, using a name that helps the team find related assets."),
      filters("Switch active or archived categories when available."),
      records("Manage the intended category through its menu. Archiving and permanent deletion have separate confirmation steps.")
    ],
  },
  "/operations/assets/maintenance": {
    page: "Asset maintenance",
    introduction: "Track servicing and repairs for individual assets.",
    steps: [
      search("Find a maintenance record by the search supported in this worklist."),
      filters("Use status and other available controls to focus the worklist."),
      records("Open an item to inspect its asset and maintenance details. Review dates, cost and status before saving changes."),
      actions("Switch to the loans board to inspect borrowed assets.")
    ],
  },
  "/operations/assets/loans": {
    page: "Asset loans",
    introduction: "Track borrowed assets and their expected return.",
    steps: [
      search("Find the loan record you need."),
      filters("Use the available filters to focus the worklist."),
      records("Review the borrower, asset and due date. Recording a return or changing a loan is a separate action after reviewing its details."),
      actions("Switch to maintenance to review servicing and repairs.")
    ],
  },
  "/admin/team": {
    page: "Team members",
    introduction: "Manage the staff and volunteers who have workspace access.",
    steps: [
      actions("Invite or add a team member when permitted. Review the account, role and branch before granting access."),
      search("Search by name or email."),
      filters("Use role, branch and status filters to inspect the team directory."),
      records("Open a team member to review their access. Role and status changes affect what that account can do and require careful review.")
    ],
  },
  "/admin/permissions": {
    page: "Roles and permissions",
    introduction: "Review what each role can reach in the workspace.",
    steps: [
      records("Open a role to inspect its permissions. A listed permission describes access, rather than the data that role can see in every branch."),
      actions("Use the available role actions only after reviewing the intended access changes.")
    ],
  },
  "/admin/locations": {
    page: "Branches",
    introduction: "Review church locations and their contact information.",
    steps: [
      actions("Create a branch when permitted and confirm its name, location and contact details before saving."),
      search("Search branch name, city or address."),
      filters("Switch active and archived branches when available."),
      records("Open a branch to read its contact and register details. Management actions apply only to the branch you choose.")
    ],
  },
  "/admin/church": {
    page: "Church settings",
    introduction: "Maintain the church information used throughout the workspace.",
    steps: [
      tabs("Choose the settings section you want to inspect."),
      step('[id="church"]', "Church details", "Review the church’s identity and contact information before saving. These values may appear on exports and receipts."),
      fields("Edit the relevant fields, then review and save explicitly. Taking this tour does not save changes.")
    ],
  },
  "/admin/channels": {
    page: "Integrations",
    introduction: "Review the provider accounts and service connections used by the church.",
    steps: [
      tabs("Switch between provider accounts and service routing. The two views manage different parts of a connection."),
      step('[data-tour-integrations] h2', "Provider accounts and routing", "Review the provider and account status, then inspect which account each service uses. Saved secrets are not displayed again; review routing changes before applying them.")
    ],
  },
  "/settings/profile": {
    page: "Your profile",
    introduction: "Review your own workspace identity and contact details.",
    steps: [
      section("The name the workspace calls you by", "Update your photo, name or phone number, then save explicitly. Your email may be managed separately."),
      fields("Check the displayed values before saving a change to your profile."),
      section("Account", "Review your account and church context here."),
      section("Security lives elsewhere", "Open Security to manage passwords and two-step verification.")
    ],
  },
  "/settings/security": {
    page: "Security",
    introduction: "Review the controls that protect your account.",
    steps: [
      section("Something you'd never type aloud", "Use the password form when you intend to change your password. Enter the current password and confirm the new one before saving."),
      section("Two-step verification", "Follow the setup and verification steps before enabling two-step verification. Keep recovery codes private and accessible to you."),
      step('[data-tour-security-password]', "Change password", "Use a unique password. This tour only explains the controls and does not submit or change your credentials.")
    ],
  },
  "/settings/appearance": {
    page: "Appearance",
    introduction: "Choose how your workspace looks.",
    steps: [
      section("The primary colour of your workspace", "Choose an accent preset or a custom colour. Appearance controls may apply immediately."),
      step('[data-tour-appearance] section:nth-of-type(2) h2', "Theme and colour", "Review the light, dark and accent options. Choose the appearance that is comfortable for your workspace.")
    ],
  },
  "/settings/billing": {
    page: "Billing",
    introduction: "Review the church\u2019s current plan and billing information.",
    steps: [
      step('[data-tour-billing-plan]', "Current plan", "Review your current plan, its status and renewal information. Usage limits and recorded payments are shown separately below."),
      step('[data-tour-billing-compare]', "Compare plans", "Compare the available plans and their limits. Choosing a plan opens checkout; review the price, billing period and currency there before paying."),
      step('[data-tour-billing-history]', "Payment history", "Review recorded invoices and payments here. An empty ledger means no payments have been recorded in this view."),
      actions("Inspect the available billing actions. Confirm the price and period in checkout before making a payment.")
    ],
  },
  "/support": {
    page: "Help and support",
    introduction: "Choose the support channel that fits your question.",
    steps: [
      section("Talk to a human", "Open support chat when you need help. Review your message before sending and include only the details needed to explain the issue."),
      section("Answers before questions", "Visit the help centre for guides and common questions."),
      section("The quiet fallback", "Use the displayed support email if you prefer email. Sending an email takes place in your mail application.")
    ],
  },
  "/gatherings/events/[eventId]": {
    page: "Event details",
    introduction: "Review this event\u2019s schedule, registration capacity and attendance.",
    steps: [
      actions("Open the check-in desk for attendance, or Edit to revise this event when permitted. Ticket links appear when available."),
      step('[data-tour-event-capacity]', "Capacity and registration", "Read registered places and remaining capacity separately from attendance. A registration is not proof of attendance."),
      summary("Registered, attended, walk-in and no-show figures describe this event. Read the underlying registrations and check-ins for context."),
      tabs("Choose Registrations or Attendance; ticket tiers appear for ticketed events. Close the tour to change tabs, then replay it for the visible workspace."),
      step('[role="tabpanel"][data-state="active"] h2', "Inspect the visible records", "Review the selected tab’s records. Registration and payment status are separate from attendance; the Attendance tab also separates named check-ins from reported room totals."),
      ...attendance
    ],
  },
  "/gatherings/attendance/services/[serviceId]": {
    page: "Service details",
    introduction: "Review this service\u2019s schedule, named attendance and reported room counts.",
    steps: [
      step('[data-tour-service-summary]', "Service counts", "All-time check-ins and recent named records cover different scopes. Gifts are shown separately when your role can read giving."),
      ...attendance,
      section("People counted by name", "These are recent named check-ins. Open the desk to record attendance, or use Records to review the full history."),
      section("The schedule", "Confirm the recurrence, day, time and branch before using the service’s attendance desk."),
      section("What this service raised", "Only gifts tagged to this service appear here. Open the giving ledger for individual transactions.")
    ],
  },
  "/gatherings/groups/[deptId]": {
    page: "Department details",
    introduction: "Review this department\u2019s leadership, members and meeting attendance.",
    steps: [
      actions("Return to Departments or edit this department when your role and ownership allow it."),
      summary("Read the department summary, then use the tabs to inspect its records."),
      tabs("Overview shows department details. Members opens its roster; Attendance opens its meeting records. Close the tour to change tabs and replay for that workspace."),
      step('[role="tabpanel"][data-state="active"] h2', "Department workspace", "Review the visible department details or collection. Membership and attendance are separate records; adding a member does not record a meeting attendance."),
      search("Search within the visible department collection."),
      records("Review the roster or meeting records. Available add, remove and attendance controls depend on your grants and department ownership; review before saving."),
      ...attendance
    ],
  },
  "/gatherings/groups/cell/[groupId]": {
    page: "Cell group details",
    introduction: "Review this group\u2019s leader, meeting place, members and attendance.",
    steps: [
      actions("Return to Cell groups or edit the group when permitted. Check leadership and meeting details before saving."),
      summary("Member count, meetings held and average attendance have different meanings. Review the meeting records for the dates behind them."),
      tabs("Choose Overview, Members, Attendance or Giving. Access depends on your role. Close the tour to change tabs, then replay for the visible workspace."),
      section("Group details", "Confirm the leader, branch and meeting location or schedule here."),
      section("Cell groups nearby", "Nearby groups are based on the available location information."),
      search("Search within this group’s visible collection."),
      records("Review this group’s member or meeting records. Changes remain subject to group ownership and the relevant grants."),
      section("Group giving", "Giving here belongs to this cell group. Review the meeting date, purpose and amount before recording a gift."),
      ...attendance
    ],
  },
  "/gatherings/events/[eventId]/edit": {
    page: "Edit event",
    introduction: "Amend the selected event and review the changes before saving.",
    steps: [
      section("What is it?", "Check the event title, description and type."),
      section("On the calendar", "Confirm location and the start and end times for the event."),
      section("Free or ticketed", "Review the event’s entry settings. Paid-event options depend on your plan and permissions."),
      fields("Required fields must be completed. Save applies the changes; Cancel returns without saving."),
      actions("Review the event and your edits before choosing Save. Cancel leaves the event unchanged.")
    ],
  },
  "/library/sermons/new": {
    page: "New sermon",
    introduction: "Prepare a sermon record with its details and media.",
    steps: [
      step('[aria-label="Sermon sections"]', "Work through the sermon", "Complete Details first. Saving creates the sermon and opens its editor; Audio and Video then become available and each saves independently."),
      fields("Complete the required details, including title and the relevant sermon information. Review speaker, series and dates for consistency."),
      actions("Review the title, branch and sermon details before Save Details creates the record. Cancel leaves without creating a sermon. Recordings can be added afterwards.")
    ],
  },
  "/library/sermons/[sermonId]/edit": {
    page: "Edit sermon",
    introduction: "Review and amend this sermon record.",
    steps: [
      step('[aria-label="Sermon sections"]', "Work through the sermon", "Move through the available form sections to add message details and media."),
      fields("Complete the required details, including title and the relevant sermon information. Review speaker, series and dates for consistency."),
      actions("Review the message details and media before saving. Cancel returns without publishing your draft changes.")
    ],
  },
  "/library/forms/new": {
    page: "Form Builder",
    introduction: "Build questions and review the form before publishing.",
    steps: [
      tabs("Switch the available builder, preview or settings sections to prepare your form."),
      fields("Start with the form details, then add questions and mark required answers deliberately."),
      step('[data-tour-form-editor]', "Questions and preview", "Add and arrange fields, check their labels and answer types, then preview the form as a respondent. Review publication settings before saving."),
      actions("Preview the form before saving or publishing it. Review status and access settings before making it available.")
    ],
  },
  "/library/forms/[formId]/edit": {
    page: "Edit form",
    introduction: "Review this form\u2019s questions and settings before saving.",
    steps: [
      tabs("Switch the available builder, preview or settings sections to prepare your form."),
      fields("Start with the form details, then add questions and mark required answers deliberately."),
      step('[data-tour-form-editor]', "Questions and preview", "Add and arrange fields, check their labels and answer types, then preview the form as a respondent. Review publication settings before saving."),
      actions("Preview the form before saving or publishing it. Review status and access settings before making it available.")
    ],
  },
  "/operations/assets/new": {
    page: "Add asset",
    introduction: "Register an asset with its identity, assignment and value.",
    steps: [
      fields("Enter the asset identity and required details. Check the tag and serial number to avoid duplicate records."),
      section("Assignment and location", "Choose the branch, department or responsible person and record where the asset is held."),
      section("Purchase and valuation", "Review purchase price, current value and depreciation inputs. Use the values intended for this asset."),
      actions("Save only after reviewing the form. Cancel returns without saving draft changes.")
    ],
  },
  "/operations/assets/[assetId]/edit": {
    page: "Edit asset",
    introduction: "Review this asset\u2019s details before saving changes.",
    steps: [
      fields("Enter the asset identity and required details. Check the tag and serial number to avoid duplicate records."),
      section("Assignment and location", "Choose the branch, department or responsible person and record where the asset is held."),
      section("Purchase and valuation", "Review purchase price, current value and depreciation inputs. Use the values intended for this asset."),
      actions("Save only after reviewing the form. Cancel returns without saving draft changes.")
    ],
  },
  "/people/members/[memberId]": {
    page: "Member details",
    introduction: "Review this member\u2019s profile and the records your role can read.",
    steps: [
      actions("Use the tabs to inspect the member\u2019s details, involvement and other available records. Editing and communication actions have their own review steps."),
      tabs("Use the tabs to inspect the member\u2019s details, involvement and other available records. Editing and communication actions have their own review steps."),
      step('[data-tour-section] h2, [role="tabpanel"][data-state="active"], [data-tour-records]', "Review the record", "Use the tabs to inspect the member\u2019s details, involvement and other available records. Editing and communication actions have their own review steps.")
    ],
  },
  "/people/visitors/[visitorId]": {
    page: "Visitor details",
    introduction: "Review this guest\u2019s contact information and follow-up.",
    steps: [
      actions("Review contact details and visit history before following up. Changing follow-up status and converting to a member are separate actions."),
      tabs("Review contact details and visit history before following up. Changing follow-up status and converting to a member are separate actions."),
      step('[data-tour-section] h2, [role="tabpanel"][data-state="active"], [data-tour-records]', "Review the record", "Review contact details and visit history before following up. Changing follow-up status and converting to a member are separate actions.")
    ],
  },
  "/people/families/[familyId]": {
    page: "Family details",
    introduction: "Review this household, its members and their relationships.",
    steps: [
      actions("Edit the household or add a member when permitted. Check the person and relationship before saving. Removing a relationship or deleting a family requires its own confirmation."),
      summary("People together counts household entries. Linked records counts those connected to member profiles; the two totals can differ."),
      step('[data-tour-family-roster]', "Household members", "Review each person’s relationship and the head-of-household marker. Open the linked member record for their profile. Removing a household link is separate from deleting a member."),
      step('[data-tour-family-notes]', "Household status", "Review the household head, member count and active or archived status here.")
    ],
  },
  "/admin/team/[profileId]": {
    page: "Team member details",
    introduction: "Review this workspace account and its assigned access.",
    steps: [
      actions("Inspect the account\u2019s role, branch and status. Access changes affect what this person can do; review all changes before saving."),
      tabs("Inspect the account\u2019s role, branch and status. Access changes affect what this person can do; review all changes before saving."),
      step('[data-tour-section] h2, [role="tabpanel"][data-state="active"], [data-tour-records]', "Review the record", "Inspect the account\u2019s role, branch and status. Access changes affect what this person can do; review all changes before saving.")
    ],
  },
  "/admin/permissions/[roleName]": {
    page: "Role details",
    introduction: "Inspect the permissions assigned to this role before making any access changes.",
    steps: [
      summary("Review the saved grant count and any additions or removals in this session. Draft checkbox changes do not apply until saved."),
      step('[aria-label="Search permission resources"]', "Find a permission", "Search the permission resources to inspect the access you need. Filtering does not change any grants."),
      step('[data-tour-role-matrix]', "Review the permission matrix", "Locked roles are read-only. Available changes depend on your grants and whether this is a custom role or a global template. Review every intended access change before saving; Cancel discards the draft.")
    ],
  },
  "/admin/locations/[branchId]": {
    page: "Branch details",
    introduction: "Review this branch\u2019s contact and register information.",
    steps: [
      actions("Read the branch\u2019s address, contacts and status before using management actions."),
      tabs("Read the branch\u2019s address, contacts and status before using management actions."),
      step('[data-tour-section] h2, [role="tabpanel"][data-state="active"], [data-tour-records]', "Review the record", "Read the branch\u2019s address, contacts and status before using management actions.")
    ],
  },
  "/library/sermons/[sermonId]": {
    page: "Sermon details",
    introduction: "Read this message\u2019s details and use its available media.",
    steps: [
      actions("Review the summary, speaker, scripture and series. Audio and video controls appear when media are attached."),
      tabs("Review the summary, speaker, scripture and series. Audio and video controls appear when media are attached."),
      step('[data-tour-section] h2, [role="tabpanel"][data-state="active"], [data-tour-records]', "Review the record", "Review the summary, speaker, scripture and series. Audio and video controls appear when media are attached.")
    ],
  },
  "/library/forms/[formId]": {
    page: "Form details",
    introduction: "Review the form\u2019s questions, status and response links.",
    steps: [
      actions("Inspect the questions and status before sharing the form or opening its submissions."),
      tabs("Inspect the questions and status before sharing the form or opening its submissions."),
      step('[data-tour-section] h2, [role="tabpanel"][data-state="active"], [data-tour-records]', "Review the record", "Inspect the questions and status before sharing the form or opening its submissions.")
    ],
  },
  "/library/forms/[formId]/fill": {
    page: "Complete a form",
    introduction: "Read the questions and prepare your answers.",
    steps: [
      actions("Check required fields and review your answers before submitting. Closed or archived forms do not accept new responses."),
      tabs("Check required fields and review your answers before submitting. Closed or archived forms do not accept new responses."),
      step('[data-tour-section] h2, [role="tabpanel"][data-state="active"], [data-tour-records]', "Review the record", "Check required fields and review your answers before submitting. Closed or archived forms do not accept new responses.")
    ],
  },
  "/operations/assets/[assetId]": {
    page: "Asset details",
    introduction: "Review this asset\u2019s identity, assignment and history.",
    steps: [
      actions("Choose the available tabs to review maintenance, loans and valuation. Check the asset identity before changing records."),
      tabs("Choose the available tabs to review maintenance, loans and valuation. Check the asset identity before changing records."),
      step('[data-tour-section] h2, [role="tabpanel"][data-state="active"], [data-tour-records]', "Review the record", "Choose the available tabs to review maintenance, loans and valuation. Check the asset identity before changing records.")
    ],
  },
};

export const BESPOKE_TOUR_ROUTES = new Set([
  "/home", "/notifications", "/search", "/people/members", "/people/members/new",
  "/people/members/import", "/people/visitors/import", "/people/families", "/people/segments",
  "/people/visitors", "/people/visitors/follow-up", "/gatherings/events",
  "/gatherings/events/list", "/gatherings/events/new", "/gatherings/events/check-in",
  "/gatherings/events/registrations", "/gatherings/attendance", "/gatherings/attendance/services",
]);

export function resolveNavigationTour(pathname: string): NavigationTourDefinition | undefined {
  if (BESPOKE_TOUR_ROUTES.has(pathname)) return undefined;
  if (NAVIGATION_TOURS[pathname]) return NAVIGATION_TOURS[pathname];
  return Object.entries(NAVIGATION_TOURS).find(([pattern]) => {
    const expected = pattern.split("/");
    const actual = pathname.split("/");
    return expected.length === actual.length && expected.every((part, index) =>
      part.startsWith("[") ? !!actual[index] : part === actual[index]);
  })?.[1];
}
