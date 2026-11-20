"use client";

import { ListToolbar } from "@/components/shared/list-toolbar";

import { ListTable } from "@/components/shared/list-table";
import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  ArrowUpDown as ArrowUpDownIcon,
  CalendarDays,
  ClipboardList,
  LayoutGrid,
  Rows3,
  ScanLine,
  User,
  UserPlus,
} from "lucide-react";
import { PageHeader } from "@/components/paper/section";
import { PageTour, type TourStep } from "@/components/tours/page-tour";
import { useCurrentProfile } from "@/hooks/use-profile";
import { StatCard, Tag } from "@/components/paper/stat";
import {
  EmptyState,
  FilterChip,
  ListPaginationFooter,
  ManageHeading,
  PersonAvatar,
  RowActions,
  SearchField,
  SortDirectionToggle,
  ViewToggle,
} from "@/components/paper/primitives";
import { StaggerGroup, StaggerItem } from "@/components/paper/motion/primitives";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { RegisterAttendeeButton } from "@/components/events/register-attendee-button";
import { ExportDropdown } from "@/components/shared/export-dropdown";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useEventsList,
  useEventRegistrations,
  type EventRegistration,
} from "@/hooks/use-events";
import { formatDate } from "@/hooks/use-media";
import { number } from "@/lib/paper/format";

const REGISTRATIONS_TOUR_STEPS: TourStep[] = [
  { target: ".registrations-tour-heading", title: "Review event registrations", description: "Choose an event to review who registered, their payment status and whether they have checked in. This guide does not register anyone, change a payment or mark attendance." },
  { target: ".registrations-tour-event", title: "Choose the event first", description: "Select from up to 100 loaded events within your access. Choosing an event loads its registrations and clears the search. Payment and door filters remain as selected, so check them when switching events. The full tour opens after your first event choice." },
  { target: ".registrations-tour-pick", title: "Start with an event", description: "No event is selected yet. Finish this short guide, choose an event above, then follow the guide to its registration controls. You can replay the relevant tour anytime with Take a tour." },
  { target: ".registrations-tour-summary", title: "Read totals for the whole event", description: "Registrations, Paid, Checked in and Awaiting payment count registration records for the selected event, across the loaded list. They do not count seats. Search and filters change the matching results and pagination, while these totals stay separate." },
  { target: ".registrations-tour-search", title: "Find an attendee or ticket", description: "Search the loaded registrations by attendee name, tier name or ticket code. Filtering is immediate and returns to page one. Clear search removes only the text filter; payment and door filters still apply." },
  { target: ".registrations-tour-payment", title: "Filter recorded payment status", description: "Any payment removes the payment filter. Paid, pending, failed and cancelled show registrations with that recorded status. These controls filter the list; they do not collect money, cancel registrations or change payments." },
  { target: ".registrations-tour-door", title: "Filter recorded check-ins", description: "Checked in shows registrations marked as checked in; Still out shows the others. Select the active chip again to remove this filter. This is the registration's recorded check-in flag, not a date-specific attendance report. Filtering changes no attendance." },
  { target: ".registrations-tour-display", title: "Sort and choose a layout", description: "Sort by Registered date, Name, Tier or Seats and reverse the direction if needed. Table and Cards show the same matching registrations. Use horizontal scrolling for wide tables on smaller screens." },
  { target: "[data-list-table='gatherings-events-registrations-1'] > [data-export-ignore]", title: "Columns and selected rows", description: "Columns chooses the visible table fields. Checkboxes select registrations on this page and offer exports for that selection. Selecting a row does not register a person, change payment status or check them in." },
  { target: ".registrations-tour-record", title: "Read a registration", description: "Review the attendee, tier, seat quantity, payment status, check-in flag and ticket code when supplied. A registration can reserve more than one seat. The event summary counts registrations, while Qty or the card's multiplier shows seats." },
  { target: ".registrations-tour-manage", title: "Open the related workspace", description: "In Table view, hover a row or focus its controls to reveal actions. Open attendee appears when your account can read member profiles. Run check-in opens the attendance desk for this event; opening it alone does not check anyone in." },
  { target: ".registrations-tour-empty", title: "When the list is empty", description: "Check the search, payment and door filters before assuming the event has no registrations. Clear search, choose Any payment and toggle the active Checked in or Still out chip off to show the full loaded list." },
  { target: ".registrations-tour-page [aria-label='Pagination']", title: "Browse matching registrations", description: "Prev and Next move through matching results. Rows per page changes the number displayed. The range and total follow search and filters. Navigation is disabled when there is nowhere else to go." },
  { target: ".registrations-tour-export button", title: "Export the matching list", description: "Export offers PDF, Excel and CSV for all loaded registrations matching your current filters, including other pages. Check the event and filters before downloading. It is hidden when no registrations match." },
  { target: ".registrations-tour-register button", title: "Register a member for a free event", description: "For a free, unarchived event, authorised users can open Register Attendee, choose an existing member and confirm one place. Event Full disables registration when capacity is reached. Registration and check-in are separate; the tour does not submit this dialog." },
  { target: ".registrations-tour-links", title: "Continue to the event or door desk", description: "Open the event shows the event record. Run check-in opens the attendance desk with this event selected. Review the date and context there before making changes. These links alone do not alter registrations or attendance." },
];

