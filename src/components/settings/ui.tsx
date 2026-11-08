"use client";

/** Shared settings sections and Shadcn form fields. */

import * as React from "react";
import type { Control, FieldValues, Path } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

/** Section anchors support the settings scrollspy. */
export function SettingsSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      data-settings-section=""
      className="scroll-mt-28 border-b border-border pb-6 [&:not(:first-child)]:pt-6"
    >
      <h3 className="mb-4 text-lg font-medium">{title}</h3>
      {children}
    </section>
  );
}

/** Consistent stacked label and control spacing. */
export function FieldRow({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid items-start gap-2 [&+&]:mt-5",
        className,
      )}
    >
      <Label htmlFor={htmlFor}>
        {label}
      </Label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Label-left / input-right RHF field using the shared row grammar. */
export function InfoField<T extends FieldValues>({
  label,
  name,
  control,
  placeholder,
  type = "text",
  disabled,
}: {
  label: string;
  name: Path<T>;
  control: Control<T>;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="grid items-start gap-2 [&+&]:mt-5">
          <FormLabel>{label}</FormLabel>
          <div className="min-w-0">
            <FormControl>
              <Input picker="wheel" type={type} placeholder={placeholder} disabled={disabled} {...field} />
            </FormControl>
            <FormMessage />
          </div>
        </FormItem>
      )}
    />
  );
}
