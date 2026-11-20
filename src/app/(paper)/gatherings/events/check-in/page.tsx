"use client";
import { LoadingState } from "@/components/shared/loading-state";

import { ValidatedForm } from "@/components/ui/validated-form";

import * as React from "react";
import Link from "next/link";
import {
  ScanLine,
  UserPlus,
  Users,
} from "lucide-react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { PageHeader, SectionCard } from "@/components/paper/section";
import { PageTour, type TourStep } from "@/components/tours/page-tour";
import { useCurrentProfile } from "@/hooks/use-profile";
import { StatCard } from "@/components/paper/stat";
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
import { TabsContent } from "@/components/ui/tabs";
import { AttendanceWorkspace } from "@/components/attendance/attendance-workspace";
import { AttendanceRosterTable, AttendanceEditToggle } from "@/components/attendance/attendance-roster-table";
import { AttendanceSelectionBar } from "@/components/attendance/attendance-selection-bar";
import { GeneralAttendancePanel } from "@/components/attendance/general-attendance-panel";
import { usePermissions } from "@/hooks/use-permissions";
import { useCanViewGeneralAttendance } from "@/hooks/use-attendance";
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

const CHECK_IN_TOUR_STEPS: TourStep[] = [
  { target: ".event-checkin-tour-heading", title: "Run the event attendance desk", description: "Choose the right event and date before recording attendance. This tour explains the desk without checking anyone in, creating a visitor or saving a headcount. Replay it anytime with Take a tour." },
  { target: ".event-checkin-tour-event", title: "Choose the event", description: "This selector lists up to 100 loaded events within your access, ordered by proximity to today. Confirm the event title before using any save action. Changing event clears draft selections and form entries after a discard prompt when needed." },
  { target: ".event-checkin-tour-date", title: "Confirm the occurrence date", description: "Use the date picker or occurrence arrows to select a day on which the event meets. One-time events have only their scheduled day; weekly and date-range events offer their valid occurrences. Attendance saved here belongs to the selected event and date." },
  { target: ".event-checkin-tour-workspace [aria-label='Attendance method']", title: "Choose an attendance method", description: "Check in people records named attendance. Record headcount saves a room total when your account has access. The methods are independent: their totals stay separate and are never added together. Switching methods alone saves nothing." },
  { target: ".event-checkin-tour-summary", title: "Read the desk totals", description: "Named check-ins counts attendance on the selected day. Expected counts the event's loaded registrations, not just search results. Selected counts your unsaved roster choices. Review the Event card to confirm the desk's context." },
  { target: ".event-checkin-tour-tabs", title: "Registrants or visitors", description: "Registered people shows the event roster. Visitors opens the walk-in form for someone arriving without registration. Both use the selected event and date. Opening either view does not record an arrival." },
  { target: ".event-checkin-tour-search", title: "Find a registrant", description: "Search the loaded roster by name or ticket code. Filtering is immediate. Clear search restores the roster. Previously selected people can remain selected when hidden by search, so check Selected before saving." },
  { target: ".event-checkin-tour-roster > div > div:first-child", title: "Unlock the roster deliberately", description: "The roster starts in View mode. Edit attendance unlocks selection. Select all shown affects available people in the current filtered roster. Saved people remain locked. Cancel editing clears unsaved choices and returns to View mode." },
  { target: ".event-checkin-tour-roster [aria-label='Scrollable attendance roster']", title: "Review people and their status", description: "Each row identifies a registrant and shows ticket details when available. Awaiting, Selected and Saved distinguish roster state from a draft choice. Scroll within the roster for more people. Selecting a checkbox does not save attendance." },
  { target: ".event-checkin-tour-save", title: "Save only reviewed selections", description: "Clear selection removes your draft choices. Check in saves selected people for this event and date, including selections hidden by search. It is disabled while locked or empty. If a save partly fails, remaining people stay selected for review and retry." },
  { target: ".event-checkin-tour-walkin > div:first-child", title: "Unlock the walk-in form", description: "Choose Edit attendance to enter a walk-in guest. Cancel editing clears the form and locks it again. Opening or editing the form alone does not create a visitor or record attendance." },
  { target: ".event-checkin-tour-walkin-fields > div:first-child", title: "Collect the walk-in details", description: "First name, last name and phone are required. Email and gender are optional. Confirm the event and date before submitting. Use Cancel editing to discard a draft guest." },
  { target: ".event-checkin-tour-walkin-save", title: "Understand the walk-in save", description: "Check in as guest creates a visitor record and records their attendance for the selected event and date. Review the details first. This is a save action; the tour never submits it." },
  { target: ".event-checkin-tour-arrivals", title: "Review confirmed arrivals", description: "This panel shows up to eight recorded arrivals for the selected date, with names and times. It is separate from unsaved selections. An empty panel means no arrivals are displayed for that date, not that the event has no registrations." },
  { target: ".event-checkin-tour-workspace :is([aria-label='Headcount entry'], [aria-label='Reported headcount']) > div:nth-child(2)", title: "Review the headcount context", description: "Check the gathering, date and editing mode before entering a total. Existing counts open protected in View mode. Edit attendance unlocks changes when permitted; Cancel editing restores the saved values or clears an unsaved entry." },
  { target: ".event-checkin-tour-workspace :is([aria-label='Headcount entry'], [aria-label='Reported headcount']) input[id$='-total']", title: "Enter the room total", description: "Only the total is required. It describes the room for this event and date, independently of named check-ins. Saving a headcount does not check individual people in. Review the counts before using Save headcount or Save changes." },
  { target: ".event-checkin-tour-workspace [aria-label='Age breakdown']", title: "Optional age breakdown", description: "Adults and Children are optional counts within the room total. Leave unknown breakdowns blank. They describe the same attendance, not additional people to add to the total." },
  { target: ".event-checkin-tour-workspace [aria-label='Gender breakdown']", title: "Optional gender breakdown", description: "Gender counts are another breakdown of the same room total. Review them alongside any age counts before saving. This guide leaves every headcount unchanged." },
];

