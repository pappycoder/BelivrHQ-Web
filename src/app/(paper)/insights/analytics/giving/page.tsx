"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, HandCoins, RefreshCcw } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import { EmptyState, FilterChip, PersonAvatar } from "@/components/paper/primitives";
import { BarSeries, CHART_COLORS, DonutChart, TrendChart } from "@/components/paper/charts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { number, percent } from "@/lib/paper/format";
import {
  formatNaira,
  periodLabel,
  useAnalyticsGiving,
} from "@/hooks/use-analytics";
import { useBranchesList } from "@/hooks/use-branches";

const PERIODS = [
  { label: "90 days", days: 90, groupBy: "week" as const },
  { label: "12 months", days: 365, groupBy: "month" as const },
  { label: "Year to date", ytd: true, groupBy: "month" as const },
  { label: "All time", groupBy: "month" as const },
];

export default function GivingAnalyticsPage() {
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

  const giving = useAnalyticsGiving(params);
  const g = giving.data;
  const trendRows = (g?.trend ?? []).map((point) => ({ label: periodLabel(point.date), total: point.total }));
  const categoryData = (g?.byCategory ?? []).map((entry, index) => ({
    name: entry.categoryName,
    value: entry.total,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));
  const typeRows = (g?.byType ?? []).map((entry) => ({ label: entry.type, total: entry.total }));
  const topDonors = (g?.topDonors ?? []).slice(0, 8);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/insights/analytics" className="flex items-center gap-1.5 hover:text-ink">
            <ArrowLeft className="size-3" /> Insights · Analytics
          </Link>
        }
        title="Giving, in depth."
        description="Review giving totals, fund balances and trends without displaying donor names."
        actions={
          <Button asChild variant="outline" className="h-9 gap-1.5 rounded-full border-line bg-card text-xs">
            <Link href="/insights/reports">
              <HandCoins className="size-3.5" /> Turn it into a report
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

      {giving.isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      ) : giving.isError || !g ? (
        <EmptyState icon={<HandCoins />} title="Couldn&apos;t load the giving analysis" action={<Button size="sm" variant="outline" className="rounded-full border-line text-xs" onClick={() => giving.refetch()}>Retry</Button>} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Total given" value={g.total} prefix="₦" tone="brand" deltaLabel={`${number(g.count)} gifts`} />
            <StatCard label="Average gift" value={Math.round(g.average)} prefix="₦" tone="gold" />
            <StatCard label="Recurring givers" value={g.recurring.active} tone="moss" icon={<RefreshCcw className="size-4" />} deltaLabel={`${formatNaira(g.recurring.totalMonthlyAmount)}/month`} />
            <StatCard label="Scheduled gifts" value={g.recurring.totalScheduled} tone="sky" deltaLabel="in the book" />
          </div>

          <div className="grid gap-4 lg:grid-cols-12">
            <SectionCard className="lg:col-span-7" eyebrow="Trend" title="Monthly totals">
              {trendRows.length ? (
                <TrendChart data={trendRows} series={[{ key: "total", label: "Given", color: "var(--chart-1)" }]} height={230} formatter={(v) => formatNaira(Number(v))} />
              ) : (
                <p className="py-12 text-center text-[11px] text-ink-faint">No gifts recorded in this period.</p>
              )}
            </SectionCard>

            <SectionCard className="lg:col-span-5" eyebrow="Funds" title="Where it went">
              {categoryData.length ? (
                <DonutChart data={categoryData} centerValue={formatNaira(g.total)} centerLabel="received" height={175} formatter={(v) => formatNaira(Number(v))} />
              ) : (
                <p className="py-12 text-center text-[11px] text-ink-faint">No category split yet.</p>
              )}
              <div className="mt-3 space-y-1.5">
                {categoryData.slice(0, 6).map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2 text-[10px]">
                    <span className="size-1.5 rounded-full" style={{ background: entry.color }} />
                    <span className="text-ink-soft">{entry.name}</span>
                    <span className="num ml-auto">{percent(entry.value, g.total)}%</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard className="lg:col-span-5" eyebrow="Method" title="How people give">
              {typeRows.length ? (
                <BarSeries data={typeRows} series={[{ key: "total", label: "Amount", color: "var(--chart-4)" }]} horizontal height={180} formatter={(v) => formatNaira(Number(v))} />
              ) : (
                <p className="py-12 text-center text-[11px] text-ink-faint">Method data arrives with the first gifts.</p>
              )}
            </SectionCard>

            <SectionCard className="lg:col-span-7" eyebrow="Households" title="Most generous this period" bodyClassName="p-0">
              {topDonors.length ? (
                <>
                  <div className="divide-y divide-line/70">
                    {topDonors.map((donor, index) => (
                      <div key={donor.memberId} className="flex items-center gap-3 px-5 py-2.5">
                        <span className="num w-5 text-[10px] text-ink-faint">{index + 1}</span>
                        <PersonAvatar name={donor.memberName} size="xs" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium">{donor.memberName}</span>
                          <span className="block text-[10px] text-ink-faint">{number(donor.count)} gifts</span>
                        </span>
                        <span className="num text-xs font-semibold">{formatNaira(donor.total)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-line px-5 py-2.5 text-[10px] text-ink-faint">
                    Totals stay inside finance leadership. This view is for the people who count, not the noticeboard.
                  </div>
                </>
              ) : (
                <div className="px-5 py-10 text-center text-[11px] text-ink-faint">No donors recorded in this period.</div>
              )}
            </SectionCard>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <p className="rule-label mr-2">By status</p>
            {Object.entries(g.byStatus ?? {}).map(([status, count]) => (
              <Tag key={status} tone={status === "confirmed" || status === "paid" ? "moss" : status === "pending" ? "gold" : "neutral"} dot>
                {status} · {number(count)}
              </Tag>
            ))}
          </div>

          <div className="flex justify-end">
            <Button variant="ghost" size="sm" className="gap-1.5 rounded-full text-xs text-brand" asChild>
              <Link href="/insights/reports">Turn this into a board report</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
