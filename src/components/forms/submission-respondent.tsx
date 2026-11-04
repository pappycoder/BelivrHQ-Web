import type { FormField, FormSubmission } from "@/hooks/use-forms";
import { PersonAvatar } from "@/components/paper/primitives";
import { submissionRespondent } from "@/lib/submission-respondent";

export function SubmissionRespondent({ submission, fields, size = "xs" }: {
  submission: FormSubmission;
  fields?: FormField[];
  size?: "xs" | "sm";
}) {
  const respondent = submissionRespondent(submission, fields);
  return (
    <span className="flex min-w-0 items-center gap-2.5 text-left">
      <PersonAvatar name={respondent.name} size={size} />
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium" title={respondent.name}>{respondent.name}</span>
        {respondent.contact && <span className="block truncate text-[10px] text-ink-soft" title={respondent.contact}>{respondent.contact}</span>}
        {respondent.name !== respondent.reference && <span className="num block text-[10px] text-ink-faint" title={submission.id}>{respondent.reference}</span>}
      </span>
    </span>
  );
}
