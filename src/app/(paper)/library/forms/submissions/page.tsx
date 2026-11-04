"use client";

import { SubmissionRespondent } from "@/components/forms/submission-respondent";
import { submissionRespondent } from "@/lib/submission-respondent";

import * as React from "react";
import Link from "next/link";
import { CheckCheck, Eye, Inbox, LayoutGrid, Rows3, XCircle } from "lucide-react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { PageHeader } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import {
  EmptyState,
  FilterChip,
  ListPaginationFooter,
  ManageHeading,
  RowActions,
  SearchField,
  SortDirectionToggle,
  ViewToggle,
} from "@/components/paper/primitives";
import { StaggerGroup, StaggerItem } from "@/components/paper/motion/primitives";
import { Skeleton } from "@/components/ui/skeleton";
import { SubmissionDetailDialog } from "@/components/forms/submission-detail-dialog";
import { SubmissionStatusDialog } from "@/components/forms/submission-status-dialog";
import { ExportDropdown } from "@/components/shared/export-dropdown";
import { api } from "@/lib/api";
import { fetchAllPages, listUrl } from "@/lib/export-all";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useFormsList,
  useFormSubmissions,
  useUpdateSubmissionStatus,
  SUBMISSION_STATUS_LABELS,
  type Form,
  type FormSubmission,
  type PaginatedResponse,
  type SubmissionStatus,
} from "@/hooks/use-forms";
import { formatDate } from "@/hooks/use-media";
import { number } from "@/lib/paper/format";

const PAGE_SIZE = 15;

const EXPORT_COLUMNS = [
  { key: "respondent", label: "Respondent" },
  { key: "contact", label: "Contact" },
  { key: "responseId", label: "Response ID" },
  { key: "status", label: "Status" },
  { key: "submitted", label: "Submitted" },
  { key: "attachments", label: "Attachments" },
  { key: "answers", label: "Answers" },
];

