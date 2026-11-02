"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
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
import { cn } from "@/lib/utils";

function fullDate(value?: string) {
  if (!value) return "—";
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

  if (event.isError || !event.data) {
    return (
      <EmptyState
        icon={<CalendarDays />}
        title="We couldn&apos;t find that gathering"
        description="It may have been archived, or the link is old."
        action={
          <Button asChild variant="outline" size="sm" className="rounded-full border-line text-xs">
            <Link href="/gatherings/events">Back to the calendar</Link>
          </Button>
        }
      />
    );
  }

  const e = event.data;
  const upcoming = new Date(e.startDate).getTime() >= Date.now();
  const filled = e.capacity ? Math.min(100, Math.round(((e.registrationCount ?? 0) / e.capacity) * 100)) : null;

  return (
    <div className="space-y-6">
      <Link href="/gatherings/events" className="inline-flex items-center gap-1.5 text-[11px] text-ink-faint hover:text-ink">
        <ArrowLeft className="size-3" /> Gatherings · Events
      </Link>

      <div className="paper-card overflow-hidden rounded-2xl">
        <div className="h-2 bg-[linear-gradient(90deg,var(--brand),var(--gold)_55%,var(--moss))]" />
        <div className="flex flex-wrap items-start justify-between gap-4 p-5 md:p-6">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Tag tone={upcoming ? "gold" : "moss"} dot>{upcoming ? "Upcoming" : "Past"}</Tag>
              <Tag tone="neutral">{EVENT_TYPE_MAP[e.type] ?? e.type}</Tag>
              {e.branchName ? <Tag tone="sky">{e.branchName}</Tag> : null}
              {e.archivedAt ? <Tag tone="rose">Archived</Tag> : null}
            </div>
            <h1 className="font-display text-[clamp(1.5rem,2.6vw,2.1rem)] font-semibold tracking-tight">{e.title}</h1>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
              <span>{fullDate(e.startDate)}{e.endDate && timeOf(e.endDate) ? ` → ${timeOf(e.endDate)}` : ""}</span>
              <span className="flex items-center gap-1"><MapPin className="size-3" /> {e.location ?? "Location to be announced"}</span>
            </p>
            {e.description ? (
              <p className="max-w-2xl text-xs leading-relaxed text-ink-soft">{e.description}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {canCheckIn ? (
              <Button asChild size="sm" className="h-8 gap-1.5 rounded-full text-xs">
                <Link href="/gatherings/events/check-in">
                  <ScanLine className="size-3.5" /> Check-in desk
                </Link>
              </Button>
            ) : null}
            {canManageTickets && !e.isFree ? (
              <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 rounded-full border-line bg-card text-xs">
                <Link href={`/gatherings/events/tiers?event=${encodeURIComponent(e.eventId)}`}>
                  <Ticket className="size-3.5" /> Tiers
                </Link>
              </Button>
            ) : null}
            {canEditEvent && !e.archivedAt ? (
              <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 rounded-full border-line bg-card text-xs">
                <Link href={`/gatherings/events/${e.eventId}/edit`}>
                  <PencilLine className="size-3.5" /> Edit
                </Link>
              </Button>
            ) : null}
            {e.isFree ? <Tag tone="moss">Free entry</Tag> : <Tag tone="gold">{e.price ? `${e.price} / seat` : "Ticketed"}</Tag>}
          </div>
        </div>
        {e.capacity ? (
          <div className="border-t border-line px-5 py-3 md:px-6">
            <div className="flex items-center justify-between text-[11px] text-ink-soft">
              <span className="num">{e.registrationCount ?? 0} registered of {e.capacity}</span>
              <span className="num">{e.capacity - (e.registrationCount ?? 0)} seats left</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", filled !== null && filled >= 95 ? "bg-rose" : "bg-moss")}
                style={{ width: `${filled ?? 0}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Registered" value={stats.data.registered} tone="brand" icon={<Users className="size-4" />} />
        <StatCard label="Attended" value={stats.data.attended} tone="moss" />
        <StatCard label="Walk-ins" value={stats.data.walkIns} tone="gold" />
        <StatCard label="No-shows" value={stats.data.noShows} tone="sky" deltaLabel="to follow up" />
      </div>

      <Tabs defaultValue="registrations">
        <TabsList className="h-9 rounded-full border border-line bg-card p-0.5">
          {canSeeRegistrations ? (
            <TabsTrigger value="registrations" className="rounded-full px-3.5 text-xs data-[state=active]:bg-ink data-[state=active]:text-paper">
              Registrations
            </TabsTrigger>
          ) : null}
          {canSeeAttendance ? (
            <TabsTrigger value="attendance" className="rounded-full px-3.5 text-xs data-[state=active]:bg-ink data-[state=active]:text-paper">
              Attendance
            </TabsTrigger>
          ) : null}
          {!e.isFree ? (
            <TabsTrigger value="tiers" className="rounded-full px-3.5 text-xs data-[state=active]:bg-ink data-[state=active]:text-paper">
              Ticket tiers
            </TabsTrigger>
          ) : null}
        </TabsList>

        {canSeeRegistrations ? (
          <TabsContent value="registrations" className="mt-4">
            <SectionCard eyebrow="Who's coming" title={`${registrations.data?.length ?? 0} registrations`} bodyClassName="p-0">
              {registrations.isLoading ? (
                <div className="space-y-2 p-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
              ) : registrations.data?.length ? (
                <div className="divide-y divide-line/70">
                  {registrations.data.map((reg) => (
                    <div key={reg.registrationId} className="flex items-center gap-3 px-5 py-3 text-xs">
                      <PersonAvatar name={reg.memberName ?? "Guest"} size="xs" />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {reg.memberName ?? reg.memberId.slice(0, 10)}
                      </span>
                      {reg.tierName ? <Tag tone="neutral">{reg.tierName}</Tag> : null}
                      <span className="num text-[10px] text-ink-faint">×{reg.quantity}</span>
                      <Tag tone={reg.paymentStatus === "paid" || reg.paymentStatus === "success" ? "moss" : reg.paymentStatus === "pending" ? "gold" : "rose"}>
                        {reg.paymentStatus}
                      </Tag>
                      <Tag tone={reg.checkedIn ? "moss" : "neutral"} dot>{reg.checkedIn ? "In" : "Awaiting"}</Tag>
                      {reg.ticketCode ? <span className="hidden font-mono text-[9px] text-ink-faint sm:block">{reg.ticketCode}</span> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-5 py-8 text-center text-xs text-ink-faint">No registrations yet.</p>
              )}
            </SectionCard>
          </TabsContent>
        ) : null}

        {canSeeAttendance ? (
          <TabsContent value="attendance" className="mt-4">
            <Tabs defaultValue="named">
              <TabsList className="h-9 w-fit rounded-full border border-line bg-card p-0.5">
                <TabsTrigger value="named" className="rounded-full px-3.5 text-xs data-[state=active]:bg-ink data-[state=active]:text-paper">
                  Check-ins
                </TabsTrigger>
                <TabsTrigger value="reported" className="rounded-full px-3.5 text-xs data-[state=active]:bg-ink data-[state=active]:text-paper">
                  Reported totals
                </TabsTrigger>
              </TabsList>
              <TabsContent value="named" className="mt-4">
            <SectionCard eyebrow="In the room" title={`${attendance.data?.length ?? 0} check-ins`} bodyClassName="p-0">
              {attendance.data?.length ? (
                <div className="divide-y divide-line/70">
                  {attendance.data.map((record) => (
                    <div key={record.attendanceId} className="flex items-center gap-3 px-5 py-3 text-xs">
                      <ScanLine className="size-3.5 shrink-0 text-ink-faint" />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {record.memberName ?? record.visitorName ?? "Guest"}
                        {!record.memberId && record.visitorName ? <span className="ml-1.5 text-[9px] text-gold">walk-in</span> : null}
                      </span>
                      <Tag tone="neutral">{attendanceCategoryLabel(record.category) ?? "—"}</Tag>
                      <span className="num w-40 shrink-0 text-right text-[10px] text-ink-faint">
                        {new Date(record.checkInAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-5 py-8 text-center text-xs text-ink-faint">The doors haven&apos;t opened for this one yet.</p>
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
            </Tabs>
          </TabsContent>
        ) : null}

        {!e.isFree ? (
          <TabsContent value="tiers" className="mt-4 grid gap-3 sm:grid-cols-3">
            {tiers.data?.length ? (
              tiers.data.map((tier) => (
                <div key={tier.id} className="paper-card rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold">{tier.name}</p>
                    <Tag tone="gold">{tier.price}</Tag>
                  </div>
                  {tier.description ? <p className="mt-1 line-clamp-2 text-[10px] text-ink-soft">{tier.description}</p> : null}
                  <p className="num mt-3 text-[11px] text-ink-faint">
                    capacity {tier.capacity ?? "open"}
                  </p>
                </div>
              ))
            ) : (
              <p className="col-span-full rounded-xl border border-dashed border-line py-8 text-center text-xs text-ink-faint">
                No tiers yet — manage them on the legacy tiers board.
              </p>
            )}
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
