"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  ArrowUpDown,
  ArrowUpRight,
  CalendarDays,
  PencilLine,
  Plus,
  Rows3,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import {
  EmptyState,
  FilterChip,
  ListPaginationFooter,
  ManageHeading,
  RowActions,
  SearchField,
  SortDirectionToggle,
  type RowAction,
} from "@/components/paper/primitives";
import { ListTable } from "@/components/shared/list-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePermissions } from "@/hooks/use-permissions";
import { useCurrentProfile } from "@/hooks/use-profile";
import { useBranchesList } from "@/hooks/use-branches";
import {
  EVENT_TYPES,
  EVENT_TYPE_MAP,
  useArchiveEvent,
  useDeleteEvent,
  useEventsList,
  useRestoreArchiveEvent,
  type EventItem,
  type EventType,
  type ListEventsParams,
} from "@/hooks/use-events";
import { toast } from "@/lib/toast";

function dateBoundary(value: string, end = false) {
  return value
    ? new Date(`${value}T${end ? "23:59:59.999" : "00:00:00"}`).toISOString()
    : undefined;
}
function dateLabel(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EventsListPage() {
  const { can, ready } = usePermissions();
  const { data: profile } = useCurrentProfile();
  const canRead =
    ready && can("events:all", "read") && can("events:list", "read");
  const canCreate = ready && can("events", "create");
  const canUpdate = ready && can("events", "update");
  const canDelete = ready && can("events", "delete");
  const isHq = !!profile?.isAdminHq;
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState<EventType | "all">("all");
  const [status, setStatus] = useState("all");
  const [branchId, setBranchId] = useState("all");
  const [archived, setArchived] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortBy, setSortBy] =
    useState<NonNullable<ListEventsParams["sortBy"]>>("startDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);
  const list = useEventsList(
    {
      page,
      limit: perPage,
      search: search || undefined,
      type: type === "all" ? undefined : type,
      status,
      branchId: isHq && branchId !== "all" ? branchId : undefined,
      archived: archived || undefined,
      startDate: dateBoundary(fromDate),
      endDate: dateBoundary(toDate, true),
      sortBy,
      sortOrder,
    },
    { enabled: canRead },
  );
  const branches = useBranchesList(
    { limit: 100 },
    { enabled: canRead && isHq },
  );
  const archive = useArchiveEvent();
  const restore = useRestoreArchiveEvent();
  const remove = useDeleteEvent();
  const rows = list.data?.data ?? [];
  useEffect(() => {
    if (!list.data || list.isFetching) return;
    const lastPage = Math.max(1, Math.ceil(list.data.total / perPage));
    if (page > lastPage) setPage(lastPage);
  }, [list.data, list.isFetching, page, perPage]);
  const scopeName = isHq
    ? branchId === "all"
      ? "All branches"
      : (branches.data?.data.find((branch) => branch.branchId === branchId)
          ?.name ?? "Selected branch")
    : (profile?.branch?.name ?? "Your branch");
  const hasFilters =
    !!searchInput ||
    type !== "all" ||
    status !== "all" ||
    branchId !== "all" ||
    archived ||
    !!fromDate ||
    !!toDate;
  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setType("all");
    setStatus("all");
    setBranchId("all");
    setArchived(false);
    setFromDate("");
    setToDate("");
    setPage(1);
  }
  const manageActions = (event: EventItem): (RowAction | false)[] => [
    {
      label: "Open event",
      icon: <ArrowUpRight />,
      href: `/gatherings/events/${event.eventId}`,
    },
    canUpdate &&
      !event.archivedAt && {
        label: "Edit event",
        icon: <PencilLine />,
        href: `/gatherings/events/${event.eventId}/edit`,
      },
    canUpdate &&
      !event.archivedAt && {
        label: "Archive event",
        icon: <Archive />,
        disabled: archive.isPending,
        confirmation: {
          subject: event.title,
          description:
            "Archive this event while keeping its registrations and attendance history.",
        },
        onSelect: () =>
          archive.mutateAsync(event.eventId, {
            onSuccess: () => toast("Event archived."),
          }),
        bulk: {
          key: "archive",
          label: "Archive selected events",
          run: () => archive.mutateAsync(event.eventId),
        },
      },
    canUpdate &&
      !!event.archivedAt && {
        label: "Restore event",
        icon: <ArchiveRestore />,
        tone: "success",
        disabled: restore.isPending,
        confirmation: { subject: event.title },
        onSelect: () =>
          restore.mutateAsync(event.eventId, {
            onSuccess: () => toast("Event restored."),
          }),
        bulk: {
          key: "restore",
          label: "Restore selected events",
          run: () => restore.mutateAsync(event.eventId),
        },
      },
    canDelete && {
      label: "Delete event",
      icon: <Trash2 />,
      tone: "danger",
      disabled: remove.isPending,
      confirmation: {
        subject: event.title,
        destructive: true,
        description:
          "Permanently delete this event? This cannot be undone. Events with registrations or attendance history must be archived instead.",
      },
      onSelect: () =>
        remove.mutateAsync(event.eventId, {
          onSuccess: () => toast("Event deleted."),
        }),
      bulk: {
        key: "delete",
        label: "Delete selected events permanently",
        destructive: true,
        description:
          "Deletion is permanent. Events with registrations or attendance history cannot be deleted.",
        run: () => remove.mutateAsync(event.eventId),
      },
    },
  ];

  if (ready && !canRead)
    return (
      <EmptyState
        icon={<CalendarDays />}
        title="Event list is outside your access"
        description="Your role needs access to the event register."
      />
    );
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gatherings · Events"
        title="Every event, in one place."
        description="Browse schedules, registrations and event records across your church."
        actions={
          <>
            {ready && can("events:calendar", "read") && (
              <Button
                asChild
                variant="outline"
                className="h-9 rounded-full border-line bg-card text-xs"
              >
                <Link href="/gatherings/events">
                  <CalendarDays className="size-3.5" /> Calendar
                </Link>
              </Button>
            )}
            {canCreate && (
              <Button asChild className="h-9 rounded-full text-xs">
                <Link href="/gatherings/events/new">
                  <Plus className="size-3.5" /> New event
                </Link>
              </Button>
            )}
          </>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {list.isLoading || !ready ? (
          <Skeleton className="h-32 rounded-2xl" />
        ) : list.isError ? (
          <div className="paper-card flex flex-col justify-between gap-4 rounded-2xl p-5">
            <span className="rule-label">Matching events</span>
            <span className="font-display text-2xl">—</span>
          </div>
        ) : (
          <StatCard
            label="Matching events"
            value={list.data?.total ?? 0}
            icon={<Rows3 className="size-4" />}
          />
        )}
        <div className="paper-card flex flex-col justify-between gap-4 rounded-2xl p-5">
          <span className="rule-label">On this page</span>
          {list.isLoading || !ready ? (
            <Skeleton className="h-8 w-12" />
          ) : (
            <span className="num font-display text-[1.9rem] font-semibold leading-none">
              {list.isError ? "—" : rows.length}
            </span>
          )}
        </div>
        <div className="paper-card col-span-2 flex flex-col justify-between gap-4 rounded-2xl p-5 lg:col-span-1">
          <span className="rule-label">Scope</span>
          <span className="font-display text-lg font-semibold">
            {scopeName}
          </span>
        </div>
      </div>
      <div role="group" aria-label="Event list filters" className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchField
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search events…"
            className="w-full max-w-xs"
          />
          <div className="flex flex-wrap gap-1.5">
            {[
              ["all", "All"],
              ["upcoming", "Upcoming"],
              ["past", "Past"],
            ].map(([value, label]) => (
              <FilterChip
                key={value}
                active={status === value}
                onClick={() => {
                  setStatus(value);
                  setPage(1);
                }}
              >
                {label}
              </FilterChip>
            ))}
          </div>
          <div className="ml-auto flex max-w-full flex-wrap items-center gap-2">
            <FilterChip
              active={archived}
              onClick={() => {
                setArchived((value) => !value);
                setPage(1);
              }}
            >
              Archived
            </FilterChip>
            <Select
              value={type}
              onValueChange={(value) => {
                setType(value as EventType | "all");
                setPage(1);
              }}
            >
              <SelectTrigger
                aria-label="Event type"
                className="h-8 w-36 rounded-full border-line bg-card text-[11px] shadow-none"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {EVENT_TYPES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isHq && (
              <Select
                value={branchId}
                onValueChange={(value) => {
                  setBranchId(value);
                  setPage(1);
                }}
              >
                <SelectTrigger
                  aria-label="Event branch"
                  data-prefix-icon="building"
                  disabled={branches.isLoading || branches.isError}
                  className="h-8 w-36 rounded-full border-line bg-card text-[11px] shadow-none"
                >
                  <SelectValue placeholder="All branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {branches.data?.data.map((branch) => (
                    <SelectItem key={branch.branchId} value={branch.branchId}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select
              value={sortBy}
              onValueChange={(value) => {
                setSortBy(value as typeof sortBy);
                setPage(1);
              }}
            >
              <SelectTrigger
                aria-label="Sort events"
                data-prefix-icon="none"
                className="h-8 w-36 rounded-full border-line bg-card text-[11px] shadow-none"
              >
                <ArrowUpDown className="size-3" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  ["startDate", "Start date"],
                  ["title", "Title"],
                  ["createdAt", "Date added"],
                ].map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <SortDirectionToggle
              ascending={sortOrder === "asc"}
              onToggle={() => {
                setSortOrder((order) => (order === "asc" ? "desc" : "asc"));
                setPage(1);
              }}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-ink-faint">
          <label className="flex items-center gap-2">
            From
            <Input
              picker="native"
              type="date"
              aria-label="From date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(event) => {
                setFromDate(event.target.value);
                setPage(1);
              }}
              className="h-8 w-[156px] rounded-full border-line bg-card text-[11px] shadow-none"
            />
          </label>
          <label className="flex items-center gap-2">
            To
            <Input
              picker="native"
              type="date"
              aria-label="To date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(event) => {
                setToDate(event.target.value);
                setPage(1);
              }}
              className="h-8 w-[156px] rounded-full border-line bg-card text-[11px] shadow-none"
            />
          </label>
          {hasFilters && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 rounded-full text-[11px]"
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>
      {list.isError ? (
        <EmptyState
          icon={<CalendarDays />}
          title="Couldn’t load events"
          description="Try loading the event register again."
          action={
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => void list.refetch()}
            >
              Retry
            </Button>
          }
        />
      ) : list.isLoading || !ready ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="paper-card overflow-hidden rounded-2xl">
          <ListTable
            tableId="events-list"
            label="Event register"
            recordType="event"
            recordKey="eventId"
            records={rows}
            className="min-w-[760px]"
          >
            <div className="rule-label grid grid-cols-[minmax(0,2fr)_1fr_1.4fr_1fr_0.7fr_auto] items-center gap-4 border-b border-line px-5 py-2.5">
              <span>Event</span>
              <span>Type</span>
              <span>Schedule</span>
              <span>Branch</span>
              <span>Registered</span>
              <ManageHeading />
            </div>
            <div className="divide-y divide-line/70">
              {rows.map((event) => (
                <div
                  key={event.eventId}
                  className="group grid grid-cols-[minmax(0,2fr)_1fr_1.4fr_1fr_0.7fr_auto] items-center gap-4 px-5 py-3 hover:bg-muted/40"
                >
                  <Link
                    href={`/gatherings/events/${event.eventId}`}
                    className="min-w-0"
                  >
                    <span className="block truncate text-xs font-semibold">
                      {event.title}
                    </span>
                    <span className="block truncate text-[10px] text-ink-faint">
                      {event.location ?? "Location to follow"}
                    </span>
                    {event.archivedAt && <Tag tone="neutral">Archived</Tag>}
                  </Link>
                  <span className="text-[11px] text-ink-soft">
                    {EVENT_TYPE_MAP[event.type]}
                  </span>
                  <span className="min-w-0 text-[11px] text-ink-soft">
                    <span className="block truncate">
                      {dateLabel(event.startDate)}
                    </span>
                    <span className="block truncate text-[10px] text-ink-faint">
                      {event.recurrence === "weekly"
                        ? "Weekly"
                        : event.recurrence === "multi_day"
                          ? "Date range"
                          : "One-time"}
                    </span>
                  </span>
                  <span className="truncate text-[11px] text-ink-soft">
                    {event.branchName ?? profile?.branch?.name ?? "—"}
                  </span>
                  <span className="num text-[11px]">
                    {event.registrationCount}
                  </span>
                  <RowActions actions={manageActions(event)} />
                </div>
              ))}
            </div>
            {!rows.length && (
              <div className="p-6">
                <EmptyState
                  icon={<CalendarDays />}
                  title="No events match"
                  description="Try another search or adjust the filters."
                  action={
                    hasFilters ? (
                      <Button
                        variant="outline"
                        className="rounded-full"
                        onClick={clearFilters}
                      >
                        Clear filters
                      </Button>
                    ) : undefined
                  }
                />
              </div>
            )}
          </ListTable>
          <ListPaginationFooter
            page={page}
            perPage={perPage}
            total={list.data?.total ?? 0}
            onPageChange={setPage}
            onPerPageChange={(value) => {
              setPerPage(value);
              setPage(1);
            }}
            itemName="events"
            pending={list.isFetching}
          />
        </div>
      )}
    </div>
  );
}