type TabRoute = "roster" | "walkin";

export default function EventCheckInPage() {
  const { can, ready } = usePermissions();
  const { data: profile } = useCurrentProfile();
  const canCheckIn = ready && can("events:checkin", "create");

  const [eventId, setEventId] = React.useState("");
  const [tab, setTab] = React.useState<TabRoute>("roster");
  const [headcountDirty, setHeadcountDirty] = React.useState(false);
  const [headcountBusy, setHeadcountBusy] = React.useState(false);
  const canSeeReported = useCanViewGeneralAttendance("event");
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [editable, setEditable] = React.useState(false);
  const [savingRoster, setSavingRoster] = React.useState(false);
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
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("event") ?? params.get("eventId");
    if (requested) setEventId(requested);
  }, []);
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
    setEditable(false);
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

  const doBulk = async () => {
    if (!activeEvent || !attendanceDate || !selected.size || !editable || savingRoster) return;
    setSavingRoster(true);
    let recorded = 0, skipped = 0;
    try {
      const ids = [...selected];
      for (let start = 0; start < ids.length; start += 200) {
        const batch = ids.slice(start, start + 200);
        const result = await bulkCheckIn.mutateAsync({ memberIds: batch, attendanceDate });
        recorded += result.checkedIn;
        skipped += result.skipped ?? 0;
        setSelected(previous => new Set([...previous].filter(id => !batch.includes(id))));
      }
      setEditable(false);
      toast.success(`${recorded} checked in${skipped ? `, ${skipped} already recorded` : ""}.`);
    } catch (error) {
      toast.error("Check-in could not be completed", { description: `${recorded} saved. Remaining people stay selected. ${getToastErrorMessage(error, "Please retry.")}` });
    } finally {
      setSavingRoster(false);
    }
  };

  const doWalkIn = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editable) return;
    if (!activeEvent || !attendanceDate || walkInCheckIn.isPending) return;
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
          setEditable(false);
          toast.success(`${record.visitorName ?? w.firstName} walked in and is counted.`);
          setWalkIn({ firstName: "", lastName: "", phone: "", email: "", gender: "" });
        },
        onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't check the guest in.")),
      },
    );
  };

  const saving = savingRoster || headcountBusy || bulkCheckIn.isPending || walkInCheckIn.isPending;
  const changeContext = (change: () => void) => {
    if (saving) return;
    const hasDraft = selected.size > 0 || headcountDirty || Object.values(walkIn).some((value) => value.trim());
    if (hasDraft && !window.confirm("Discard unsaved attendance selections and form entries before changing the gathering or date?")) return;
    setSelected(new Set());
    setWalkIn({ firstName: "", lastName: "", phone: "", email: "", gender: "" });
    setHeadcountDirty(false);
    change();
  };

  if (!canCheckIn) {
    return (
      <EmptyState
        icon={<ScanLine />}
        title="Check-in is a staff task"
        description="Your role can view events but not check people in."
        action={<Button asChild variant="outline" size="sm" className="rounded-full border-line text-sm"><Link href="/gatherings/events">Back to events</Link></Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        className="event-checkin-tour-heading"
        eyebrow="Gatherings · Events"
        title="Event attendance"
        description="Choose an event and date, then check in registrants, welcome visitors or record a headcount."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PageTour page="Event check-in" account={profile ? `${profile.churchId}:${profile.profileId}` : undefined} ready={ready && events.isSuccess && (!activeId || (registrations.isSuccess && attendance.isSuccess)) && !saving} steps={CHECK_IN_TOUR_STEPS} />
            <CheckInDatePicker
              className="event-checkin-tour-date"
              value={attendanceDate}
              onChange={(date) => changeContext(() => setAttendanceDate(date))}
              occursOn={occursOn}
              label="Event date"
              disabled={!activeEvent || saving}
            />
            <select
              value={activeId}
              disabled={saving}
              onChange={(event) => changeContext(() => setEventId(event.target.value))}
              className="event-checkin-tour-event h-9 w-full min-w-[220px] rounded-full border border-line bg-card px-3 text-sm outline-none"
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

      <div className="event-checkin-tour-workspace">
      <AttendanceWorkspace name={activeEvent?.title ?? "Choose a gathering"} scope="Event" canSeeHeadcount={canSeeReported} busy={saving}>
        <TabsContent value="individual" forceMount className="data-[state=inactive]:hidden">
          <div className="space-y-4">
      <div className="event-checkin-tour-summary grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Named check-ins" value={attendedCount} tone="moss" icon={<Users className="size-4" />} deltaLabel={attendanceDate === todayKey() ? "right now" : "selected day"} />
        <StatCard label="Expected" value={registeredCount} tone="brand" deltaLabel="registered" />
        <StatCard label="Selected" value={selected.size} tone="gold" deltaLabel={selected.size ? "ready to check in" : "tap to select"} />
        <div className="paper-card flex flex-col justify-between gap-4 rounded-2xl p-5">
          <span className="rule-label">Event</span>
          <span className="font-display text-sm font-semibold leading-tight">{activeEvent?.title ?? "Not available"}</span>
        </div>
      </div>


      <div className="flex flex-wrap items-center gap-2">
        <div className="event-checkin-tour-tabs flex flex-wrap gap-2"><FilterChip active={tab === "roster"} onClick={() => setTab("roster")}>Registered people</FilterChip>
        <FilterChip active={tab === "walkin"} onClick={() => setTab("walkin")}>Visitors</FilterChip></div>
        {tab === "roster" ? (
          <SearchField value={query} onChange={setQuery} placeholder="Search a name or ticket code…" className="event-checkin-tour-search ml-auto w-full max-w-xs" />
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {tab === "roster" ? (
          <div className="paper-card rounded-2xl">

            {registrations.isError ? <div role="alert" className="p-4 text-sm">The roster could not be loaded. <Button type="button" variant="outline" onClick={() => registrations.refetch()}>Retry roster</Button></div> : registrations.isLoading ? <LoadingState label="Loading roster" variant="table" rows={4} /> : (
              <div className="event-checkin-tour-roster"><AttendanceRosterTable
                rows={rows.map(reg => ({ id: reg.memberId, name: reg.memberName ?? reg.memberId, detail: `${reg.tierName ? `${reg.tierName} · ` : ""}×${reg.quantity}${reg.ticketCode ? ` · ${reg.ticketCode}` : ""}`, recorded: reg.checkedIn, status: "Awaiting" }))}
                selected={selected}
                editable={editable}
                busy={savingRoster}
                onEdit={() => setEditable(true)}
                onCancel={() => { setSelected(new Set()); setEditable(false); }}
                onToggle={toggle}
                onSelectAll={(ids, checked) => setSelected(previous => { const next = new Set(previous); ids.forEach(id => checked ? next.add(id) : next.delete(id)); return next; })}
              /></div>
            )}
            <div className="event-checkin-tour-save"><AttendanceSelectionBar editable={editable} count={selected.size} busy={savingRoster} disabled={!activeEvent} onSave={doBulk} onClear={() => setSelected(new Set())} /></div>
          </div>
        ) : (
          <SectionCard className="event-checkin-tour-walkin" eyebrow="No ticket? No problem" title="Walk someone in" bodyClassName="p-5" actions={<AttendanceEditToggle editable={editable} busy={saving} onEdit={() => setEditable(true)} onCancel={() => { setEditable(false); setSelected(new Set()); setWalkIn({ firstName: "", lastName: "", phone: "", email: "", gender: "" }); }} />}>
            <ValidatedForm onSubmit={doWalkIn} className="space-y-4">
              <fieldset disabled={!editable || saving} className="space-y-4">
              <div className="event-checkin-tour-walkin-fields grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label required className="text-sm" htmlFor="event-walkin-firstName">First name</Label>
                  <Input id="event-walkin-firstName" required value={walkIn.firstName} onChange={(e) => setWalkIn((w) => ({ ...w, firstName: e.target.value }))} className="h-10 rounded-lg border-line bg-background text-sm shadow-none" />
                </div>
                <div className="space-y-1.5">
                  <Label required className="text-sm" htmlFor="event-walkin-lastName">Last name</Label>
                  <Input id="event-walkin-lastName" required value={walkIn.lastName} onChange={(e) => setWalkIn((w) => ({ ...w, lastName: e.target.value }))} className="h-10 rounded-lg border-line bg-background text-sm shadow-none" />
                </div>
                <div className="space-y-1.5">
                  <Label required className="text-sm" htmlFor="event-walkin-phone">Phone</Label>
                  <Input id="event-walkin-phone" required value={walkIn.phone} onChange={(e) => setWalkIn((w) => ({ ...w, phone: e.target.value }))} placeholder="+1 415 555 0100" className="h-10 rounded-lg border-line bg-background text-sm shadow-none" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm" htmlFor="event-walkin-email">Email (optional)</Label>
                  <Input id="event-walkin-email" value={walkIn.email} onChange={(e) => setWalkIn((w) => ({ ...w, email: e.target.value }))} className="h-10 rounded-lg border-line bg-background text-sm shadow-none" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-sm" htmlFor="event-walkin-gender">Gender (optional)</Label>
                  <select id="event-walkin-gender" value={walkIn.gender} onChange={(e) => setWalkIn((w) => ({ ...w, gender: e.target.value }))} className="h-10 w-full rounded-lg border border-line bg-background px-2 text-sm outline-none">
                    <option value="">Not said</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>
              <Button type="submit" disabled={!activeEvent || walkInCheckIn.isPending} className="event-checkin-tour-walkin-save h-10 w-full gap-2 rounded-lg text-sm">
                <UserPlus className="size-4" /> {walkInCheckIn.isPending ? "Checking in…" : "Check in as guest"}
              </Button>
              <p className="text-center text-xs text-ink-faint">
                Walk-ins become visitor records. The follow-up desk will pick them up tomorrow.
              </p>
              </fieldset>
            </ValidatedForm>
          </SectionCard>
        )}

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <SectionCard className="event-checkin-tour-arrivals" eyebrow="Arrivals" title="Confirmed arrivals" bodyClassName="p-0">
            <div className="divide-y divide-line/70">
              {attendanceForDay.slice(0, 8).map((record) => (
                <div key={record.attendanceId} className="flex items-center gap-2.5 px-4 py-2.5">
                  <PersonAvatar name={record.memberName ?? record.visitorName ?? "Guest"} size="xs" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{record.memberName ?? record.visitorName ?? "Guest"}</span>
                  <span className="text-xs text-ink-faint">
                    {new Date(record.checkInAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
              {!attendanceForDay.length ? <p className="px-4 py-8 text-center text-sm text-ink-faint">Doors haven&apos;t opened yet.</p> : null}
            </div>
          </SectionCard>
          <div className="rounded-2xl border border-dashed border-line p-4 text-sm leading-relaxed text-ink-soft">
            Volunteers run this screen on the door tablet. Anything missed can be
            reconciled from the event page afterwards.
          </div>
        </aside>
      </div>
          </div>
        </TabsContent>

        {canSeeReported ? (
          <TabsContent value="general" forceMount className="data-[state=inactive]:hidden">
            {activeEvent ? (
              <GeneralAttendancePanel
                key={`${activeId}:${attendanceDate}`}
                onDirtyChange={setHeadcountDirty}
                onBusyChange={setHeadcountBusy}
                context={{
                  type: "event",
                  id: activeEvent.eventId,
                  name: activeEvent.title,
                  branchId: activeEvent.branchId,
                  active: !activeEvent.archivedAt,
                }}
                entryMode="inline"
                showRecords={false}
                attendanceDate={attendanceDate}
                occursOn={occursOn}
              />
            ) : (
              <p className="px-4 py-8 text-center text-sm text-ink-faint">
                Pick an event above to report its headcount.
              </p>
            )}
          </TabsContent>
        ) : null}
      </AttendanceWorkspace>
      </div>
    </div>
  );
}
