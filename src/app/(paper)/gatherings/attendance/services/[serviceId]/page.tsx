"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  HandCoins,
  UserCheck,
  Users,
} from "lucide-react";
import { SectionCard } from "@/components/paper/section";
import { Tag } from "@/components/paper/stat";
import {
  DataList,
  EmptyState,
  FieldRow,
  PersonAvatar,
} from "@/components/paper/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TabsContent } from "@/components/ui/tabs";
import { AttendanceWorkspace } from "@/components/attendance/attendance-workspace";
import { GeneralAttendancePanel } from "@/components/attendance/general-attendance-panel";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useService,
  useServiceAttendance,
  useCanViewGeneralAttendance,
  SERVICE_CATEGORIES,
  attendanceCategoryLabel,
  type AttendanceRecord,
} from "@/hooks/use-attendance";
import { useGivingTransactionsAll } from "@/hooks/use-giving";
import { formatNaira } from "@/hooks/use-analytics";
import { formatDate } from "@/hooks/use-media";
import { number, timeLabel } from "@/lib/paper/format";
import { SCHEDULE_RECURRENCE_LABELS } from "@/lib/schedule-occurrence";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Date-only values are local calendar days, not instants. */
const formatDay = (value: string) => formatDate(`${value}T00:00:00`);

export default function ServiceDetailPage({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  const { serviceId } = React.use(params);
  const { can, ready } = usePermissions();

  const service = useService(serviceId);
  const named = useServiceAttendance(serviceId);
  const canGiving = ready && can("giving:records", "read");
  const canSeeReported = useCanViewGeneralAttendance("service");
  const gifts = useGivingTransactionsAll({ serviceId });

  if (service.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  if (service.isError || !service.data) {
    return (
      <EmptyState
        icon={<CalendarDays />}
        title="We couldn&apos;t find this service"
        description="It may have been retired, or the link is old."
        action={<Button asChild variant="outline" size="sm" className="rounded-full border-line text-xs"><Link href="/gatherings/attendance/services">Back to services</Link></Button>}
      />
    );
  }

  const s = service.data;
  const namedRows: AttendanceRecord[] = named.data?.data ?? [];
  const giftRows = gifts.data ?? [];
  const giftTotal = giftRows.reduce((sum, t) => sum + t.amount, 0);
  const byCategory = giftRows.reduce<Map<string, number>>((map, t) => {
    map.set(t.categoryName, (map.get(t.categoryName) ?? 0) + t.amount);
    return map;
  }, new Map());
  const topCategories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <div className="space-y-6">
      <Link href="/gatherings/attendance/services" className="inline-flex items-center gap-1.5 text-[11px] text-ink-faint hover:text-ink">
        <ArrowLeft className="size-3" /> Gatherings · Attendance · Services
      </Link>

      <div className="paper-card rounded-2xl p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              {s.category ? <Tag tone={s.category === "children" ? "gold" : "moss"}>{SERVICE_CATEGORIES.find((c) => c.value === s.category)?.label ?? s.category}</Tag> : null}
              {s.recurrence && s.recurrence !== "weekly" ? <Tag tone="sky">{SCHEDULE_RECURRENCE_LABELS[s.recurrence]}</Tag> : null}
              {!s.isActive ? <Tag tone="neutral">Paused</Tag> : null}
              {s.archivedAt ? <Tag tone="rose">Archived</Tag> : null}
            </div>
            <h1 className="font-display text-[clamp(1.4rem,2.4vw,2rem)] font-semibold tracking-tight">{s.name}</h1>
            <p className="text-[11px] text-ink-soft">
              {s.recurrence === "one_time" && s.startsOn
                ? formatDay(s.startsOn)
                : s.recurrence === "multi_day" && s.startsOn && s.endsOn
                  ? `${formatDay(s.startsOn)} – ${formatDay(s.endsOn)}`
                  : s.dayOfWeek != null ? DAY_NAMES[s.dayOfWeek] : "Any day"}
              {s.startTime ? <span className="num"> · {timeLabel(s.startTime)}{s.endTime ? ` – ${timeLabel(s.endTime)}` : ""}</span> : null}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-3">
            <div className="rounded-xl bg-muted/40 px-4 py-3">
              <p className="num font-display text-xl font-semibold">{number(s.attendanceCount ?? 0)}</p>
              <p className="text-[9px] uppercase tracking-wider text-ink-faint">all-time check-ins</p>
            </div>
            <div className="rounded-xl bg-muted/40 px-4 py-3">
              <p className="num font-display text-xl font-semibold">{number(namedRows.length)}</p>
              <p className="text-[9px] uppercase tracking-wider text-ink-faint">recent named</p>
            </div>
            {canGiving ? (
              <div className="rounded-xl bg-muted/40 px-4 py-3">
                <p className="num font-display text-xl font-semibold">{giftRows.length ? formatNaira(giftTotal) : "Not available"}</p>
                <p className="text-[9px] uppercase tracking-wider text-ink-faint">gifts tagged</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <AttendanceWorkspace name={s.name} scope="Service" peopleValue="named" headcountValue="reported" canSeeHeadcount={canSeeReported}>
        <TabsContent value="named" className={canSeeReported ? "mt-4" : undefined}>
        <SectionCard
          eyebrow="Named check-ins"
          title="People counted by name"
          actions={<Link href={`/gatherings/attendance/check-in?service=${encodeURIComponent(s.serviceId)}`} className="flex items-center gap-1 text-[11px] text-brand hover:underline"><UserCheck className="size-3" /> Open the desk</Link>}
          bodyClassName="p-0"
        >
          {named.isLoading ? (
            <div className="space-y-2 p-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}</div>
          ) : namedRows.length === 0 ? (
            <p className="px-5 py-10 text-center text-[11px] text-ink-faint">No named check-ins yet. A headcount can be recorded independently.</p>
          ) : (
            <div className="divide-y divide-line/70">
              {namedRows.slice(0, 12).map((record) => (
                <div key={record.attendanceId} className="flex items-center gap-3 px-5 py-2.5 text-[11px]">
                  <PersonAvatar name={record.memberName ?? record.visitorName ?? "Someone"} size="xs" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{record.memberName ?? record.visitorName ?? "Unnamed"}</span>
                    <span className="block text-[10px] text-ink-faint">{formatDate(record.checkInAt)} · {record.source}</span>
                  </span>
                  {record.visitorId ? <Tag tone="gold">guest</Tag> : <Tag tone="moss">member</Tag>}
                  <span className="num hidden text-[10px] text-ink-faint sm:block">{(attendanceCategoryLabel(record.category) ?? "Not available").toLowerCase()}</span>
                </div>
              ))}
              {namedRows.length > 12 ? (
                <p className="border-t border-line px-5 py-2 text-[10px] text-ink-faint">+ {number(namedRows.length - 12)} more on the records page.</p>
              ) : null}
            </div>
          )}
        </SectionCard>
        </TabsContent>

        {canSeeReported ? (
          <TabsContent value="reported" className="mt-4">
            <GeneralAttendancePanel service={s} />
          </TabsContent>
        ) : null}
        </AttendanceWorkspace>

        <aside className="space-y-4">
          <SectionCard eyebrow="This service" title="The schedule">
            <DataList>
              <FieldRow label="Category">{SERVICE_CATEGORIES.find((c) => c.value === s.category)?.label ?? "Uncategorised"}</FieldRow>
              <FieldRow label="Repeats">{SCHEDULE_RECURRENCE_LABELS[s.recurrence ?? "weekly"]}</FieldRow>
              <FieldRow label="Day">{s.recurrence === "weekly" || !s.recurrence ? (s.dayOfWeek != null ? DAY_NAMES[s.dayOfWeek] : "Not available") : "Not available"}</FieldRow>
              {s.startsOn || s.endsOn ? (
                <FieldRow label="Window">{s.startsOn ? formatDay(s.startsOn) : "Always"} → {s.endsOn ? formatDay(s.endsOn) : "Ongoing"}</FieldRow>
              ) : null}
              <FieldRow label="Start">{s.startTime ? timeLabel(s.startTime) : "Not available"}</FieldRow>
              <FieldRow label="End">{s.endTime ? timeLabel(s.endTime) : "Not available"}</FieldRow>
              <FieldRow label="Branch">{s.branchId ? "Branch-tied" : "Church-wide"}</FieldRow>
              <FieldRow label="Added">{formatDate(s.createdAt)}</FieldRow>
            </DataList>
          </SectionCard>

          {canGiving ? (
            <SectionCard eyebrow="Gifts tagged here" title="What this service raised" actions={<HandCoins className="size-3.5 text-gold" />}>
              {gifts.isLoading ? (
                <Skeleton className="h-16 rounded-xl" />
              ) : giftRows.length === 0 ? (
                <p className="text-[11px] text-ink-faint">No gifts are tagged to this service yet.</p>
              ) : (
                <>
                  <p className="num font-display text-lg font-semibold">{formatNaira(giftTotal)}</p>
                  <p className="text-[10px] text-ink-faint">{number(giftRows.length)} gifts · full ledger at <Link href="/giving/donations" className="text-brand hover:underline">Donations</Link></p>
                  <div className="mt-3 space-y-2">
                    {topCategories.map(([name, value]) => (
                      <div key={name}>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="truncate">{name}</span>
                          <span className="num text-ink-soft">{formatNaira(value)}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-gold" style={{ width: `${giftTotal ? Math.round((value / giftTotal) * 100) : 0}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </SectionCard>
          ) : null}

          <div className="rounded-2xl border border-dashed border-line p-5 text-[10px] leading-relaxed text-ink-faint">
            <Users className="mb-1 size-3.5" />
            Headcounts and named check-ins are recorded independently. One counts the room, the other remembers the names. Both are honest;
            neither replaces the other.
          </div>
        </aside>
      </div>
    </div>
  );
}
