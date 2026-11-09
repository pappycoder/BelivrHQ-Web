"use client";

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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gatherings · Events"
        title="Who&apos;s coming."
        description="Review registrations, payments and walk-ins in one place."
        actions={
          <>
            {eventId && total ? (
              <ExportDropdown
                columns={EXPORT_COLUMNS}
                data={filtered.map(exportRow)}
                title={`Registrations: ${selected?.title ?? "Event"}`}
                filename="event-registrations"
                disabled={!total}
              />
            ) : null}
            {selected && canRegister ? <RegisterAttendeeButton event={selected} /> : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={eventId}
          onChange={(e) => {
            setEventId(e.target.value);
            setQuery("");
            resetPage();
            router.replace(`/gatherings/events/registrations${e.target.value ? `?event=${e.target.value}` : ""}`);
          }}
          className="h-9 max-w-[300px] truncate rounded-full border border-line bg-card px-3 text-[11px] outline-none"
          aria-label="Event selector"
        >
          <option value="">Choose an event…</option>
          {eventList.map((event) => (
            <option key={event.eventId} value={event.eventId}>
              {event.title} · {formatDate(event.startDate)}
            </option>
          ))}
        </select>
        {eventId ? (
          <>
            <SearchField
              value={query}
              onChange={(value) => { setQuery(value); resetPage(); }}
              placeholder="Search attendees…"
              className="w-full max-w-[220px]"
            />
            <div className="flex flex-wrap gap-1.5">
              {(["all", "paid", "pending", "failed", "cancelled"] as const).map((s) => (
                <FilterChip key={s} active={payment === s} onClick={() => { setPayment(s); resetPage(); }}>
                  {s === "all" ? "Any payment" : s}
                </FilterChip>
              ))}
              <FilterChip active={door === "in"} onClick={() => { setDoor((d) => (d === "in" ? "all" : "in")); resetPage(); }}>Checked in</FilterChip>
              <FilterChip active={door === "out"} onClick={() => { setDoor((d) => (d === "out" ? "all" : "out")); resetPage(); }}>Still out</FilterChip>
            </div>
            <span className="ml-auto flex flex-wrap items-center gap-1.5 text-[10px] text-ink-faint">
              {selected?.isFree ? <Tag tone="moss">free event</Tag> : <Tag tone="gold">tickets</Tag>}
              {selected?.capacity ? <span className="num">capacity {number(selected.capacity)}</span> : null}
            </span>
          </>
        ) : null}
      </div>

      {eventId ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Registrations" value={all.length} tone="brand" icon={<ClipboardList className="size-4" />} deltaLabel={total !== all.length ? `${number(total)} matching` : "all shown"} />
            <StatCard label="Paid" value={paid} tone="moss" />
            <StatCard label="Checked in" value={checkedIn} tone="sky" deltaLabel={all.length ? `${Math.round((checkedIn / all.length) * 100)}% of list` : "Not available"} />
            <StatCard label="Awaiting payment" value={all.filter((r) => r.paymentStatus === "pending").length} tone="gold" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={sortBy} onValueChange={(value) => { setSortBy(value as SortValue); resetPage(); }}>
              <SelectTrigger className="h-8 w-40 rounded-full border-line bg-card text-[11px] shadow-none">
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
          </div>

          {registrations.isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<UserPlus />}
              title={query ? "Nobody matches that search" : "No registrations yet"}
              description={selected?.isFree ? "Free events fill at the door or with Register Attendee." : "Tickets appear here the moment someone registers."}
              action={selected ? <RegisterAttendeeButton event={selected} /> : null}
            />
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
                    <ManageHeading />
                  </div>
                  <div className="divide-y divide-line/70">
                    {rows.map((registration: EventRegistration) => (
                      <div
                        key={registration.registrationId}
                        className="group grid grid-cols-[minmax(0,1.8fr)_1fr_0.8fr_0.8fr_0.8fr_1fr_auto] items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <PersonAvatar name={registration.memberName ?? "A member"} size="xs" />
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-medium">{displayName(registration)}</span>
                            <span className="block truncate text-[10px] text-ink-faint">{formatDate(registration.createdAt)}</span>
                          </span>
                        </span>
                        <span className="truncate text-[11px] text-ink-soft">{registration.tierName ?? "General"}</span>
                        <span className="num text-right text-[11px]">{registration.quantity ?? 1}</span>
                        <span>
                          <Tag tone={STATUS_TONES[registration.paymentStatus ?? "pending"] ?? "neutral"} dot>
                            {registration.paymentStatus ?? "pending"}
                          </Tag>
                        </span>
                        <span className="text-[10px] text-ink-faint">
                          {registration.checkedIn ? <Tag tone="moss" dot>In</Tag> : "not yet"}
                        </span>
                        <span className="truncate text-right font-mono text-[9px] text-ink-faint">{registration.ticketCode ?? "Not available"}</span>
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
                        <span className="flex min-w-0 items-center gap-2.5">
                          <PersonAvatar name={registration.memberName ?? "A member"} size="md" />
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold">{displayName(registration)}</span>
                            <span className="num block text-[10px] text-ink-faint">
                              {registration.tierName ?? "General"} · ×{registration.quantity ?? 1}
                            </span>
                          </span>
                        </span>
                        <RowActions reveal={false} actions={manageActions(registration)} />
                      </div>
                      <p className="mt-2 flex-1 text-[11px] text-ink-soft">
                        Registered {formatDate(registration.createdAt)}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line/70 pt-3">
                        <span className="flex items-center gap-1.5">
                          <Tag tone={STATUS_TONES[registration.paymentStatus ?? "pending"] ?? "neutral"} dot>
                            {registration.paymentStatus ?? "pending"}
                          </Tag>
                          {registration.checkedIn ? <Tag tone="sky" dot>Checked in</Tag> : null}
                        </span>
                        <span className="truncate font-mono text-[9px] text-ink-faint">{registration.ticketCode ?? "Not available"}</span>
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

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
            <button type="button" onClick={() => router.push(`/gatherings/events/${eventId}`)} className="flex items-center gap-1.5 text-brand hover:underline">
              <CalendarDays className="size-3" /> Open the event
            </button>
            <Link href={`/gatherings/events/check-in?event=${encodeURIComponent(eventId)}`} className="text-brand hover:underline">
              Run check-in
            </Link>
          </div>
        </>
      ) : (
        <EmptyState
          icon={<ClipboardList />}
          title="Pick an event to see its house"
          description="Registrations, payments and check-ins arrive here the moment a list is chosen."
        />
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
