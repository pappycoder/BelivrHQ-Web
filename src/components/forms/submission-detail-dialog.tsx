"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { SubmissionRespondent } from "./submission-respondent";
import {
  SUBMISSION_STATUS_LABELS,
  SUBMISSION_STATUS_TEXT,
  type Form,
  type FormSubmission,
} from "@/hooks/use-forms";

export interface SubmissionDetailDialogProps {
  form?: Form;
  submission?: FormSubmission;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function labelFor(form: Form | undefined, key: string): string {
  if (!form) return key;
  const field = form.fields.find((f) => f.key === key);
  return field?.label || key;
}

export function SubmissionDetailDialog({
  form,
  submission,
  open,
  onOpenChange,
}: SubmissionDetailDialogProps) {
  if (!submission) return null;

  const entries = Object.entries(submission.data ?? {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Submission
            <Badge variant="outline" className={SUBMISSION_STATUS_TEXT[submission.status]}>
              {SUBMISSION_STATUS_LABELS[submission.status]}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <SubmissionRespondent submission={submission} fields={form?.fields} size="sm" />

        <div className="space-y-1 text-sm text-muted-foreground">
          <p>Submitted {format(new Date(submission.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
          <p>{submission.submittedBy ? "Submitted by a church member" : "Submitted publicly"}</p>
        </div>

        <div className="rounded-md border divide-y">
          {entries.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">No data in this submission.</div>
          )}
          {entries.map(([key, value]) => (
            <div key={key} className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[140px_1fr]">
              <dt className="text-sm font-medium text-muted-foreground sm:pt-0.5">
                {labelFor(form, key)}
              </dt>
              <dd className="text-sm">
                {Array.isArray(value) ? (
                  <div className="flex flex-wrap gap-1">
                    {value.map((v) => (
                      <span key={String(v)} className="rounded bg-muted px-2 py-0.5 text-sm">
                        {String(v)}
                      </span>
                    ))}
                  </div>
                ) : (
                  String(value ?? "")
                )}
              </dd>
            </div>
          ))}
        </div>

        {submission.attachments.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Attachments</p>
            <div className="flex flex-wrap gap-2">
              {submission.attachments.map((a) => (
                <a
                  key={a.assetId}
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border px-3 py-1.5 text-sm text-primary hover:bg-muted"
                >
                  {a.filename}
                </a>
              ))}
            </div>
          </div>
        )}

        {submission.rejectionReason && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <p className="font-medium text-destructive">Rejection reason</p>
            <p className="mt-1 text-muted-foreground">{submission.rejectionReason}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
