"use client";

import { cn } from "@/lib/utils";
import { useId, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ClipboardList,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FIELD_TYPES,
  FIELD_TYPE_LABELS,
  type FormField,
  type FieldType,
} from "@/hooks/use-forms";

export interface FormFieldsEditorProps {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
  disabled?: boolean;
  showErrors?: boolean;
}

export function FormFieldsEditor({
  fields,
  onChange,
  disabled,
  showErrors = false,
}: FormFieldsEditorProps) {
  const id = useId();
  const [active, setActive] = useState(0);
  const update = (index: number, patch: Partial<FormField>) =>
    onChange(
      fields.map((field, i) => (i === index ? { ...field, ...patch } : field)),
    );
  const move = (index: number, offset: number) => {
    const next = [...fields];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    onChange(next);
    setActive(index + offset);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Choose a question to edit. Use Move up or Move down to change the order.
      </p>
      {!fields.length && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-background px-4 py-8 text-center">
          <span className="rounded-2xl bg-brand-soft p-3 text-brand">
            <ClipboardList className="size-6" />
          </span>
          <h3 className="font-display text-lg font-semibold">
            Start with a question
          </h3>
          <p className="max-w-64 text-sm text-ink-soft">
            Add your first question to start collecting responses.
          </p>
        </div>
      )}
      {fields.map((field, index) => {
        const prefix = `${id}-${index}`;
        const expanded = active === index || showErrors;
        const duplicate = fields.some(
          (other, i) => i !== index && other.key === field.key,
        );
        const message = !field.label.trim()
          ? "Label is required"
          : !field.key
            ? "Field key is required"
            : duplicate
              ? `Duplicate field key "${field.key}"`
              : (field.type === "dropdown" || field.type === "checkbox") &&
                  !field.options?.length
                ? `"${field.label}" needs at least one option`
                : "";
        return (
          <section
            key={index}
            className={cn(
              "overflow-hidden rounded-2xl border transition-colors",
              expanded
                ? "border-brand/40 bg-brand-soft/15"
                : "border-line bg-card",
            )}
            aria-label={`Question ${index + 1}`}
          >
            <div className="flex flex-wrap items-center gap-2 p-3">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 rounded-sm text-left text-sm focus-visible:outline-2 focus-visible:outline-ring"
                aria-expanded={expanded}
                aria-controls={`${prefix}-editor`}
                onClick={() => setActive(active === index ? -1 : index)}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-sm font-semibold text-brand">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1 break-words font-medium">
                  {field.label || "New question"}
                </span>
                <ChevronDown className="size-4 shrink-0" />
              </button>
              <span className="rounded-full bg-background px-2.5 py-1 text-sm text-ink-soft">
                {FIELD_TYPE_LABELS[field.type]}
                {field.required ? " · Required" : ""}
              </span>
              <div className="flex items-center">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={`Move question ${index + 1} up`}
                  disabled={disabled || index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={`Move question ${index + 1} down`}
                  disabled={disabled || index === fields.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-destructive"
                  aria-label={`Remove field ${index + 1}`}
                  disabled={disabled}
                  onClick={() => {
                    onChange(fields.filter((_, i) => i !== index));
                    setActive(Math.max(0, index - 1));
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            {expanded && (
              <div
                id={`${prefix}-editor`}
                className="space-y-4 border-t border-line bg-card p-4"
              >
                <div className="space-y-2">
                  <Label required htmlFor={`${prefix}-label`}>Question label</Label>
                  <Input
                    id={`${prefix}-label`}
                    value={field.label}
                    disabled={disabled}
                    aria-invalid={showErrors && !field.label.trim()}
                    onChange={(event) =>
                      update(index, {
                        label: event.target.value,
                        key: field.key || makeKey(event.target.value),
                      })
                    }
                    placeholder="e.g. Full name"
                  />
                </div>
                <div className="grid items-start gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label required htmlFor={`${prefix}-type`}>Answer type</Label>
                    <Select
                      value={field.type}
                      onValueChange={(value) =>
                        update(index, { type: value as FieldType })
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger id={`${prefix}-type`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {FIELD_TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${prefix}-required`}>
                      Required answer
                    </Label>
                    <div className="flex h-9 items-center">
                      <Switch
                        id={`${prefix}-required`}
                        checked={!!field.required}
                        disabled={disabled}
                        onCheckedChange={(required) =>
                          update(index, { required })
                        }
                      />
                    </div>
                  </div>
                </div>
                {(field.type === "dropdown" || field.type === "checkbox") && (
                  <div className="space-y-2">
                    <Label required htmlFor={`${prefix}-options`}>
                      Options (one per line)
                    </Label>
                    <textarea
                      id={`${prefix}-options`}
                      className="min-h-24 w-full rounded-md border bg-background p-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
                      disabled={disabled}
                      value={(field.options ?? []).join("\n")}
                      onChange={(event) =>
                        update(index, {
                          options: event.target.value
                            .split("\n")
                            .map((option) => option.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  </div>
                )}
                <details
                  open={
                    showErrors && (!field.key || duplicate) ? true : undefined
                  }
                  className="text-sm"
                >
                  <summary className="cursor-pointer font-medium">
                    Advanced: answer identifier
                  </summary>
                  <div className="mt-3 space-y-2">
                    <Label required htmlFor={`${prefix}-key`}>Field Key</Label>
                    <Input
                      id={`${prefix}-key`}
                      value={field.key}
                      disabled={disabled}
                      onChange={(event) =>
                        update(index, { key: event.target.value })
                      }
                    />
                    <p className="text-sm text-muted-foreground">
                      Used to identify saved answers. Keep existing identifiers
                      unchanged when editing a live form.
                    </p>
                  </div>
                </details>
                {showErrors && message && (
                  <p role="alert" className="text-sm text-destructive">
                    {message}
                  </p>
                )}
              </div>
            )}
          </section>
        );
      })}
      <Button
        type="button"
        variant="outline"
        className="w-full rounded-xl border-dashed border-brand/40 py-6 text-brand hover:bg-brand-soft"
        disabled={disabled}
        onClick={() => {
          onChange([
            ...fields,
            {
              key: `field_${crypto.randomUUID().replaceAll("-", "")}`,
              label: "",
              type: "text",
              required: false,
              options: [],
            },
          ]);
          setActive(fields.length);
        }}
      >
        <Plus className="size-4" />
        Add Field
      </Button>
    </div>
  );
}

function makeKey(label: string) {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
