"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const axisStyle = {
  fontSize: 12,
  fill: "var(--ink-faint)",
  fontFamily: "var(--font-inter-tight), sans-serif",
} as const;

function PaperTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: readonly { name?: string; value?: number | string; color?: string }[];
  label?: string | number;
  formatter?: (value: number | string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-popover px-3 py-2 shadow-lg">
      {label !== undefined ? (
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
          {label}
        </p>
      ) : null}
      <div className="space-y-0.5">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span
              className="size-1.5 rounded-full"
              style={{ background: entry.color }}
            />
            <span className="text-ink-soft">{entry.name}</span>
            <span className="num ml-auto font-semibold text-ink">
              {formatter && entry.value !== undefined
                ? formatter(entry.value)
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface Serie {
  key: string;
  label: string;
  color?: string;
}

export function TrendChart({
  data,
  series,
  xKey = "label",
  height = 220,
  formatter,
  showGrid = true,
  stacked = false,
  className,
}: {
  data: Record<string, string | number>[];
  series: Serie[];
  xKey?: string;
  height?: number;
  formatter?: (value: number | string) => string;
  showGrid?: boolean;
  stacked?: boolean;
  className?: string;
}) {
  const id = React.useId().replace(/:/g, "");
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
          <defs>
            {series.map((serie, i) => (
              <linearGradient
                key={serie.key}
                id={`fill-${id}-${i}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={serie.color ?? CHART_COLORS[i % CHART_COLORS.length]}
                  stopOpacity={0.28}
                />
                <stop
                  offset="100%"
                  stopColor={serie.color ?? CHART_COLORS[i % CHART_COLORS.length]}
                  stopOpacity={0.02}
                />
              </linearGradient>
            ))}
          </defs>
          {showGrid ? (
            <CartesianGrid
              strokeDasharray="2 6"
              vertical={false}
              stroke="var(--line)"
            />
          ) : null}
          <XAxis
            dataKey={xKey}
            tick={axisStyle}
            tickLine={false}
            axisLine={false}
            dy={6}
          />
          <YAxis
            tick={axisStyle}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(value) =>
              typeof value === "number" && value >= 1000
                ? `${Math.round(value / 1000)}k`
                : String(value)
            }
          />
          <Tooltip
            content={<PaperTooltip formatter={formatter} />}
            cursor={{ stroke: "var(--line)" }}
          />
          {series.map((serie, i) => (
            <Area
              key={serie.key}
              type="monotone"
              dataKey={serie.key}
              name={serie.label}
              stackId={stacked ? "1" : undefined}
              stroke={serie.color ?? CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={2}
              fill={`url(#fill-${id}-${i})`}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarSeries({
  data,
  series,
  xKey = "label",
  height = 220,
  formatter,
  horizontal = false,
  className,
}: {
  data: Record<string, string | number>[];
  series: Serie[];
  xKey?: string;
  height?: number;
  formatter?: (value: number | string) => string;
  horizontal?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={horizontal ? "vertical" : "horizontal"}
          margin={{ top: 8, right: 8, left: horizontal ? 4 : -18, bottom: 0 }}
          barCategoryGap="26%"
        >
          <CartesianGrid
            strokeDasharray="2 6"
            vertical={false}
            horizontal={!horizontal}
            stroke="var(--line)"
          />
          {horizontal ? (
            <>
              <XAxis type="number" tick={axisStyle} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey={xKey}
                tick={axisStyle}
                tickLine={false}
                axisLine={false}
                width={92}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey={xKey}
                tick={axisStyle}
                tickLine={false}
                axisLine={false}
                dy={6}
              />
              <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={44} />
            </>
          )}
          <Tooltip
            content={<PaperTooltip formatter={formatter} />}
            cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          />
          {series.map((serie, i) => (
            <Bar
              key={serie.key}
              dataKey={serie.key}
              name={serie.label}
              fill={serie.color ?? CHART_COLORS[i % CHART_COLORS.length]}
              radius={horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]}
              maxBarSize={34}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutChart({
  data,
  height = 200,
  centerLabel,
  centerValue,
  formatter,
}: {
  data: { name: string; value: number; color?: string }[];
  height?: number;
  centerLabel?: string;
  centerValue?: string;
  formatter?: (value: number | string) => string;
}) {
  return (
    <div className="relative w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((entry, i) => (
              <Cell
                key={entry.name}
                fill={entry.color ?? CHART_COLORS[i % CHART_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<PaperTooltip formatter={formatter} />} />
        </PieChart>
      </ResponsiveContainer>
      {centerValue ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="font-display text-xl font-semibold leading-none">
              {centerValue}
            </div>
            {centerLabel ? (
              <div className="mt-1 text-xs uppercase tracking-[0.14em] text-ink-faint">
                {centerLabel}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function Sparkline({
  data,
  color = "var(--chart-1)",
  height = 40,
}: {
  data: { value: number }[];
  color?: string;
  height?: number;
}) {
  const id = React.useId().replace(/:/g, "");
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.6}
            fill={`url(#spark-${id})`}
            isAnimationActive
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
