"use client";
import { useContext, type ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { FormPreviewContext } from "./create-preview";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

/** A consistent action stack beside create/edit previews. */
export function FormActions({ className, children, ...props }: ComponentProps<"div">) {
  const openPreview = useContext(FormPreviewContext);
  return <div {...props} data-form-actions className={cn("flex min-w-0 flex-col gap-2", className)}>
    {openPreview && <Button data-mobile-preview type="button" variant="outline" className="lg:hidden" onClick={openPreview}><Eye className="size-4" />Preview</Button>}{children}
  </div>;
}
