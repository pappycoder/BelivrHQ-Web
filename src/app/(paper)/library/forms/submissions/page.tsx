"use client";

import * as React from "react";
import Link from "next/link";
import { Inbox, Loader2, XCircle } from "lucide-react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { PageHeader } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import { EmptyState, FilterChip, ListPaginationFooter, PersonAvatar } from "@/components/paper/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SubmissionDetailDialog } from "@/components/forms/submission-detail-dialog";
import { SubmissionStatusDialog } from "@/components/forms/submission-status-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useFormsList,
  useFormSubmissions,
  useUpdateSubmissionStatus,
  SUBMISSION_STATUS_LABELS,
  type Form,
  type FormSubmission,
  type SubmissionStatus,
} from "@/hooks/use-forms";
import { formatDate } from "@/hooks/use-media";
import { number } from "@/lib/paper/format";

const PAGE_SIZE = 15;

export default function FormsSubmissionsPage() {
  const { can, ready } = usePermissions();
  const canReview = ready && can("forms:submissions", "update");

  const forms = useFormsList({ limit: 100 });
  const selectable = (forms.data?.data ?? []).filter((f: Form) => !f.archivedAt);

  const [formId, setFormId] = React.useState<string>("");
  const [status, setStatus] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(PAGE_SIZE);
  const [detail, setDetail] = React.useState<FormSubmission | null>(null);
  const [rejectTarget, setRejectTarget] = React.useState<FormSubmission | null>(null);

  const selected: Form | undefined = selectable.find((f) => f.id === formId);
  const submissions = useFormSubmissions(formId || undefined, {
    status: (status || undefined) as SubmissionStatus | undefined,
    page,
    limit: perPage,
  });
  const updateStatus = useUpdateSubmissionStatus(formId);

  const rows = submissions.data?.data ?? [];
  const total = submissions.data?.meta?.total ?? 0;

  const approve = (submission: FormSubmission) => {
    updateStatus.mutate(
      { submissionId: submission.id, input: { status: "approved" } },
      { onSuccess: () => toast("Answer approved."), onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't approve it.")) },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Library · Forms"
        title="Every answer, one inbox."
        description="Approve, question, and archive responses across every form — without leaving this page."
      />

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={formId}
          onChange={(e) => { setFormId(e.target.value); setPage(1); }}
          className="h-9 rounded-full border border-line bg-card px-3 text-[11px] outline-none"
          aria-label="Form picker"
        >
          <option value="">Choose a form…</option>
          {selectable.map((f) => (
            <option key={f.id} value={f.id}>{f.title} · {number(f.submissionCount ?? 0)} answers</option>
          ))}
        </select>
        <FilterChip active={status === ""} onClick={() => { setStatus(""); setPage(1); }}>All states</FilterChip>
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <FilterChip key={s} active={status === s} onClick={() => { setStatus(s); setPage(1); }}>{SUBMISSION_STATUS_LABELS[s]}</FilterChip>
        ))}
        {formId && selected ? (
          <Link href={`/library/forms/${formId}`} className="ml-auto text-[11px] text-brand hover:underline">Form settings →</Link>
        ) : null}
      </div>

      {!formId ? (
        <EmptyState
          icon={<Inbox />}
          title="Pick a form to open its inbox"
          description="Answers wait here by state — pending is the pile that benefits from a Monday pass."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Matching answers" value={total} tone="brand" icon={<Inbox className="size-4" />} />
            <StatCard label="This form, all time" value={selected?.submissionCount ?? 0} tone="moss" />
            <StatCard label="On this page" value={rows.length} tone="sky" />
            <StatCard label="Pending in queue" value={status === "pending" ? total : rows.filter((r) => r.status === "pending").length} tone="gold" />
          </div>

          {submissions.isLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<Inbox />}
              title={status ? `No ${status} answers` : "No answers yet"}
              description={selected?.isPublic ? "The public link is live on the form page — answers land here the moment they're sent." : "Members can fill this from the form page."}
            />
          ) : (
            <div className="paper-card divide-y divide-line/70 overflow-hidden rounded-2xl">
              {rows.map((submission) => (
                <div key={submission.id} className="flex items-center gap-3 px-5 py-3">
                  <PersonAvatar name={submission.submittedBy ?? "Anonymous"} size="xs" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{submission.submittedBy ?? "Anonymous"}</p>
                    <p className="truncate text-[10px] text-ink-faint">{formatDate(submission.createdAt)}{submission.attachments?.length ? ` · ${submission.attachments.length} file(s)` : ""}</p>
                  </div>
                  <Tag tone={submission.status === "approved" ? "moss" : submission.status === "rejected" ? "rose" : "gold"} dot>
                    {SUBMISSION_STATUS_LABELS[submission.status]}
                  </Tag>
                  {canReview && submission.status === "pending" ? (
                    <>
                      <Button size="xs" className="rounded-full text-[10px]" disabled={updateStatus.isPending} onClick={() => approve(submission)}>
                        {updateStatus.isPending ? <Loader2 className="size-3 animate-spin" /> : null} Approve
                      </Button>
                      <Button size="xs" variant="ghost" className="gap-1 rounded-full text-[10px] text-rose" onClick={() => setRejectTarget(submission)}>
                        <XCircle className="size-3" /> Reject
                      </Button>
                    </>
                  ) : null}
                  <Button size="xs" variant="ghost" className="rounded-full text-[10px] text-ink-faint" onClick={() => setDetail(submission)}>
                    Read
                  </Button>
                </div>
              ))}
              <ListPaginationFooter
                page={page}
                perPage={perPage}
                total={total}
                onPageChange={setPage}
                onPerPageChange={setPerPage}
                itemName="responses"
                pending={submissions.isFetching}
              />
            </div>
          )}
        </>
      )}

      <SubmissionDetailDialog form={selected} submission={detail ?? undefined} open={!!detail} onOpenChange={(value) => !value && setDetail(null)} />
      <SubmissionStatusDialog formId={formId} submission={rejectTarget ?? undefined} open={!!rejectTarget} onOpenChange={(value) => !value && setRejectTarget(null)} />
    </div>
  );
}
