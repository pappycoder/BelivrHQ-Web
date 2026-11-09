"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChartBig,
  CalendarCheck,
  HandCoins,
  Inbox,
  Users,
} from "lucide-react";
import { PageHeader, SectionCard } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import { EmptyState, FilterChip } from "@/components/paper/primitives";
import { StaggerGroup, StaggerItem } from "@/components/paper/motion/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CHART_COLORS, DonutChart, TrendChart } from "@/components/paper/charts";
import { number, percent } from "@/lib/paper/format";
import {
  formatNaira,
  periodLabel,
  useAnalyticsAttendance,
  useAnalyticsDashboard,
  useAnalyticsGiving,
  useAnalyticsMembers,
} from "@/hooks/use-analytics";
import { useBranchesList } from "@/hooks/use-branches";

const PERIODS = [
  { label: "90 days", days: 90, groupBy: "week" as const },
  { label: "12 months", days: 365, groupBy: "month" as const },
  { label: "Year to date", ytd: true, groupBy: "month" as const },
  { label: "All time", groupBy: "month" as const },
];

export default function AnalyticsOverviewPage() {
  const [period, setPeriod] = React.useState(1);
  const [branchId, setBranchId] = React.useState("");

  const branches = useBranchesList({ limit: 100 });
  const params = React.useMemo(() => {
    const p = PERIODS[period];
    const out: { startDate?: string; groupBy?: "day" | "week" | "month"; branchId?: string } = {
      groupBy: p.groupBy,
    };
    if ("days" in p && p.days) out.startDate = new Date(Date.now() - p.days * 86_400_000).toISOString().slice(0, 10);
    if ("ytd" in p && p.ytd) out.startDate = `${new Date().getFullYear()}-01-01`;
    if (branchId) out.branchId = branchId;
    return out;
  }, [period, branchId]);

  const dashboard = useAnalyticsDashboard(params);
  const giving = useAnalyticsGiving(params);
  const attendance = useAnalyticsAttendance(params);
  const members = useAnalyticsMembers({ branchId: params.branchId });

  const d = dashboard.data;
  const givingRows = (giving.data?.trend ?? []).map((point) => ({
    label: periodLabel(point.date),
    total: point.total,
  }));
  const attendanceRows = (attendance.data?.trend ?? []).map((point) => ({
    label: periodLabel(point.date),
    members: point.members,
    visitors: point.visitors,
  }));
  const growthRows = (members.data?.growth ?? []).map((point) => ({
    label: periodLabel(point.date),
    members: point.total,
  }));
  const engagementData = Object.entries(d?.engagementDistribution ?? {}).map(([name, value], index) => ({
    name,
    value,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insights · Analytics"
        title="The story the numbers tell."
        description="Review your church&apos;s activity and trends in one place."
        actions={
          <Button variant="outline" className="h-9 gap-1.5 rounded-full border-line bg-card text-xs" asChild>
            <Link href="/insights/reports">
              <BarChartBig className="size-3.5" /> Report studio
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((item, index) => (
          <FilterChip key={item.label} active={period === index} onClick={() => setPeriod(index)}>{item.label}</FilterChip>
        ))}
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="ml-auto h-8 rounded-full border border-line bg-card px-3 text-[11px] outline-none" aria-label="Branch filter">
          <option value="">All branches</option>
          {(branches.data?.data ?? []).map((branch) => <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>)}
        </select>
      </div>

      {dashboard.isLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      ) : dashboard.isError || !d ? (
        <EmptyState icon={<BarChartBig />} title="Couldn&apos;t load the overview" action={<Button size="sm" variant="outline" className="rounded-full border-line text-xs" onClick={() => dashboard.refetch()}>Retry</Button>} />
      ) : (
        <>
          <StaggerGroup className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StaggerItem><StatCard label="Giving" value={giving.data?.total ?? d.totalGiving} prefix="₦" tone="brand" icon={<HandCoins className="size-4" />} deltaLabel="in this period" /></StaggerItem>
            <StaggerItem><StatCard label="Attendance" value={attendance.data?.total ?? d.totalAttendance} tone="moss" icon={<CalendarCheck className="size-4" />} deltaLabel="people counted" /></StaggerItem>
            <StaggerItem><StatCard label="Members" value={d.totalMembers} tone="sky" icon={<Users className="size-4" />} deltaLabel={`${number(d.activeMembers)} active`} /></StaggerItem>
            <StaggerItem><StatCard label="New members" value={d.newMembers} tone="gold" deltaLabel="joined recently" /></StaggerItem>
          </StaggerGroup>

          <div className="grid gap-4 lg:grid-cols-12">
            <SectionCard className="lg:col-span-7" eyebrow="Generosity" title="Giving by period">
              {givingRows.length ? (
                <TrendChart data={givingRows} series={[{ key: "total", label: "Giving", color: "var(--chart-1)" }]} height={220} formatter={(v) => formatNaira(Number(v))} />
              ) : (
                <p className="py-10 text-center text-[11px] text-ink-faint">No giving recorded in this period.</p>
              )}
            </SectionCard>

            <SectionCard className="lg:col-span-5" eyebrow="Engagement" title="Where people are plugged in">
              {engagementData.length ? (
                <DonutChart data={engagementData} centerValue={number(d.activeMembers)} centerLabel="active" height={180} formatter={(v) => `${v} people`} />
              ) : (
                <p className="py-10 text-center text-[11px] text-ink-faint">Engagement data needs a little more history.</p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                {engagementData.slice(0, 6).map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-[10px]">
                    <span className="size-1.5 rounded-full" style={{ background: entry.color }} />
                    <span className="truncate text-ink-soft">{entry.name}</span>
                    <span className="num ml-auto text-ink-faint">{number(entry.value)}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard className="lg:col-span-7" eyebrow="Gathering" title="In the room: members and guests">
              {attendanceRows.length ? (
                <TrendChart
                  data={attendanceRows}
                  series={[
                    { key: "members", label: "Members", color: "var(--chart-2)" },
                    { key: "visitors", label: "Guests", color: "var(--chart-1)" },
                  ]}
                  height={200}
                  formatter={(v) => number(Number(v))}
                />
              ) : (
                <p className="py-10 text-center text-[11px] text-ink-faint">No attendance counted in this period.</p>
              )}
            </SectionCard>

            <SectionCard className="lg:col-span-5" eyebrow="Becoming" title="Membership growth">
              {growthRows.length ? (
                <TrendChart data={growthRows} series={[{ key: "members", label: "Members", color: "var(--chart-2)" }]} height={200} formatter={(v) => number(Number(v))} />
              ) : (
                <p className="py-10 text-center text-[11px] text-ink-faint">Growth appears after the first records.</p>
              )}
            </SectionCard>
          </div>

          <StaggerGroup className="grid gap-3 md:grid-cols-3">
            {[
              { title: "Giving", line: `${formatNaira(giving.data?.total ?? 0)} in this period, across ${number(giving.data?.count ?? 0)} gifts.`, tone: "brand" as const, href: "/insights/analytics/giving", cta: "Open giving analysis" },
              { title: "Attendance", line: `${number(attendance.data?.visitors ?? 0)} guest visits, ${number(attendance.data?.firstTimeVisitors ?? 0)} of them first-timers.`, tone: "sky" as const, href: "/insights/analytics/attendance", cta: "Open attendance analysis" },
              { title: "Members", line: `${number(d.totalMembers)} on the roll, ${percent(d.activeMembers, d.totalMembers)}% active.`, tone: "moss" as const, href: "/insights/analytics/members", cta: "Open membership analysis" },
            ].map((insight) => (
              <StaggerItem key={insight.title}>
                <Link href={insight.href} className="paper-card lift flex h-full flex-col rounded-2xl p-5">
                  <Tag tone={insight.tone} dot>{insight.title}</Tag>
                  <p className="mt-3 flex-1 font-display text-sm leading-snug">{insight.line}</p>
                  <span className="mt-3 flex items-center gap-1 text-[11px] text-brand">{insight.cta} <ArrowRight className="size-3" /></span>
                </Link>
              </StaggerItem>
            ))}
          </StaggerGroup>

          <div className="grid grid-cols-2 gap-3 text-[11px] lg:grid-cols-4">
            <div className="paper-card flex items-center gap-3 rounded-2xl px-4 py-3">
              <Inbox className="size-4 text-gold" />
              <span><span className="num font-display text-sm font-semibold">{number(d.pendingSubmissions)}</span><span className="block text-ink-faint">answers waiting review</span></span>
            </div>
            <div className="paper-card flex items-center gap-3 rounded-2xl px-4 py-3">
              <CalendarCheck className="size-4 text-moss" />
              <span><span className="num font-display text-sm font-semibold">{number(d.upcomingEvents)}</span><span className="block text-ink-faint">services ahead</span></span>
            </div>
            <div className="paper-card flex items-center gap-3 rounded-2xl px-4 py-3">
              <Users className="size-4 text-sky" />
              <span><span className="num font-display text-sm font-semibold">{number(d.totalBranches)}</span><span className="block text-ink-faint">branches counting</span></span>
            </div>
            <Link href="/people/pastoral/risk" className="paper-card lift flex items-center gap-3 rounded-2xl px-4 py-3 hover:border-rose/40">
              <span className="text-rose">•</span>
              <span><span className="num font-display text-sm font-semibold">{number(d.atRiskCount)}</span><span className="block text-ink-faint">with open care needs</span></span>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-line p-4 text-[11px] text-ink-soft">
            Numbers describe the field; they don&apos;t replace the shepherding.{" "}
            <Link href="/insights/reports" className="text-brand underline">Compose a board-ready report</Link>
          </div>
        </>
      )}
    </div>
  );
}
