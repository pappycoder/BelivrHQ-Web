"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { FormDateTimePanel } from "@/components/ui/form-date-time-picker";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
 * occurrences for fast backfill; the calendar is there for longer jumps.
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

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={`${label}: ${format(selected, "EEEE d MMMM yyyy")}`}
            className="h-9 gap-2 rounded-full border-line bg-card px-3.5 text-sm font-medium"
          >
            <CalendarDays className="size-3.5 text-ink-faint" />
            <span>{format(selected, "EEE d MMM")}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" collisionPadding={12} className="filter-date-popover" data-date-picker-kind="date" aria-label={label}>
          <p className="filter-date-title">{label}</p>
          <FormDateTimePanel
            compact
            type="date"
            value={value}
            todayValue={todayTarget ?? undefined}
            todayLabel="Jump to today"
            validate={date => occursOn(date) ? undefined : "Choose a date when this gathering meets."}
            onApply={date => {
              if (disabled || !occursOn(date)) return;
              onChange(date);
              setOpen(false);
            }}
            onCancel={() => setOpen(false)}
          />
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
