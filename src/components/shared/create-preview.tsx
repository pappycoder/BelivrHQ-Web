"use client";
import { Children, createContext, isValidElement, useRef, useState, type ReactNode } from "react";
import { SectionCard } from "@/components/paper/section";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const FormPreviewContext = createContext<(() => void) | null>(null);

export const CREATE_FORM_LAYOUT = "grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]";

export function CreatePreviewSidebar({ children, className }: { children: ReactNode; className?: string }) {
  const returnFocus = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const preview = Children.toArray(children).filter(child => isValidElement(child) && child.type === CreatePreviewCard);
  return <FormPreviewContext.Provider value={preview.length ? () => { returnFocus.current = document.activeElement as HTMLElement; setOpen(true); } : null}>
    <aside data-create-sidebar className={cn("min-w-0 space-y-4 lg:sticky lg:top-20 lg:self-start", className)}>{children}</aside>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90dvh] overflow-y-auto" onCloseAutoFocus={event => { event.preventDefault(); returnFocus.current?.focus(); }}><DialogHeader><DialogTitle>Review before saving</DialogTitle><DialogDescription>Your current details are shown below. Opening this preview does not save the record.</DialogDescription></DialogHeader>{preview}</DialogContent></Dialog>
  </FormPreviewContext.Provider>;
}

export function CreatePreviewCard({ title, eyebrow = "Preview", children, className, editing = false }: {
  editing?: boolean;
  title: ReactNode;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div data-create-preview className={className}>
      <SectionCard eyebrow={eyebrow} title={title} bodyClassName="space-y-4">
        {children}
        <p className="text-sm leading-relaxed text-ink-soft">{editing ? "Review your changes before saving. The record updates only when you save." : "Review the details before saving. This preview has not been saved."}</p>
      </SectionCard>
    </div>
  );
}
