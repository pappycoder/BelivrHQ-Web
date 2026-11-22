"use client";

import type { ComponentProps } from "react";
import { DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Shared chrome for add/edit dialogs; content retains its own form and submit handler. */
export function FormDialogContent({ className, ...props }: ComponentProps<typeof DialogContent>) {
  return <DialogContent {...props} data-form-dialog className={cn("min-w-0 grid-cols-[minmax(0,1fr)] sm:max-w-2xl", className)} />;
}
