"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, TrendingUp, Users } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/paper/section";
import { StatCard } from "@/components/paper/stat";
import { EmptyState, FilterChip } from "@/components/paper/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BarSeries } from "@/components/paper/charts";
import { GeneralAttendanceReportSummary } from "@/components/attendance/general-attendance-summary";
import { ExportDropdown } from "@/components/shared/export-dropdown";
import type { ExportColumn } from "@/lib/export-utils";
import { number } from "@/lib/paper/format";
import { usePermissions } from "@/hooks/use-permissions";
import { useBranchesList } from "@/hooks/use-branches";
import {
  useAttendanceSummary,
  useAttendanceTrends,
  useAttendanceServices,
} from "@/hooks/use-attendance";
import { periodLabel } from "@/hooks/use-analytics";

const iso = (d: Date) => d.toISOString().slice(0, 10);

function periodDates(key: string): { startDate?: string; endDate?: string } {
  const now = new Date();
  if (key === "This month") return { startDate: iso(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: iso(now) };
  if (key === "Last 30 days") return { startDate: iso(new Date(now.getTime() - 30 * 86_400_000)), endDate: iso(now) };
  if (key === "This quarter") {
    const q = Math.floor(now.getMonth() / 3) * 3;
    return { startDate: iso(new Date(now.getFullYear(), q, 1)), endDate: iso(now) };
  }
  if (key === "Year to date") return { startDate: `${now.getFullYear()}-01-01`, endDate: iso(now) };
  return {};
}

const PERIODS = ["This month", "Last 30 days", "This quarter", "Year to date", "All time"] as const;

const TREND_EXPORT: ExportColumn[] = [
  { key: "date", label: "Date" },
  { key: "total", label: "Total" },
  { key: "members", label: "Members" },
  { key: "visitors", label: "Visitors" },
];

export default function AttendanceReportsPage() {
  const { can, ready } = usePermissions();
  const canTrends = ready && can("attendance:reports", "read");

  const [period, setPeriod] = React.useState<(typeof PERIODS)[number]>("This quarter");
  const [branchId, setBranchId] = React.useState("");

  const branches = useBranchesList({ limit: 100 });
  const filters = React.useMemo(
    () => ({ ...periodDates(period), branchId: branchId || undefined }),
    [period, branchId],
  );

  const summary = useAttendanceSummary({ startDate: filters.startDate, endDate: filters.endDate, branchId: filters.branchId });
  const trends = useAttendanceTrends({ startDate: filters.startDate, endDate: filters.endDate, branchId: filters.branchId }, { enabled: canTrends });
  const services = useAttendanceServices({ limit: 100 });

  const s = summary.data;
  const trendRows = (trends.data ?? []).map((point) => ({
    label: periodLabel(point.date),
    total: point.total,
    members: point.members,
    visitors: point.visitors,
    date: point.date,
  }));
  const serviceRows = (services.data?.data ?? [])
    .map((svc) => ({ label: svc.name, count: svc.attendanceCount ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/gatherings/attendance" className="flex items-center gap-1.5 hover:text-ink">
            <ArrowLeft className="size-3" /> Gatherings · Attendance
          </Link>
        }
        title="The room, reported."
        description="View named check-ins and reported headcounts side by side."
        actions={canTrends ? (
          <ExportDropdown
            tableId="attendance-trends"
            columns={TREND_EXPORT}
            data={trendRows}
            title="Attendance trend"
            filename="attendance-trend"
            disabled={!trendRows.length}
          />
        ) : null}
      />

      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((item) => (
          <FilterChip key={item} active={period === item} onClick={() => setPeriod(item)}>{item}</FilterChip>
        ))}
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="ml-auto h-8 rounded-full border border-line bg-card px-3 text-sm outline-none" aria-label="Branch filter">
          <option value="">All branches</option>
          {(branches.data?.data ?? []).map((b) => <option key={b.branchId} value={b.branchId}>{b.name}</option>)}
        </select>
      </div>

      {summary.isLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total counted" value={s?.totalCheckIns ?? 0} tone="brand" icon={<TrendingUp className="size-4" />} deltaLabel={period.toLowerCase()} />
          <StatCard label="Named members" value={s?.memberCheckIns ?? 0} tone="moss" />
          <StatCard label="Guests counted" value={s?.visitorCheckIns ?? 0} tone="gold" />
          <StatCard label="Days with a count" value={trendRows.length} tone="sky" deltaLabel="trend points" />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-12">
        <SectionCard className="lg:col-span-7" eyebrow="Trend" title="Headcount over the window">
          {canTrends ? (
            trends.isLoading ? (
              <Skeleton className="h-[230px] rounded-xl" />
            ) : trendRows.length ? (
              <BarSeries
                data={trendRows}
                series={[
                  { key: "total", label: "Total", color: "var(--chart-1)" },
                  { key: "members", label: "Members", color: "var(--chart-2)" },
                  { key: "visitors", label: "Visitors", color: "var(--chart-3)" },
                ]}
                height={230}
                formatter={(v) => number(Number(v))}
              />
            ) : (
              <p className="py-14 text-center text-sm text-ink-faint">No counted days in this window.</p>
            )
          ) : (
            <p className="py-14 text-center text-sm text-ink-faint">The trend series needs the reports grant. The totals above still read.</p>
          )}
          {s?.bySource && Object.keys(s.bySource).length ? (
            <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line/70 pt-3 text-xs text-ink-faint">
              {Object.entries(s.bySource).map(([source, count]) => (
                <span key={source} className="rounded-full bg-muted px-2 py-0.5">{source} · <span className="num">{number(count)}</span></span>
              ))}
            </div>
          ) : null}
        </SectionCard>

        <SectionCard className="lg:col-span-5" eyebrow="Reported counts" title="The raised-hand numbers">
          <GeneralAttendanceReportSummary filters={{ startDate: filters.startDate, endDate: filters.endDate, branchId: filters.branchId }} />
        </SectionCard>

        <SectionCard className="lg:col-span-12" eyebrow="By service" title="Who carries the numbers">
          {serviceRows.length ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {serviceRows.map((svc) => (
                <div key={svc.label} className="flex items-center gap-2.5 rounded-xl border border-line bg-muted/20 px-3 py-2.5">
                  <Users className="size-3.5 shrink-0 text-ink-faint" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{svc.label}</span>
                  <span className="num text-sm font-semibold">{number(svc.count)}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<BarChart3 />} title="No services listed" description="Create a service first. Reports need something to count." action={<Button asChild variant="outline" size="sm" className="rounded-full border-line text-sm"><Link href="/gatherings/attendance/services">Add services</Link></Button>} />
          )}
        </SectionCard>
      </div>

      <p className="text-center text-xs text-ink-faint">
        Named check-ins come from the desk; reported counts come from who was watching the door. The gap between them is worth noticing.
      </p>
    </div>
  );
}
