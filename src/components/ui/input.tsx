import * as React from "react"

import { WheelPickerInput } from "@/components/ui/wheel-date-time-picker"

import { isWheelPickerType } from "@/lib/wheel-date-time"

import { cn } from "@/lib/utils"

type InputProps = React.ComponentProps<"input"> & {
  /** Form date/time fields opt into wheels; filters and navigation stay native. */
  picker?: "native" | "wheel"
}

function Input({ className, type, picker = "native", ...props }: InputProps) {
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
  return picker === "wheel" && isWheelPickerType(type)
    ? <WheelPickerInput type={type}>{input}</WheelPickerInput>
    : input
}

export { Input }
