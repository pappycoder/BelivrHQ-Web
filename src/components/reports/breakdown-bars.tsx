"use client";

import { cn } from "@/lib/utils";

interface BreakdownItem {
  name: string;
  value: number;
  count?: number;
}

interface BreakdownBarsProps {
  items: BreakdownItem[];
  colorful?: boolean;
  labelSuffix?: (item: BreakdownItem) => string;
  formatValue?: (value: number) => string;
}

export function BreakdownBars({
  items,
  labelSuffix,
  formatValue,
  colorful = false,
}: BreakdownBarsProps) {
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No data yet.
      </p>
    );
  }

  const total = items.reduce((sum, item) => sum + item.value, 0);
  const colors = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
    "var(--chart-6)",
  ];
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div data-export-list className="divide-y">
      {items.map((item, index) => (
        <div key={item.name} className="py-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium capitalize">{item.name}</span>
            <span className="flex items-baseline gap-2">
              {labelSuffix && (
                <span className="text-sm text-muted-foreground capitalize">
                  {labelSuffix(item)}
                </span>
              )}
              <span className="text-sm text-muted-foreground">
                {Math.round((item.value / (colorful ? total || 1 : max)) * 100)}
                %
              </span>
              <span className="font-semibold tabular-nums">
                {formatValue
                  ? formatValue(item.value)
                  : item.value.toLocaleString()}
              </span>
            </span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-muted">
            <div
              className={cn("h-2 rounded-full bg-primary/70")}
              style={{
                width: `${Math.max((item.value / max) * 100, colorful ? 0 : 2)}%`,
                ...(colorful
                  ? { backgroundColor: colors[index % colors.length] }
                  : {}),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
