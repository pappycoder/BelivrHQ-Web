"use client";

import { useId } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/shared/loading-state";
import { usePermissions } from "@/hooks/use-permissions";
import { useEventsList, type EventItem } from "@/hooks/use-events";
import { formatDate } from "@/hooks/use-media";
import { cn } from "@/lib/utils";
import { getToastErrorMessage } from "@/lib/toast";

/** Match the register's explicit scope, including past events with issued tickets. */
export function useEventPickerEvents() {
  return useEventsList({ page: 1, limit: 100, status: "all", sortBy: "startDate", sortOrder: "desc" });
}

export type EventPickerState = "loading" | "restricted" | "error" | "empty" | "ready";
export function eventPickerState({ ready, allowed, pending, error, count }: {
  ready: boolean; allowed: boolean; pending: boolean; error: boolean; count: number;
}): EventPickerState {
  if (!ready) return "loading";
  if (!allowed) return "restricted";
  if (error) return "error";
  if (pending) return "loading";
  return count ? "ready" : "empty";
}

export function EventPicker({ query, value, onValueChange, items, disabled = false, label = "Event selector", className, showPricing = false }: {
  query: Pick<ReturnType<typeof useEventsList>, "data" | "isPending" | "isError" | "isFetching" | "error" | "refetch">;
  value: string;
  onValueChange: (value: string) => void;
  items?: EventItem[];
  disabled?: boolean;
  label?: string;
  className?: string;
  showPricing?: boolean;
}) {
  const feedbackId = useId();
  const { ready, can } = usePermissions();
  const rows = items ?? query.data?.data ?? [];
  const selectedTitle = rows.find(event => event.eventId === value)?.title;
  const state = eventPickerState({ ready, allowed: can("events:list", "read"), pending: query.isPending, error: query.isError, count: rows.length });
  const placeholder = { loading: "Loading events…", restricted: "Event access unavailable", error: "Events unavailable", empty: "No events available", ready: "Choose an event…" }[state];
  return (
    <div data-event-picker-state={state} className="w-full min-w-0 max-w-full space-y-2 sm:w-[32rem] sm:flex-none">
      <select
        data-event-picker-control
        title={selectedTitle}
        aria-label={label}
        aria-describedby={state !== "ready" ? feedbackId : undefined}
        aria-busy={state === "loading"}
        value={value}
        disabled={disabled || state === "restricted" || (!rows.length && state !== "ready")}
        onChange={event => onValueChange(event.target.value)}
        className={cn("h-9 w-full min-w-0 max-w-full rounded-full border border-line bg-card px-3 text-sm outline-none disabled:opacity-60", className)}
      >
        <option value="">{placeholder}</option>
        {rows.map(event => <option key={event.eventId} value={event.eventId}>{event.title} · {formatDate(event.startDate)}{showPricing && event.isFree ? " (free)" : ""}</option>)}
      </select>
      {selectedTitle && state !== "restricted" ? <p data-event-selection-name aria-hidden="true" className="break-words text-sm text-ink-soft sm:hidden">{selectedTitle}</p> : null}
      {state === "loading" ? <div id={feedbackId}><LoadingState variant="inline" label="Loading events" /></div> : null}
      {state === "restricted" ? <p id={feedbackId} role="status" className="text-sm text-ink-soft">Your role cannot browse event choices. Ask your church administrator for access.</p> : null}
      {state === "error" || state === "empty" ? (
        <div id={feedbackId} role={state === "error" ? "alert" : "status"} className="paper-card space-y-2 rounded-xl border border-line p-4 text-sm">
          <p className="font-medium text-ink">{state === "error" ? "Couldn't load events" : "No events available"}</p>
          <p className="text-ink-soft">{state === "error" ? getToastErrorMessage(query.error, "Check your connection and try again.") : "There are no events available within your access. Refresh the list or open the events calendar."}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" disabled={query.isFetching || disabled} onClick={() => void query.refetch()}>{query.isFetching ? "Refreshing…" : "Refresh events"}</Button>
            <Button asChild size="sm" variant="ghost"><Link href="/gatherings/events">Open events</Link></Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
