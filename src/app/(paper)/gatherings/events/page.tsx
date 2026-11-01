"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/paper/primitives";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useEventsList,
  EVENT_TYPES,
  type EventType,
} from "@/hooks/use-events";
import { useBranchesList } from "@/hooks/use-branches";
import { useCurrentProfile } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const TYPE_COLORS: Record<EventType, string> = {
  service: "bg-brand",
  conference: "bg-sky",
  lifecycle: "bg-gold",
  training: "bg-moss",
  social: "bg-rose",
};

function iso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function EventsCalendarPage() {
  const router = useRouter();
  const { canAny, ready } = usePermissions();
  const { data: profile } = useCurrentProfile();
  const isHq = !!profile?.isAdminHq;
  const canRead = ready && canAny("events:calendar:read", "events:list:read", "events:all:read");

  const [today, setToday] = React.useState(() => new Date());
  const [month, setMonth] = React.useState(() => new Date());
  const [selected, setSelected] = React.useState(() => new Date());
  const [type, setType] = React.useState<EventType | "all">("all");
  const [branchId, setBranchId] = React.useState("all");

  React.useEffect(() => {
    const now = new Date();
    setToday(now);
    setMonth(now);
    setSelected(now);
  }, []);

  const events = useEventsList(
    {
      limit: 100,
      type: type === "all" ? undefined : type,
      branchId: isHq && branchId !== "all" ? branchId : undefined,
      sortBy: "startDate",
      sortOrder: "asc",
    },
    { enabled: canRead },
  );
  const branches = useBranchesList({ limit: 100 }, { enabled: isHq });

  const rows = React.useMemo(() => events.data?.data ?? [], [events.data]);

  const byDay = React.useMemo(() => {
    const map = new Map<string, typeof rows>();
    for (const event of rows) {
      const d = new Date(event.startDate);
      if (Number.isNaN(d.getTime())) continue;
      const key = iso(d);
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    return map;
  }, [rows]);

  const grid = React.useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [month]);

  const selectedKey = iso(selected);
  const dayEvents = byDay.get(selectedKey) ?? [];
  const upcoming = rows
    .filter((event) => new Date(event.startDate).getTime() >= today.getTime() - 86_400_000)
    .slice(0, 5);
  const monthLabel = month.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gatherings · Events"
        title="The season, laid out gently."
        description="Every service, conference and dinner — one calendar the whole team can trust."
        actions={
          <>
            <Button asChild variant="outline" className="h-9 gap-1.5 rounded-full border-line bg-card text-xs">
              <Link href="/gatherings/events/tickets">
                <Tickets className="size-3.5" /> Tickets
              </Link>
            </Button>
            <Button asChild className="h-9 gap-1.5 rounded-full text-xs">
              <Link href="/gatherings/events/new">
                <Plus className="size-3.5" /> New event
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Events loaded" value={rows.length} tone="brand" icon={<CalendarDays className="size-4" />} deltaLabel="next hundred" />
        <StatCard label="On the selected day" value={dayEvents.length} tone="gold" />
        <StatCard label="Registrations shown" value={rows.reduce((sum, e) => sum + (e.registrationCount ?? 0), 0)} tone="moss" />
        <StatCard label="Free events" value={rows.filter((e) => e.isFree).length} tone="sky" deltaLabel="no ticket required" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip active={type === "all"} onClick={() => setType("all")}>All types</FilterChip>
        {EVENT_TYPES.map((item) => (
          <FilterChip key={item.value} active={type === item.value} onClick={() => setType(item.value)}>
            {item.label}
          </FilterChip>
        ))}
        {isHq ? (
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
        <EmptyState icon={<CalendarDays />} title="Events are outside your access" description="Your role can&apos;t view the calendar." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="paper-card overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <p className="font-display text-sm font-semibold">{monthLabel}</p>
              <div className="flex items-center gap-1">
                <IconAction
                  label="Previous month"
                  icon={<ChevronLeft className="size-4" />}
                  onSelect={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
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
                  onSelect={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                  className="size-8"
                />
              </div>
            </div>
            <div className="rule-label grid grid-cols-7 border-b border-line px-2 py-2">
              {WEEKDAYS.map((d) => <span key={d} className="px-1 text-center">{d}</span>)}
            </div>
            <div className="grid grid-cols-7">
              {events.isLoading ? (
                Array.from({ length: 28 }).map((_, i) => <div key={i} className="min-h-20 border-b border-r border-line/40 p-1.5"><Skeleton className="h-full w-full rounded-lg" /></div>)
              ) : (
                grid.map((d) => {
                  const key = iso(d);
                  const dayEvents = byDay.get(key) ?? [];
                  const inMonth = d.getMonth() === month.getMonth();
                  const isToday = sameDay(d, today);
                  const isSelected = sameDay(d, selected);
                  return (
                    <button
                      type="button"
                      key={key}
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
                        {dayEvents.slice(0, 2).map((event) => (
                          <span key={event.eventId} className="flex min-w-0 items-center gap-1">
                            <span className={cn("size-1.5 shrink-0 rounded-full", TYPE_COLORS[event.type])} />
                            <span className="truncate text-[9px] font-medium">{event.title}</span>
                          </span>
                        ))}
                        {dayEvents.length > 2 ? (
                          <span className="pl-2.5 text-[8px] text-ink-faint">+{dayEvents.length - 2} more</span>
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
                {dayEvents.length ? (
                  dayEvents.map((event) => (
                    <button
                      key={event.eventId}
                      type="button"
                      onClick={() => router.push(`/gatherings/events/${event.eventId}`)}
                      className="flex w-full items-start gap-2.5 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                    >
                      <span className={cn("mt-1 size-2 shrink-0 rounded-full", TYPE_COLORS[event.type])} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold">{event.title}</span>
                        <span className="block truncate text-[10px] text-ink-faint">
                          {new Date(event.startDate).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                          {event.location ? ` · ${event.location}` : ""}
                          {event.branchName ? ` · ${event.branchName}` : ""}
                        </span>
                        <span className="mt-1 flex items-center gap-1.5">
                          <Tag tone="neutral">{EVENT_TYPES.find((t) => t.value === event.type)?.label ?? event.type}</Tag>
                          {!event.isFree ? <Tag tone="gold">Ticketed</Tag> : null}
                        </span>
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-8 text-center text-[11px] text-ink-faint">
                    Nothing on this day — rest is permitted.
                  </p>
                )}
              </div>
            </div>

            <div className="paper-card rounded-2xl p-4">
              <p className="rule-label mb-3">Coming up</p>
              <StaggerGroup className="space-y-2.5">
                {upcoming.map((event) => (
                  <StaggerItem key={event.eventId}>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(event.startDate);
                        setSelected(d);
                        setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                      }}
                      className="flex w-full items-center gap-2.5 text-left"
                    >
                      <MapPin className="size-3 shrink-0 text-ink-faint" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-medium">{event.title}</span>
                        <span className="num block text-[10px] text-ink-faint">
                          {new Date(event.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {event.registrationCount ?? 0} in
                        </span>
                      </span>
                    </button>
                  </StaggerItem>
                ))}
                {!upcoming.length && !events.isLoading ? (
                  <p className="flex items-center gap-2 text-[11px] text-ink-faint">
                    <Search className="size-3" /> Nothing scheduled ahead.
                  </p>
                ) : null}
              </StaggerGroup>
            </div>

            <div className="flex flex-col gap-1.5">
              <Button asChild variant="outline" size="sm" className="h-8 justify-start gap-2 rounded-full border-line bg-card text-[11px]">
                <Link href="/gatherings/events/check-in">Door check-in</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-8 justify-start gap-2 rounded-full border-line bg-card text-[11px]">
                <Link href="/gatherings/attendance">Attendance &amp; reports</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-8 justify-start gap-2 rounded-full border-line bg-card text-[11px]">
                <Link href="/gatherings/events/registrations">All registrations</Link>
              </Button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
