"use client";

import { Button } from "@/components/ui/button";

export function AttendanceSelectionBar({ count, busy, disabled, onSave, onClear, meeting = false, editable = true }: {
  count: number; busy?: boolean; disabled?: boolean; onSave: () => void; onClear: () => void; meeting?: boolean; editable?: boolean;
}) {
  return <div className="relative z-10 mx-auto mb-3 w-[calc(100%_-_2rem)] max-w-xl flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-card p-3 shadow-lg" data-export-ignore>
    <div aria-live="polite"><p className="text-sm font-semibold">{count} selected</p><p className="text-xs text-ink-muted">{!editable ? "Attendance is locked for viewing." : count ? "Selection has not been saved yet." : "Select people from the roster to begin."}</p></div>
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="ghost" disabled={!editable || busy || !count} onClick={onClear}>Clear selection</Button>
      <Button type="button" className="scroll-mb-24" disabled={!editable || busy || disabled || !count} onClick={onSave}>{busy ? "Saving…" : meeting ? `Save attendance (${count})` : `Check in (${count})`}</Button>
    </div>
  </div>;
}
