"use client";

import { useRef, useState } from "react";
import { ArrowUpRight, Expand, Eye, FileText, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PublicFormFrame } from "./public-form-frame";
import { FormFieldsRenderer } from "./form-fields-renderer";
import type { ChurchFormIdentity } from "./church-form-branding";
import type { FormField } from "@/hooks/use-forms";

interface PreviewProps extends ChurchFormIdentity {
  title: string;
  description?: string;
  fields: FormField[];
}

function RespondentPreview({
  title,
  description,
  fields,
  churchName,
  churchLogoUrl,
  stacked = false,
}: PreviewProps & { stacked?: boolean }) {
  return (
    <PublicFormFrame
      embedded
      stacked={stacked}
      churchName={churchName || "Your church"}
      churchLogoUrl={churchLogoUrl}
      title={title.trim() || "Untitled form"}
      description={
        description?.trim() || "Your form description will appear here."
      }
      eyebrow="You're invited"
    >
      {fields.length ? (
        <FormFieldsRenderer fields={fields} showOptional onChange={() => {}} />
      ) : (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="rounded-2xl bg-brand-soft p-3 text-brand">
            <FileText className="size-6" />
          </span>
          <h4 className="font-display text-lg font-semibold">
            Your questions will appear here
          </h4>
          <p className="max-w-60 text-sm text-ink-soft">
            Add a question to see the form your respondents will fill in.
          </p>
        </div>
      )}
      <div className="mt-6 space-y-3 border-t border-line pt-5">
        <Button type="button" disabled className="w-full rounded-full">
          Submit response <ArrowUpRight className="size-4" />
        </Button>
        <p className="text-center text-sm leading-relaxed text-ink-soft">
          Preview only. Sample answers are not saved or submitted.
        </p>
      </div>
    </PublicFormFrame>
  );
}

export function FormBuilderPreview(props: PreviewProps) {
  const expandTrigger = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [revision, setRevision] = useState(0);
  return (
    <section
      aria-label="Form preview"
      className="paper-card overflow-hidden rounded-2xl border border-line"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
        <div>
          <span className="rule-label flex items-center gap-2">
            <Eye className="size-3.5" /> Live preview
          </span>
          <h2 className="mt-1 font-display text-lg font-semibold">
            The respondent&apos;s view
          </h2>
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Reset preview answers"
            onClick={() => setRevision((value) => value + 1)}
          >
            <RotateCcw className="size-4" />
          </Button>
          <Button
            ref={expandTrigger}
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => setExpanded(true)}
          >
            <Expand className="size-3.5" /> Expand preview
          </Button>
        </div>
      </div>
      <div
        className="xl:max-h-[75svh] xl:overflow-y-auto xl:overscroll-contain"
        tabIndex={0}
        aria-label="Scrollable form preview"
      >
        <RespondentPreview key={revision} {...props} stacked />
      </div>
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent
          className="max-h-[92svh] w-[95vw] overflow-y-auto p-0 sm:max-w-5xl"
          data-paper-root
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            expandTrigger.current?.focus();
          }}
        >
          <DialogHeader className="border-b border-line p-5 pr-12">
            <DialogTitle>Form preview</DialogTitle>
            <DialogDescription>
              Try the questions as a respondent. No answers will be submitted.
            </DialogDescription>
          </DialogHeader>
          <RespondentPreview {...props} />
        </DialogContent>
      </Dialog>
    </section>
  );
}
