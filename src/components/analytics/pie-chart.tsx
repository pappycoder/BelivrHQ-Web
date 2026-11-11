"use client";

import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

export interface PieSlice {
  /** Display label, e.g. "Active" */
  name: string;
  value: number;
  /** CSS color string, e.g. "var(--chart-1)". */
  color: string;
  /** Optional unit suffix shown in the legend, e.g. "members". */
  unit?: string;
}

interface PieChartCardProps {
  /** Slices to render. Total is derived from the sum. */
  data: PieSlice[];
  loading?: boolean;
  /** e.g. "members" — appended after each legend value. */
  unit?: string;
  /** Compact height for the chart area. */
  height?: number;
}

const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

/** Assign chart-1..n colors to slices that don't already carry a color. */
export function colorize(data: Array<{ name: string; value: number }>): PieSlice[] {
  return data.map((d, i) => ({
    ...d,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));
}

function formatLabel(value: number): string {
  return value.toLocaleString();
}

export function DonutChart({ data, loading, unit, height = 220 }: PieChartCardProps) {
  if (loading) {
    return <Skeleton className="w-full" style={{ height }} />;
  }
  if (data.length === 0 || data.every((slice) => slice.value === 0)) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        No data yet.
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative shrink-0" style={{ height, width: height, maxWidth: "100%" }}>
        <ChartContainer config={{ value: { label: unit || "Total" } }} className="h-full w-full aspect-square">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="62%"
              outerRadius="90%"
              paddingAngle={3}
              cornerRadius={4}
              stroke="var(--background)"
              strokeWidth={2}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <ChartTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0];
                const slice = data.find((d) => d.name === p.name);
                const value = Number(p.value ?? 0);
                const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                return (
                  <div className="rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
                    <div className="font-medium capitalize">{p.name}</div>
                    <div className="text-muted-foreground">
                      {value.toLocaleString()} {slice?.unit ?? unit ?? ""} · {pct}%
                    </div>
                  </div>
                );
              }}
            />
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-lg font-semibold tabular-nums">{total.toLocaleString()}</span>
        </div>
      </div>

      {/* Legend */}
      <ul className="w-full flex-1 space-y-1.5">
        {data.map((slice) => {
          const pct = total > 0 ? Math.round((slice.value / total) * 100) : 0;
          return (
            <li key={slice.name} className="flex items-center gap-2 text-sm">
              <span
                className="h-2.5 w-2.5 rounded-[3px]"
                style={{ backgroundColor: slice.color }}
              />
              <span className="flex-1 capitalize text-muted-foreground">{slice.name}</span>
              <span className="font-semibold tabular-nums">
                {slice.value.toLocaleString()}
              </span>
              <span className="w-10 text-right text-sm text-muted-foreground tabular-nums">
                {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export { formatLabel };
