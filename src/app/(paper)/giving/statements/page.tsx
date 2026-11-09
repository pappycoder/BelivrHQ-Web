"use client";

import * as React from "react";
import { givingSource } from "@/lib/giving-source";
import {
  Download,
  HandCoins,
  HeartHandshake,
  Receipt,
  Users,
} from "lucide-react";
import type { ExportColumn } from "@/lib/export-utils";
import { PageHeader, SectionCard } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import {
  EmptyState,
  FilterChip,
  PersonAvatar,
} from "@/components/paper/primitives";
import { BarSeries, CHART_COLORS, TrendChart } from "@/components/paper/charts";
import { Skeleton } from "@/components/ui/skeleton";
import { ExportDropdown } from "@/components/shared/export-dropdown";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useGivingTransactionsAll,
  useGivingCategories,
} from "@/hooks/use-giving";
import { formatNaira } from "@/hooks/use-analytics";
import { monthYear, number, percent } from "@/lib/paper/format";
import { cn } from "@/lib/utils";

type RangeKey = "month" | "quarter" | "year" | "lastYear" | "all";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "month", label: "This month" },
  { key: "quarter", label: "This quarter" },
  { key: "year", label: "This year" },
  { key: "lastYear", label: "Last year" },
  { key: "all", label: "All time" },
];

function rangeDates(key: RangeKey): { startDate?: string; endDate?: string } {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  switch (key) {
    case "month":
      return {
        startDate: iso(new Date(now.getFullYear(), now.getMonth(), 1)),
        endDate: iso(now),
      };
    case "quarter": {
      const q = Math.floor(now.getMonth() / 3) * 3;
      return {
        startDate: iso(new Date(now.getFullYear(), q, 1)),
        endDate: iso(now),
      };
    }
    case "year":
      return {
        startDate: `${now.getFullYear()}-01-01`,
        endDate: `${now.getFullYear()}-12-31`,
      };
    case "lastYear":
      return {
        startDate: `${now.getFullYear() - 1}-01-01`,
        endDate: `${now.getFullYear() - 1}-12-31`,
      };
    default:
      return {};
  }
}

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: "date", label: "Giving date" },
  { key: "giver", label: "Giving source" },
  { key: "context", label: "Service / event / group" },
  { key: "category", label: "Category" },
  { key: "amount", label: "Amount" },
  { key: "method", label: "Method" },
  { key: "reference", label: "Reference" },
];

