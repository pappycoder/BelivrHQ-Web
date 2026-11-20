import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** A consistent action stack beside create/edit previews. */
export function FormActions({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} data-form-actions className={cn("flex min-w-0 flex-col gap-2", className)} />;
}
