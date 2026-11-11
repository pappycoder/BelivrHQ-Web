"use client";

import { ValidatedForm } from "@/components/ui/validated-form";

import * as React from "react";
import Link from "next/link";
import { ScanLine, UserPlus, Users } from "lucide-react";
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
import { TabsContent } from "@/components/ui/tabs";
import { AttendanceWorkspace } from "@/components/attendance/attendance-workspace";
import {
  AttendanceRosterTable,
  AttendanceEditToggle,
} from "@/components/attendance/attendance-roster-table";
import { AttendanceSelectionBar } from "@/components/attendance/attendance-selection-bar";
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
import { type MemberListResponse } from "@/hooks/use-members";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCreateVisitor } from "@/hooks/use-visitors";
import {
  defaultServiceDate,
  serviceOccursOn,
  todayKey,
  type ServiceSchedule,
} from "@/lib/schedule-occurrence";

function defaultCategory(serviceCategory?: string): AttendanceCategory {
  if (serviceCategory === "children") return "children";
  if (serviceCategory === "adult") return "adult";
  return "unspecified";
}

export default function AttendanceCheckInPage() {
  const { can, ready } = usePermissions();
  const canCheckIn = ready && can("attendance:checkin", "create");

  const services = useAttendanceServices(
    { limit: 100, isActive: true, page: 1 },
    { enabled: ready },
  );
  const serviceList = services.data?.data ?? [];
  const [serviceId, setServiceId] = React.useState("");
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("service") ?? params.get("serviceId");
    if (requested) setServiceId(requested);
  }, []);
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
  const [headcountDirty, setHeadcountDirty] = React.useState(false);
  const [headcountBusy, setHeadcountBusy] = React.useState(false);
  const canSeeReported = useCanViewGeneralAttendance("service");
  const [query, setQuery] = React.useState("");
  const [category, setCategory] =
    React.useState<AttendanceCategory>("unspecified");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [editable, setEditable] = React.useState(false);
  const [savingRoster, setSavingRoster] = React.useState(false);
  const [walkIn, setWalkIn] = React.useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });

  const rosterQuery = query.trim().toLowerCase();
  const roster = useInfiniteQuery({
    queryKey: ["attendance-live-roster", activeService?.branchId, rosterQuery],
    enabled: canCheckIn && !!activeService,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams({
        page: String(pageParam),
        limit: "100",
        status: "active",
      });
      if (activeService?.branchId)
        params.set("branchId", activeService.branchId);
      if (rosterQuery) params.set("search", rosterQuery);
      return api.get<MemberListResponse>(`/members?${params}`, { signal });
    },
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPageParam * 100 < (lastPage.meta?.total ?? 0)
        ? lastPageParam + 1
        : undefined,
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === activeService?.branchId
        ? previous
        : undefined,
  });
  const rosterPeople = React.useMemo(
    () => [
      ...new Map(
        (roster.data?.pages.flatMap((page) => page.data) ?? []).map(
          (member) => [member.memberId, member],
        ),
      ).values(),
    ],
    [roster.data],
  );
  const people = React.useMemo(
    () =>
      rosterQuery
        ? rosterPeople.filter((member) =>
            `${member.firstName} ${member.lastName} ${member.phone ?? ""} ${member.email ?? ""}`
              .toLowerCase()
              .includes(rosterQuery),
          )
        : rosterPeople,
    [rosterPeople, rosterQuery],
  );
  const recent = useAttendanceRecords({
    serviceId: activeId,
    limit: 200,
    ...dayBounds,
  });
  const recordBulk = useRecordBulkAttendance();
  const recordOne = useRecordAttendance();
  const createVisitor = useCreateVisitor();

  React.useEffect(() => {
    setSelected(new Set());
    setEditable(false);
    setQuery("");
  }, [activeId, attendanceDate]);

  React.useEffect(() => {
    if (activeService?.category)
      setCategory(defaultCategory(activeService.category));
  }, [activeService?.category]);

  const checkedInIds = new Set(
    (recent.data?.data ?? [])
      .map((r) => r.memberId)
      .filter(Boolean) as string[],
  );

  const toggle = (memberId: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });

  const doBulk = async () => {
    if (
      !activeService ||
      !attendanceDate ||
      !selected.size ||
      !editable ||
      savingRoster
    )
      return;
    setSavingRoster(true);
    let recorded = 0,
      skipped = 0;
    try {
      const ids = [...selected];
      for (let start = 0; start < ids.length; start += 200) {
        const batch = ids.slice(start, start + 200);
        const result = await recordBulk.mutateAsync({
          serviceId: activeId,
          records: batch.map((memberId) => ({ memberId })),
          category,
          source: "self",
          attendanceDate,
        });
        recorded += result.recorded;
        skipped += result.skipped ?? 0;
        setSelected(
          (previous) =>
            new Set([...previous].filter((id) => !batch.includes(id))),
        );
      }
      setEditable(false);
      toast.success(
        `${recorded} checked in${skipped ? `, ${skipped} already recorded` : ""}.`,
      );
    } catch (error) {
      toast.error("Check-in could not be completed", {
        description: `${recorded} saved. Remaining people stay selected. ${getToastErrorMessage(error, "Please retry.")}`,
      });
    } finally {
      setSavingRoster(false);
    }
  };

  const doWalkIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editable) return;
    if (
      !activeService ||
      !attendanceDate ||
      createVisitor.isPending ||
      recordOne.isPending
    )
      return;
    const first = walkIn.firstName.trim();
    const last = walkIn.lastName.trim();
    if (!first || !last) {
      toast.error("A first and last name, please.");
      return;
    }
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
      setEditable(false);
      toast.success(
        `${first} is counted and now lives in the visitor register.`,
      );
      setWalkIn({ firstName: "", lastName: "", phone: "", email: "" });
    } catch (e) {
      toast.error(
        getToastErrorMessage(
          e,
          "The visitor was created but the check-in failed. Add them from Records.",
        ),
      );
    }
  };

  const saving =
    savingRoster ||
    headcountBusy ||
    recordBulk.isPending ||
    recordOne.isPending ||
    createVisitor.isPending;
  const changeContext = (change: () => void) => {
    if (saving) return;
    const hasDraft =
      selected.size > 0 ||
      headcountDirty ||
      Object.values(walkIn).some((value) => value.trim());
    if (
      hasDraft &&
      !window.confirm(
        "Discard unsaved attendance selections and form entries before changing the gathering or date?",
      )
    )
      return;
    setSelected(new Set());
    setWalkIn({ firstName: "", lastName: "", phone: "", email: "" });
    setHeadcountDirty(false);
    change();
  };

  if (!canCheckIn) {
    return (
      <EmptyState
        icon={<ScanLine />}
        title="Check-in needs the attendance grant"
        description="Your role can read attendance but not record it."
        action={
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-full border-line text-sm"
          >
            <Link href="/gatherings/attendance">Back to attendance</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gatherings · Attendance"
        title="Service attendance"
        description="Choose a service and date, then check in people or record the room total."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <CheckInDatePicker
              value={attendanceDate}
              onChange={(date) => changeContext(() => setAttendanceDate(date))}
              occursOn={occursOn}
              disabled={!activeService || saving}
            />
            <select
              value={activeId}
              disabled={saving}
              onChange={(event) =>
                changeContext(() => setServiceId(event.target.value))
              }
              className="h-9 min-w-[200px] rounded-full border border-line bg-card px-3 text-sm outline-none"
              aria-label="Choose service"
            >
              {serviceList.map((service) => (
                <option key={service.serviceId} value={service.serviceId}>
                  {service.name}
                </option>
              ))}
              {!serviceList.length ? <option>No active services</option> : null}
            </select>
          </div>
        }
      />

      <AttendanceWorkspace
        name={activeService?.name ?? "Choose a gathering"}
        scope="Service"
        canSeeHeadcount={canSeeReported}
        busy={saving}
      >
        <TabsContent
          value="individual"
          forceMount
          className="data-[state=inactive]:hidden"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                label="Named check-ins"
                value={recent.data?.meta?.total ?? 0}
                tone="moss"
                icon={<Users className="size-4" />}
                deltaLabel={
                  attendanceDate === todayKey() ? "today" : "selected day"
                }
              />
              <StatCard
                label="Selected"
                value={selected.size}
                tone="gold"
                deltaLabel={selected.size ? "ready" : "tap faces"}
              />
              <StatCard
                label={rosterQuery ? "Matching people" : "Active members"}
                value={roster.data?.pages[0]?.meta?.total ?? 0}
                tone="brand"
                deltaLabel="roster loaded"
              />
              <div className="paper-card flex flex-col justify-between gap-4 rounded-2xl p-5">
                <span className="rule-label">Service</span>
                <span className="font-display text-sm font-semibold leading-tight">
                  {activeService?.name ?? "Not available"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <FilterChip
                active={tab === "roster"}
                onClick={() => setTab("roster")}
              >
                Members roster
              </FilterChip>
              <FilterChip
                active={tab === "walkin"}
                onClick={() => setTab("walkin")}
              >
                Visitors
              </FilterChip>
            </div>
            <div
              className="flex flex-wrap items-center gap-2"
              aria-label="Check-in category"
            >
              <span className="text-sm font-medium text-ink-muted">
                Attendance category
              </span>
              {ATTENDANCE_CATEGORIES.map((item) => (
                <FilterChip
                  key={item.value}
                  active={category === item.value}
                  onClick={() => setCategory(item.value)}
                >
                  {item.label}
                </FilterChip>
              ))}
              {tab === "roster" ? (
                <SearchField
                  value={query}
                  onChange={setQuery}
                  placeholder="Search people…"
                  className="ml-auto w-full max-w-[220px]"
                />
              ) : null}
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
              {tab === "roster" ? (
                <div className="paper-card rounded-2xl">
                  {roster.isError ? (
                    <div role="alert" className="p-4 text-sm">
                      The roster could not be loaded.{" "}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => roster.refetch()}
                      >
                        Retry roster
                      </Button>
                    </div>
                  ) : roster.isLoading ? (
                    <p role="status" className="p-4 text-sm">
                      Loading roster…
                    </p>
                  ) : (
                    <AttendanceRosterTable
                      rows={people.map((member) => ({
                        id: member.memberId,
                        name: `${member.firstName} ${member.lastName}`,
                        detail: member.phone,
                        avatar: member.photoUrl,
                        recorded: checkedInIds.has(member.memberId),
                      }))}
                      selected={selected}
                      editable={editable}
                      busy={savingRoster}
                      onEdit={() => setEditable(true)}
                      onCancel={() => {
                        setSelected(new Set());
                        setEditable(false);
                      }}
                      onToggle={toggle}
                      onSelectAll={(ids, checked) =>
                        setSelected((previous) => {
                          const next = new Set(previous);
                          ids.forEach((id) =>
                            checked ? next.add(id) : next.delete(id),
                          );
                          return next;
                        })
                      }
                    />
                  )}
                  {roster.hasNextPage && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="m-3"
                      disabled={roster.isFetching || savingRoster}
                      onClick={() => void roster.fetchNextPage()}
                    >
                      Load more members
                    </Button>
                  )}
                  <AttendanceSelectionBar
                    editable={editable}
                    count={selected.size}
                    busy={savingRoster}
                    disabled={!activeService}
                    onSave={doBulk}
                    onClear={() => setSelected(new Set())}
                  />
                </div>
              ) : (
                <SectionCard
                  eyebrow="Guests become records"
                  title="Walk someone in"
                  bodyClassName="p-5"
                  actions={
                    <AttendanceEditToggle
                      editable={editable}
                      busy={saving}
                      onEdit={() => setEditable(true)}
                      onCancel={() => {
                        setEditable(false);
                        setSelected(new Set());
                        setWalkIn({
                          firstName: "",
                          lastName: "",
                          phone: "",
                          email: "",
                        });
                      }}
                    />
                  }
                >
                  <ValidatedForm onSubmit={doWalkIn} className="space-y-4">
                    <fieldset
                      disabled={!editable || saving}
                      className="space-y-4"
                    >
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label required className="text-sm">
                            First name
                          </Label>
                          <Input
                            required
                            value={walkIn.firstName}
                            onChange={(e) =>
                              setWalkIn((w) => ({
                                ...w,
                                firstName: e.target.value,
                              }))
                            }
                            className="h-10 rounded-lg border-line bg-background text-sm shadow-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label required className="text-sm">
                            Last name
                          </Label>
                          <Input
                            required
                            value={walkIn.lastName}
                            onChange={(e) =>
                              setWalkIn((w) => ({
                                ...w,
                                lastName: e.target.value,
                              }))
                            }
                            className="h-10 rounded-lg border-line bg-background text-sm shadow-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm">Phone</Label>
                          <Input
                            value={walkIn.phone}
                            onChange={(e) =>
                              setWalkIn((w) => ({
                                ...w,
                                phone: e.target.value,
                              }))
                            }
                            placeholder="+1 415 555 0100"
                            className="h-10 rounded-lg border-line bg-background text-sm shadow-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm">Email</Label>
                          <Input
                            value={walkIn.email}
                            onChange={(e) =>
                              setWalkIn((w) => ({
                                ...w,
                                email: e.target.value,
                              }))
                            }
                            className="h-10 rounded-lg border-line bg-background text-sm shadow-none"
                          />
                        </div>
                      </div>
                      <Button
                        type="submit"
                        disabled={
                          !activeService ||
                          createVisitor.isPending ||
                          recordOne.isPending
                        }
                        className="h-10 w-full gap-2 rounded-lg text-sm"
                      >
                        <UserPlus className="size-4" />{" "}
                        {createVisitor.isPending
                          ? "Welcoming…"
                          : "Check in as visitor"}
                      </Button>
                      <p className="text-center text-xs text-ink-faint">
                        Category is {attendanceCategoryLabel(category)}; change
                        it with the chips above before submitting.
                      </p>
                    </fieldset>
                  </ValidatedForm>
                </SectionCard>
              )}

              <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
                <SectionCard
                  eyebrow="Arrivals"
                  title="Confirmed arrivals"
                  bodyClassName="p-0"
                  actions={
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={recent.isFetching}
                      onClick={() => recent.refetch()}
                    >
                      Refresh
                    </Button>
                  }
                >
                  <div className="divide-y divide-line/70">
                    {(recent.data?.data ?? []).slice(0, 8).map((record) => (
                      <div
                        key={record.attendanceId}
                        className="flex items-center gap-2.5 px-4 py-2.5"
                      >
                        <PersonAvatar
                          name={
                            record.memberName ?? record.visitorName ?? "Guest"
                          }
                          size="xs"
                        />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {record.memberName ?? record.visitorName ?? "Guest"}
                        </span>
                        <span className="text-xs uppercase text-ink-faint">
                          {attendanceCategoryLabel(record.category) ??
                            "Not available"}
                        </span>
                      </div>
                    ))}
                    {recent.isError ? (
                      <p role="alert" className="p-4 text-sm text-destructive">
                        Arrivals could not be loaded. Refresh to try again.
                      </p>
                    ) : recent.isLoading ? (
                      <p role="status" className="p-4 text-sm text-ink-muted">
                        Loading arrivals…
                      </p>
                    ) : !recent.data?.data?.length ? (
                      <p className="px-4 py-8 text-center text-sm text-ink-faint">
                        The first one through the door starts the list.
                      </p>
                    ) : null}
                  </div>
                </SectionCard>
                {activeService ? (
                  <div className="paper-card rounded-2xl p-4">
                    <p className="text-sm font-semibold">
                      {activeService.name}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-1.5 text-xs text-ink-faint">
                      {SERVICE_CATEGORIES.map((c) => (
                        <Tag
                          key={c.value}
                          tone={
                            activeService.category === c.value
                              ? "sky"
                              : "neutral"
                          }
                        >
                          {c.label}
                        </Tag>
                      ))}
                    </p>
                  </div>
                ) : null}
              </aside>
            </div>
          </div>
        </TabsContent>

        {canSeeReported ? (
          <TabsContent
            value="general"
            forceMount
            className="data-[state=inactive]:hidden"
          >
            {activeService ? (
              <GeneralAttendancePanel
                key={`${activeId}:${attendanceDate}`}
                onDirtyChange={setHeadcountDirty}
                onBusyChange={setHeadcountBusy}
                service={activeService}
                requireService
                entryMode="inline"
                showRecords={false}
                attendanceDate={attendanceDate}
                occursOn={occursOn}
              />
            ) : (
              <p className="px-4 py-8 text-center text-sm text-ink-faint">
                Create a service first. Headcount is reported per service.
              </p>
            )}
          </TabsContent>
        ) : null}
      </AttendanceWorkspace>
    </div>
  );
}
