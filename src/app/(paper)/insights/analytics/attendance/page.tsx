"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CalendarCheck, UserRoundPlus } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import { EmptyState, FilterChip } from "@/components/paper/primitives";
import { BarSeries, CHART_COLORS, DonutChart, TrendChart } from "@/components/paper/charts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { number, percent } from "@/lib/paper/format";
import {
  periodLabel,
  useAnalyticsAttendance,
} from "@/hooks/use-analytics";
import { useBranchesList } from "@/hooks/use-branches";

const PERIODS = [
  { label: "90 days", days: 90, groupBy: "week" as const },
  { label: "12 months", days: 365, groupBy: "month" as const },
  { label: "Year to date", ytd: true, groupBy: "month" as const },
  { label: "All time", groupBy: "month" as const },
];

export default function AttendanceAnalyticsPage() {
  const [period, setPeriod] = React.useState(1);
  const [branchId, setBranchId] = React.useState("");

  const branches = useBranchesList({ limit: 100 });
  const params = React.useMemo(() => {
    const p = PERIODS[period];
    const out: { startDate?: string; groupBy?: "day" | "week" | "month"; branchId?: string } = { groupBy: p.groupBy };
    if ("days" in p && p.days) out.startDate = new Date(Date.now() - p.days * 86_400_000).toISOString().slice(0, 10);
    if ("ytd" in p && p.ytd) out.startDate = `${new Date().getFullYear()}-01-01`;
    if (branchId) out.branchId = branchId;
    return out;
  }, [period, branchId]);

  const attendance = useAnalyticsAttendance(params);
  const a = attendance.data;
  const trendRows = (a?.trend ?? []).map((point) => ({
    label: periodLabel(point.date),
    members: point.members,
    visitors: point.visitors,
    total: point.total,
  }));
  const serviceRows = (a?.byService ?? []).map((service) => ({
    label: service.serviceName,
    total: service.total,
    visitors: service.visitors,
  }));
  const branchRows = (a?.byBranch ?? []).map((branch) => ({ label: branch.branchName, total: branch.total }));
  const sourceData = Object.entries(a?.bySource ?? {}).map(([name, value], index) => ({
    name,
    value,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));
  const guestTotal = (a?.firstTimeVisitors ?? 0) + (a?.returningVisitors ?? 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/insights/analytics" className="flex items-center gap-1.5 hover:text-ink">
            <ArrowLeft className="size-3" /> Insights · Analytics
          </Link>
        }
        title="Attendance, in depth."
        description="Who gathers, when, and how guests become family."
        actions={
          <Button asChild variant="outline" className="h-9 gap-1.5 rounded-full border-line bg-card text-sm">
            <Link href="/gatherings/attendance">
              <UserRoundPlus className="size-3.5" /> Attendance workspace
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((item, index) => (
          <FilterChip key={item.label} active={period === index} onClick={() => setPeriod(index)}>{item.label}</FilterChip>
        ))}
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="ml-auto h-8 rounded-full border border-line bg-card px-3 text-sm outline-none" aria-label="Branch filter">
          <option value="">All branches</option>
          {(branches.data?.data ?? []).map((branch) => <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>)}
        </select>
      </div>

      {attendance.isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      ) : attendance.isError || !a ? (
        <EmptyState icon={<CalendarCheck />} title="Couldn&apos;t load the attendance analysis" action={<Button size="sm" variant="outline" className="rounded-full border-line text-sm" onClick={() => attendance.refetch()}>Retry</Button>} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Total counted" value={a.total} tone="brand" icon={<CalendarCheck className="size-4" />} deltaLabel={`${number(a.members)} members`} />
            <StatCard label="Guest visits" value={a.visitors} tone="gold" deltaLabel={`${number(a.firstTimeVisitors)} first-timers`} />
            <StatCard label="Returning guests" value={a.returningVisitors} tone="sky" deltaLabel={guestTotal ? `${percent(a.returningVisitors, guestTotal)}% of guest visits` : "Not available"} />
            <StatCard label="Services logged" value={a.byService?.length ?? 0} tone="moss" />
          </div>

          <div className="grid gap-4 lg:grid-cols-12">
            <SectionCard className="lg:col-span-7" eyebrow="Trend" title="Total in the room">
              {trendRows.length ? (
                <TrendChart
                  data={trendRows}
                  series={[
                    { key: "members", label: "Members", color: "var(--chart-2)" },
                    { key: "visitors", label: "Guests", color: "var(--chart-1)" },
                  ]}
                  height={220}
                  formatter={(v) => number(Number(v))}
                />
              ) : (
                <p className="py-12 text-center text-sm text-ink-faint">Nothing counted in this period.</p>
              )}
            </SectionCard>

            <SectionCard className="lg:col-span-5" eyebrow="Sources" title="How people were counted">
              {sourceData.length ? (
                <DonutChart data={sourceData} centerValue={number(a.total)} centerLabel="counted" height={170} formatter={(v) => `${number(Number(v))} visits`} />
              ) : (
                <p className="py-12 text-center text-sm text-ink-faint">Sources appear with the first check-ins.</p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                {sourceData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                    <span className="size-1.5 rounded-full" style={{ background: entry.color }} />
                    <span className="truncate text-ink-soft">{entry.name}</span>
                    <span className="num ml-auto">{number(entry.value)}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard className="lg:col-span-7" eyebrow="Per service" title="Where the people are">
              {serviceRows.length ? (
                <BarSeries data={serviceRows} series={[{ key: "total", label: "Attendance", color: "var(--chart-1)" }]} horizontal height={200} formatter={(v) => number(Number(v))} />
              ) : (
                <p className="py-12 text-center text-sm text-ink-faint">No services in this period.</p>
              )}
            </SectionCard>

            <SectionCard className="lg:col-span-5" eyebrow="Branches" title="Gathering by location">
              {branchRows.length ? (
                <div className="space-y-3">
                  {branchRows.map((branch) => (
                    <div key={branch.label}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate font-medium">{branch.label}</span>
                        <span className="num text-ink-soft">{number(branch.total)}</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-moss" style={{ width: `${percent(branch.total, a.total)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-12 text-center text-sm text-ink-faint">Branch splits arrive once services are tagged.</p>
              )}
              <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-faint">
                <Tag tone="gold" dot>Guests</Tag> follow them up at <Link href="/people/visitors" className="text-brand hover:underline">the visitor board</Link>
              </p>
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}
