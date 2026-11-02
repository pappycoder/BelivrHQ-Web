"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCheck,
  ScanLine,
  UserPlus,
  Users,
} from "lucide-react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { PageHeader, SectionCard } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import { CheckInDatePicker } from "@/components/paper/check-in-date";
import {
  EmptyState,
  FilterChip,
  PersonAvatar,
  SearchField,
} from "@/components/paper/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useEventsList,
  useEventRegistrations,
  useEventAttendance,
  useBulkCheckIn,
  useWalkInCheckIn,
  type EventItem,
} from "@/hooks/use-events";
import {
  dayKey,
  defaultEventDate,
  eventOccursOn,
  todayKey,
  type EventSchedule,
} from "@/lib/schedule-occurrence";
import { cn } from "@/lib/utils";

type TabRoute = "roster" | "walkin";

export default function EventCheckInPage() {
  const { can, ready } = usePermissions();
  const canCheckIn = ready && can("events:checkin", "create");

  const [eventId, setEventId] = React.useState("");
  const [tab, setTab] = React.useState<TabRoute>("roster");
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [walkIn, setWalkIn] = React.useState({ firstName: "", lastName: "", phone: "", email: "", gender: "" });

  const events = useEventsList(
    { limit: 100, sortBy: "startDate", sortOrder: "desc" },
    { enabled: ready && can("events:list", "read") },
  );
  const eventList = React.useMemo(() => {
    const today = todayKey();
    const distance = (event: EventItem) => {
      const schedule = {
        recurrence: event.recurrence,
        startDate: event.startDate,
        endDate: event.endDate,
      };
      // Recurring and bounded windows that include today are the likeliest desk.
      if (
        eventOccursOn(schedule, today) &&
        (event.recurrence === "weekly" || event.endDate)
      ) {
        return 0;
      }
      const start = new Date(`${dayKey(event.startDate)}T00:00:00`).getTime();
      const now = new Date(`${today}T00:00:00`).getTime();
      return Math.abs(Math.round((start - now) / 86_400_000));
    };
    return [...(events.data?.data ?? [])].sort(
      (a, b) => distance(a) - distance(b),
    );
  }, [events.data]);
  const activeId = eventId || eventList[0]?.eventId || "";
  const activeEvent = eventList.find((e) => e.eventId === activeId);

  const activeSchedule = React.useMemo<EventSchedule>(
    () => ({
      recurrence: activeEvent?.recurrence,
      startDate: activeEvent?.startDate ?? todayKey(),
      endDate: activeEvent?.endDate,
    }),
    [activeEvent],
  );
  const occursOn = React.useCallback(
    (date: string) => eventOccursOn(activeSchedule, date),
    [activeSchedule],
  );
  const [attendanceDate, setAttendanceDate] = React.useState(() => todayKey());
  const datedEvent = React.useRef("");

  React.useEffect(() => {
    if (!activeEvent || datedEvent.current === activeEvent.eventId) return;
    datedEvent.current = activeEvent.eventId;
    setAttendanceDate(defaultEventDate(activeSchedule));
  }, [activeEvent, activeSchedule]);

  const registrations = useEventRegistrations(activeId);
  const attendance = useEventAttendance(activeId);
  const bulkCheckIn = useBulkCheckIn(activeId);
  const walkInCheckIn = useWalkInCheckIn(activeId);

  const attendanceForDay = React.useMemo(
    () =>
      (attendance.data ?? []).filter(
        (record) => dayKey(record.checkInAt) === attendanceDate,
      ),
    [attendance.data, attendanceDate],
  );

  React.useEffect(() => {
    setSelected(new Set());
  }, [activeId, attendanceDate]);

  const rows = React.useMemo(() => {
    const list = registrations.data ?? [];
    const q = query.trim().toLowerCase();
    return q
      ? list.filter((r) => (r.memberName ?? r.memberId).toLowerCase().includes(q) || (r.ticketCode ?? "").toLowerCase().includes(q))
      : list;
  }, [registrations.data, query]);

  const attendedCount = attendanceForDay.length;
  const registeredCount = registrations.data?.length ?? 0;

  const toggle = (memberId: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });

  const doBulk = () => {
    if (!selected.size) return;
    bulkCheckIn.mutate(
      { memberIds: [...selected], attendanceDate },
      {
        onSuccess: (result) => {
          toast.success(`${result.checkedIn} checked in${result.skipped ? `, ${result.skipped} already inside` : ""}.`);
          setSelected(new Set());
        },
        onError: (e) => toast.error(getToastErrorMessage(e, "Check-in didn't complete.")),
      },
    );
  };

  const doWalkIn = (event: React.FormEvent) => {
    event.preventDefault();
    const w = walkIn;
    if (!w.firstName.trim() || !w.lastName.trim()) { toast.error("A first and last name, please."); return; }
    if (!w.phone.trim()) { toast.error("A phone number so we remember them next time."); return; }
    walkInCheckIn.mutate(
      {
        attendanceDate,
        firstName: w.firstName.trim(),
        lastName: w.lastName.trim(),
        phone: w.phone.trim(),
        email: w.email.trim() || undefined,
        gender: w.gender || undefined,
      },
      {
        onSuccess: (record) => {
          toast.success(`${record.visitorName ?? w.firstName} walked in and is counted.`);
          setWalkIn({ firstName: "", lastName: "", phone: "", email: "", gender: "" });
        },
        onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't check the guest in.")),
      },
    );
  };

  if (!canCheckIn) {
    return (
      <EmptyState
        icon={<ScanLine />}
        title="Check-in is a staff task"
        description="Your role can view events but not check people in."
        action={<Button asChild variant="outline" size="sm" className="rounded-full border-line text-xs"><Link href="/gatherings/events">Back to events</Link></Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gatherings · Events"
        title="The door desk."
        description="Tap faces as they walk in. Warmth first, admin second."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <CheckInDatePicker
              value={attendanceDate}
              onChange={setAttendanceDate}
              occursOn={occursOn}
              label="Event date"
              disabled={!activeEvent}
            />
            <select
              value={activeId}
              onChange={(event) => setEventId(event.target.value)}
              className="h-9 w-full min-w-[220px] rounded-full border border-line bg-card px-3 text-xs outline-none"
              aria-label="Choose event"
            >
              {eventList.map((event) => (
                <option key={event.eventId} value={event.eventId}>
                  {event.title} · {new Date(event.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </option>
              ))}
              {!eventList.length && activeEvent ? <option>{activeEvent.title}</option> : null}
            </select>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="In the room" value={attendedCount} tone="moss" icon={<Users className="size-4" />} deltaLabel={attendanceDate === todayKey() ? "right now" : "selected day"} />
        <StatCard label="Expected" value={registeredCount} tone="brand" deltaLabel="registered" />
        <StatCard label="Selected" value={selected.size} tone="gold" deltaLabel={selected.size ? "ready to check in" : "tap to select"} />
        <div className="paper-card flex flex-col justify-between gap-4 rounded-2xl p-5">
          <span className="rule-label">Event</span>
          <span className="font-display text-sm font-semibold leading-tight">{activeEvent?.title ?? "—"}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip active={tab === "roster"} onClick={() => setTab("roster")}>Roster</FilterChip>
        <FilterChip active={tab === "walkin"} onClick={() => setTab("walkin")}>Walk-in</FilterChip>
        {tab === "roster" ? (
          <SearchField value={query} onChange={setQuery} placeholder="Search a name or ticket code…" className="ml-auto w-full max-w-xs" />
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {tab === "roster" ? (
          <div className="paper-card overflow-hidden rounded-2xl">
            {selected.size ? (
              <div className="flex items-center justify-between gap-3 bg-ink px-4 py-2.5 text-paper">
                <span className="num text-xs font-medium">{selected.size} selected</span>
                <div className="flex gap-2">
                  <Button size="xs" className="gap-1.5 rounded-full bg-paper text-ink hover:bg-paper/90" disabled={bulkCheckIn.isPending} onClick={doBulk}>
                    <CheckCheck className="size-3" /> {bulkCheckIn.isPending ? "Checking…" : "Check in"}
                  </Button>
                  <Button size="xs" variant="ghost" className="rounded-full text-[11px] text-paper/70 hover:bg-paper/10 hover:text-paper" onClick={() => setSelected(new Set())}>
                    Clear
                  </Button>
                </div>
              </div>
            ) : null}
            <div className="divide-y divide-line/70">
              {registrations.isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <div key={i} className="px-4 py-3"><Skeleton className="h-10 rounded-lg" /></div>)
              ) : rows.length ? (
                rows.map((reg) => (
                  <button
                    key={reg.registrationId}
                    type="button"
                    disabled={reg.checkedIn}
                    onClick={() => toggle(reg.memberId)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                      reg.checkedIn ? "opacity-50" : "hover:bg-muted/40",
                    )}
                  >
                    <span className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-md border",
                      selected.has(reg.memberId) ? "border-moss bg-moss text-paper" : "border-line",
                    )}
                    >
                      {selected.has(reg.memberId) ? <CheckCheck className="size-3" /> : null}
                    </span>
                    <PersonAvatar name={reg.memberName ?? "Guest"} size="xs" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">{reg.memberName ?? reg.memberId.slice(0, 10)}</span>
                      <span className="block text-[10px] text-ink-faint">
                        {reg.tierName ? `${reg.tierName} · ` : ""}×{reg.quantity}
                        {reg.ticketCode ? ` · ${reg.ticketCode}` : ""}
                      </span>
                    </span>
                    {reg.checkedIn ? <Tag tone="moss" dot>Checked in</Tag> : <Tag tone="neutral">Awaiting</Tag>}
                  </button>
                ))
              ) : (
                <p className="px-5 py-12 text-center text-xs text-ink-soft">
                  {registrations.isError ? "Couldn't load the roster — retry shortly." : "Nobody registered for this one yet."}
                </p>
              )}
            </div>
          </div>
        ) : (
          <SectionCard eyebrow="No ticket? No problem" title="Walk someone in" bodyClassName="p-5">
            <form onSubmit={doWalkIn} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">First name</Label>
                  <Input value={walkIn.firstName} onChange={(e) => setWalkIn((w) => ({ ...w, firstName: e.target.value }))} className="h-10 rounded-lg border-line bg-background text-sm shadow-none" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Last name</Label>
                  <Input value={walkIn.lastName} onChange={(e) => setWalkIn((w) => ({ ...w, lastName: e.target.value }))} className="h-10 rounded-lg border-line bg-background text-sm shadow-none" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone</Label>
                  <Input value={walkIn.phone} onChange={(e) => setWalkIn((w) => ({ ...w, phone: e.target.value }))} placeholder="+1 415 555 0100" className="h-10 rounded-lg border-line bg-background text-sm shadow-none" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email (optional)</Label>
                  <Input value={walkIn.email} onChange={(e) => setWalkIn((w) => ({ ...w, email: e.target.value }))} className="h-10 rounded-lg border-line bg-background text-sm shadow-none" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Gender (optional)</Label>
                  <select value={walkIn.gender} onChange={(e) => setWalkIn((w) => ({ ...w, gender: e.target.value }))} className="h-10 w-full rounded-lg border border-line bg-background px-2 text-xs outline-none">
                    <option value="">Not said</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>
              <Button type="submit" disabled={walkInCheckIn.isPending} className="h-10 w-full gap-2 rounded-lg text-sm">
                <UserPlus className="size-4" /> {walkInCheckIn.isPending ? "Checking in…" : "Check in as guest"}
              </Button>
              <p className="text-center text-[10px] text-ink-faint">
                Walk-ins become visitor records — the follow-up desk will pick them up tomorrow.
              </p>
            </form>
          </SectionCard>
        )}

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <SectionCard eyebrow="Arrivals" title="On this day" bodyClassName="p-0">
            <div className="divide-y divide-line/70">
              {attendanceForDay.slice(0, 8).map((record) => (
                <div key={record.attendanceId} className="flex items-center gap-2.5 px-4 py-2.5">
                  <PersonAvatar name={record.memberName ?? record.visitorName ?? "Guest"} size="xs" />
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium">{record.memberName ?? record.visitorName ?? "Guest"}</span>
                  <span className="text-[9px] text-ink-faint">
                    {new Date(record.checkInAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
              {!attendanceForDay.length ? <p className="px-4 py-8 text-center text-[11px] text-ink-faint">Doors haven&apos;t opened yet.</p> : null}
            </div>
          </SectionCard>
          <div className="rounded-2xl border border-dashed border-line p-4 text-[11px] leading-relaxed text-ink-soft">
            Volunteers run this screen on the door tablet. Anything missed can be
            reconciled from the event page afterwards.
          </div>
        </aside>
      </div>
    </div>
  );
}
