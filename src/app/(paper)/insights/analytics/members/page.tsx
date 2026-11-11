"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/paper/section";
import { StatCard } from "@/components/paper/stat";
import { EmptyState, FilterChip } from "@/components/paper/primitives";
import { BarSeries, CHART_COLORS, DonutChart, TrendChart } from "@/components/paper/charts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { number, percent } from "@/lib/paper/format";
import {
  periodLabel,
  useAnalyticsMembers,
} from "@/hooks/use-analytics";
import { useBranchesList } from "@/hooks/use-branches";

export default function MembersAnalyticsPage() {
  const [branchId, setBranchId] = React.useState("");

  const branches = useBranchesList({ limit: 100 });
  const members = useAnalyticsMembers(branchId ? { branchId } : {});
  const m = members.data;

  const growthRows = (m?.growth ?? []).map((point) => ({
    label: periodLabel(point.date),
    members: point.total,
  }));
  const ageData = Object.entries(m?.byAgeGroup ?? {}).map(([name, value], index) => ({
    name,
    value,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));
  const statusRows = Object.entries(m?.byStatus ?? {}).map(([label, count]) => ({ label, count: count as number }));
  const genderData = Object.entries(m?.byGender ?? {}).map(([name, value], index) => ({
    name,
    value,
    color: CHART_COLORS[(index + 2) % CHART_COLORS.length],
  }));
  const activeCount = (m?.byStatus ?? {})["active"] ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/insights/analytics" className="flex items-center gap-1.5 hover:text-ink">
            <ArrowLeft className="size-3" /> Insights · Analytics
          </Link>
        }
        title="The growing family."
        description="Track member growth, group participation and retention over time."
        actions={
          <Button asChild variant="outline" className="h-9 gap-1.5 rounded-full border-line bg-card text-sm">
            <Link href="/people/members">
              <Users className="size-3.5" /> Member directory
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip active={branchId === ""} onClick={() => setBranchId("")}>All branches</FilterChip>
        {(branches.data?.data ?? []).map((branch) => (
          <FilterChip key={branch.branchId} active={branchId === branch.branchId} onClick={() => setBranchId(branch.branchId)}>{branch.name}</FilterChip>
        ))}
      </div>

      {members.isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      ) : members.isError || !m ? (
        <EmptyState icon={<Users />} title="Couldn&apos;t load the membership analysis" action={<Button size="sm" variant="outline" className="rounded-full border-line text-sm" onClick={() => members.refetch()}>Retry</Button>} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Members" value={m.total} tone="brand" icon={<Users className="size-4" />} />
            <StatCard label="Active" value={activeCount} tone="moss" deltaLabel={m.total ? `${percent(activeCount, m.total)}% of the roll` : "Not available"} />
            <StatCard label="Age bands" value={ageData.length} tone="sky" deltaLabel="generation spread" />
            <StatCard label="Recorded growth" value={growthRows.length} tone="gold" deltaLabel="periods tracked" />
          </div>

          <div className="grid gap-4 lg:grid-cols-12">
            <SectionCard className="lg:col-span-7" eyebrow="Growth" title="Members over time">
              {growthRows.length ? (
                <TrendChart data={growthRows} series={[{ key: "members", label: "Members", color: "var(--chart-2)" }]} height={220} formatter={(v) => number(Number(v))} />
              ) : (
                <p className="py-12 text-center text-sm text-ink-faint">Growth trends will appear once there are enough records.</p>
              )}
            </SectionCard>

            <SectionCard className="lg:col-span-5" eyebrow="Age" title="Congregation bands">
              {ageData.length ? (
                <DonutChart data={ageData} centerValue={number(m.total)} centerLabel="people" height={170} formatter={(v) => `${number(Number(v))} people`} />
              ) : (
                <p className="py-12 text-center text-sm text-ink-faint">Age data appears as profiles are filled.</p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                {ageData.map((band) => (
                  <div key={band.name} className="flex items-center gap-1.5 text-xs">
                    <span className="size-1.5 rounded-full" style={{ background: band.color }} />
                    <span className="truncate text-ink-soft">{band.name}</span>
                    <span className="num ml-auto">{m.total ? percent(band.value, m.total) : 0}%</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard className="lg:col-span-5" eyebrow="Status" title="Where people stand">
              {statusRows.length ? (
                <BarSeries data={statusRows} series={[{ key: "count", label: "Members", color: "var(--chart-4)" }]} horizontal height={190} formatter={(v) => number(Number(v))} />
              ) : (
                <p className="py-12 text-center text-sm text-ink-faint">No status breakdown yet.</p>
              )}
            </SectionCard>

            <SectionCard className="lg:col-span-7" eyebrow="Gender" title="The mix in the room">
              {genderData.length ? (
                <div className="grid items-center gap-4 sm:grid-cols-2">
                  <DonutChart data={genderData} centerValue={number(m.total)} centerLabel="recorded" height={160} formatter={(v) => number(Number(v))} />
                  <div className="space-y-2">
                    {genderData.map((entry) => (
                      <div key={entry.name}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full" style={{ background: entry.color }} />{entry.name}</span>
                          <span className="num text-ink-soft">{number(entry.value)}</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full" style={{ width: `${m.total ? percent(entry.value, m.total) : 0}%`, background: entry.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="py-12 text-center text-sm text-ink-faint">Gender data appears with filled member profiles.</p>
              )}
              <p className="mt-4 text-xs leading-relaxed text-ink-faint">
                Members in at least one group attend far more often; belonging precedes behaving.
                The group roster lives at <Link href="/gatherings/groups" className="text-brand hover:underline">Gatherings · Groups</Link>.
              </p>
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}
