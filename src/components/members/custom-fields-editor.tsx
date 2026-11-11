"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface CustomFieldRow {
  key: string;
  value: string;
}

/** Converts stored `customFields` JSON into editable form rows. */
export function customFieldsToRows(
  customFields?: Record<string, unknown> | null
): CustomFieldRow[] {
  if (!customFields) return [];
  return Object.entries(customFields).map(([key, value]) => ({
    key,
    value: value === null || value === undefined ? "" : String(value),
  }));
}

/**
 * Converts editor rows back into a `customFields` record.
 * Empty-key rows are dropped; duplicate keys resolve last-wins.
 * Returns undefined when nothing remains.
 */
export function rowsToCustomFields(
  rows?: CustomFieldRow[] | null
): Record<string, string> | undefined {
  if (!rows || rows.length === 0) return undefined;
  const record: Record<string, string> = {};
  for (const row of rows) {
    const key = row.key.trim();
    if (!key) continue;
    record[key] = row.value.trim();
  }
  return Object.keys(record).length > 0 ? record : undefined;
}

interface CustomFieldsEditorProps {
  rows: CustomFieldRow[];
  onChange: (rows: CustomFieldRow[]) => void;
  disabled?: boolean;
}

/**
 * Repeatable label/value pair editor for member `customFields`.
 * The parent owns the array state (typically via RHF useFieldArray).
 */
export function CustomFieldsEditor({
  rows,
  onChange,
  disabled,
}: CustomFieldsEditorProps) {
  const updateRow = (index: number, patch: Partial<CustomFieldRow>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeRow = (index: number) => {
    onChange(rows.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {rows.length > 0 && (
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <p className="text-sm font-medium text-muted-foreground px-1">Label</p>
          <p className="text-sm font-medium text-muted-foreground px-1">Value</p>
          <span className="w-9" />
        </div>
      )}
      {rows.map((row, index) => (
        <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
          <Input
            placeholder="e.g. Occupation"
            value={row.key}
            disabled={disabled}
            onChange={(e) => updateRow(index, { key: e.target.value })}
          />
          <Input
            placeholder="e.g. Engineer"
            value={row.value}
            disabled={disabled}
            onChange={(e) => updateRow(index, { value: e.target.value })}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
            disabled={disabled}
            onClick={() => removeRow(index)}
            aria-label={`Remove field ${row.key || index + 1}`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => onChange([...rows, { key: "", value: "" }])}
      >
        <Plus className="h-4 w-4 mr-1.5" />
        Add Field
      </Button>
    </div>
  );
}
