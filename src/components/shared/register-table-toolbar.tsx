"use client";

import type { ComponentProps, ReactNode } from "react";
import { collectionLabel } from "@/lib/collection-label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ColumnSelector } from "./column-selector";
import { TableOptions } from "./table-options";

/** Shared controls for native tables and Paper grid registers. */
export function RegisterTableToolbar({
  visibleCount, selectedCount, allSelected, selectable = true,
  onToggleAll, onClearSelection, bulkActions, selectionExport, exportAction,
  columns, hidden, onHiddenChange, view, onWidthChange,
}: {
  visibleCount: number;
  selectedCount: number;
  allSelected: boolean;
  selectable?: boolean;
  onToggleAll: () => void;
  onClearSelection: () => void;
  bulkActions?: ReactNode;
  selectionExport?: ReactNode;
  exportAction?: ReactNode;
  columns: ComponentProps<typeof ColumnSelector>["columns"];
  hidden: string[];
  onHiddenChange: (ids: string[]) => void;
  view: ComponentProps<typeof TableOptions>["view"];
  onWidthChange: ComponentProps<typeof TableOptions>["onWidthChange"];
}) {
  return (
    <div data-export-ignore data-register-toolbar className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2">
      {selectable && <Checkbox
        disabled={!visibleCount}
        aria-label="Select all visible records"
        checked={allSelected ? true : selectedCount ? "indeterminate" : false}
        onCheckedChange={onToggleAll}
      />}
      <span className="mr-auto text-sm text-ink-soft" role="status">
        {selectedCount ? `${selectedCount} selected on this page` : `${visibleCount} ${collectionLabel(visibleCount, "records")} on this page`}
      </span>
      {bulkActions}
      {selectedCount > 0 && <>
        {selectionExport}
        <Button size="sm" variant="ghost" className="rounded-full" onClick={onClearSelection}>Clear selection</Button>
      </>}
      <ColumnSelector columns={columns} hidden={hidden} onChange={onHiddenChange} />
      {exportAction}
      <TableOptions view={view} columns={columns} hidden={hidden} onHiddenChange={onHiddenChange} onWidthChange={onWidthChange} />
    </div>
  );
}
