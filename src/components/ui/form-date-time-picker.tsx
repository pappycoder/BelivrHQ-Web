"use client";

import { cloneElement, useEffect, useId, useRef, useState, type ComponentProps, type ReactElement } from "react";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toCalendarDate, withCalendarDate } from "@/lib/form-date-time";
import { displayWheelDate, readDateTime, writeDateTime, type WheelPickerType } from "@/lib/wheel-date-time";

const pad = (value: number) => String(value).padStart(2, "0");
const months = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  short: new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(2000, index, 1)),
  long: new Intl.DateTimeFormat("en", { month: "long" }).format(new Date(2000, index, 1)),
}));
const numbers = (count: number) => Array.from({ length: count }, (_, index) => pad(index));
const hours = numbers(24);
const minutes = numbers(60);

function FormPickerDayButton(props: ComponentProps<typeof CalendarDayButton>) {
  return <CalendarDayButton {...props} disableTooltip />;
}

export function FormDateTimePanel({ type, value, onApply, onCancel, onClear, validate, seconds = false, min, max, todayValue, todayLabel = "Today", compact = false }: {
  type: WheelPickerType;
  value: string;
  onApply: (value: string) => void;
  onCancel: () => void;
  onClear?: () => void;
  validate?: (value: string) => string | undefined;
  seconds?: boolean;
  min?: string;
  max?: string;
  /** Optional nearest valid date for schedule-aware Today shortcuts. */
  todayValue?: string;
  todayLabel?: string;
  compact?: boolean;
}) {
  const id = useId();
  const [parts, setParts] = useState(() => readDateTime(type, value || min || ""));
  const [month, setMonth] = useState(() => toCalendarDate({ ...parts, day: 1 }));
  const [yearText, setYearText] = useState(String(month.getFullYear()));
  useEffect(() => setYearText(String(month.getFullYear())), [month]);
  const selected = toCalendarDate(parts);
  const candidate = writeDateTime(type, parts, seconds);
  const error = validate?.(candidate);
  const now = new Date();
  const today = todayValue ? toCalendarDate(readDateTime("date", todayValue)) : now;
  const nowParts = { ...parts, hour: now.getHours(), minute: now.getMinutes(), second: seconds ? now.getSeconds() : 0 };
  const nowInvalid = !!validate?.(writeDateTime(type, nowParts, seconds));

  function dayDisabled(day: Date) {
    if (day.getFullYear() < 1 || day.getFullYear() > 9999) return true;
    const next = withCalendarDate(parts, day);
    if (type === "date") return !!validate?.(writeDateTime("date", next));
    const date = writeDateTime("date", next);
    return !!((min && date < min.slice(0, 10)) || (max && date > max.slice(0, 10)));
  }
  function selectDay(day: Date) {
    if (compact && type === "date") {
      const date = writeDateTime("date", withCalendarDate(parts, day));
      if (!validate?.(date)) onApply(date);
      return;
    }
    setParts(current => withCalendarDate(current, day));
    setMonth(toCalendarDate({ ...withCalendarDate(parts, day), day: 1 }));
  }
  function moveMonth(direction: number) {
    const next = new Date(month);
    next.setMonth(next.getMonth() + direction);
    if (next.getFullYear() >= 1 && next.getFullYear() <= 9999) setMonth(next);
  }
  function changeYear(text: string) {
    setYearText(text);
    const year = Number(text);
    if (text && Number.isInteger(year) && year >= 1 && year <= 9999) {
      setMonth(toCalendarDate({ ...parts, year, month: month.getMonth() + 1, day: 1 }));
    }
  }
  function timeUnit(key: "hour" | "minute" | "second", label: string, options: string[]) {
    return <div className="form-time-unit">
      <label htmlFor={`${id}-${key}`}>{label}</label>
      <Select value={pad(parts[key])} onValueChange={value => setParts(current => ({ ...current, [key]: Number(value) }))}>
        <SelectTrigger id={`${id}-${key}`} data-prefix-icon="none" className="form-time-trigger"><SelectValue /></SelectTrigger>
        <SelectContent position="popper" className="form-time-menu">
          {options.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>;
  }

  return <div className="form-date-panel" data-form-date-picker={type} data-has-seconds={seconds || undefined} data-compact={compact || undefined}>
    {!compact && <div className="form-date-summary">
      <span className="form-date-summary-icon" aria-hidden="true">{type === "time" ? <Clock3 /> : <CalendarDays />}</span>
      <div className="min-w-0">
        <p className="form-date-eyebrow">{type === "time" ? "Selected time" : selected.toLocaleDateString("en", { weekday: "long" })}</p>
        <output aria-live="polite" aria-atomic="true" data-date-time-preview className="form-date-preview">
          <span>{type === "time" ? candidate : displayWheelDate(parts)}</span>
          <span className="form-date-preview-detail">{type === "datetime-local" ? `${writeDateTime("time", parts, seconds)} · 24-hour time` : type === "time" ? "24-hour format" : "Your selected date"}</span>
        </output>
      </div>
    </div>}

    <div className="form-date-layout">
      {type !== "time" && <section className="form-calendar-card" aria-label="Choose a date">
        <div className="form-picker-section-heading"><h3>Choose a date</h3><Button type="button" variant="ghost" size="sm" disabled={dayDisabled(today)} onClick={() => selectDay(today)}>{todayLabel}</Button></div>
        <div className="form-calendar-navigation">
          <div className="form-calendar-caption">
            <Select value={String(month.getMonth() + 1)} onValueChange={value => setMonth(toCalendarDate({ ...parts, year: month.getFullYear(), month: Number(value), day: 1 }))}>
              <SelectTrigger aria-label="Month" data-prefix-icon="none" className="form-month-trigger"><SelectValue><span className="form-month-long">{months[month.getMonth()].long}</span><span className="form-month-short">{months[month.getMonth()].short}</span></SelectValue></SelectTrigger>
              <SelectContent position="popper" className="form-calendar-menu">{months.map(option => <SelectItem key={option.value} value={option.value}>{option.long}</SelectItem>)}</SelectContent>
            </Select>
            <input aria-label="Year" data-prefix-icon="none" className="form-picker-year" type="number" placeholder="Year" min={1} max={9999} step={1} value={yearText} onChange={event => changeYear(event.target.value)} onBlur={() => setYearText(String(month.getFullYear()))} />
          </div>
          <div className="form-calendar-arrows">
            <Button type="button" variant="ghost" size="icon" aria-label="Previous month" disabled={month.getFullYear() === 1 && month.getMonth() === 0} onClick={() => moveMonth(-1)}><ChevronLeft aria-hidden="true" /></Button>
            <Button type="button" variant="ghost" size="icon" aria-label="Next month" disabled={month.getFullYear() === 9999 && month.getMonth() === 11} onClick={() => moveMonth(1)}><ChevronRight aria-hidden="true" /></Button>
          </div>
        </div>
        <Calendar mode="single" required autoFocus selected={selected} month={month} onMonthChange={setMonth} onSelect={selectDay}
          fixedWeeks showOutsideDays disabled={dayDisabled}
          startMonth={toCalendarDate({ ...parts, year: 1, month: 1, day: 1 })}
          endMonth={toCalendarDate({ ...parts, year: 9999, month: 12, day: 1 })}
          components={{ DayButton: FormPickerDayButton }}
          className="form-picker-calendar"
          classNames={{ months: "form-calendar-months", month: "form-calendar-month", month_caption: "hidden", nav: "hidden", month_grid: "form-calendar-grid", weekdays: "form-calendar-weekdays", weekday: "form-calendar-weekday", week: "form-calendar-week", day: "form-calendar-day", today: "form-calendar-today", outside: "form-calendar-outside", disabled: "form-calendar-disabled" }} />
      </section>}

      {type !== "date" && <section className="form-time-card" aria-label="Choose a time">
        <div className="form-picker-section-heading"><h3><Clock3 aria-hidden="true" /> Time</h3><div className="form-time-heading-actions"><span className="form-time-format" title="Local time in 24-hour format">24h</span><Button type="button" variant="ghost" size="sm" disabled={nowInvalid} onClick={() => setParts(nowParts)}>Now</Button></div></div>
        <div className="form-time-units" data-seconds={seconds || undefined}>
          {timeUnit("hour", "Hour", hours)}<span className="form-time-colon" aria-hidden="true">:</span>{timeUnit("minute", "Minute", minutes)}
          {seconds && <><span className="form-time-colon" aria-hidden="true">:</span>{timeUnit("second", "Second", minutes)}</>}
        </div>
        <p className="form-time-note">{type === "datetime-local" ? "Pick the date on the calendar, then set the time here." : "Choose your local time, then apply your selection."}</p>
      </section>}
    </div>

    {error && <p className="form-date-error" role="status">{error}</p>}
    <div className="form-date-actions">
      {onClear && <Button type="button" variant="ghost" className="mr-auto" onClick={onClear}>Clear</Button>}
      {compact && type === "date" ? <Button type="button" variant="ghost" disabled={dayDisabled(today)} onClick={() => selectDay(today)}>{todayLabel}</Button> : <>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="button" disabled={!!error} onClick={() => onApply(candidate)}><Check aria-hidden="true" className="size-4" /> Apply</Button>
      </>}
    </div>
  </div>;
}

/** Preserve native fields, React bindings, constraints and focus when opening the form picker. */
export function FormDateTimeInput({ children, type, compact = false }: { children: ReactElement<ComponentProps<"input">>; type: WheelPickerType; compact?: boolean }) {
  const titleId = useId();
  const returnFocus = useRef(true);
  const [control, setControl] = useState<HTMLInputElement | null>(null);
  const origin = useRef<HTMLInputElement | null>(null);
  const title = control?.getAttribute("aria-label") || control?.dataset.fieldLabel ||
    Array.from(control?.labels ?? []).map(label => label.textContent?.replace(/\*|\(optional\)/gi, "").trim()).join(" ") ||
    (type === "date" ? "Choose date" : type === "time" ? "Choose time" : "Choose date and time");
  function open(node: HTMLInputElement) {
    if (!node.disabled && !node.readOnly) { origin.current = node; returnFocus.current = true; setControl(node); }
  }
  function apply(value: string) {
    if (!control?.isConnected || control.disabled || control.readOnly) { setControl(null); return; }
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(control, value);
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
    setControl(null);
  }
  const input = cloneElement(children, {
      "aria-haspopup": "dialog",
      "aria-expanded": !!control,
      onClick: event => {
        children.props.onClick?.(event);
        if (!event.defaultPrevented && !event.currentTarget.disabled && !event.currentTarget.readOnly) {
          event.preventDefault(); open(event.currentTarget);
        }
      },
      onKeyDown: event => {
        children.props.onKeyDown?.(event);
        if (!event.defaultPrevented && (event.key === "Enter" || event.key === " " || (event.altKey && event.key === "ArrowDown"))) {
          event.preventDefault(); open(event.currentTarget);
        }
      },
    });
  const panel = control && <FormDateTimePanel type={type} value={control.value} min={control.min} max={control.max} compact={compact}
    seconds={type !== "date" && ((control.step !== "" && control.step !== "any" && Number(control.step) < 60) || /:\d{2}:\d{2}/.test(control.value))}
    validate={candidate => {
      const probe = control.cloneNode() as HTMLInputElement;
      probe.value = candidate;
      return probe.validity.valid ? undefined : probe.validationMessage || "Choose a value within the allowed range.";
    }} onApply={apply} onCancel={() => setControl(null)} onClear={control.required ? undefined : () => apply("")} />;
  if (compact) return <Popover open={!!control} onOpenChange={open => { if (!open) setControl(null); }}>
    <PopoverAnchor asChild>{input}</PopoverAnchor>
    <PopoverContent className="filter-date-popover" data-date-picker-kind={type} align="start" sideOffset={6} collisionPadding={12}
      aria-labelledby={titleId}
      onInteractOutside={() => { returnFocus.current = false; }}
      onCloseAutoFocus={event => {
        event.preventDefault();
        if (returnFocus.current && origin.current?.isConnected) origin.current.focus();
      }}>
      <p id={titleId} className="filter-date-title">{title}</p>
      {panel}
    </PopoverContent>
  </Popover>;
  return <>{input}
    <Dialog open={!!control} onOpenChange={open => { if (!open) setControl(null); }}>
      <DialogContent className="form-date-dialog" data-date-picker-kind={type} onCloseAutoFocus={event => {
        event.preventDefault();
        if (origin.current?.isConnected) origin.current.focus();
      }}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{type === "datetime-local" ? "Choose a date and set the time." : type === "date" ? "Choose a date from the calendar." : "Choose a time in 24-hour format."}</DialogDescription>
        </DialogHeader>
        {panel}
      </DialogContent>
    </Dialog>
  </>;
}
