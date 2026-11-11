"use client";

import * as React from "react";
import { format, startOfMonth, startOfQuarter, subDays } from "date-fns";
import { CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface ReportRange {
  startDate: string;
  endDate: string;
}

interface ReportDateRangeProps {
  value: ReportRange;
  onChange: (range: ReportRange) => void;
}

type PresetKey = "all" | "this-month" | "last-30" | "this-quarter" | "ytd";

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "all", label: "All time" },
  { key: "this-month", label: "This month" },
  { key: "last-30", label: "Last 30 days" },
  { key: "this-quarter", label: "This quarter" },
  { key: "ytd", label: "Year to date" },
];

function presetRange(key: PresetKey): ReportRange {
  const today = new Date();
  switch (key) {
    case "this-month":
      return {
        startDate: format(startOfMonth(today), "yyyy-MM-dd"),
        endDate: format(today, "yyyy-MM-dd"),
      };
    case "last-30":
      return {
        startDate: format(subDays(today, 29), "yyyy-MM-dd"),
        endDate: format(today, "yyyy-MM-dd"),
      };
    case "this-quarter":
      return {
        startDate: format(startOfQuarter(today), "yyyy-MM-dd"),
        endDate: format(today, "yyyy-MM-dd"),
      };
    case "ytd":
      return {
        startDate: `${today.getFullYear()}-01-01`,
        endDate: format(today, "yyyy-MM-dd"),
      };
    default:
      return { startDate: "", endDate: "" };
  }
}

export function ReportDateRange({ value, onChange }: ReportDateRangeProps) {
  const activePreset = PRESETS.find((p) => {
    const r = presetRange(p.key);
    return r.startDate === value.startDate && r.endDate === value.endDate;
  })?.key;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <CalendarRange className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Range</span>
      </div>

      <div className="flex flex-wrap gap-1">
        {PRESETS.map((p) => (
          <Button
            key={p.key}
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2.5 text-sm",
              activePreset === p.key
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => onChange(presetRange(p.key))}
          >
            {p.label}
          </Button>
        ))}
      </div>

      <Input picker="native"
        type="date"
        value={value.startDate}
        onChange={(e) => onChange({ ...value, startDate: e.target.value })}
        className="w-40"
        aria-label="Start date"
      />
      <span className="text-sm text-muted-foreground">to</span>
      <Input picker="native"
        type="date"
        value={value.endDate}
        onChange={(e) => onChange({ ...value, endDate: e.target.value })}
        className="w-40"
        aria-label="End date"
      />
      {(value.startDate || value.endDate) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({ startDate: "", endDate: "" })}
        >
          Clear
        </Button>
      )}
    </div>
  );
}