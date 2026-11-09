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
import { GeneralAttendancePanel } from "@/components/attendance/general-attendance-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useAttendanceServices,
  useAttendanceRecords,
  useRecordBulkAttendance,
  useRecordAttendance,
  useCanViewGeneralAttendance,
  ATTENDANCE_CATEGORIES,
  SERVICE_CATEGORIES,
  attendanceCategoryLabel,
  type AttendanceCategory,
} from "@/hooks/use-attendance";
import { useMembersList, useSearchMembers } from "@/hooks/use-members";
import { useCreateVisitor } from "@/hooks/use-visitors";
import {
  defaultServiceDate,
  serviceOccursOn,
  todayKey,
  type ServiceSchedule,
} from "@/lib/schedule-occurrence";
import { cn } from "@/lib/utils";

function defaultCategory(serviceCategory?: string): AttendanceCategory {
  if (serviceCategory === "children") return "children";
  if (serviceCategory === "adult") return "adult";
  return "unspecified";
}

export default function AttendanceCheckInPage() {
  const { can, ready } = usePermissions();
  const canCheckIn = ready && can("attendance:checkin", "create");

  const services = useAttendanceServices({ limit: 100, isActive: true, page: 1 }, { enabled: ready });
  const serviceList = services.data?.data ?? [];
  const [serviceId, setServiceId] = React.useState("");
  const activeId = serviceId || serviceList[0]?.serviceId || "";
  const activeService = serviceList.find((s) => s.serviceId === activeId);

  const activeSchedule = React.useMemo<ServiceSchedule>(
    () => ({
      recurrence: activeService?.recurrence,
      dayOfWeek: activeService?.dayOfWeek,
      startsOn: activeService?.startsOn,
      endsOn: activeService?.endsOn,
    }),
    [activeService],
  );
  const occursOn = React.useCallback(
    (date: string) => serviceOccursOn(activeSchedule, date),
    [activeSchedule],
  );
  const [attendanceDate, setAttendanceDate] = React.useState(() => todayKey());
  const datedService = React.useRef("");

  React.useEffect(() => {
    if (!activeService || datedService.current === activeService.serviceId) {
      return;
    }
    datedService.current = activeService.serviceId;
    setAttendanceDate(defaultServiceDate(activeSchedule));
  }, [activeService, activeSchedule]);

  const dayBounds = React.useMemo(
    () => ({
      startDate: `${attendanceDate}T00:00:00.000Z`,
      endDate: `${attendanceDate}T23:59:59.999Z`,
    }),
    [attendanceDate],
  );

  const [tab, setTab] = React.useState<"roster" | "walkin">("roster");
  const canSeeReported = useCanViewGeneralAttendance("service");
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<AttendanceCategory>("unspecified");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [rosterLimit, setRosterLimit] = React.useState(50);
  const [walkIn, setWalkIn] = React.useState({ firstName: "", lastName: "", phone: "", email: "" });

  const roster = useMembersList({ page: 1, limit: rosterLimit, status: "active" }, { enabled: canCheckIn });
  const search = useSearchMembers(query, 20, { enabled: query.trim().length >= 2 });
  const recent = useAttendanceRecords({ serviceId: activeId, limit: 200, ...dayBounds });
  const recordBulk = useRecordBulkAttendance();
  const recordOne = useRecordAttendance();
  const createVisitor = useCreateVisitor();

  React.useEffect(() => {
    setSelected(new Set());
    setQuery("");
  }, [activeId, attendanceDate]);

  React.useEffect(() => {
    if (activeService?.category) setCategory(defaultCategory(activeService.category));
  }, [activeService?.category]);

  const people = (query.trim().length >= 2 ? search.data?.data : roster.data?.data) ?? [];
  const checkedInIds = new Set((recent.data?.data ?? []).map((r) => r.memberId).filter(Boolean) as string[]);

  const toggle = (memberId: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });

  const doBulk = () => {
    if (!activeId || !selected.size) return;
    recordBulk.mutate(
      {
        serviceId: activeId,
        records: [...selected].map((memberId) => ({ memberId })),
        category,
        source: "self",
        attendanceDate,
      },
      {
        onSuccess: (result) => {
          toast.success(`${result.recorded} checked in${result.skipped ? `, ${result.skipped} already here` : ""}.`);
          setSelected(new Set());
        },
        onError: (e) => toast.error(getToastErrorMessage(e, "Check-in didn't complete.")),
      },
    );
  };

  const doWalkIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeId) return;
    const first = walkIn.firstName.trim();
    const last = walkIn.lastName.trim();
    if (!first || !last) { toast.error("A first and last name, please."); return; }
    try {
      const visitor = await createVisitor.mutateAsync({
        firstName: first,
        lastName: last,
        phone: walkIn.phone.trim() || undefined,
        email: walkIn.email.trim() || undefined,
      });
      await recordOne.mutateAsync({
        serviceId: activeId,
        visitorId: visitor.id,
        visitorName: `${visitor.firstName} ${visitor.lastName ?? ""}`.trim(),
        category,
        source: "walk_in",
        attendanceDate,
      });
      toast.success(`${first} is counted and now lives in the visitor register.`);
      setWalkIn({ firstName: "", lastName: "", phone: "", email: "" });
    } catch (e) {
      toast.error(getToastErrorMessage(e, "The visitor was created but the check-in failed. Add them from Records."));
    }
  };

  if (!canCheckIn) {
    return (
      <EmptyState
        icon={<ScanLine />}
        title="Check-in needs the attendance grant"
        description="Your role can read attendance but not record it."
        action={<Button asChild variant="outline" size="sm" className="rounded-full border-line text-xs"><Link href="/gatherings/attendance">Back to attendance</Link></Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gatherings · Attendance"
        title="Sunday, right now."
        description="One counter per service, counted calmly at the door."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <CheckInDatePicker
              value={attendanceDate}
              onChange={setAttendanceDate}
              occursOn={occursOn}
              disabled={!activeService}
            />
            <select
              value={activeId}
              onChange={(event) => setServiceId(event.target.value)}
              className="h-9 min-w-[200px] rounded-full border border-line bg-card px-3 text-xs outline-none"
              aria-label="Choose service"
            >
              {serviceList.map((service) => (
                <option key={service.serviceId} value={service.serviceId}>{service.name}</option>
              ))}
              {!serviceList.length ? <option>No active services</option> : null}
            </select>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="In this service" value={recent.data?.meta?.total ?? 0} tone="moss" icon={<Users className="size-4" />} deltaLabel={attendanceDate === todayKey() ? "today" : "selected day"} />
        <StatCard label="Selected" value={selected.size} tone="gold" deltaLabel={selected.size ? "ready" : "tap faces"} />
        <StatCard label="Active members" value={roster.data?.meta?.total ?? 0} tone="brand" deltaLabel="roster loaded" />
        <div className="paper-card flex flex-col justify-between gap-4 rounded-2xl p-5">
          <span className="rule-label">Service</span>
          <span className="font-display text-sm font-semibold leading-tight">{activeService?.name ?? "Not available"}</span>
        </div>
      </div>

      <Tabs defaultValue="individual" className="min-w-0">
        {canSeeReported ? (
          <TabsList className="h-9 w-fit rounded-full border border-line bg-card p-0.5">
            <TabsTrigger value="individual" className="rounded-full px-3.5 text-xs data-[state=active]:bg-ink data-[state=active]:text-paper">
              Individual check-in
            </TabsTrigger>
            <TabsTrigger value="general" className="rounded-full px-3.5 text-xs data-[state=active]:bg-ink data-[state=active]:text-paper">
              General attendance
            </TabsTrigger>
          </TabsList>
        ) : null}

        <TabsContent value="individual" className={canSeeReported ? "mt-4" : undefined}>
          <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip active={tab === "roster"} onClick={() => setTab("roster")}>Members roster</FilterChip>
        <FilterChip active={tab === "walkin"} onClick={() => setTab("walkin")}>Walk-in</FilterChip>
        <span className="mx-1 hidden h-4 w-px bg-line sm:block" />
        {ATTENDANCE_CATEGORIES.map((item) => (
          <FilterChip key={item.value} active={category === item.value} onClick={() => setCategory(item.value)}>
            {item.label}
          </FilterChip>
        ))}
        {tab === "roster" ? <SearchField value={query} onChange={setQuery} placeholder="Find a face…" className="ml-auto w-full max-w-[220px]" /> : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {tab === "roster" ? (
          <div className="paper-card overflow-hidden rounded-2xl">
            {selected.size ? (
              <div className="flex items-center justify-between gap-3 bg-ink px-4 py-2.5 text-paper">
                <span className="num text-xs font-medium">{selected.size} selected</span>
                <div className="flex gap-2">
                  <Button size="xs" className="gap-1.5 rounded-full bg-paper text-ink hover:bg-paper/90" disabled={recordBulk.isPending} onClick={doBulk}>
                    <CheckCheck className="size-3" /> {recordBulk.isPending ? "Recording…" : "Check in"}
                  </Button>
                  <Button size="xs" variant="ghost" className="rounded-full text-[11px] text-paper/70 hover:bg-paper/10 hover:text-paper" onClick={() => setSelected(new Set())}>Clear</Button>
                </div>
              </div>
            ) : null}
            <div className="max-h-[540px] divide-y divide-line/70 overflow-y-auto">
              {people.length ? (
                people.map((member) => {
                  const already = checkedInIds.has(member.memberId);
                  return (
                    <button
                      key={member.memberId}
                      type="button"
                      disabled={already}
                      onClick={() => toggle(member.memberId)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                        already ? "opacity-45" : "hover:bg-muted/40",
                      )}
                    >
                      <span className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-md border",
                        selected.has(member.memberId) ? "border-moss bg-moss text-paper" : "border-line",
                      )}
                      >
                        {selected.has(member.memberId) ? <CheckCheck className="size-3" /> : null}
                      </span>
                      <PersonAvatar name={`${member.firstName} ${member.lastName}`} src={member.photoUrl} size="xs" />
                      <span className="min-w-0 flex-1 truncate text-xs font-medium">
                        {member.firstName} {member.lastName}
                      </span>
                      {already ? <Tag tone="moss" dot>In</Tag> : null}
                    </button>
                  );
                })
              ) : (
                <p className="px-5 py-12 text-center text-xs text-ink-faint">
                  {query.trim().length >= 2 ? "No member matches that." : "No one on the roster yet."}
                </p>
              )}
            </div>
            {query.trim().length < 2 && (roster.data?.data?.length ?? 0) < (roster.data?.meta?.total ?? 0) ? (
              <button type="button" onClick={() => setRosterLimit((n) => n + 50)} className="w-full border-t border-line py-2 text-[11px] text-brand hover:bg-muted/40">
                Load {Math.min(50, (roster.data?.meta?.total ?? 0) - (roster.data?.data?.length ?? 0))} more
              </button>
            ) : null}
          </div>
        ) : (
          <SectionCard eyebrow="Guests become records" title="Walk someone in" bodyClassName="p-5">
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
                  <Label className="text-xs">Email</Label>
                  <Input value={walkIn.email} onChange={(e) => setWalkIn((w) => ({ ...w, email: e.target.value }))} className="h-10 rounded-lg border-line bg-background text-sm shadow-none" />
                </div>
              </div>
              <Button type="submit" disabled={createVisitor.isPending || recordOne.isPending} className="h-10 w-full gap-2 rounded-lg text-sm">
                <UserPlus className="size-4" /> {createVisitor.isPending ? "Welcoming…" : "Check in as visitor"}
              </Button>
              <p className="text-center text-[10px] text-ink-faint">
                Category is {attendanceCategoryLabel(category)}; change it with the chips above before submitting.
              </p>
            </form>
          </SectionCard>
        )}

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <SectionCard eyebrow="Arrivals" title="On this day" bodyClassName="p-0">
            <div className="divide-y divide-line/70">
              {(recent.data?.data ?? []).slice(0, 8).map((record) => (
                <div key={record.attendanceId} className="flex items-center gap-2.5 px-4 py-2.5">
                  <PersonAvatar name={record.memberName ?? record.visitorName ?? "Guest"} size="xs" />
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium">{record.memberName ?? record.visitorName ?? "Guest"}</span>
                  <span className="text-[9px] uppercase text-ink-faint">{attendanceCategoryLabel(record.category) ?? "Not available"}</span>
                </div>
              ))}
              {!recent.data?.data?.length ? <p className="px-4 py-8 text-center text-[11px] text-ink-faint">The first one through the door starts the list.</p> : null}
            </div>
          </SectionCard>
          {activeService ? (
            <div className="paper-card rounded-2xl p-4">
              <p className="text-xs font-semibold">{activeService.name}</p>
              <p className="mt-1 flex flex-wrap gap-1.5 text-[10px] text-ink-faint">
                {SERVICE_CATEGORIES.map((c) => (
                  <Tag key={c.value} tone={activeService.category === c.value ? "sky" : "neutral"}>{c.label}</Tag>
                ))}
              </p>
            </div>
          ) : null}
        </aside>
      </div>
        </div>
        </TabsContent>

        {canSeeReported ? (
          <TabsContent value="general" className="mt-4">
            {activeService ? (
              <GeneralAttendancePanel
                service={activeService}
                requireService
                entryMode="inline"
                showRecords={false}
                attendanceDate={attendanceDate}
                occursOn={occursOn}
              />
            ) : (
              <p className="px-4 py-8 text-center text-xs text-ink-faint">
                Create a service first. Headcount is reported per service.
              </p>
            )}
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
