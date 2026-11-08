"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { WheelDateTimePanel } from "@/components/ui/wheel-date-time-picker";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { IconAction } from "@/components/paper/primitives";
import {
  localDayKey,
  nearestOccurrence,
  stepOccurrence,
} from "@/lib/schedule-occurrence";
import { cn } from "@/lib/utils";

function parseDayKey(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

/**
 * Date control for check-in desks.
 *
 * Opens on a valid occurrence and only lets the operator pick days the
 * service/event actually meets on. The `‹ Sun 1 Nov ›` stepper walks adjacent
 * occurrences for fast backfill; the scroll wheels are there for longer jumps.
 */
export function CheckInDatePicker({
  value,
  onChange,
  occursOn,
  label = "Attendance date",
  disabled,
  className,
}: {
  /** Selected day as `YYYY-MM-DD`. */
  value: string;
  onChange: (value: string) => void;
  /** Whether the service/event meets on a given `YYYY-MM-DD`. */
  occursOn: (date: string) => boolean;
  /** Accessible label for the trigger. */
  label?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);

  const selected = React.useMemo(() => parseDayKey(value), [value]);
  const previous = stepOccurrence(occursOn, value, -1);
  const next = stepOccurrence(occursOn, value, 1);
  const today = localDayKey(new Date());
  const todayTarget = occursOn(today)
    ? today
    : nearestOccurrence(occursOn, today);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <IconAction
        label="Previous occurrence"
        icon={<ChevronLeft />}
        onSelect={() => previous && onChange(previous)}
        disabled={disabled || !previous}
        className="size-9 rounded-full border border-line bg-card"
      />

      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={`${label}: ${format(selected, "EEEE d MMMM yyyy")}`}
            className="h-9 gap-2 rounded-full border-line bg-card px-3.5 text-xs font-medium"
          >
            <CalendarDays className="size-3.5 text-ink-faint" />
            <span>{format(selected, "EEE d MMM")}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] p-0">
          <div className="p-4">
            <p className="mb-3 text-xs text-muted-foreground">Scroll to an occurrence date, then apply.</p>
            <WheelDateTimePanel key={value} type="date" value={value}
              validate={(date) => occursOn(date) ? undefined : "This gathering does not meet on the selected date."}
              onApply={(date) => { onChange(date); setOpen(false); }} onCancel={() => setOpen(false)} />
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-line px-3 py-2">
            <span className="text-[10px] text-ink-faint">
              Only occurrence dates can be applied
            </span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={!todayTarget}
              onClick={() => {
                if (!todayTarget) return;
                onChange(todayTarget);
                setOpen(false);
              }}
              className="rounded-full text-[11px]"
            >
              Jump to today
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <IconAction
        label="Next occurrence"
        icon={<ChevronRight />}
        onSelect={() => next && onChange(next)}
        disabled={disabled || !next}
        className="size-9 rounded-full border border-line bg-card"
      />
    </div>
  );
}
