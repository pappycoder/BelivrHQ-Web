"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarCheck,
  ScanLine,
  TrendingUp,
  UserRoundPlus,
  Users,
} from "lucide-react";
import { PageHeader, SectionCard } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import { EmptyState, PersonAvatar } from "@/components/paper/primitives";
import { StaggerGroup, StaggerItem } from "@/components/paper/motion/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendChart } from "@/components/paper/charts";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useAttendanceSummary,
  useAttendanceTrends,
  useAttendanceRecords,
  useAttendanceServices,
  attendanceCategoryLabel,
} from "@/hooks/use-attendance";
import { number } from "@/lib/paper/format";

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function stamp(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function AttendanceDashboardPage() {
  const { can, canAny, ready } = usePermissions();
  const canDash = ready && can("attendance:dashboard", "read");
  const canSeeRecords = ready && canAny("attendance:records:read");

  const window = React.useMemo(() => ({ startDate: isoDaysAgo(30), endDate: new Date().toISOString().slice(0, 10) }), []);
  const summary = useAttendanceSummary(window, { enabled: canDash });
  const trends = useAttendanceTrends({ days: 30 }, { enabled: canDash });
  const recent = useAttendanceRecords({ limit: 8 });
  const services = useAttendanceServices({ limit: 6, isActive: true, archived: false, page: 1 }, { enabled: canDash });

  const data = summary.data;
  const avg = trends.data?.length ? Math.round((trends.data.reduce((sum, p) => sum + p.total, 0) / trends.data.length) * 10) / 10 : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gatherings · Attendance"
        title="Who gathers, week by week."
        description="Track attendance over time and notice when someone may need a check-in."
        actions={
          <>
            <Button asChild variant="outline" className="h-9 gap-1.5 rounded-full border-line bg-card text-sm">
              <Link href="/gatherings/attendance/records">
                <CalendarCheck className="size-3.5" /> Records
              </Link>
            </Button>
            <Button asChild className="h-9 gap-1.5 rounded-full text-sm">
              <Link href="/gatherings/attendance/check-in">
                <ScanLine className="size-3.5" /> Live check-in
              </Link>
            </Button>
          </>
        }
      />

      <StaggerGroup className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StaggerItem><StatCard label="Check-ins · 30 days" value={data?.totalCheckIns ?? 0} tone="brand" icon={<Users className="size-4" />} /></StaggerItem>
        <StaggerItem><StatCard label="Members" value={data?.memberCheckIns ?? 0} tone="moss" /></StaggerItem>
        <StaggerItem><StatCard label="Visitors" value={data?.visitorCheckIns ?? 0} tone="gold" deltaLabel="new faces" /></StaggerItem>
        <StaggerItem><StatCard label="Daily average" value={avg} decimals={1} tone="sky" icon={<TrendingUp className="size-4" />} /></StaggerItem>
      </StaggerGroup>

      {!canDash ? (
        <EmptyState
          icon={<CalendarCheck />}
          title="Attendance is outside your access"
          description="Ask a church admin for the attendance:dashboard grant if you need it."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-12">
          <SectionCard className="lg:col-span-7" eyebrow="Trend" title="Thirty days of doors opening" description="View member and visitor attendance separately, alongside the total headcount.">
            {trends.isLoading || summary.isLoading ? (
              <Skeleton className="h-[220px]" />
            ) : trends.data?.length ? (
              <TrendChart
                data={trends.data.map((point) => ({
                  label: new Date(point.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
                  members: point.members,
                  visitors: point.visitors,
                }))}
                series={[
                  { key: "members", label: "Members", color: "var(--chart-1)" },
                  { key: "visitors", label: "Visitors", color: "var(--chart-3)" },
                ]}
                height={220}
                formatter={(value) => number(Number(value))}
              />
            ) : (
              <EmptyState icon={<TrendingUp />} title="No check-ins in this window" description="The chart fills as the doors open on Sunday." />
            )}
          </SectionCard>

          <SectionCard className="lg:col-span-5" eyebrow="Mix" title="How people arrive" bodyClassName="p-5">
            {data ? (
              <div className="space-y-4">
                <div>
                  <p className="rule-label mb-2">Source</p>
                  {Object.entries(data.bySource ?? {}).length ? (
                    Object.entries(data.bySource).map(([key, value]) => (
                      <div key={key} className="mb-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-ink-soft capitalize">{key.replace(/[_-]/g, " ")}</span>
                          <span className="num font-medium">{value}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-sky" style={{ width: `${Math.min(100, Math.round((value / Math.max(1, data.totalCheckIns)) * 100))}%` }} />
                        </div>
                      </div>
                    ))
                  ) : <p className="text-sm text-ink-faint">No arrivals recorded yet.</p>}
                </div>
                <div>
                  <p className="rule-label mb-2">Age split</p>
                  {Object.entries(data.byCategory ?? {}).length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(data.byCategory).map(([key, value]) => (
                        <Tag key={key} tone={key === "children" ? "gold" : "moss"}>
                          <span className="capitalize">{attendanceCategoryLabel(key) ?? key}</span> · <span className="num">{value}</span>
                        </Tag>
                      ))}
                    </div>
                  ) : <p className="text-sm text-ink-faint">Nothing to split yet.</p>}
                </div>
              </div>
            ) : (
              <Skeleton className="h-40" />
            )}
          </SectionCard>

          {canSeeRecords ? (
            <SectionCard
              className="lg:col-span-7"
              eyebrow="Last in"
              title="Most recent check-ins"
              actions={
                <Button asChild variant="ghost" size="sm" className="h-7 rounded-full text-sm text-ink-faint">
                  <Link href="/gatherings/attendance/records">All records</Link>
                </Button>
              }
              bodyClassName="p-0"
            >
              <div className="divide-y divide-line/70">
                {(recent.data?.data ?? []).map((record) => (
                  <div key={record.attendanceId} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <PersonAvatar name={record.memberName ?? record.visitorName ?? "Guest"} size="xs" />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {record.memberName ?? record.visitorName ?? "Guest"}
                      {!record.memberId && record.visitorName ? <span className="ml-1.5 text-xs text-gold">visitor</span> : null}
                    </span>
                    <span className="hidden min-w-0 max-w-[180px] truncate text-xs text-ink-faint sm:block">
                      {record.serviceName ?? record.eventName ?? "Not available"}
                    </span>
                    <span className="num w-28 shrink-0 text-right text-xs text-ink-faint">{stamp(record.checkInAt)}</span>
                  </div>
                ))}
                {!recent.data?.data?.length ? <p className="px-5 py-8 text-center text-sm text-ink-faint">Nothing recorded yet.</p> : null}
              </div>
            </SectionCard>
          ) : null}

          <SectionCard className="lg:col-span-5" eyebrow="Rhythm" title="Weekly services" bodyClassName="p-0">
            <div className="divide-y divide-line/70">
              {(services.data?.data ?? []).map((service) => (
                <Link
                  key={service.serviceId}
                  href={`/gatherings/attendance/services/${service.serviceId}`}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-ink-faint">
                    <UserRoundPlus className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{service.name}</span>
                    <span className="block text-xs capitalize text-ink-faint">
                      {service.category ?? "mixed"} · {service.startTime ?? "time not set"}
                    </span>
                  </span>
                  <span className="num text-sm text-ink-soft">{service.attendanceCount ?? 0} all-time</span>
                </Link>
              ))}
              {!services.data?.data?.length ? <p className="px-5 py-8 text-center text-sm text-ink-faint">No active services yet.</p> : null}
            </div>
            <div className="border-t border-line px-5 py-2.5">
              <Button asChild variant="ghost" size="sm" className="w-full justify-between rounded-lg text-sm text-brand">
                <Link href="/gatherings/attendance/services">Manage services</Link>
              </Button>
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
