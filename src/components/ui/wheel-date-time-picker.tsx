"use client";

import { cloneElement, useEffect, useLayoutEffect, useRef, useState, type ComponentProps, type ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { displayWheelDate, daysInMonth, readDateTime, updateDateTime, writeDateTime, type DateTimeParts, type WheelPickerType } from "@/lib/wheel-date-time";

const ROW = 40;
const numbers = (start: number, end: number) => Array.from({ length: end - start + 1 }, (_, i) => start + i);
const YEARS = numbers(1, 9999);
const MONTHS = numbers(1, 12);
const HOURS = numbers(0, 23);
const MINUTES = numbers(0, 59);
const monthLabel = (month: number) => new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(2000, month - 1, 1));
const twoDigits = (value: number) => String(value).padStart(2, "0");

/** Native momentum with a settled selection, and a virtual ruler for long year ranges. */
function WheelColumn({ label, values, value, onChange, format = String }: {
  label: string; values: number[]; value: number; onChange: (value: number) => void; format?: (value: number) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const emitted = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const index = Math.max(0, values.indexOf(value));
  const [position, setPosition] = useState(index);
  const [scrolling, setScrolling] = useState(false);
  useLayoutEffect(() => {
    if (emitted.current === value) return;
    const node = ref.current;
    if (!node) return;
    node.scrollTop = index * ROW;
    setPosition(index);
  }, [index, value]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const centre = Math.round(position);
  const start = values.length > 150 ? Math.max(0, centre - 8) : 0;
  const end = values.length > 150 ? Math.min(values.length, centre + 9) : values.length;
  function select(next: number) {
    emitted.current = null;
    onChange(values[Math.max(0, Math.min(values.length - 1, next))]);
  }
  return <div className="wheel-column">
    <span className="wheel-column-label">{label}</span>
    <div className="wheel-ruler">
      <div ref={ref} role="spinbutton" tabIndex={0} aria-label={label}
        aria-valuemin={values[0]} aria-valuemax={values[values.length - 1]} aria-valuenow={value} aria-valuetext={format(value)}
        className="wheel-scroll" data-scrolling={scrolling ? "true" : "false"}
        onKeyDown={(event) => {
          const next = { ArrowUp: index + 1, ArrowDown: index - 1, PageUp: index + 5, PageDown: index - 5, Home: 0, End: values.length - 1 }[event.key];
          if (next !== undefined) { event.preventDefault(); select(next); }
        }}
        onScroll={(event) => {
          const next = Math.max(0, Math.min(values.length - 1, Math.round(event.currentTarget.scrollTop / ROW)));
          setPosition(event.currentTarget.scrollTop / ROW);
          setScrolling(true);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            const node = ref.current;
            if (!node) return;
            const target = Math.max(0, Math.min(values.length - 1, Math.round(node.scrollTop / ROW))) * ROW;
            if (Math.abs(node.scrollTop - target) > .5) {
              node.scrollTo({ top: target, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
            } else setScrolling(false);
          }, 160);
          emitted.current = values[next];
          if (values[next] !== value) onChange(values[next]);
        }}>
        <div style={{ height: values.length * ROW, position: "relative" }} aria-hidden="true">
          {values.slice(start, end).map((item, offset) => <div key={item}
            style={{ position: "absolute", top: (start + offset) * ROW, left: 0, right: 0 }}
            className="wheel-tick" data-selected={item === value ? "true" : "false"} data-major={(start + offset) % 5 === 0 ? "true" : "false"}
            onClick={() => select(start + offset)}>
              <span className="wheel-tick-label" style={{
                transform: `perspective(180px) rotateX(${Math.max(-65, Math.min(65, (position - start - offset) * 24))}deg) scale(${Math.max(.7, 1.08 - Math.abs(start + offset - position) * .12)})`,
                opacity: Math.max(.25, 1 - Math.abs(start + offset - position) * .2),
              }}>{format(item)}</span>
            </div>)}
        </div>
      </div>
    </div>
  </div>;
}

export function WheelDateTimePanel({ type, value, onApply, onCancel, onClear, validate, seconds = false }: {
  type: WheelPickerType; value: string; onApply: (value: string) => void; onCancel: () => void; onClear?: () => void;
  validate?: (value: string) => string | undefined; seconds?: boolean;
}) {
  const [parts, setParts] = useState(() => readDateTime(type, value));
  const candidate = writeDateTime(type, parts, seconds);
  const error = validate?.(candidate);
  const column = (key: keyof DateTimeParts, label: string, values: number[], format?: (value: number) => string) =>
    <WheelColumn key={key} label={label} values={values} value={parts[key]} format={format}
      onChange={(next) => setParts((current) => updateDateTime(current, key, next))} />;
  return <div className="space-y-3" data-wheel-picker={type}>
    <output className="wheel-preview" aria-live="polite" aria-atomic="true" data-wheel-preview>
      <span>{type === "time" ? candidate : displayWheelDate(parts)}</span>
      {type === "time" && <span className="wheel-preview-time">24-hour time</span>}
      {type === "datetime-local" && <> <span className="wheel-preview-time">{writeDateTime("time", parts, seconds)} · 24h</span></>}
    </output>
    {type !== "time" && <div className="wheel-columns" role="group" aria-label="Date">
      {column("day", "Day", numbers(1, daysInMonth(parts.year, parts.month)), twoDigits)}
      {column("month", "Month", MONTHS, monthLabel)}
      {column("year", "Year", YEARS)}
    </div>}
    {type !== "date" && <div className="wheel-columns wheel-time-columns" role="group" aria-label="Time in 24-hour format" style={{ gridTemplateColumns: `repeat(${seconds ? 3 : 2}, minmax(0, 1fr))` }}>
      {column("hour", "Hour", HOURS, twoDigits)}
      {column("minute", "Minute", MINUTES, twoDigits)}
      {seconds && column("second", "Second", MINUTES, twoDigits)}
    </div>}
    {error && <p className="text-sm text-destructive" role="status">{error}</p>}
    <div className="flex flex-wrap items-center justify-end gap-2">
      {onClear && <Button type="button" variant="ghost" className="mr-auto" onClick={onClear}>Clear</Button>}
      <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      <Button type="button" disabled={!!error} onClick={() => onApply(candidate)}>Apply</Button>
    </div>
  </div>;
}

/** Keep the native input, ref, constraints and form contract; replace its popup only. */
export function WheelPickerInput({ children, type }: { children: ReactElement<ComponentProps<"input">>; type: WheelPickerType }) {
  const [control, setControl] = useState<HTMLInputElement | null>(null);
  const origin = useRef<HTMLInputElement | null>(null);
  const title = control?.getAttribute("aria-label") || control?.dataset.fieldLabel ||
    Array.from(control?.labels ?? []).map((label) => label.textContent?.replace(/\*|\(optional\)/gi, "").trim()).join(" ") ||
    (type === "date" ? "Choose date" : type === "time" ? "Choose time" : "Choose date and time");
  function open(node: HTMLInputElement) {
    if (!node.disabled && !node.readOnly) { origin.current = node; setControl(node); }
  }
  function apply(value: string) {
    if (!control?.isConnected || control.disabled || control.readOnly) { setControl(null); return; }
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(control, value);
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
    setControl(null);
  }
  return <>
    {cloneElement(children, {
      "aria-haspopup": "dialog",
      "aria-expanded": !!control,
      onClick: (event) => {
        children.props.onClick?.(event);
        if (!event.defaultPrevented && !event.currentTarget.disabled && !event.currentTarget.readOnly) {
          event.preventDefault(); open(event.currentTarget);
        }
      },
      onKeyDown: (event) => {
        children.props.onKeyDown?.(event);
        if (!event.defaultPrevented && (event.key === "Enter" || event.key === " " || (event.altKey && event.key === "ArrowDown"))) {
          event.preventDefault(); open(event.currentTarget);
        }
      },
    })}
    <Dialog open={!!control} onOpenChange={(open) => { if (!open) setControl(null); }}>
      <DialogContent className="wheel-picker-dialog gap-3 border-0 sm:max-w-xs" onCloseAutoFocus={(event) => {
        event.preventDefault();
        // The native field remains the focus target even inside another form dialog.
        if (origin.current?.isConnected) origin.current.focus();
      }}>
        <DialogHeader>
          <DialogTitle className="text-sm">{title}</DialogTitle>
          <DialogDescription className="sr-only">Scroll the ruler to choose. Use arrow keys for precise changes.</DialogDescription>
        </DialogHeader>
        {control && <WheelDateTimePanel type={type} value={control.value}
          seconds={type !== "date" && ((control.step !== "" && control.step !== "any" && Number(control.step) < 60) || /:\d{2}:\d{2}/.test(control.value))}
          validate={(candidate) => {
            const probe = control.cloneNode() as HTMLInputElement;
            probe.value = candidate;
            return probe.validity.valid ? undefined : probe.validationMessage || "Choose a value within the allowed range.";
          }}
          onApply={apply} onCancel={() => setControl(null)} onClear={control.required ? undefined : () => apply("")} />}
      </DialogContent>
    </Dialog>
  </>;
}
