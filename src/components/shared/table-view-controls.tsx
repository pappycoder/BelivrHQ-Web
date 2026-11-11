"use client";

import { useState } from "react";
import { Columns3, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { TableColumn } from "@/contexts/table-columns-context";

export function TableViewControls({
  compactRows,
  compactColumns,
  onRowsChange,
  onColumnsChange,
}: {
  compactRows: boolean;
  compactColumns: boolean;
  onRowsChange: (compact: boolean) => void;
  onColumnsChange: (compact: boolean) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="size-4" />
          Table view
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] space-y-4">
        <h3 className="font-semibold">Table size</h3>
        <div>
          <p className="mb-2 text-sm font-medium">Row spacing</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={!compactRows ? "default" : "outline"}
              aria-pressed={!compactRows}
              onClick={() => onRowsChange(false)}
            >
              Comfortable rows
            </Button>
            <Button
              size="sm"
              variant={compactRows ? "default" : "outline"}
              aria-pressed={compactRows}
              onClick={() => onRowsChange(true)}
            >
              Compact rows
            </Button>
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Column width</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={!compactColumns ? "default" : "outline"}
              aria-pressed={!compactColumns}
              onClick={() => onColumnsChange(false)}
            >
              Expand columns
            </Button>
            <Button
              size="sm"
              variant={compactColumns ? "default" : "outline"}
              aria-pressed={compactColumns}
              onClick={() => onColumnsChange(true)}
            >
              Compact columns
            </Button>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Compact text uses ellipses. Headers stay full size, and number and currency columns keep
          their width.
        </p>
      </PopoverContent>
    </Popover>
  );
}

export function TableColumnActions({
  columns,
  hidden,
  onHiddenChange,
  onWidthChange,
}: {
  columns: TableColumn[];
  hidden: string[];
  onHiddenChange: (ids: string[]) => void;
  onWidthChange: (ids: string[], size: "compact" | "expanded") => void;
}) {
  const [selection, setSelection] = useState<string[]>([]);
  const choices = columns.filter(
    (column) => column.label && !/^(actions?|options?|manage)$/i.test(column.label),
  );
  const selected = selection.filter((id) => choices.some((column) => column.id === id));
  const hideable = choices
    .filter((column) => selected.includes(column.id) && column.hideable)
    .map((column) => column.id);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Columns3 className="size-4" />
          Column actions
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] space-y-3">
        <h3 className="font-semibold">Select columns</h3>
        <div className="flex gap-2">
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setSelection(choices.map((column) => column.id))}
          >
            Select all columns
          </Button>
          <Button
            size="xs"
            variant="ghost"
            disabled={!selected.length}
            onClick={() => setSelection([])}
          >
            Clear column selection
          </Button>
        </div>
        <div className="max-h-60 overflow-y-auto space-y-1">
          {choices.map((column) => (
            <label
              key={column.id}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent"
            >
              <input
                type="checkbox"
                aria-label={`Select column ${column.label}`}
                checked={selected.includes(column.id)}
                onChange={(event) =>
                  setSelection(
                    event.target.checked
                      ? [...selected, column.id]
                      : selected.filter((id) => id !== column.id),
                  )
                }
              />
              <span className="min-w-0 flex-1 truncate">{column.label}</span>
              {!column.hideable && <span className="text-sm text-muted-foreground">Fixed</span>}
              {hidden.includes(column.id) && (
                <span className="text-sm text-muted-foreground">Hidden</span>
              )}
            </label>
          ))}
        </div>
        <p role="status" className="text-sm text-muted-foreground">
          {selected.length} columns selected
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!hideable.length}
            onClick={() => onHiddenChange([...new Set([...hidden, ...hideable])])}
          >
            Hide selected
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!selected.length}
            onClick={() => onHiddenChange(hidden.filter((id) => !selected.includes(id)))}
          >
            Show selected
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!selected.length}
            onClick={() => onWidthChange(selected, "compact")}
          >
            Compact selected
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!selected.length}
            onClick={() => onWidthChange(selected, "expanded")}
          >
            Expand selected
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Fixed identifiers stay visible. Numeric and currency widths are preserved.
        </p>
      </PopoverContent>
    </Popover>
  );
}
