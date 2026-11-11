"use client";

import { PersonAvatar } from "@/components/paper/primitives";
import { Tag } from "@/components/paper/stat";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

export interface AttendanceRosterRow {
  id: string;
  name: string;
  detail?: string;
  avatar?: string;
  recorded?: boolean;
  status?: string;
}

export function AttendanceEditToggle({
  editable,
  busy,
  onEdit,
  onCancel,
}: {
  editable: boolean;
  busy?: boolean;
  onEdit: () => void;
  onCancel: () => void;
}) {
  return (
    <Button
      type="button"
      variant={editable ? "ghost" : "outline"}
      size="sm"
      disabled={busy}
      onClick={editable ? onCancel : onEdit}
    >
      {editable ? "Cancel editing" : "Edit attendance"}
    </Button>
  );
}

/** Selection is a draft; confirmed attendance is never removed by this table. */
export function AttendanceRosterTable({
  rows,
  selected,
  onToggle,
  onSelectAll,
  editable,
  busy,
  onEdit,
  onCancel,
}: {
  rows: AttendanceRosterRow[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: (ids: string[], selected: boolean) => void;
  editable: boolean;
  busy?: boolean;
  onEdit: () => void;
  onCancel: () => void;
}) {
  const available = rows.filter((row) => !row.recorded);
  const allSelected =
    available.length > 0 && available.every((row) => selected.has(row.id));
  const anySelected = available.some((row) => selected.has(row.id));
  const selectVisible = () =>
    onSelectAll(
      available.map((row) => row.id),
      !allSelected,
    );
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
        <div>
          <p className="text-sm font-semibold">
            {editable ? "Edit mode" : "View mode"}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {editable
              ? "Select people, then save to confirm their attendance."
              : "Selection is locked. Choose Edit attendance to make changes."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {editable ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy || !available.length}
                onClick={selectVisible}
              >
                {allSelected ? "Deselect all shown" : "Select all shown"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={onCancel}
              >
                Cancel editing
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={onEdit}
            >
              Edit attendance
            </Button>
          )}
        </div>
      </div>
      <div
        role="region"
        aria-label="Scrollable attendance roster"
        tabIndex={0}
        className="max-h-[52vh] overflow-auto overscroll-contain rounded-b-xl"
      >
        <table
          className="w-full text-left text-xs"
          aria-label="Individual attendance roster"
        >
          <thead className="sticky top-0 z-10 border-b border-line bg-card text-[10px] uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="w-11 p-3 font-medium">
                <Checkbox
                  aria-label="Select all visible people"
                  disabled={!editable || busy || !available.length}
                  checked={
                    allSelected ? true : anySelected ? "indeterminate" : false
                  }
                  onCheckedChange={selectVisible}
                />
              </th>
              <th className="px-2 py-3 font-medium">Person</th>
              <th className="w-24 px-3 py-3 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {rows.map((row) => (
              <tr
                key={row.id}
                className={
                  selected.has(row.id) ? "bg-brand/5" : "hover:bg-muted/30"
                }
              >
                <td className="p-3">
                  <Checkbox
                    aria-label={`Select ${row.name}`}
                    disabled={!editable || busy || row.recorded}
                    checked={selected.has(row.id) || !!row.recorded}
                    onCheckedChange={() => onToggle(row.id)}
                  />
                </td>
                <td className="min-w-0 px-2 py-3">
                  <div className="flex items-center gap-2.5">
                    <PersonAvatar name={row.name} src={row.avatar} size="xs" />
                    <span className="min-w-0 break-words">
                      <span className="block font-medium">{row.name}</span>
                      {row.detail && (
                        <span className="mt-0.5 block break-all text-[10px] text-ink-faint">
                          {row.detail}
                        </span>
                      )}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 text-right">
                  <Tag
                    tone={
                      row.recorded
                        ? "moss"
                        : selected.has(row.id)
                          ? "sky"
                          : "neutral"
                    }
                  >
                    {row.recorded
                      ? "Saved"
                      : selected.has(row.id)
                        ? "Selected"
                        : (row.status ?? "Ready")}
                  </Tag>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={3} className="p-6 text-center text-ink-muted">
                  No people match this roster.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
