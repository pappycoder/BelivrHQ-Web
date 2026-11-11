"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Columns3, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import type { TableColumn } from "@/contexts/table-columns-context";

export function ColumnSelector({ columns, hidden, onChange }: {
  columns: TableColumn[]; hidden: string[]; onChange: (hidden: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const choices = columns.filter((column) => !!column.label);
  const filtered = choices.filter((column) => column.label.toLowerCase().includes(query.toLowerCase()));
  const visibleCount = choices.filter((column) => !hidden.includes(column.id)).length;
  if (!choices.length) return null;
  return (
    <DropdownMenu onOpenChange={(open) => { if (!open) setQuery(""); }}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Choose visible columns">
          <Columns3 className="h-4 w-4" />
          Columns <span className="text-muted-foreground text-sm">{visibleCount}/{choices.length}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <Input aria-label="Find columns" placeholder="Find columns…" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key !== "Escape") event.stopPropagation(); }} />
        <div className="max-h-72 overflow-y-auto">
          {filtered.map((column) => {
            const checked = !hidden.includes(column.id);
            const fixedData = columns.some((choice) => !choice.hideable && choice.label && !/^(actions?|options?|manage)$/i.test(choice.label));
            return <DropdownMenuCheckboxItem key={column.id} checked={checked}
              disabled={!column.hideable || (checked && !fixedData && visibleCount === 1)}
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={(value) => onChange(value ? hidden.filter((id) => id !== column.id) : [...hidden, column.id])}>
              {column.label}{!column.hideable && <span className="ml-auto text-xs text-muted-foreground">Fixed</span>}
            </DropdownMenuCheckboxItem>;
          })}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onChange(columns.filter((column) => column.defaultHidden).map((column) => column.id))}>
          <RotateCcw className="h-4 w-4" /> Reset default columns
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!hidden.length} onSelect={() => onChange([])}>
          <RotateCcw className="h-4 w-4" /> Show all columns
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
