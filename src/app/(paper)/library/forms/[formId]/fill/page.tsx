"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ClipboardList, Send } from "lucide-react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { PageHeader, SectionCard } from "@/components/paper/section";
import { EmptyState, Tag } from "@/components/paper/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChurchFormBranding } from "@/components/forms/church-form-branding";
import { FormFieldsRenderer } from "@/components/forms/form-fields-renderer";
import { SubmissionAttachments } from "@/components/forms/submission-attachments";
import { useForm, useSubmitForm, type CreateSubmissionInput } from "@/hooks/use-forms";

const apiErrorStatus = (err: unknown): number | undefined =>
  typeof err === "object" && err !== null && "statusCode" in err
    ? (err as { statusCode?: number }).statusCode
    : undefined;

export default function FillFormPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = React.use(params);
  const form = useForm(formId);
  const submit = useSubmitForm(formId);

  const [answers, setAnswers] = React.useState<Record<string, unknown>>({});
  const [assetIds, setAssetIds] = React.useState<string[]>([]);
  const [missing, setMissing] = React.useState<string[] | null>(null);
  const [submitted, setSubmitted] = React.useState(false);
  const [already, setAlready] = React.useState(false);

  const f = form.data;
  const notFillable = !!f && (f.status === "closed" || !!f.archivedAt);

  const submitForm = () => {
    if (!f) return;
    const missingNow = f.fields
      .filter((field) => field.required)
      .filter((field) => {
        const value = answers[field.key];
        return value === undefined || value === "" || value === false || (Array.isArray(value) && value.length === 0);
      })
      .map((field) => field.label);
    setMissing(missingNow);
    if (missingNow.length) {
      toast.error("Some required answers are still open.");
      return;
    }
    const input: CreateSubmissionInput = { data: answers, attachmentAssetIds: assetIds.length ? assetIds : undefined };
    submit.mutate(input, {
      onSuccess: () => {
        setSubmitted(true);
        toast.success("Answer sent.");
      },
      onError: (err) => {
        if (apiErrorStatus(err) === 409) {
          setAlready(true);
          return;
        }
        toast.error(getToastErrorMessage(err, "Couldn't send the answer."));
      },
    });
  };

  if (form.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  if (form.isError || !f) {
    return (
      <EmptyState
        icon={<ClipboardList />}
        title="We couldn&apos;t open this form"
        description="It may have been deleted, or the link is old."
        action={<Button asChild variant="outline" size="sm" className="rounded-full border-line text-xs"><Link href="/library/forms">Back to forms</Link></Button>}
      />
    );
  }

  if (notFillable) {
    return (
      <EmptyState
        icon={<ClipboardList />}
        title={f.status === "closed" ? "This form is closed" : "This form is archived"}
        description="No more answers are being collected. Past responses stay in the inbox."
        action={<Button asChild variant="outline" size="sm" className="rounded-full border-line text-xs"><Link href={`/library/forms/${f.id}`}>Back to the form</Link></Button>}
      />
    );
  }

  if (submitted || already) {
    return (
      <div className="mx-auto max-w-md space-y-4 pt-10 text-center">
        <ChurchFormBranding churchName={f.churchName} churchLogoUrl={f.churchLogoUrl} />
        <CheckCircle2 className={`mx-auto size-12 ${already ? "text-sky" : "text-moss"}`} />
        <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">{already ? "Already submitted" : "Thank you!"}</h1>
        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
          {already
            ? "This form only welcomes one answer per person — yours is already with the team."
            : "Your answers are with the team that owns this form."}
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button asChild variant="outline" size="sm" className="h-9 rounded-full border-line bg-card text-xs"><Link href="/library/forms">All forms</Link></Button>
          <Button asChild size="sm" className="h-9 rounded-full text-xs"><Link href={`/library/forms/${f.id}`}>Back to the form</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ChurchFormBranding churchName={f.churchName} churchLogoUrl={f.churchLogoUrl} />
      <PageHeader
        eyebrow={
          <Link href={`/library/forms/${f.id}`} className="flex items-center gap-1.5 hover:text-ink">
            <ArrowLeft className="size-3" /> Library · Forms
          </Link>
        }
        title={f.title}
        description={f.description || "Answer honestly — someone reads every response."}
        actions={<Tag tone="neutral">{f.fields?.length ?? 0} questions</Tag>}
      />

      <div className="mx-auto max-w-2xl space-y-4">
        <div className="rounded-2xl border border-dashed border-line px-4 py-2.5 text-[11px] text-ink-faint">
          Submitting as a member of your church — your name travels with the answer.
        </div>
        <SectionCard eyebrow="Your answers" title="Take your time">
          <FormFieldsRenderer fields={f.fields ?? []} disabled={submit.isPending} onChange={setAnswers} />
          {missing?.length ? (
            <div className="mt-4 rounded-xl border border-rose/40 bg-rose-soft/30 px-4 py-3 text-[11px] text-rose">
              Still needed: {missing.join(", ")}
            </div>
          ) : null}
          <div className="mt-4 border-t border-line/70 pt-4">
            <p className="rule-label mb-2">Attachments (optional)</p>
            <SubmissionAttachments onChange={setAssetIds} disabled={submit.isPending} />
          </div>
          <Button className="mt-5 h-10 w-full gap-2 rounded-lg text-sm" disabled={submit.isPending} onClick={submitForm}>
            <Send className="size-4" /> {submit.isPending ? "Sending…" : "Send answer"}
          </Button>
        </SectionCard>
      </div>
    </div>
  );
}
