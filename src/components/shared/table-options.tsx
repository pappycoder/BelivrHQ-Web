"use client";

import { Settings2 } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TableColumnActions, TableViewControls } from "./table-view-controls";
import { ColumnSelector } from "./column-selector";

/** Keep advanced table configuration together without changing export or selection. */
export function TableOptions({
  view,
  columns,
  hidden,
  onHiddenChange,
  onWidthChange,
}: {
  view: ComponentProps<typeof TableViewControls>;
  columns: ComponentProps<typeof ColumnSelector>["columns"];
  hidden: string[];
  onHiddenChange: (ids: string[]) => void;
  onWidthChange: ComponentProps<typeof TableColumnActions>["onWidthChange"];
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="size-4" />
          Table options
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="space-y-3"
        aria-label="Table options"
      >
        <h3 className="text-sm font-semibold">Display and columns</h3>
        <p className="text-sm text-muted-foreground">
          Adjust spacing, choose visible columns, or resize several columns
          together.
        </p>
        <div className="flex flex-wrap gap-2">
          <TableViewControls {...view} />
          <ColumnSelector
            columns={columns}
            hidden={hidden}
            onChange={onHiddenChange}
          />
          <TableColumnActions
            columns={columns}
            hidden={hidden}
            onHiddenChange={onHiddenChange}
            onWidthChange={onWidthChange}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
