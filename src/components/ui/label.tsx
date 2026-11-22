"use client"

import * as React from "react"
import { Label as LabelPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { RequiredIndicator } from "./required-fields"

function Label({
  className,
  required = false,
  children,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root> & { required?: boolean }) {
  const content = React.Children.toArray(children);
  const last = content.length - 1;
  const suffix = content[last];
  const marked = typeof suffix === "string" && /\s*\*+\s*$/.test(suffix);
  if (marked) content[last] = suffix.replace(/\s*\*+\s*$/, "");
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-snug font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    >
      {content}
      {(required || marked) && <RequiredIndicator />}
    </LabelPrimitive.Root>
  )
}

export { Label }
