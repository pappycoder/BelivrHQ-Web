"use client";

import { useState, useEffect, useId } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import { inputPlaceholder } from "@/lib/input-placeholder";
import type { FormField } from "@/hooks/use-forms";

export interface FormFieldsRendererProps {
  fields: FormField[];
  initialValues?: Record<string, unknown>;
  showOptional?: boolean;
  validateRequired?: boolean;
  disabled?: boolean;
  onChange: (data: Record<string, unknown>) => void;
}

function hasAnswer(value: unknown) {
  return value !== undefined && value !== null && (typeof value !== "string" || !!value.trim()) && (!Array.isArray(value) || value.length > 0);
}

function initialData(fields: FormField[]): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const f of fields) {
    data[f.key] = f.type === "checkbox" ? [] : "";
  }
  return data;
}

export function FormFieldsRenderer({ fields, disabled, onChange, initialValues, showOptional, validateRequired }: FormFieldsRendererProps) {
  const fieldId = useId();
  const [data, setData] = useState<Record<string, unknown>>(() => ({ ...initialData(fields), ...initialValues }));

  useEffect(() => {
    setData({ ...initialData(fields), ...initialValues });
  }, [fields, initialValues]);

  const update = (key: string, value: unknown) => {
    const next = { ...data, [key]: value };
    setData(next);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {fields.length === 0 && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          This form has no fields to complete.
        </p>
      )}

      {fields.map((field) => (
        <div key={field.key} className="space-y-1.5">
          <Label
            id={`${fieldId}-${field.key}-label`}
            htmlFor={field.type === "checkbox" ? undefined : `${fieldId}-${field.key}`}
            className="text-sm"
          >
            {field.label}
            {field.required && <span className="ml-1 text-destructive">*</span>}
            {showOptional && !field.required && <span className="ml-2 text-xs text-muted-foreground">(optional)</span>}
          </Label>

          {field.type === "textarea" && (
            <Textarea
              id={`${fieldId}-${field.key}`}
              name={field.key}
              data-field-label={field.label}
              placeholder={inputPlaceholder(field.type, field.label)}
              value={String(data[field.key] ?? "")}
              onChange={(e) => update(field.key, e.target.value)}
              disabled={disabled}
              aria-required={!!field.required}
              aria-invalid={validateRequired && field.required && !hasAnswer(data[field.key]) ? true : undefined}
            />
          )}

          {field.type === "number" && (
            <Input
              id={`${fieldId}-${field.key}`}
              name={field.key}
              data-field-label={field.label}
              placeholder={inputPlaceholder(field.type, field.label)}
              type="number"
              value={String(data[field.key] ?? "")}
              onChange={(e) => update(field.key, e.target.value)}
              disabled={disabled}
              aria-required={!!field.required}
              aria-invalid={validateRequired && field.required && !hasAnswer(data[field.key]) ? true : undefined}
            />
          )}

          {field.type === "date" && (
            <Input
              id={`${fieldId}-${field.key}`}
              name={field.key}
              data-field-label={field.label}
              placeholder={inputPlaceholder(field.type, field.label)}
              type="date"
              value={String(data[field.key] ?? "")}
              onChange={(e) => update(field.key, e.target.value)}
              disabled={disabled}
              aria-required={!!field.required}
              aria-invalid={validateRequired && field.required && !hasAnswer(data[field.key]) ? true : undefined}
            />
          )}

          {field.type === "dropdown" && (
            <Select
              value={String(data[field.key] ?? "")}
              onValueChange={(value) => update(field.key, value)}
              disabled={disabled}
            >
              <SelectTrigger id={`${fieldId}-${field.key}`} className="w-full" aria-required={!!field.required} aria-invalid={validateRequired && field.required && !hasAnswer(data[field.key]) ? true : undefined}>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {(field.options ?? []).map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {field.type === "checkbox" && (
            <div
              className="grid gap-2"
              role="group"
              aria-labelledby={`${fieldId}-${field.key}-label`}
            >
              {(field.options ?? []).map((opt) => {
                const selected = Array.isArray(data[field.key])
                  ? (data[field.key] as string[])
                  : [];
                return (
                  <label key={opt} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selected.includes(opt)}
                      onCheckedChange={(checked) =>
                        update(
                          field.key,
                          checked ? [...selected, opt] : selected.filter((o) => o !== opt),
                        )
                      }
                      disabled={disabled}
                      aria-invalid={validateRequired && field.required && !hasAnswer(data[field.key]) ? true : undefined}
                    />
                    {opt}
                  </label>
                );
              })}
            </div>
          )}

          {(field.type === "text" || field.type === "email" || field.type === "phone") && (
            <Input
              id={`${fieldId}-${field.key}`}
              name={field.key}
              data-field-label={field.label}
              placeholder={inputPlaceholder(field.type, field.label)}
              type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
              value={String(data[field.key] ?? "")}
              onChange={(e) => update(field.key, e.target.value)}
              disabled={disabled}
              aria-required={!!field.required}
              aria-invalid={validateRequired && field.required && !hasAnswer(data[field.key]) ? true : undefined}
            />
          )}
        </div>
      ))}
    </div>
  );
}