const PAGE_SIZE = 15;

const STATUS_TONES: Record<string, "moss" | "gold" | "rose" | "neutral"> = {
  paid: "moss",
  pending: "gold",
  failed: "rose",
  cancelled: "neutral",
};

type PaymentFilter = "all" | "paid" | "pending" | "failed" | "cancelled";
type DoorFilter = "all" | "in" | "out";
type SortValue = "createdAt" | "name" | "tier" | "quantity";

const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: "createdAt", label: "Registered" },
  { value: "name", label: "Name" },
  { value: "tier", label: "Tier" },
  { value: "quantity", label: "Seats" },
];

const EXPORT_COLUMNS = [
  { key: "attendee", label: "Attendee" },
  { key: "tier", label: "Tier" },
  { key: "quantity", label: "Seats" },
  { key: "payment", label: "Payment" },
  { key: "checkedIn", label: "Checked in" },
  { key: "ticketCode", label: "Ticket code" },
  { key: "registered", label: "Registered" },
];

const displayName = (r: EventRegistration) =>
  r.memberName ?? `Member ${r.memberId?.slice(0, 6) ?? "Not available"}`;

const exportRow = (r: EventRegistration) => ({
  attendee: displayName(r),
  tier: r.tierName ?? "General",
  quantity: r.quantity ?? 1,
  payment: r.paymentStatus ?? "pending",
  checkedIn: r.checkedIn ? "yes" : "no",
  ticketCode: r.ticketCode ?? "Not available",
  registered: r.createdAt ? formatDate(r.createdAt) : "Not available",
});

function RegistrationsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can, ready } = usePermissions();
  const { data: profile } = useCurrentProfile();
  const canRegister = ready && can("events:registrations", "create");
  const canViewMembers = ready && can("members:all", "read");

  const [eventId, setEventId] = React.useState(searchParams.get("event") ?? "");
  const [query, setQuery] = React.useState("");
  const [payment, setPayment] = React.useState<PaymentFilter>("all");
  const [door, setDoor] = React.useState<DoorFilter>("all");
  const [sortBy, setSortBy] = React.useState<SortValue>("createdAt");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(PAGE_SIZE);
  const [view, setView] = React.useState<"table" | "cards">("table");

  const events = useEventsList({ limit: 100, sortBy: "startDate", sortOrder: "desc" });
  const registrations = useEventRegistrations(eventId);

  // The endpoint returns the whole list, so every control is client-side —
  // the same shape as the groups and cell-group registers.
  const filtered = React.useMemo(() => {
    let list = registrations.data ?? [];
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((r) =>
        [r.memberName, r.tierName, r.ticketCode]
          .some((v) => v?.toLowerCase().includes(q)),
      );
    }
    if (payment !== "all") list = list.filter((r) => (r.paymentStatus ?? "pending") === payment);
    if (door !== "all") list = list.filter((r) => (door === "in" ? r.checkedIn : !r.checkedIn));
    const direction = sortOrder === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return displayName(a).localeCompare(displayName(b)) * direction;
        case "tier":
          return (a.tierName ?? "").localeCompare(b.tierName ?? "") * direction;
        case "quantity":
          return ((a.quantity ?? 1) - (b.quantity ?? 1)) * direction;
        default:
          return a.createdAt.localeCompare(b.createdAt) * direction;
      }
    });
  }, [registrations.data, query, payment, door, sortBy, sortOrder]);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, pages);
  const rows = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  const resetPage = () => setPage(1);

  const eventList = events.data?.data ?? [];
  const selected = eventList.find((e) => e.eventId === eventId);
  const all = registrations.data ?? [];
  const checkedIn = all.filter((r) => r.checkedIn).length;
  const paid = all.filter((r) => r.paymentStatus === "paid").length;

  const manageActions = (registration: EventRegistration) => [
    canViewMembers && registration.memberId && {
      label: "Open attendee",
      icon: <User />,
      href: `/people/members/${registration.memberId}`,
    },
    {
      label: "Run check-in",
      icon: <ScanLine />,
      onSelect: () =>
        router.push(`/gatherings/events/check-in?event=${encodeURIComponent(eventId)}`),
    },
  ];

  return (
    <div className="registrations-tour-page space-y-6">
      <PageHeader
        className="registrations-tour-heading"
        eyebrow="Gatherings · Events"
        title="Who&apos;s coming."
        description="Review registrations, payments and walk-ins in one place."
        actions={
          <>
            <PageTour page={eventId ? "Event registrations" : "Choose event registrations"} account={profile ? `${profile.churchId}:${profile.profileId}` : undefined} ready={ready && events.isSuccess && (!eventId || registrations.isSuccess)} steps={REGISTRATIONS_TOUR_STEPS} />
            {eventId && total ? (
              <div className="registrations-tour-export inline-flex">
              <ExportDropdown
                columns={EXPORT_COLUMNS}
                data={filtered.map(exportRow)}
                title={`Registrations: ${selected?.title ?? "Event"}`}
                filename="event-registrations"
                disabled={!total}
              /></div>
            ) : null}
            {selected && canRegister ? <div className="registrations-tour-register inline-flex"><RegisterAttendeeButton event={selected} /></div> : null}
          </>
        }
      />

      {eventId ? (<div className="registrations-tour-summary grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Registrations" value={all.length} tone="brand" icon={<ClipboardList className="size-4" />} deltaLabel={total !== all.length ? `${number(total)} matching` : "all shown"} />
            <StatCard label="Paid" value={paid} tone="moss" />
            <StatCard label="Checked in" value={checkedIn} tone="sky" deltaLabel={all.length ? `${Math.round((checkedIn / all.length) * 100)}% of list` : "Not available"} />
            <StatCard label="Awaiting payment" value={all.filter((r) => r.paymentStatus === "pending").length} tone="gold" />
          </div>) : null}

<ListToolbar search={eventId ? (<SearchField
              value={query}
              onChange={(value) => { setQuery(value); resetPage(); }}
              placeholder="Search attendees…"
              className="registrations-tour-search w-full max-w-xs"
            />) : undefined} controls={<><select
          value={eventId}
          onChange={(e) => {
            setEventId(e.target.value);
            setQuery("");
            resetPage();
            router.replace(`/gatherings/events/registrations${e.target.value ? `?event=${e.target.value}` : ""}`);
          }}
          className="registrations-tour-event h-9 max-w-[300px] truncate rounded-full border border-line bg-card px-3 text-sm outline-none"
          aria-label="Event selector"
        >
          <option value="">Choose an event…</option>
          {eventList.map((event) => (
            <option key={event.eventId} value={event.eventId}>
              {event.title} · {formatDate(event.startDate)}
            </option>
          ))}
        </select>{eventId ? (<span className="flex flex-wrap items-center gap-1.5 text-xs text-ink-faint">
              {selected?.isFree ? <Tag tone="moss">free event</Tag> : <Tag tone="gold">tickets</Tag>}
              {selected?.capacity ? <span className="num">capacity {number(selected.capacity)}</span> : null}
            </span>) : null}{eventId ? (<div className="registrations-tour-display flex flex-wrap items-center gap-2">
            <Select value={sortBy} onValueChange={(value) => { setSortBy(value as SortValue); resetPage(); }}>
              <SelectTrigger aria-label="Sort registrations" className="h-9 w-44 rounded-full border-line bg-card text-sm shadow-none">
                <ArrowUpDownIcon /> <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <SortDirectionToggle
              ascending={sortOrder === "asc"}
              onToggle={() => { setSortOrder((o) => (o === "asc" ? "desc" : "asc")); resetPage(); }}
            />
            <ViewToggle
              value={view}
              onChange={setView}
              options={[
                { value: "table", label: "Table", icon: <Rows3 /> },
                { value: "cards", label: "Cards", icon: <LayoutGrid /> },
              ]}
            />
          </div>) : null}</>}>{eventId ? <><div className="registrations-tour-payment flex flex-wrap gap-1.5" role="group" aria-label="Registration payment filters">
              {(["all", "paid", "pending", "failed", "cancelled"] as const).map((s) => (
                <FilterChip key={s} active={payment === s} onClick={() => { setPayment(s); resetPage(); }}>
                  {s === "all" ? "Any payment" : s}
                </FilterChip>
              ))}
              </div><div className="registrations-tour-door flex flex-wrap gap-1.5" role="group" aria-label="Registration check-in filters">
              <FilterChip active={door === "in"} onClick={() => { setDoor((d) => (d === "in" ? "all" : "in")); resetPage(); }}>Checked in</FilterChip>
              <FilterChip active={door === "out"} onClick={() => { setDoor((d) => (d === "out" ? "all" : "out")); resetPage(); }}>Still out</FilterChip></div></> : null}</ListToolbar>

      {eventId ? (
        <>




          {registrations.isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
          ) : rows.length === 0 ? (
            <div className="registrations-tour-empty"><EmptyState
              className="paper-card bg-card"
              icon={<UserPlus />}
              title={query || payment !== "all" || door !== "all" ? "No matching registrations" : "No registrations yet"}
              description={query || payment !== "all" || door !== "all" ? "Adjust the search, payment or check-in filters to review other registrations." : selected?.isFree ? "Use Register Attendee to register a member for this free event." : "Tickets appear here when someone registers."}
              action={selected ? <RegisterAttendeeButton event={selected} /> : null}
            /></div>
          ) : view === "table" ? (
            <div className="paper-card overflow-hidden rounded-2xl">
              <div className="overflow-x-auto">
                <ListTable className="min-w-[760px]" tableId="gatherings-events-registrations-1" records={rows ?? []} recordKey="registrationId">
                  <div className="rule-label grid grid-cols-[minmax(0,1.8fr)_1fr_0.8fr_0.8fr_0.8fr_1fr_auto] items-center gap-3 border-b border-line px-5 py-2.5">
                    <span>Attendee</span>
                    <span>Tier</span>
                    <span className="text-right">Qty</span>
                    <span>Payment</span>
                    <span>Checked in</span>
                    <span className="text-right">Ticket</span>
                    <div className="registrations-tour-manage text-right"><ManageHeading /></div>
                  </div>
                  <div className="divide-y divide-line/70">
                    {rows.map((registration: EventRegistration) => (
                      <div
                        key={registration.registrationId}
                        className="group grid grid-cols-[minmax(0,1.8fr)_1fr_0.8fr_0.8fr_0.8fr_1fr_auto] items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
                      >
                        <span className="registrations-tour-record flex min-w-0 items-center gap-2.5">
                          <PersonAvatar name={registration.memberName ?? "A member"} size="xs" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{displayName(registration)}</span>
                            <span className="block truncate text-xs text-ink-faint">{formatDate(registration.createdAt)}</span>
                          </span>
                        </span>
                        <span className="truncate text-sm text-ink-soft">{registration.tierName ?? "General"}</span>
                        <span className="num text-right text-sm">{registration.quantity ?? 1}</span>
                        <span>
                          <Tag tone={STATUS_TONES[registration.paymentStatus ?? "pending"] ?? "neutral"} dot>
                            {registration.paymentStatus ?? "pending"}
                          </Tag>
                        </span>
                        <span className="text-xs text-ink-faint">
                          {registration.checkedIn ? <Tag tone="moss" dot>In</Tag> : "not yet"}
                        </span>
                        <span className="truncate text-right font-mono text-xs text-ink-faint">{registration.ticketCode ?? "Not available"}</span>
                        <div className="flex justify-end">
                          <RowActions actions={manageActions(registration)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </ListTable>
              </div>
              <div className="border-t border-line px-5 py-3">
                <ListPaginationFooter
                  page={safePage}
                  perPage={perPage}
                  total={total}
                  onPageChange={setPage}
                  onPerPageChange={(value) => { setPerPage(value); resetPage(); }}
                  itemName="registrations"
                />
              </div>
            </div>
          ) : (
            <>
              <StaggerGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((registration: EventRegistration) => (
                  <StaggerItem key={registration.registrationId}>
                    <div className="paper-card flex h-full flex-col rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-2">
                        <span className="registrations-tour-record flex min-w-0 items-center gap-2.5">
                          <PersonAvatar name={registration.memberName ?? "A member"} size="md" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">{displayName(registration)}</span>
                            <span className="num block text-xs text-ink-faint">
                              {registration.tierName ?? "General"} · ×{registration.quantity ?? 1}
                            </span>
                          </span>
                        </span>
                        <RowActions className="registrations-tour-manage" reveal={false} actions={manageActions(registration)} />
                      </div>
                      <p className="mt-2 flex-1 text-sm text-ink-soft">
                        Registered {formatDate(registration.createdAt)}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line/70 pt-3">
                        <span className="flex items-center gap-1.5">
                          <Tag tone={STATUS_TONES[registration.paymentStatus ?? "pending"] ?? "neutral"} dot>
                            {registration.paymentStatus ?? "pending"}
                          </Tag>
                          {registration.checkedIn ? <Tag tone="sky" dot>Checked in</Tag> : null}
                        </span>
                        <span className="truncate font-mono text-xs text-ink-faint">{registration.ticketCode ?? "Not available"}</span>
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerGroup>
              <div className="paper-card rounded-2xl">
                <ListPaginationFooter
                  page={safePage}
                  perPage={perPage}
                  total={total}
                  onPageChange={setPage}
                  onPerPageChange={(value) => { setPerPage(value); resetPage(); }}
                  itemName="registrations"
                />
              </div>
            </>
          )}

          <div className="registrations-tour-links flex flex-wrap items-center justify-center gap-4 text-sm">
            <button type="button" onClick={() => router.push(`/gatherings/events/${eventId}`)} className="flex items-center gap-1.5 text-brand hover:underline">
              <CalendarDays className="size-3" /> Open the event
            </button>
            <Link href={`/gatherings/events/check-in?event=${encodeURIComponent(eventId)}`} className="text-brand hover:underline">
              Run check-in
            </Link>
          </div>
        </>
      ) : (
        <div className="registrations-tour-pick"><EmptyState
          className="paper-card bg-card"
          icon={<ClipboardList />}
          title="Pick an event to see its house"
          description="Registrations, payments and check-ins arrive here the moment a list is chosen."
        /></div>
      )}
    </div>
  );
}

export default function EventRegistrationsPage() {
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-6 w-40" /><Skeleton className="h-64 rounded-2xl" /></div>}>
      <RegistrationsInner />
    </Suspense>
  );
}
