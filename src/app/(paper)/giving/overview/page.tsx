"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  HandCoins,
  HeartHandshake,
  PiggyBank,
  Repeat,
} from "lucide-react";
import { PageHeader, SectionCard } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import { GivingSourceIdentity } from "@/components/giving/giving-source-identity";
import {
  StaggerGroup,
  StaggerItem,
} from "@/components/paper/motion/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendChart } from "@/components/paper/charts";
import { dayMonth, number } from "@/lib/paper/format";
import { formatNaira } from "@/hooks/use-analytics";
import { usePermissions } from "@/hooks/use-permissions";
import { RecordCashDialog } from "@/components/giving/record-cash-dialog";
import {
  useGivingSummary,
  useGivingTransactions,
  useRecurringGiving,
  useGivingCategories,
  type GivingTransaction,
} from "@/hooks/use-giving";
import { formatDate } from "@/hooks/use-media";

export default function GivingOverviewPage() {
  const { can, ready } = usePermissions();
  const canRecord = ready && can("giving", "create");
  const canRecords = ready && can("giving:records", "read");
  const canRecurring = ready && can("giving:recurring", "read");
  const canFunds = ready && can("giving:categories", "read");
  const [recordOpen, setRecordOpen] = React.useState(false);

  const summary = useGivingSummary();
  const s = summary.data;

  const trendRows = React.useMemo(
    () =>
      (s?.trend ?? []).map((point) => ({
        label: dayMonth(point.date),
        total: point.total,
      })),
    [s],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Giving · Overview"
        title="Generosity, seen clearly."
        description="Review giving totals, recent contributions and trends for the selected period."
        actions={
          <>
            <Button
              asChild
              variant="outline"
              className="h-9 gap-1.5 rounded-full border-line bg-card text-xs"
            >
              <Link href="/giving/statements">
                <HeartHandshake className="size-3.5" /> Statements
              </Link>
            </Button>
            {canRecord ? (
              <Button
                className="h-9 gap-1.5 rounded-full text-xs"
                onClick={() => setRecordOpen(true)}
              >
                <HandCoins className="size-3.5" /> Record a gift
              </Button>
            ) : null}
          </>
        }
      />

      {summary.isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      ) : summary.isError || !s ? (
        <div className="paper-card rounded-2xl p-8 text-center text-xs text-ink-faint">
          Viewing giving totals requires access to the giving dashboard.
        </div>
      ) : (
        <>
          <StaggerGroup className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StaggerItem>
              <StatCard
                label="This month"
                value={s.monthTotal}
                prefix="₦"
                tone="brand"
                icon={<HandCoins className="size-4" />}
                deltaLabel={`${number(s.monthCount)} gifts`}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="All time"
                value={s.allTimeTotal}
                prefix="₦"
                tone="moss"
                deltaLabel={`${number(s.count)} recorded`}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Average gift"
                value={Math.round(s.monthTotal / Math.max(1, s.monthCount))}
                prefix="₦"
                tone="gold"
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="In the last 30 days"
                value={s.trend.reduce((sum, point) => sum + point.total, 0)}
                prefix="₦"
                tone="sky"
                icon={<PiggyBank className="size-4" />}
                deltaLabel="chart window"
              />
            </StaggerItem>
          </StaggerGroup>

          <div className="grid gap-4 lg:grid-cols-12">
            <SectionCard
              className="lg:col-span-8"
              eyebrow="Trend"
              title="Thirty days of generosity"
              description="Daily totals, counted once and honestly."
            >
              {trendRows.length ? (
                <TrendChart
                  data={trendRows}
                  series={[
                    { key: "total", label: "Given", color: "var(--chart-1)" },
                  ]}
                  height={240}
                  formatter={(v) => formatNaira(Number(v))}
                />
              ) : (
                <p className="py-14 text-center text-[11px] text-ink-faint">
                  No gifts recorded in this period.
                </p>
              )}
            </SectionCard>

            <div className="space-y-4 lg:col-span-4">
              {canFunds ? <FundsRail /> : null}
              {canRecurring ? <RecurringRail /> : null}
            </div>

            {canRecords ? (
              <SectionCard
                className="lg:col-span-12"
                eyebrow="The stream"
                title="Recent gifts"
                actions={
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 rounded-full text-[11px] text-ink-faint"
                  >
                    <Link href="/giving/donations">
                      All giving records <ArrowRight className="size-3" />
                    </Link>
                  </Button>
                }
                bodyClassName="p-0"
              >
                <RecentGifts />
              </SectionCard>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-4 text-[11px]">
            <Link
              href="/giving/donations"
              className="text-brand hover:underline"
            >
              Giving records
            </Link>
            <Link href="/giving/funds" className="text-brand hover:underline">
              Giving categories
            </Link>
            <Link
              href="/giving/schedules"
              className="text-brand hover:underline"
            >
              Recurring schedules
            </Link>
            <Link
              href="/insights/analytics/giving"
              className="ml-auto text-ink-faint hover:text-ink"
            >
              Deep analysis →
            </Link>
          </div>
        </>
      )}

      <RecordCashDialog open={recordOpen} onOpenChange={setRecordOpen} />
    </div>
  );
}

function RecentGifts() {
  const recent = useGivingTransactions({
    page: 1,
    limit: 8,
    sortBy: "created_at",
    sortOrder: "desc",
  });
  const rows = recent.data?.data ?? [];
  if (recent.isLoading) {
    return (
      <div className="space-y-2 p-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 rounded-xl" />
        ))}
      </div>
    );
  }
  if (!rows.length) {
    return (
      <p className="px-5 py-10 text-center text-[11px] text-ink-faint">
        No giving records yet.
      </p>
    );
  }
  return (
    <div className="divide-y divide-line/70">
      {rows.map((tx: GivingTransaction) => (
        <div
          key={tx.transactionId}
          className="flex items-center gap-3 px-5 py-2.5"
        >
          <GivingSourceIdentity transaction={tx}>
            <span className="block truncate text-[10px] text-ink-faint">
              {tx.categoryName}
              {tx.serviceName ? ` · ${tx.serviceName}` : ""}
              {tx.eventName ? ` · ${tx.eventName}` : ""} ·{" "}
              {formatDate(tx.givingDate ?? tx.createdAt)}
            </span>
          </GivingSourceIdentity>
          <Tag
            tone={
              tx.status === "success"
                ? "moss"
                : tx.status === "pending"
                  ? "gold"
                  : "rose"
            }
            dot
          >
            {tx.status}
          </Tag>
          <span className="num w-28 text-right text-xs font-semibold">
            {formatNaira(tx.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}

function FundsRail() {
  const categories = useGivingCategories({ limit: 100 });
  const active = (categories.data?.data ?? [])
    .filter((c) => c.isActive && !c.archivedAt)
    .slice(0, 5);
  return (
    <SectionCard
      eyebrow="Giving categories"
      title="Where giving is aimed"
      actions={
        <Link
          href="/giving/funds"
          className="text-[11px] text-brand hover:underline"
        >
          Manage
        </Link>
      }
      bodyClassName="p-0"
    >
      <div className="divide-y divide-line/70">
        {(categories.data?.data ?? []).length === 0 ? (
          <p className="px-5 py-8 text-center text-[11px] text-ink-faint">
            No giving categories defined yet.
          </p>
        ) : (
          active.map((category) => (
            <div
              key={category.categoryId}
              className="flex items-center justify-between px-5 py-2.5 text-[11px]"
            >
              <span className="min-w-0 truncate font-medium">
                {category.name}
              </span>
              {category.isRecurring ? (
                <Tag tone="sky">recurring</Tag>
              ) : (
                <span className="num text-[10px] text-ink-faint">
                  one-off gifts
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </SectionCard>
  );
}

function RecurringRail() {
  const recurring = useRecurringGiving({ page: 1, limit: 100 });
  const rows = recurring.data?.data ?? [];
  const active = rows.filter((r) => r.isActive);
  const monthly = active.reduce(
    (sum, r) =>
      sum +
      (r.frequency === "monthly"
        ? r.amount
        : r.frequency === "quarterly"
          ? Math.round(r.amount / 3)
          : Math.round(r.amount / 4)),
    0,
  );
  return (
    <SectionCard
      eyebrow="Recurring"
      title="The floor under the year"
      actions={
        <Link
          href="/giving/schedules"
          className="text-[11px] text-brand hover:underline"
        >
          Schedules
        </Link>
      }
    >
      <div className="flex items-center gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-sky-soft text-sky">
          <Repeat className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="num font-display text-lg font-semibold leading-tight">
            {formatNaira(monthly)}
            <span className="text-[10px] font-normal text-ink-faint">
              {" "}
              / month projected
            </span>
          </p>
          <p className="text-[10px] text-ink-faint">
            {number(active.length)} active schedules ·{" "}
            {number(rows.length - active.length)} paused or ended
          </p>
        </div>
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-ink-faint">
        Follow up on paused recurring gifts to help keep giving consistent.
      </p>
    </SectionCard>
  );
}
