"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Plus,
  Search,
  Tickets,
} from "lucide-react";
import { PageHeader } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import { FilterChip, IconAction } from "@/components/paper/primitives";
import { StaggerGroup, StaggerItem } from "@/components/paper/motion/primitives";
import { ServiceFormDialog } from "@/components/attendance/service-form-dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/paper/primitives";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useEventsList,
  EVENT_TYPES,
  type EventType,
} from "@/hooks/use-events";
import {
  useAttendanceServices,
} from "@/hooks/use-attendance";
import { useBranchesList } from "@/hooks/use-branches";
import { useCurrentProfile } from "@/hooks/use-profile";
import {
  projectGatherings,
  serviceSchedule,
} from "@/lib/event-calendar";
import {
  eventOccursOn,
  serviceOccursOn,
  stepOccurrence,
  todayKey,
} from "@/lib/schedule-occurrence";
import { cn } from "@/lib/utils";

const MONTHS = Array.from({ length: 12 }, (_, month) => new Date(2026, month, 1).toLocaleDateString("en-GB", { month: "long" }));

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const TYPE_COLORS: Record<EventType, string> = {
  service: "bg-brand",
  conference: "bg-sky",
  lifecycle: "bg-gold",
  training: "bg-moss",
  social: "bg-rose",
};

type KindFilter = "all" | "services" | "events";