export default function GivingStatementsPage() {
  const { can, ready } = usePermissions();
  const canRecords = ready && can("giving:records", "read");

  const [range, setRange] = React.useState<RangeKey>("year");
  const [categoryId, setCategoryId] = React.useState("");

  const params = React.useMemo(
    () => ({ ...rangeDates(range), categoryId: categoryId || undefined }),
    [range, categoryId],
  );

  const rowsQuery = useGivingTransactionsAll(params);
  const categories = useGivingCategories({ limit: 100 });
  const rows = React.useMemo(() => rowsQuery.data ?? [], [rowsQuery.data]);

  const totals = React.useMemo(() => {
    const total = rows.reduce((sum, t) => sum + t.amount, 0);
    const byMonth = new Map<string, number>();
    const byCategory = new Map<string, number>();
    const byMethod = new Map<string, number>();
    const byGiver = new Map<
      string,
      { name: string; total: number; count: number }
    >();
    for (const t of rows) {
      const stamp = (t.givingDate ?? t.createdAt).slice(0, 7);
      byMonth.set(stamp, (byMonth.get(stamp) ?? 0) + t.amount);
      byCategory.set(
        t.categoryName,
        (byCategory.get(t.categoryName) ?? 0) + t.amount,
      );
      byMethod.set(
        t.type === "cash"
          ? "Cash"
          : t.type === "bank_transfer"
            ? "Bank transfer"
            : "Online",
        (byMethod.get(t.type) ?? 0) + t.amount,
      );
      if (t.memberName) {
        const current = byGiver.get(t.memberId ?? t.memberName) ?? {
          name: t.memberName,
          total: 0,
          count: 0,
        };
        current.total += t.amount;
        current.count += 1;
        byGiver.set(t.memberId ?? t.memberName, current);
      }
    }
    return {
      total,
      months: [...byMonth.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, value]) => ({ label: monthYear(`${month}-01`), value })),
      byCategory: [...byCategory.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([label, value]) => ({ label, value })),
      byMethod: [...byMethod.entries()].sort((a, b) => b[1] - a[1]),
      givers: [...byGiver.values()].sort((a, b) => b.total - a.total),
    };
  }, [rows]);

  const exportRows = React.useMemo(
    () =>
      rows.map((t) => ({
        date: (t.givingDate ?? t.createdAt).slice(0, 10),
        giver: givingSource(t).label,
        context: givingSource(t).context,
        category: t.categoryName,
        amount: t.amount,
        method: t.type,
        reference: t.paymentReference ?? t.receiptNumber ?? "",
      })),
    [rows],
  );

  const rangeLabel = RANGES.find((r) => r.key === range)?.label ?? "All time";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Giving · Statements"
        title="Receipts-ready, year after year."
        description="The season rolled up by month, fund and method — the same figures the ledger keeps, dressed for the board."
        actions={
          <ExportDropdown
            tableId="statements"
            columns={EXPORT_COLUMNS}
            data={exportRows}
            title="Giving statements"
            filename={`giving-${range}`}
            disabled={!exportRows.length}
          />
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((item) => (
          <FilterChip
            key={item.key}
            active={range === item.key}
            onClick={() => setRange(item.key)}
          >
            {item.label}
          </FilterChip>
        ))}
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="ml-auto h-8 rounded-full border border-line bg-card px-3 text-[11px] outline-none"
          aria-label="Fund filter"
        >
          <option value="">All funds</option>
          {(categories.data?.data ?? [])
            .filter((c) => !c.archivedAt)
            .map((c) => (
              <option key={c.categoryId} value={c.categoryId}>
                {c.name}
              </option>
            ))}
        </select>
      </div>

      {!canRecords ? (
        <EmptyState
          icon={<Receipt />}
          title="Statements follow the records grant"
          description="Giving totals live with the treasurer and those who hold the records permission."
        />
      ) : rowsQuery.isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<HeartHandshake />}
          title="No gifts in this window"
          description="Try a wider range — or the season simply hasn't landed yet."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label={`Given · ${rangeLabel}`}
              value={totals.total}
              prefix="₦"
              tone="brand"
              icon={<HandCoins className="size-4" />}
              deltaLabel={`${number(rows.length)} gifts`}
            />
            <StatCard
              label="Average gift"
              value={Math.round(totals.total / rows.length)}
              prefix="₦"
              tone="gold"
            />
            <StatCard
              label="Named givers"
              value={totals.givers.length}
              tone="moss"
              icon={<Users className="size-4" />}
              deltaLabel="at least one gift"
            />
            <StatCard
              label="Funds moved"
              value={totals.byCategory.length}
              tone="sky"
              deltaLabel="received something"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-12">
            <SectionCard
              className="lg:col-span-7"
              eyebrow="Season shape"
              title="Month by month"
            >
              <TrendChart
                data={totals.months}
                series={[
                  { key: "value", label: "Given", color: "var(--chart-1)" },
                ]}
                height={220}
                formatter={(v) => formatNaira(Number(v))}
              />
            </SectionCard>

            <SectionCard
              className="lg:col-span-5"
              eyebrow="Giving categories"
              title="Where the season went"
            >
              <BarSeries
                data={totals.byCategory.map((entry, index) => ({
                  ...entry,
                  color: CHART_COLORS[index % CHART_COLORS.length],
                }))}
                series={[
                  { key: "value", label: "Given", color: "var(--chart-2)" },
                ]}
                horizontal
                height={210}
                formatter={(v) => formatNaira(Number(v))}
              />
            </SectionCard>

            <SectionCard
              className="lg:col-span-5"
              eyebrow="Method"
              title="How it arrived"
            >
              <div className="space-y-3">
                {totals.byMethod.map(([label, value], index) => (
                  <div key={label}>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="size-1.5 rounded-full"
                          style={{
                            background:
                              CHART_COLORS[index % CHART_COLORS.length],
                          }}
                        />
                        {label}
                      </span>
                      <span className="num text-ink-soft">
                        {formatNaira(value)}
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${percent(value, totals.total)}%`,
                          background: CHART_COLORS[index % CHART_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 flex items-center gap-1.5 text-[10px] text-ink-faint">
                <Download className="size-3" /> CSV, Excel and PDF all honour
                this exact window.
              </p>
            </SectionCard>

            <SectionCard
              className="lg:col-span-7"
              eyebrow="Roll"
              title="The most faithful givers"
              bodyClassName="p-0"
            >
              <div className="divide-y divide-line/70">
                {totals.givers.slice(0, 7).map((giver, index) => (
                  <div
                    key={giver.name}
                    className="flex items-center gap-3 px-5 py-2.5"
                  >
                    <span className="num w-5 text-[10px] text-ink-faint">
                      {index + 1}
                    </span>
                    <PersonAvatar name={giver.name} size="xs" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">
                        {giver.name}
                      </span>
                      <span className="block text-[10px] text-ink-faint">
                        {number(giver.count)} gifts
                      </span>
                    </span>
                    <span
                      className={cn(
                        "num text-xs font-semibold",
                        range === "lastYear" && "text-moss",
                      )}
                    >
                      {formatNaira(giver.total)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-line px-5 py-2.5 text-[10px] text-ink-faint">
                <span>
                  Year-end statements for each giver open from the ledger rows.
                </span>
                <Tag tone="brand">handle with care</Tag>
              </div>
            </SectionCard>
          </div>

          <div className="rounded-2xl border border-dashed border-line p-5 text-[11px] leading-relaxed text-ink-soft">
            <p className="mb-1 font-display text-xs font-semibold text-ink">
              Statement discipline
            </p>
            Every figure here walks the full successful ledger for the window —
            the same source the receipts print from, so a board pack and a
            giver&apos;s receipt can never disagree.
          </div>
        </>
      )}
    </div>
  );
}
