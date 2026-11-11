"use client";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { dashboardColors } from "@/components/dashboard/dashboard-plots";
import { givingMoney } from "./giving-presentation";
export function GivingCategoryBars({
  data,
  currency,
}: {
  data: { name: string; amount: number }[];
  currency: string;
}) {
  if (!data.length || data.every((row) => row.amount === 0))
    return (
      <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
        No data yet.
      </div>
    );
  return (
    <div
      className="max-h-64 overflow-y-auto"
      aria-label={`Giving category amounts in ${currency}`}
    >
      <ChartContainer
        config={{
          amount: { label: `Given (${currency})`, color: dashboardColors[1] },
        }}
        style={{ height: Math.max(176, data.length * 30) }}
        className="w-full aspect-auto"
      >
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 0, right: 8, top: 4, bottom: 0 }}
        >
          <CartesianGrid horizontal={false} strokeOpacity={0.3} />
          <XAxis
            type="number"
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
          <YAxis
            type="category"
            dataKey="name"
            width={108}
            tickLine={false}
            axisLine={false}
            interval={0}
            tick={{ fontSize: 12 }}
            tickFormatter={(value) =>
              String(value).length > 18
                ? `${String(value).slice(0, 17)}…`
                : String(value)
            }
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => givingMoney(currency, Number(value))}
              />
            }
          />
          <Bar
            dataKey="amount"
            radius={[0, 5, 5, 0]}
            maxBarSize={18}
            isAnimationActive={false}
          >
            {data.map((row, i) => (
              <Cell
                key={`${row.name}-${i}`}
                fill={dashboardColors[(i + 1) % dashboardColors.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
