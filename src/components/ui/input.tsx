import * as React from "react"

import { FormDateTimeInput } from "@/components/ui/form-date-time-picker"

import { isWheelPickerType } from "@/lib/wheel-date-time"

import { cn } from "@/lib/utils"

type InputProps = React.ComponentProps<"input"> & {
  /** Date/time fields share the calendar picker; native controls remain an explicit escape hatch. */
  picker?: "native" | "calendar" | "wheel" | "popover"
}

function Input({ className, type, picker = "calendar", ...props }: InputProps) {
  const input = (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 py-1 text-base shadow-xs transition-[color,border-color,box-shadow] duration-200 outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-muted/50 md:text-sm dark:bg-input/30",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/15",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
  return picker !== "native" && isWheelPickerType(type)
    ? <FormDateTimeInput type={type} compact={picker === "popover"}>{input}</FormDateTimeInput>
    : input
}

export { Input }
