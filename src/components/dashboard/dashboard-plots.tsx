"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export const dashboardColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];
const height = 216;
const number = (value: number) => value.toLocaleString("en-NG");

function EmptyPlot() {
  return (
    <div className="flex min-h-54 items-center justify-center text-sm text-muted-foreground">
      No data yet.
    </div>
  );
}

interface TrendPoint {
  date: string;
  total: number;
  members?: number;
  visitors?: number;
}

export function DashboardTrend({
  data,
  colors,
  split = false,
  monthly = false,
  formatValue = number,
  showValueAxis = false,
}: {
  data: TrendPoint[];
  colors: string[];
  split?: boolean;
  monthly?: boolean;
  showValueAxis?: boolean;
  formatValue?: (value: number) => string;
}) {
  const id = useId().replace(/:/g, "");
  if (!data.length) return <EmptyPlot />;
  const series = split
    ? [
        { key: "members", label: "Members" },
        { key: "visitors", label: "Visitors" },
      ]
    : [{ key: "total", label: "Total" }];
  const config = Object.fromEntries(
    series.map((s, i) => [
      s.key,
      { label: s.label, color: colors[i % colors.length] },
    ]),
  );
  return (
    <ChartContainer
      config={config}
      role="group"
      aria-label={`${split ? "Members and visitors" : "Total"} across ${data.length} periods. Latest: ${split ? `${number(data[data.length - 1].members ?? 0)} members, ${number(data[data.length - 1].visitors ?? 0)} visitors` : formatValue(data[data.length - 1].total)}.`}
      style={{ height }}
      className="w-full aspect-auto"
    >
      <AreaChart data={data} margin={{ top: 10, right: 6, bottom: 0, left: 6 }}>
        <defs>
          {series.map((s, i) => (
            <linearGradient
              key={s.key}
              id={`${id}-${s.key}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor={colors[i % colors.length]}
                stopOpacity={0.3}
              />
              <stop
                offset="100%"
                stopColor={colors[i % colors.length]}
                stopOpacity={0.02}
              />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} strokeOpacity={0.3} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          minTickGap={30}
          tickMargin={8}
          tick={{ fontSize: 12 }}
          tickFormatter={(date) =>
            new Date(date).toLocaleDateString(
              "en-NG",
              monthly
                ? { month: "short", year: "2-digit" }
                : { month: "short", day: "numeric" },
            )
          }
        />
        <YAxis
          hide={!showValueAxis}
          width={44}
          domain={[0, "auto"]}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12 }}
          tickFormatter={(value) =>
            new Intl.NumberFormat("en-NG", {
              notation: "compact",
              maximumFractionDigits: 1,
            }).format(Number(value))
          }
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => formatValue(Number(value))}
            />
          }
        />
        {series.map((s, i) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            stroke={colors[i % colors.length]}
            fill={`url(#${id}-${s.key})`}
            strokeWidth={2.5}
            dot={
              data.length === 1
                ? { r: 4, fill: colors[i % colors.length], strokeWidth: 0 }
                : false
            }
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}

export function DashboardBars({
  data,
  colors = dashboardColors,
  formatValue = number,
}: {
  data: { label: string; value: number }[];
  colors?: string[];
  formatValue?: (value: number) => string;
}) {
  if (!data.length || data.every((d) => d.value === 0)) return <EmptyPlot />;
  return (
    <ChartContainer
      config={{ value: { label: "Total", color: colors[0] } }}
      role="group"
      aria-label={data.map(item => `${item.label}: ${formatValue(item.value)}`).join(". ")}
      style={{ height }}
      className="w-full aspect-auto"
    >
      <BarChart data={data} margin={{ top: 10, right: 4, left: 4, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeOpacity={0.3} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          minTickGap={10}
          tickMargin={8}
          tick={{ fontSize: 12 }}
          tickFormatter={(value) =>
            String(value).length > 13
              ? `${String(value).slice(0, 12)}…`
              : String(value)
          }
        />
        <YAxis hide domain={[0, "auto"]} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => formatValue(Number(value))}
            />
          }
        />
        <Bar
          dataKey="value"
          radius={[6, 6, 0, 0]}
          maxBarSize={34}
          isAnimationActive={false}
        >
          {data.map((entry, i) => (
            <Cell
              key={`${entry.label}-${i}`}
              fill={colors[i % colors.length]}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export function DashboardDonut({
  data,
  valueLabel = "Members",
  formatValue,
  showCounts = false,
  showPercentages = false,
}: {
  data: { name: string; value: number }[];
  valueLabel?: string;
  showCounts?: boolean;
  showPercentages?: boolean;
  formatValue?: (value: number) => string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (!data.length || data.every((d) => d.value === 0)) return <EmptyPlot />;
  return (
    <div className="flex min-h-54 flex-col items-center justify-center gap-2">
      <p className="sr-only">{valueLabel}: {formatValue ? formatValue(total) : number(total)}. {data.map(item => `${item.name}: ${formatValue ? formatValue(item.value) : number(item.value)}`).join(". ")}</p>
      <ChartContainer
        config={{ value: { label: valueLabel } }}
        className="h-36 w-full aspect-auto"
      >
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={44}
            outerRadius={64}
            paddingAngle={3}
            cornerRadius={4}
            stroke="var(--card)"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {data.map((entry, i) => (
              <Cell
                key={entry.name}
                fill={dashboardColors[i % dashboardColors.length]}
              />
            ))}
          </Pie>
          <ChartTooltip
            content={
              <ChartTooltipContent
                nameKey="name"
                formatter={
                  formatValue || showPercentages
                    ? (value) =>
                        `${(formatValue ?? number)(Number(value))}${showPercentages ? ` (${((Number(value) / total) * 100).toFixed(1)}%)` : ""}`
                    : undefined
                }
              />
            }
          />
        </PieChart>
      </ChartContainer>
      <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        {data.map((entry, i) => (
          <li key={entry.name} className="flex items-center gap-1.5 capitalize">
            <span
              className="size-2 rounded-full"
              style={{
                backgroundColor: dashboardColors[i % dashboardColors.length],
              }}
            />
            {entry.name}
            {showCounts && (
              <span className="font-semibold tabular-nums text-foreground">
                {(formatValue ?? number)(entry.value)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