function answersSummary(submission: FormSubmission): string {
  return Object.entries(submission.data ?? {})
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value ?? "")}`)
    .join(" · ");
}

export default function FormsSubmissionsPage() {
  const { can, ready } = usePermissions();
  const canReview = ready && can("forms:submissions", "update");

  const forms = useFormsList({ limit: 100 });
  const selectable = (forms.data?.data ?? []).filter((f: Form) => !f.archivedAt);

  const [formId, setFormId] = React.useState<string>("");
  const [status, setStatus] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(PAGE_SIZE);
  const [view, setView] = React.useState<"table" | "cards">("table");
  const [detail, setDetail] = React.useState<FormSubmission | null>(null);
  const [rejectTarget, setRejectTarget] = React.useState<FormSubmission | null>(null);

  const selected: Form | undefined = selectable.find((f) => f.id === formId);
  const submissions = useFormSubmissions(formId || undefined, {
    status: (status || undefined) as SubmissionStatus | undefined,
    search: query.trim() || undefined,
    sortOrder,
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

  // One Manage builder feeds rows and cards alike.
  const manageActions = (submission: FormSubmission) => [
    { label: "Read answer", icon: <Eye />, onSelect: () => setDetail(submission) },
    canReview && submission.status === "pending" && {
      label: "Approve answer",
      icon: <CheckCheck />,
      tone: "success" as const,
      disabled: updateStatus.isPending,
      onSelect: () => approve(submission),
    },
    canReview && submission.status === "pending" && {
      label: "Reject answer",
      icon: <XCircle />,
      tone: "danger" as const,
      onSelect: () => setRejectTarget(submission),
    },
  ];

  const exportRow = (submission: FormSubmission) => ({
    respondent: submissionRespondent(submission, selected?.fields).name,
    contact: submissionRespondent(submission, selected?.fields).contact,
    responseId: submission.id,
    status: SUBMISSION_STATUS_LABELS[submission.status] ?? submission.status,
    submitted: formatDate(submission.createdAt),
    attachments: submission.attachments?.length ?? 0,
    answers: answersSummary(submission),
  });

  const exportParams = {
    status: status || undefined,
    search: query.trim() || undefined,
    sortOrder,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Library · Forms"
        title="Every answer, one inbox."
        description="Approve, question, and archive responses across every form — without leaving this page."
        actions={
          formId && total ? (
            <ExportDropdown
              columns={EXPORT_COLUMNS}
              data={rows.map(exportRow)}
              title={`Answers — ${selected?.title ?? "Form"}`}
              filename="form-submissions"
              disabled={!total}
              fetchAllRows={async () => {
                const all = await fetchAllPages<FormSubmission>((p) =>
                  api.get<PaginatedResponse<FormSubmission>>(
                    listUrl(`/forms/${formId}/submissions`, { ...exportParams, page: p, limit: 100 }),
                  ),
                );
                return all.map(exportRow);
              }}
            />
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={formId}
          onChange={(e) => { setFormId(e.target.value); setPage(1); }}
          className="h-9 max-w-[280px] rounded-full border border-line bg-card px-3 text-[11px] outline-none"
          aria-label="Form picker"
        >
          <option value="">Choose a form…</option>
          {selectable.map((f) => (
            <option key={f.id} value={f.id}>{f.title} · {number(f.submissionCount ?? 0)} answers</option>
          ))}
        </select>
        {formId ? (
          <SearchField
            value={query}
            onChange={(value) => { setQuery(value); setPage(1); }}
            placeholder="Search answers…"
            className="w-full max-w-[220px]"
          />
        ) : null}
        <FilterChip active={status === ""} onClick={() => { setStatus(""); setPage(1); }}>All states</FilterChip>
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <FilterChip key={s} active={status === s} onClick={() => { setStatus(s); setPage(1); }}>{SUBMISSION_STATUS_LABELS[s]}</FilterChip>
        ))}
        {formId ? (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <SortDirectionToggle
              ascending={sortOrder === "asc"}
              onToggle={() => { setSortOrder((o) => (o === "asc" ? "desc" : "asc")); setPage(1); }}
              className="ml-auto"
            />
            <ViewToggle
              value={view}
              onChange={setView}
              options={[
                { value: "table", label: "Table", icon: <Rows3 /> },
                { value: "cards", label: "Cards", icon: <LayoutGrid /> },
              ]}
            />
            {selected ? (
              <Link href={`/library/forms/${formId}`} className="text-[11px] text-brand hover:underline">Form settings →</Link>
            ) : null}
          </div>
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
              title={query.trim() ? "No answers match that" : status ? `No ${status} answers` : "No answers yet"}
              description={selected?.isPublic ? "The public link is live on the form page — answers land here the moment they're sent." : "Members can fill this from the form page."}
            />
          ) : view === "table" ? (
            <div className="paper-card overflow-hidden rounded-2xl">
              <div className="overflow-x-auto">
                <div className="min-w-[680px]">
                  <div className="rule-label grid grid-cols-[minmax(0,1.6fr)_minmax(0,2fr)_minmax(0,1fr)_auto] items-center gap-3 border-b border-line px-5 py-2.5">
                    <span>Respondent</span>
                    <span>Answers</span>
                    <span>Submitted</span>
                    <ManageHeading />
                  </div>
                  <div className="divide-y divide-line/70">
                    {rows.map((submission) => (
                      <div
                        key={submission.id}
                        className="group grid grid-cols-[minmax(0,1.6fr)_minmax(0,2fr)_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
                      >
                        <button type="button" onClick={() => setDetail(submission)} className="flex min-w-0 items-center gap-2.5 text-left">
                          <span className="min-w-0">
                            <SubmissionRespondent submission={submission} fields={selected?.fields} />
                            <span className="block truncate text-[10px] text-ink-faint">
                              {SUBMISSION_STATUS_LABELS[submission.status]}
                              {submission.attachments?.length ? ` · ${submission.attachments.length} file(s)` : ""}
                            </span>
                          </span>
                        </button>
                        <span className="truncate text-[11px] text-ink-soft">{answersSummary(submission) || "—"}</span>
                        <span className="num text-[11px] text-ink-faint">{formatDate(submission.createdAt)}</span>
                        <div className="flex justify-end">
                          <RowActions actions={manageActions(submission)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="border-t border-line px-5 py-3">
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
            </div>
          ) : (
            <>
              <StaggerGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((submission) => (
                  <StaggerItem key={submission.id}>
                    <div className="paper-card flex h-full flex-col rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-2">
                        <button type="button" onClick={() => setDetail(submission)} className="flex min-w-0 items-center gap-2.5 text-left">
                          <span className="min-w-0">
                            <SubmissionRespondent submission={submission} fields={selected?.fields} />
                            <span className="num block text-[10px] text-ink-faint">{formatDate(submission.createdAt)}</span>
                          </span>
                        </button>
                        <Tag tone={submission.status === "approved" ? "moss" : submission.status === "rejected" ? "rose" : "gold"} dot>
                          {SUBMISSION_STATUS_LABELS[submission.status]}
                        </Tag>
                      </div>
                      <p className="mt-2 line-clamp-3 flex-1 text-[11px] leading-relaxed text-ink-soft">
                        {answersSummary(submission) || "No text answers — files or empty responses only."}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line/70 pt-3">
                        <span className="text-[10px] text-ink-faint">
                          {submission.attachments?.length ? `${submission.attachments.length} file(s)` : ""}
                        </span>
                        <RowActions reveal={false} actions={manageActions(submission)} />
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerGroup>
              <div className="paper-card rounded-2xl">
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
            </>
          )}
        </>
      )}

      <SubmissionDetailDialog form={selected} submission={detail ?? undefined} open={!!detail} onOpenChange={(value) => !value && setDetail(null)} />
      <SubmissionStatusDialog formId={formId} submission={rejectTarget ?? undefined} open={!!rejectTarget} onOpenChange={(value) => !value && setRejectTarget(null)} />
    </div>
  );
}