function iso(d: Date) {
  const y = String(d.getFullYear()).padStart(4, "0");
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function EventsCalendarPage() {
  const router = useRouter();
  const { can, canAny, ready } = usePermissions();
  const { data: profile } = useCurrentProfile();
  const isHq = !!profile?.isAdminHq;
  const canReadEvents = ready && canAny("events:calendar:read", "events:list:read", "events:all:read");
  const canReadServices = ready && can("attendance:services", "read");
  const canRead = canReadEvents || canReadServices;
  const canCreateService = ready && (can("attendance:services", "create") || can("attendance", "create"));
  const canCreateEvent = ready && can("events", "create");

  const [today, setToday] = React.useState(() => new Date());
  const [month, setMonth] = React.useState(() => new Date());
  const [selected, setSelected] = React.useState(() => new Date());
  const [kind, setKind] = React.useState<KindFilter>("all");
  const [type, setType] = React.useState<EventType | "all">("all");
  const [branchId, setBranchId] = React.useState("all");
  const [serviceFormOpen, setServiceFormOpen] = React.useState(false);

  React.useEffect(() => {
    const now = new Date();
    setToday(now);
    setMonth(now);
    setSelected(now);
  }, []);

  const dayBranch = isHq && branchId !== "all" ? branchId : undefined;
  const events = useEventsList(
    {
      limit: 100,
      type: type === "all" ? undefined : type,
      branchId: dayBranch,
      sortBy: "startDate",
      sortOrder: "asc",
    },
    { enabled: canReadEvents },
  );
  const services = useAttendanceServices(
    { limit: 100, isActive: true, branchId: dayBranch },
    { enabled: canReadServices },
  );
  const branches = useBranchesList({ limit: 100 }, { enabled: isHq });

  const rows = React.useMemo(() => events.data?.data ?? [], [events.data]);
  const serviceRows = React.useMemo(
    () => (services.data?.data ?? []).filter((s) => s.isActive && !s.archivedAt),
    [services.data],
  );

  const grid = React.useMemo(() => {
    const first = new Date(month);
    first.setDate(1);
    first.setHours(0, 0, 0, 0);
    const start = new Date(first);
    start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [month]);

  /** Events on every day they occur + service occurrences projected per visible day. */
  const byDay = React.useMemo(
    () =>
      projectGatherings(rows, serviceRows, grid, {
        events: canReadEvents && kind !== "services",
        services: canReadServices && kind !== "events",
      }),
    [canReadEvents, canReadServices, kind, rows, serviceRows, grid],
  );

  const selectedKey = iso(selected);
  const dayEntries = byDay.get(selectedKey) ?? [];
  const upcoming = React.useMemo(() => {
    const today = todayKey();
    const items: { id: string; title: string; day: string; kind: "event" | "service"; link?: string; registrations?: number }[] = [];
    if (canReadEvents) {
      for (const event of rows) {
        // Occurrence-driven like services: a weekly meeting shows its NEXT day,
        // not its (possibly past) start date.
        const schedule = { recurrence: event.recurrence, startDate: event.startDate, endDate: event.endDate };
        const occurs = (d: string) => eventOccursOn(schedule, d);
        const when = occurs(today) ? today : stepOccurrence(occurs, today, 1);
        if (when) {
          items.push({
            id: `event-${event.eventId}`,
            title: event.title,
            day: when,
            kind: "event",
            link: `/gatherings/events/${event.eventId}`,
            registrations: event.registrationCount ?? 0,
          });
        }
      }
    }
    if (canReadServices) {
      for (const service of serviceRows) {
        const occurs = (d: string) => serviceOccursOn(serviceSchedule(service), d);
        const next = occurs(today) ? today : stepOccurrence(occurs, today, 1);
        if (next) {
          items.push({
            id: `service-${service.serviceId}`,
            title: service.name,
            day: next,
            kind: "service",
            link: `/gatherings/attendance/services/${service.serviceId}`,
          });
        }
      }
    }
    return items
      .sort((a, b) => (a.day === b.day ? a.kind.localeCompare(b.kind) : a.day.localeCompare(b.day)))
      .slice(0, 6);
  }, [canReadEvents, canReadServices, rows, serviceRows]);
  const monthLabel = month.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const years = Array.from({ length: Math.min(9999, month.getFullYear() + 100) - Math.max(1, month.getFullYear() - 100) + 1 }, (_, index) => Math.max(1, month.getFullYear() - 100) + index);
  function moveCalendar(yearOffset: number, monthOffset = 0) {
    setMonth((current) => {
      const next = new Date(current);
      next.setDate(1);
      next.setFullYear(current.getFullYear() + yearOffset, current.getMonth() + monthOffset, 1);
      return next;
    });
  }
  function chooseCalendar(year: number, monthIndex: number) {
    setMonth((current) => {
      const next = new Date(current);
      next.setFullYear(year, monthIndex, 1);
      return next;
    });
  }

  const showSkeleton =
    (canReadEvents && events.isLoading) || (canReadServices && services.isLoading);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gatherings · Events"
        title="The season, laid out gently."
        description="Plan services, conferences and dinners in one shared calendar."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {ready && can("events:all", "read") && can("events:list", "read") && <Button asChild variant="outline" size="sm" className="h-9 rounded-full border-line bg-card text-xs"><Link href="/gatherings/events/list">View events</Link></Button>}
            {canCreateService ? (
              <Button
                variant="outline"
                className="h-9 gap-1.5 rounded-full border-line bg-card text-xs"
                onClick={() => setServiceFormOpen(true)}
              >
                <Plus className="size-3.5" /> Add service
              </Button>
            ) : null}
            {canReadEvents && can("events:tickets", "read") ? (
              <Button asChild variant="outline" className="h-9 gap-1.5 rounded-full border-line bg-card text-xs">
                <Link href="/gatherings/events/tickets">
                  <Tickets className="size-3.5" /> Tickets
                </Link>
              </Button>
            ) : null}
            {canCreateEvent ? (
              <Button asChild className="h-9 gap-1.5 rounded-full text-xs">
                <Link href="/gatherings/events/new">
                  <Plus className="size-3.5" /> New event
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {canReadServices ? (
          <StatCard label="Services active" value={serviceRows.length} tone="moss" icon={<CalendarClock className="size-4" />} deltaLabel="recurring windows" />
        ) : null}
        {canReadEvents ? (
          <>
            <StatCard label="Events loaded" value={rows.length} tone="brand" icon={<CalendarDays className="size-4" />} deltaLabel="next hundred" />
            <StatCard label="Registrations shown" value={rows.reduce((sum, e) => sum + (e.registrationCount ?? 0), 0)} tone="sky" />
            <StatCard label="Free events" value={rows.filter((e) => e.isFree).length} tone="gold" deltaLabel="no ticket required" />
          </>
        ) : null}
        <div className="paper-card flex flex-col justify-between gap-4 rounded-2xl p-5">
          <span className="rule-label">On the selected day</span>
          <span className="num font-display text-sm font-semibold leading-tight">{dayEntries.length}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {canReadEvents && canReadServices ? (
          <>
            <FilterChip active={kind === "all"} onClick={() => setKind("all")}>All</FilterChip>
            <FilterChip active={kind === "services"} onClick={() => setKind("services")}>Services</FilterChip>
            <FilterChip active={kind === "events"} onClick={() => setKind("events")}>Events</FilterChip>
            <span className="mx-1 hidden h-4 w-px bg-line sm:block" />
          </>
        ) : null}
        {canReadEvents && kind !== "services" ? (
          <>
            <FilterChip active={type === "all"} onClick={() => setType("all")}>All types</FilterChip>
            {EVENT_TYPES.map((item) => (
              <FilterChip key={item.value} active={type === item.value} onClick={() => setType(item.value)}>
                {item.label}
              </FilterChip>
            ))}
          </>
        ) : null}
        {isHq && canRead ? (
          <select
            value={branchId}
            onChange={(event) => setBranchId(event.target.value)}
            className="ml-auto h-8 rounded-full border border-line bg-card px-3 text-[11px] outline-none"
          >
            <option value="all">All branches</option>
            {(branches.data?.data ?? []).map((b) => (
              <option key={b.branchId} value={b.branchId}>{b.name}</option>
            ))}
          </select>
        ) : (
          <span className="ml-auto text-[10px] text-ink-faint">{profile?.branch?.name ?? "Your branch"} scope</span>
        )}
      </div>

      {ready && !canRead ? (
        <EmptyState icon={<CalendarDays />} title="Gatherings are outside your access" description="Your role can&apos;t view the calendar." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="paper-card overflow-hidden rounded-2xl">
            <div role="group" aria-label="Calendar navigation" className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
              <p className="sr-only" aria-live="polite" data-calendar-period>{monthLabel}</p>
              <div className="flex items-center gap-2">
                <Select value={String(month.getMonth())} onValueChange={(value) => chooseCalendar(month.getFullYear(), Number(value))}>
                  <SelectTrigger aria-label="Calendar month" data-prefix-icon="none" className="h-8 w-32 rounded-full border-line bg-card font-display text-sm font-semibold shadow-none"><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map((name, index) => <SelectItem key={name} value={String(index)}>{name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={String(month.getFullYear())} onValueChange={(value) => chooseCalendar(Number(value), month.getMonth())}>
                  <SelectTrigger aria-label="Calendar year" data-prefix-icon="none" className="h-8 w-24 rounded-full border-line bg-card text-sm shadow-none"><SelectValue /></SelectTrigger>
                  <SelectContent>{years.map((year) => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <IconAction label="Previous year" icon={<ChevronsLeft className="size-4" />} onSelect={() => moveCalendar(-1)} disabled={month.getFullYear() <= 1} className="size-8" />
                <IconAction
                  label="Previous month"
                  icon={<ChevronLeft className="size-4" />}
                  onSelect={() => moveCalendar(0, -1)}
                  disabled={month.getFullYear() === 1 && month.getMonth() === 0}
                  className="size-8"
                />
                <button
                  type="button"
                  onClick={() => { setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelected(today); }}
                  className="rounded-full px-3 py-1 text-[11px] text-ink-soft hover:bg-muted hover:text-ink"
                >
                  Today
                </button>
                <IconAction
                  label="Next month"
                  icon={<ChevronRight className="size-4" />}
                  onSelect={() => moveCalendar(0, 1)}
                  disabled={month.getFullYear() === 9999 && month.getMonth() === 11}
                  className="size-8"
                />
                <IconAction label="Next year" icon={<ChevronsRight className="size-4" />} onSelect={() => moveCalendar(1)} disabled={month.getFullYear() >= 9999} className="size-8" />
              </div>
            </div>
            <div className="rule-label grid grid-cols-7 border-b border-line px-2 py-2">
              {WEEKDAYS.map((d) => <span key={d} className="px-1 text-center">{d}</span>)}
            </div>
            <div className="grid grid-cols-7">
              {showSkeleton ? (
                Array.from({ length: 28 }).map((_, i) => <div key={i} className="min-h-20 border-b border-r border-line/40 p-1.5"><Skeleton className="h-full w-full rounded-lg" /></div>)
              ) : (
                grid.map((d) => {
                  const key = iso(d);
                  const entries = byDay.get(key) ?? [];
                  const inMonth = d.getMonth() === month.getMonth();
                  const isToday = sameDay(d, today);
                  const isSelected = sameDay(d, selected);
                  return (
                    <button
                      type="button"
                      key={key}
                      data-calendar-day={key}
                      onClick={() => setSelected(d)}
                      className={cn(
                        "min-h-20 border-b border-r border-line/40 p-1.5 text-left transition-colors",
                        !inMonth && "bg-paper-deep/30",
                        isSelected ? "bg-brand-soft/40" : "hover:bg-muted/40",
                      )}
                    >
                      <span className={cn(
                        "num inline-grid size-5 place-items-center rounded-full text-[10px]",
                        isToday && "bg-brand font-semibold text-paper",
                        !isToday && inMonth && "text-ink",
                        !isToday && !inMonth && "text-ink-faint",
                      )}
                      >
                        {d.getDate()}
                      </span>
                      <span className="mt-1 flex flex-col gap-1">
                        {entries.slice(0, 2).map((entry) => (
                          <span key={entry.id} className="flex min-w-0 items-center gap-1">
                            {entry.kind === "event" ? (
                              <span className={cn("size-1.5 shrink-0 rounded-full", TYPE_COLORS[entry.event.type])} />
                            ) : (
                              <span className="size-1.5 shrink-0 rounded-full border border-ink/60" />
                            )}
                            <span className={cn("truncate text-[9px] font-medium", entry.kind === "service" && "text-ink-soft")}>
                              {entry.title}
                            </span>
                          </span>
                        ))}
                        {entries.length > 2 ? (
                          <span className="pl-2.5 text-[8px] text-ink-faint">+{entries.length - 2} more</span>
                        ) : null}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="paper-card overflow-hidden rounded-2xl">
              <div className="border-b border-line bg-muted/30 px-4 py-3">
                <p className="rule-label">
                  {selected.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                </p>
              </div>
              <div className="divide-y divide-line/70">
                {dayEntries.length ? (
                  dayEntries.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() =>
                        entry.kind === "event"
                          ? router.push(`/gatherings/events/${entry.event.eventId}`)
                          : router.push(`/gatherings/attendance/services/${entry.service.serviceId}`)
                      }
                      className="flex w-full items-start gap-2.5 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                    >
                      {entry.kind === "event" ? (
                        <span className={cn("mt-1 size-2 shrink-0 rounded-full", TYPE_COLORS[entry.event.type])} />
                      ) : (
                        <span className="mt-1 size-2 shrink-0 rounded-full border-2 border-ink/60" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold">{entry.title}</span>
                        <span className="block truncate text-[10px] text-ink-faint">
                          {entry.at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                          {entry.kind === "event" && entry.event.location ? ` · ${entry.event.location}` : ""}
                          {entry.kind === "event" && entry.event.branchName ? ` · ${entry.event.branchName}` : ""}
                        </span>
                        <span className="mt-1 flex items-center gap-1.5">
                          {entry.kind === "event" ? (
                            <>
                              <Tag tone="neutral">{EVENT_TYPES.find((t) => t.value === entry.event.type)?.label ?? entry.event.type}</Tag>
                              {!entry.event.isFree ? <Tag tone="gold">Ticketed</Tag> : null}
                            </>
                          ) : (
                            <>
                              <Tag tone="sky">Service</Tag>
                              {entry.service.dayOfWeek == null && entry.service.recurrence !== "one_time" && entry.service.recurrence !== "multi_day" ? (
                                <Tag tone="neutral">Any day</Tag>
                              ) : null}
                            </>
                          )}
                        </span>
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-8 text-center text-[11px] text-ink-faint">
                    Nothing scheduled for this day.
                  </p>
                )}
              </div>
            </div>

            <div className="paper-card rounded-2xl p-4">
              <p className="rule-label mb-3">Coming up</p>
              <StaggerGroup className="space-y-2.5">
                {upcoming.map((item) => (
                  <StaggerItem key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(`${item.day}T00:00:00`);
                        setSelected(d);
                        setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                      }}
                      className="flex w-full items-center gap-2.5 text-left"
                    >
                      <MapPin className="size-3 shrink-0 text-ink-faint" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-medium">{item.title}</span>
                        <span className="num block text-[10px] text-ink-faint">
                          {new Date(`${item.day}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          {item.kind === "service" ? " · meets" : ` · ${item.registrations ?? 0} in`}
                        </span>
                      </span>
                    </button>
                  </StaggerItem>
                ))}
                {!upcoming.length && !showSkeleton ? (
                  <p className="flex items-center gap-2 text-[11px] text-ink-faint">
                    <Search className="size-3" /> Nothing scheduled ahead.
                  </p>
                ) : null}
              </StaggerGroup>
            </div>

            <div className="flex flex-col gap-1.5">
              {canReadEvents ? (
                <Button asChild variant="outline" size="sm" className="h-8 justify-start gap-2 rounded-full border-line bg-card text-[11px]">
                  <Link href="/gatherings/events/check-in">Door check-in</Link>
                </Button>
              ) : null}
              <Button asChild variant="outline" size="sm" className="h-8 justify-start gap-2 rounded-full border-line bg-card text-[11px]">
                <Link href="/gatherings/attendance">Attendance &amp; reports</Link>
              </Button>
              {canReadEvents ? (
                <Button asChild variant="outline" size="sm" className="h-8 justify-start gap-2 rounded-full border-line bg-card text-[11px]">
                  <Link href="/gatherings/events/registrations">All registrations</Link>
                </Button>
              ) : null}
            </div>
          </aside>
        </div>
      )}

      <ServiceFormDialog
        open={serviceFormOpen}
        onOpenChange={setServiceFormOpen}
        defaultDayOfWeek={selected.getDay()}
      />
    </div>
  );
}
