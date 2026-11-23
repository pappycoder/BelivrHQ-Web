"use client";

import { RecordQueryError } from "@/components/shared/record-query-error";
import { isMissingRecordError } from "@/lib/record-query-error";

import { formatRecordDateTime } from "@/lib/record-date";
import { formatStatusLabel } from "@/lib/status-label";


import { collectionLabel } from "@/lib/collection-label";

import { GatheringWorkspace } from "@/components/gatherings/gathering-workspace";
import { DetailNavigation } from "@/components/paper/section";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  PencilLine,
  ScanLine,
  Ticket,
  Users,
} from "lucide-react";
import { SectionCard } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import {
  EmptyState,
  PersonAvatar,
} from "@/components/paper/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttendanceWorkspace } from "@/components/attendance/attendance-workspace";
import { GeneralAttendancePanel } from "@/components/attendance/general-attendance-panel";
import { attendanceCategoryLabel } from "@/hooks/use-attendance";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useEvent,
  useEventStats,
  useEventRegistrations,
  useEventAttendance,
  useEventTiers,
  EVENT_TYPE_MAP,
} from "@/hooks/use-events";
import {
  eventOccursOn,
  stepOccurrence,
  todayKey,
} from "@/lib/schedule-occurrence";

function fullDate(value?: string) {
  if (!value) return "Not available";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function timeOf(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = React.use(params);
  const { can, ready } = usePermissions();

  const event = useEvent(eventId);
  const stats = useEventStats(eventId);
  const registrations = useEventRegistrations(eventId);
  const attendance = useEventAttendance(eventId);
  const tiers = useEventTiers(eventId);

  const canSeeRegistrations = ready && can("events:registrations", "read");
  const canSeeAttendance = ready && can("events:checkin", "read");
  const canCheckIn = ready && can("events:checkin", "create");
  const canManageTickets = ready && can("events:tickets", "read");
  const canEditEvent = ready && can("events", "update");

  if (event.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-4 w-40 animate-pulse rounded bg-line" />
        <div className="h-44 animate-pulse rounded-2xl bg-line" />
      </div>
    );
  }

  if (event.isError && !isMissingRecordError(event.error)) {
    return <RecordQueryError title="Event details" error={event.error} backHref="/gatherings/events" backLabel="Back to the calendar" />;
  }

  if (event.isError || !event.data) {
    return (
      <EmptyState
        icon={<CalendarDays />}
        title="We couldn&apos;t find that gathering"
        description="It may have been archived, or the link is old."
        action={
          <Button asChild variant="outline" size="sm" className="rounded-full border-line text-sm">
            <Link href="/gatherings/events">Back to the calendar</Link>
          </Button>
        }
      />
    );
  }

  const e = event.data;
  const schedule = { recurrence: e.recurrence, startDate: e.startDate, endDate: e.endDate };
  const occursToday = eventOccursOn(schedule, todayKey());
  // A recurring event that meets today is not "Past" just because its first
  // occurrence came and went — same evergreen rule as the service schedules.
  const upcoming = occursToday || new Date(e.startDate).getTime() >= Date.now();
  const recurrence = e.recurrence ?? "one_time";
  const nextDay =
    recurrence === "weekly" || recurrence === "multi_day"
      ? occursToday
        ? todayKey()
        : stepOccurrence((d) => eventOccursOn(schedule, d), todayKey(), 1)
      : null;


  return (
    <div className="space-y-6">
      <DetailNavigation><Link href="/gatherings/events" className="inline-flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink">
        <ArrowLeft className="size-3" /> Gatherings · Events
      </Link></DetailNavigation>

      <GatheringWorkspace recordKey={`event:${e.eventId}`} title={e.title} kind={EVENT_TYPE_MAP[e.type]??e.type} date={fullDate(e.startDate)+(timeOf(e.startDate)?` · ${timeOf(e.startDate)}`:"")+(e.endDate&&timeOf(e.endDate)?` – ${timeOf(e.endDate)}`:"")+(recurrence!=="one_time"?` · ${recurrence==="weekly"?"Repeats weekly":"Daily gathering"}${nextDay?` · next ${fullDate(`${nextDay}T00:00:00`)}`:""}`:"")} location={e.location} description={e.description} capacity={e.capacity} registered={e.registrationCount} tags={<><Tag tone={upcoming?"gold":"moss"} dot>{upcoming?"Upcoming":"Past"}</Tag>{e.branchName&&<Tag tone="sky">{e.branchName}</Tag>}{e.archivedAt&&<Tag tone="rose">Archived</Tag>}</>} actions={          <div data-tour-actions className="flex flex-wrap gap-2">
            {canCheckIn ? (
              <Button asChild size="sm" className="h-8 gap-1.5 rounded-full text-sm">
                <Link href={`/gatherings/events/check-in?event=${encodeURIComponent(e.eventId)}`}>
                  <ScanLine className="size-3.5" /> Check-in desk
                </Link>
              </Button>
            ) : null}
            {canManageTickets && !e.isFree ? (
              <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 rounded-full border-line bg-card text-sm">
                <Link href={`/gatherings/events/tiers?event=${encodeURIComponent(e.eventId)}`}>
                  <Ticket className="size-3.5" /> Tiers
                </Link>
              </Button>
            ) : null}
            {canEditEvent && !e.archivedAt ? (
              <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 rounded-full border-line bg-card text-sm">
                <Link href={`/gatherings/events/${e.eventId}/edit`}>
                  <PencilLine className="size-3.5" /> Edit
                </Link>
              </Button>
            ) : null}
            {e.isFree ? <Tag tone="moss">Free entry</Tag> : <Tag tone="gold">{e.price ? `${e.price} / seat` : "Ticketed"}</Tag>}
          </div>} overview={<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Registered" value={stats.data.registered} tone="brand" icon={<Users className="size-4" />} />
        <StatCard label="Attended" value={stats.data.attended} tone="moss" />
        <StatCard label="Walk-ins" value={stats.data.walkIns} tone="gold" />
        <StatCard label="No-shows" value={stats.data.noShows} tone="sky" deltaLabel="to follow up" />
      </div>}>
      <Tabs defaultValue="registrations">
        <TabsList className="h-9 rounded-full border border-line bg-card p-0.5">
          {canSeeRegistrations ? (
            <TabsTrigger value="registrations" className="rounded-full px-3.5 text-sm data-[state=active]:bg-ink data-[state=active]:text-paper">
              Registrations
            </TabsTrigger>
          ) : null}
          {canSeeAttendance ? (
            <TabsTrigger value="attendance" className="rounded-full px-3.5 text-sm data-[state=active]:bg-ink data-[state=active]:text-paper">
              Attendance
            </TabsTrigger>
          ) : null}
          {!e.isFree ? (
            <TabsTrigger value="tiers" className="rounded-full px-3.5 text-sm data-[state=active]:bg-ink data-[state=active]:text-paper">
              Ticket tiers
            </TabsTrigger>
          ) : null}
        </TabsList>

        {canSeeRegistrations ? (
          <TabsContent value="registrations" className="mt-4">
            <SectionCard eyebrow="Who's coming" title={`${registrations.data?.length ?? 0} ${collectionLabel(registrations.data?.length ?? 0, "registrations")}`} bodyClassName="p-0">
              {registrations.isLoading ? (
                <div className="space-y-2 p-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
              ) : registrations.data?.length ? (
                <div className="divide-y divide-line/70">
                  {registrations.data.map((reg) => (
                    <div key={reg.registrationId} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2 px-5 py-3 text-sm sm:flex sm:items-center">
                      <PersonAvatar name={reg.memberName ?? "Guest"} size="xs" />
                      <span className="min-w-0 flex-1 break-words font-medium [overflow-wrap:anywhere]">
                        {reg.memberName ?? reg.memberId.slice(0, 10)}
                      </span>
                      <div className="col-start-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 sm:max-w-[60%] sm:justify-end">
                      {reg.tierName ? <Tag tone="neutral" className="max-w-full whitespace-normal"><span className="min-w-0 [overflow-wrap:anywhere]">{reg.tierName}</span></Tag> : null}
                      <span className="num text-xs text-ink-faint">×{reg.quantity}</span>
                      <Tag tone={reg.paymentStatus === "paid" || reg.paymentStatus === "success" ? "moss" : reg.paymentStatus === "pending" ? "gold" : "rose"}>
                        {formatStatusLabel(reg.paymentStatus)}
                      </Tag>
                      <Tag tone={reg.checkedIn ? "moss" : "neutral"} dot>{reg.checkedIn ? "In" : "Awaiting"}</Tag>
                      {reg.ticketCode ? <span className="hidden min-w-0 break-all font-mono text-xs text-ink-faint sm:block">{reg.ticketCode}</span> : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-5 py-8 text-center text-sm text-ink-faint">No registrations yet.</p>
              )}
            </SectionCard>
          </TabsContent>
        ) : null}

        {canSeeAttendance ? (
          <TabsContent value="attendance" className="mt-4">
            <AttendanceWorkspace name={e.title} scope="Event" peopleValue="named" headcountValue="reported" canSeeHeadcount={true}>
        <TabsContent value="named" className="mt-4">
            <SectionCard eyebrow="In the room" title={`${attendance.data?.length ?? 0} ${collectionLabel(attendance.data?.length ?? 0, "check-ins")}`} bodyClassName="p-0">
              {attendance.data?.length ? (
                <div className="divide-y divide-line/70">
                  {attendance.data.map((record) => (
                    <div key={record.attendanceId} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2 px-5 py-3 text-sm sm:flex sm:items-center">
                      <ScanLine className="mt-0.5 size-3.5 shrink-0 text-ink-faint sm:mt-0" />
                      <span className="min-w-0 flex-1 break-words font-medium [overflow-wrap:anywhere]">
                        {record.memberName ?? record.visitorName ?? "Guest"}
                        {!record.memberId && record.visitorName ? <span className="ml-1.5 text-xs text-gold">walk-in</span> : null}
                      </span>
                      <div className="col-start-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 sm:shrink-0 sm:justify-end">
                        <Tag tone="neutral">{attendanceCategoryLabel(record.category) ?? "Not available"}</Tag>
                        <span className="num text-xs text-ink-faint">
                          {formatRecordDateTime(record.checkInAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-5 py-8 text-center text-sm text-ink-faint">The doors haven&apos;t opened for this one yet.</p>
              )}
            </SectionCard>
              </TabsContent>

              <TabsContent value="reported" className="mt-4">
                <GeneralAttendancePanel
                  context={{
                    type: "event",
                    id: e.eventId,
                    name: e.title,
                    branchId: e.branchId,
                    active: !e.archivedAt,
                  }}
                />
              </TabsContent>
            </AttendanceWorkspace>
          </TabsContent>
        ) : null}

        {!e.isFree ? (
          <TabsContent value="tiers" className="mt-4 grid gap-3 sm:grid-cols-3">
            {tiers.data?.length ? (
              tiers.data.map((tier) => (
                <div key={tier.id} className="paper-card rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{tier.name}</p>
                    <Tag tone="gold">{tier.price}</Tag>
                  </div>
                  {tier.description ? <p className="mt-1 line-clamp-2 text-xs text-ink-soft">{tier.description}</p> : null}
                  <p className="num mt-3 text-sm text-ink-faint">
                    capacity {tier.capacity ?? "open"}
                  </p>
                </div>
              ))
            ) : (
              <p className="col-span-full rounded-xl border border-dashed border-line py-8 text-center text-sm text-ink-faint">
                No tiers yet. Manage them on the legacy tiers board.
              </p>
            )}
          </TabsContent>
        ) : null}
      </Tabs>
      </GatheringWorkspace>
    </div>
  );
}
