"use client";

import { useManageConfirmation } from "@/components/shared/manage-confirmation";

import * as React from "react";
import Link from "next/link";
import { submissionRespondent } from "@/lib/submission-respondent";
import { SubmissionRespondent } from "@/components/forms/submission-respondent";
import { hasLivePublicFormLink } from "@/lib/public-form-link";
import {
  ArrowLeft,
  CalendarX2,
  Copy,
  Inbox,
  Link2,
  RefreshCcw,
  Users,
} from "lucide-react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { SectionCard } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import {
  DataList,
  EmptyState,
  FieldRow,
  FilterChip,
  ListPaginationFooter,
  SearchField,
  SortDirectionToggle,
} from "@/components/paper/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SubmissionDetailDialog } from "@/components/forms/submission-detail-dialog";
import { SubmissionStatusDialog } from "@/components/forms/submission-status-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useForm,
  useFormSubmissions,
  useCloseForm,
  useReopenForm,
  useRegenerateLink,
  useUpdateSubmissionStatus,
  SUBMISSION_STATUS_LABELS,
  FIELD_TYPE_LABELS,
  type FormSubmission,
  type SubmissionStatus,
} from "@/hooks/use-forms";
import { formatDate } from "@/hooks/use-media";

export default function FormDetailPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { confirm, dialog } = useManageConfirmation();
  const { formId } = React.use(params);
  const { can, ready } = usePermissions();
  const canUpdate = ready && can("forms:list", "update");
  const canReview = ready && can("forms:submissions", "update");

  const form = useForm(formId);
  const close = useCloseForm();
  const reopen = useReopenForm();
  const regenerate = useRegenerateLink();
  const updateStatus = useUpdateSubmissionStatus(formId);

  const [status, setStatus] = React.useState<SubmissionStatus | "">("");
  const [query, setQuery] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(15);
  const [detail, setDetail] = React.useState<FormSubmission | null>(null);
  const [rejectTarget, setRejectTarget] = React.useState<FormSubmission | null>(null);

  const submissions = useFormSubmissions(formId, {
    status: status || undefined,
    search: query.trim() || undefined,
    sortOrder,
    page,
    limit: perPage,
  });

  if (form.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-4 w-40 animate-pulse rounded bg-line" />
        <div className="h-44 animate-pulse rounded-2xl bg-line" />
      </div>
    );
  }

  if (form.isError || !form.data) {
    return (
      <EmptyState
        icon={<Inbox />}
        title="We couldn&apos;t find that form"
        description="It may have been deleted, or the link is old."
        action={<Button asChild variant="outline" size="sm" className="rounded-full border-line text-xs"><Link href="/library/forms">Back to forms</Link></Button>}
      />
    );
  }

  const f = form.data;
  const rows = submissions.data?.data ?? [];
  const total = submissions.data?.meta?.total ?? 0;
  const shareUrl = hasLivePublicFormLink(f) ? `${typeof window !== "undefined" ? window.location.origin : ""}/forms/public/${f.publicToken}` : null;

  const copyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard?.writeText(shareUrl).catch(() => undefined);
    toast("Public link copied.");
  };

  const approve = (submission: FormSubmission) => confirm({
    title: "Approve answer?", subject: submissionRespondent(submission, f.fields).name, onConfirm: () => updateStatus.mutateAsync(
      { submissionId: submission.id, input: { status: "approved" } },
      { onSuccess: () => toast("Answer approved."), onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't approve it.")) },
    ),
  });

  return (
    <div className="space-y-6">
      {dialog}
      <Link href="/library/forms" className="inline-flex items-center gap-1.5 text-[11px] text-ink-faint hover:text-ink">
        <ArrowLeft className="size-3" /> Library · Forms
      </Link>

      <div className="paper-card rounded-2xl p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Tag tone={f.status === "published" ? "moss" : f.status === "draft" ? "gold" : "sky"} dot>{f.status}</Tag>
              {f.isPublic ? <Tag tone="brand">Public</Tag> : <Tag tone="neutral">Members only</Tag>}
              {f.archivedAt ? <Tag tone="rose">Archived</Tag> : null}
              {f.branchName ? <Tag tone="sky">{f.branchName}</Tag> : null}
            </div>
            <h1 className="font-display text-[clamp(1.5rem,2.4vw,2rem)] font-semibold tracking-tight">{f.title}</h1>
            {f.description ? <p className="max-w-2xl text-xs leading-relaxed text-ink-soft">{f.description}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {shareUrl ? (
              <>
                <Button size="sm" className="h-8 gap-1.5 rounded-full text-xs" onClick={copyLink}>
                  <Link2 className="size-3.5" /> Copy public link
                </Button>
                <Button asChild variant="outline" size="sm" className="h-8 rounded-full border-line bg-card text-xs">
                  <a href={shareUrl} target="_blank" rel="noreferrer">Open live form</a>
                </Button>
                {canUpdate ? (
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full border-line bg-card text-xs" onClick={copyLink}>
                    <Copy className="size-3.5" /> Share
                  </Button>
                ) : null}
              </>
            ) : null}
            {canUpdate && f.status === "published" ? (
              <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full border-line bg-card text-xs" disabled={close.isPending} onClick={() => confirm({ title: "Close form?", subject: f.title, onConfirm: () => close.mutateAsync(f.id, { onSuccess: () => toast("Form closed — no new answers."), onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't close it.")) }) })}>
                <CalendarX2 className="size-3.5" /> Close form
              </Button>
            ) : null}
            {canUpdate && f.status === "closed" ? (
              <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full border-line bg-card text-xs" disabled={reopen.isPending} onClick={() => confirm({ title: "Reopen form?", subject: f.title, onConfirm: () => reopen.mutateAsync(f.id, { onSuccess: () => toast("Form reopened."), onError: () => toast.error("Couldn't reopen it.") }) })}>
                Reopen
              </Button>
            ) : null}
            {canUpdate && f.isPublic ? (
              <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full border-line bg-card text-xs" disabled={regenerate.isPending} onClick={() => confirm({ title: "Replace public link?", subject: f.title, description: "The current public link will stop working. Share the replacement link with respondents.", destructive: true, onConfirm: () => regenerate.mutateAsync(f.id, { onSuccess: () => toast("New link issued — the old one is dead."), onError: () => toast.error("Couldn't regenerate.") }) })}>
                <RefreshCcw className="size-3.5" /> New link
              </Button>
            ) : null}
            {f.status === "published" && ready && can("forms:list", "read") ? (
              <Button asChild variant="outline" size="sm" className="h-8 rounded-full border-line bg-card text-xs">
                <Link href={`/library/forms/${f.id}/fill`}>Open — fill as member</Link>
              </Button>
            ) : null}
            {canUpdate ? (
              <Button asChild variant="outline" size="sm" className="h-8 rounded-full border-line bg-card text-xs">
                <Link href={`/library/forms/${f.id}/edit`}>Edit in builder</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {f.isPublic && !shareUrl && (
        <p role="status" className="text-sm text-ink-soft">
          {f.archivedAt
            ? "Restore this form before sharing its public link."
            : f.status === "draft"
              ? "Publish this form in the builder to activate its public link."
              : "Reopen this form to activate its public link."}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Answers" value={f.submissionCount ?? 0} tone="brand" icon={<Inbox className="size-4" />} />
        <StatCard label="Questions" value={f.fields?.length ?? 0} tone="moss" icon={<Users className="size-4" />} deltaLabel={f.uniqueField ? "one response per person" : "unlimited responses"} />
        <StatCard label="Limit" value={f.submissionLimit ?? 0} tone="sky" deltaLabel={f.submissionLimit ? "caps at this many answers" : "no cap set"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="rule-label mr-2">Answers inbox</p>
            <FilterChip active={status === ""} onClick={() => { setStatus(""); setPage(1); }}>All</FilterChip>
            {(["pending", "approved", "rejected"] as const).map((s) => (
              <FilterChip key={s} active={status === s} onClick={() => { setStatus(s); setPage(1); }}>
                {SUBMISSION_STATUS_LABELS[s]}
              </FilterChip>
            ))}
            <SearchField
              value={query}
              onChange={(value) => { setQuery(value); setPage(1); }}
              placeholder="Search answers…"
              className="w-full max-w-[220px]"
            />
            <SortDirectionToggle
              ascending={sortOrder === "asc"}
              onToggle={() => { setSortOrder((o) => (o === "asc" ? "desc" : "asc")); setPage(1); }}
              className="ml-auto"
            />
          </div>

          {submissions.isLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<Inbox />}
              title={query.trim() ? "No answers match that" : status ? "Nothing in this state" : "No answers yet"}
              description={f.isPublic ? "Share the link — answers land here the moment they&apos;re sent." : "Members can fill this from the link above."}
            />
          ) : (
            <div className="paper-card divide-y divide-line/70 overflow-hidden rounded-2xl">
              {rows.map((submission) => (
                <div key={submission.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <SubmissionRespondent submission={submission} fields={f.fields} />
                    <p className="truncate text-[10px] text-ink-faint">{formatDate(submission.createdAt)}{submission.attachments?.length ? ` · ${submission.attachments.length} file(s)` : ""}</p>
                  </div>
                  <Tag tone={submission.status === "approved" ? "moss" : submission.status === "rejected" ? "rose" : "gold"} dot>
                    {SUBMISSION_STATUS_LABELS[submission.status]}
                  </Tag>
                  {canReview && submission.status === "pending" ? (
                    <>
                      <Button size="xs" className="rounded-full text-[10px]" disabled={updateStatus.isPending} onClick={() => approve(submission)}>
                        Approve
                      </Button>
                      <Button size="xs" variant="ghost" className="rounded-full text-[10px] text-rose" onClick={() => setRejectTarget(submission)}>
                        Reject
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
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <SectionCard eyebrow="Questions" title={`${f.fields?.length ?? 0} fields`} bodyClassName="p-0">
            <div className="divide-y divide-line/70">
              {(f.fields ?? []).map((field) => (
                <div key={field.key} className="flex items-center justify-between gap-2 px-4 py-2.5 text-[11px]">
                  <span className="min-w-0 truncate font-medium">{field.label}</span>
                  <span className="shrink-0 text-ink-faint">
                    {FIELD_TYPE_LABELS[field.type] ?? field.type}
                    {field.required ? <span className="text-rose"> *</span> : null}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>
          <DataList className="rounded-2xl border border-line bg-card px-4">
            <FieldRow label="Unique field">{f.uniqueField ?? "—"}</FieldRow>
            <FieldRow label="Submission limit">{f.submissionLimit ?? "none"}</FieldRow>
            <FieldRow label="Template">{f.isTemplate ? "Yes" : "No"}</FieldRow>
            <FieldRow label="Created">{formatDate(f.createdAt)}</FieldRow>
          </DataList>
        </aside>
      </div>

      <SubmissionDetailDialog form={f} submission={detail ?? undefined} open={!!detail} onOpenChange={(value) => !value && setDetail(null)} />
      <SubmissionStatusDialog formId={f.id} submission={rejectTarget ?? undefined} open={!!rejectTarget} onOpenChange={(value) => !value && setRejectTarget(null)} />
    </div>
  );
}
