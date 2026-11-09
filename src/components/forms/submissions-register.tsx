"use client";

import * as React from "react";
import {
  CheckCheck,
  Eye,
  Inbox,
  LayoutGrid,
  Rows3,
  XCircle,
} from "lucide-react";
import { ListTable } from "@/components/shared/list-table";
import {
  EmptyState,
  ListPaginationFooter,
  ManageHeading,
  PersonAvatar,
  RowActions,
  SearchField,
  SortDirectionToggle,
  ViewToggle,
} from "@/components/paper/primitives";
import { Tag } from "@/components/paper/stat";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExportDropdown } from "@/components/shared/export-dropdown";
import { useManageConfirmation } from "@/components/shared/manage-confirmation";
import { SubmissionDetailDialog } from "./submission-detail-dialog";
import { SubmissionStatusDialog } from "./submission-status-dialog";
import { SubmissionRespondent } from "./submission-respondent";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useFormSubmissions,
  useUpdateSubmissionStatus,
  SUBMISSION_STATUS_LABELS,
  type Form,
  type FormSubmission,
  type SubmissionStatus,
  type ListSubmissionsParams,
  type PaginatedResponse,
} from "@/hooks/use-forms";
import { submissionRespondent } from "@/lib/submission-respondent";
import { formatDate } from "@/hooks/use-media";
import { api } from "@/lib/api";
import { fetchAllPages, listUrl } from "@/lib/export-all";
import { toast } from "@/lib/toast";

const EXPORT_COLUMNS = [
  { key: "respondent", label: "Respondent" },
  { key: "contact", label: "Contact" },
  { key: "reference", label: "Submission reference" },
  { key: "status", label: "Status" },
  { key: "source", label: "Source" },
  { key: "submitted", label: "Submitted" },
  { key: "attachments", label: "Attachments" },
  { key: "answers", label: "Answers" },
];

function answers(row: FormSubmission, form: Form) {
  return Object.entries(row.data ?? {})
    .map(
      ([key, value]) =>
        `${form.fields.find((field) => field.key === key)?.label ?? key}: ${Array.isArray(value) ? value.join(", ") : String(value ?? "")}`,
    )
    .join(" · ");
}

/** Both inbox entry points share filters, paging, columns, selection and confirmed review. */
export function SubmissionsRegister({ form }: { form: Form }) {
  const { can, ready } = usePermissions();
  const canRead = ready && can("forms:submissions", "read");
  const canReview = canRead && can("forms:submissions", "update");
  const { confirm, dialog } = useManageConfirmation();
  const [query, setQuery] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<SubmissionStatus | "all">("all");
  const [source, setSource] = React.useState<"all" | "public" | "member">(
    "all",
  );
  const [sortBy, setSortBy] =
    React.useState<NonNullable<ListSubmissionsParams["sortBy"]>>("createdAt");
  const [ascending, setAscending] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(15);
  const [view, setView] = React.useState<"table" | "cards">("table");
  const [detail, setDetail] = React.useState<FormSubmission | null>(null);
  const [reject, setReject] = React.useState<FormSubmission | null>(null);
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);
  const params: ListSubmissionsParams = {
    page,
    limit: perPage,
    search: search || undefined,
    status: status === "all" ? undefined : status,
    source: source === "all" ? undefined : source,
    sortBy,
    sortOrder: ascending ? "asc" : "desc",
  };
  const submissions = useFormSubmissions(form.id, params);
  const update = useUpdateSubmissionStatus(form.id);
  const rows = submissions.data?.data ?? [];
  const total = submissions.data?.meta?.total ?? 0;
  React.useEffect(() => {
    if (submissions.data && page > Math.max(1, Math.ceil(total / perPage)))
      setPage(Math.max(1, Math.ceil(total / perPage)));
  }, [submissions.data, total, page, perPage]);
  const clear = () => {
    setQuery("");
    setStatus("all");
    setSource("all");
    setPage(1);
  };
  const filtered = !!query || status !== "all" || source !== "all";
  const approve = (row: FormSubmission) =>
    update.mutateAsync({ submissionId: row.id, input: { status: "approved" } });
  const actions = (row: FormSubmission) => [
    {
      label: "Read answer",
      icon: <Eye />,
      opensRecord: true,
      onSelect: () => setDetail(row),
    },
    canReview &&
      row.status === "pending" && {
        label: "Approve answer",
        icon: <CheckCheck />,
        tone: "success" as const,
        disabled: update.isPending,
        onSelect: () =>
          confirm({
            title: "Approve answer?",
            subject: submissionRespondent(row, form.fields).name,
            onConfirm: async () => {
              await approve(row);
              toast.success("Answer approved.");
            },
          }),
        bulk: {
          key: "approve",
          label: "Approve selected answers",
          run: () => approve(row),
        },
      },
    canReview &&
      row.status === "pending" && {
        label: "Reject answer",
        icon: <XCircle />,
        tone: "danger" as const,
        disabled: update.isPending,
        onSelect: () => setReject(row),
        bulk: {
          key: "reject",
          label: "Reject selected answers",
          destructive: true,
          requiresReason: true,
          run: (input?: { reason?: string }) =>
            update.mutateAsync({
              submissionId: row.id,
              input: { status: "rejected", rejectionReason: input?.reason },
            }),
        },
      },
  ];
  const exportRow = (row: FormSubmission) => ({
    respondent: submissionRespondent(row, form.fields).name,
    contact: submissionRespondent(row, form.fields).contact,
    reference: row.id,
    status: SUBMISSION_STATUS_LABELS[row.status],
    source: row.submittedBy ? "Signed in" : "Public",
    submitted: formatDate(row.createdAt),
    attachments: row.attachments?.length ?? 0,
    answers: answers(row, form),
  });
  const select = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    choices: { value: string; label: string }[],
  ) => (
    <Select
      value={value}
      onValueChange={(value) => {
        onChange(value);
        setPage(1);
      }}
    >
      <SelectTrigger
        aria-label={label}
        className="h-8 w-40 rounded-full border-line bg-card text-[11px] shadow-none"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {choices.map((choice) => (
          <SelectItem key={choice.value} value={choice.value}>
            {choice.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
  if (!canRead)
    return (
      <EmptyState
        icon={<Inbox />}
        title="Submission access is required"
        description="Your role can view this form but does not have access to its answers."
      />
    );
  return (
    <section
      aria-label={`${form.title} submissions register`}
      className="min-w-0 space-y-4"
    >
      {dialog}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Submissions</h2>
          <p className="mt-1 text-xs text-ink-soft">
            {total} matching responses · {form.title}
          </p>
        </div>
        <ExportDropdown
          columns={EXPORT_COLUMNS}
          data={rows.map(exportRow)}
          title={`Answers — ${form.title}`}
          filename="form-submissions"
          disabled={!total}
          fetchAllRows={async () =>
            (
              await fetchAllPages<FormSubmission>((p) =>
                api.get<PaginatedResponse<FormSubmission>>(
                  listUrl(`/forms/${form.id}/submissions`, {
                    ...params,
                    page: p,
                    limit: 100,
                  }),
                ),
              )
            ).map(exportRow)
          }
        />
      </div>
      <div
        role="group"
        aria-label="Submission list controls"
        className="flex flex-wrap items-center gap-2"
      >
        <SearchField
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          placeholder="Search answers or reference…"
          className="w-full max-w-xs"
        />
        <div className="ml-auto flex max-w-full flex-wrap items-center gap-2">
          {select(
            "Submission status",
            status,
            (value) => setStatus(value as typeof status),
            [
              { value: "all", label: "Any status" },
              ...Object.entries(SUBMISSION_STATUS_LABELS).map(
                ([value, label]) => ({ value, label }),
              ),
            ],
          )}
          {select(
            "Submission source",
            source,
            (value) => setSource(value as typeof source),
            [
              { value: "all", label: "All sources" },
              { value: "public", label: "Public" },
              { value: "member", label: "Signed in" },
            ],
          )}
          {select(
            "Sort submissions",
            sortBy,
            (value) => setSortBy(value as typeof sortBy),
            [
              { value: "createdAt", label: "Date submitted" },
              { value: "status", label: "Status" },
              { value: "id", label: "Reference" },
            ],
          )}
          <SortDirectionToggle
            ascending={ascending}
            onToggle={() => {
              setAscending((value) => !value);
              setPage(1);
            }}
          />
          <ViewToggle
            value={view}
            onChange={setView}
            options={[
              { value: "table", label: "List view", icon: <Rows3 /> },
              { value: "cards", label: "Card view", icon: <LayoutGrid /> },
            ]}
          />
          {filtered && (
            <button
              type="button"
              onClick={clear}
              className="text-xs text-ink-soft underline underline-offset-4"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>
      {submissions.isError ? (
        <EmptyState
          icon={<Inbox />}
          title="Submissions could not be loaded"
          description="Try opening this inbox again."
          action={
            <Button
              variant="outline"
              onClick={() => void submissions.refetch()}
            >
              Retry
            </Button>
          }
        />
      ) : submissions.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : !rows.length ? (
        <EmptyState
          icon={<Inbox />}
          title={filtered ? "No submissions match" : "No submissions yet"}
          description={
            filtered
              ? "Try another search or clear the filters."
              : "Responses will appear here after someone submits this form."
          }
          action={
            filtered ? (
              <Button variant="outline" onClick={clear}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : view === "table" ? (
        <ListTable
          key={`${page}:${perPage}:${search}:${status}:${source}:${sortBy}:${ascending}`}
          tableId={`form-submissions-${form.id}`}
          label="Form submissions"
          records={rows}
          recordKey="id"
          recordType="formSubmission"
          fields={form.fields}
          className="paper-card min-w-[1000px] overflow-hidden rounded-2xl"
        >
          <div className="rule-label grid grid-cols-[minmax(0,1.5fr)_minmax(0,2fr)_1fr_0.8fr_1fr_0.7fr_auto] items-center gap-3 border-b border-line px-5 py-3">
            <span>Respondent</span>
            <span>Answers</span>
            <span>Status</span>
            <span>Source</span>
            <span>Submitted</span>
            <span>Files</span>
            <ManageHeading />
          </div>
          {rows.map((row) => {
            const person = submissionRespondent(row, form.fields);
            return (
              <div
                key={row.id}
                className="group grid grid-cols-[minmax(0,1.5fr)_minmax(0,2fr)_1fr_0.8fr_1fr_0.7fr_auto] items-center gap-3 border-b border-line/70 px-5 py-4 text-xs"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <PersonAvatar name={person.name} size="xs" />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {person.name}
                    </span>
                    <span className="block truncate text-[10px] text-ink-faint">
                      {person.contact || person.reference}
                    </span>
                  </span>
                </div>
                <span
                  title={answers(row, form)}
                  className="truncate text-ink-soft"
                >
                  {answers(row, form)}
                </span>
                <span>
                  <Tag
                    tone={
                      row.status === "approved"
                        ? "moss"
                        : row.status === "rejected"
                          ? "rose"
                          : "gold"
                    }
                  >
                    {SUBMISSION_STATUS_LABELS[row.status]}
                  </Tag>
                </span>
                <span className="text-ink-soft">
                  {row.submittedBy ? "Signed in" : "Public"}
                </span>
                <span className="text-ink-faint">
                  {formatDate(row.createdAt)}
                </span>
                <span className="num">{row.attachments?.length ?? 0}</span>
                <RowActions actions={actions(row)} />
              </div>
            );
          })}
        </ListTable>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <article
              key={row.id}
              className="paper-card flex flex-col gap-3 rounded-2xl p-5"
            >
              <SubmissionRespondent submission={row} fields={form.fields} />
              <p className="line-clamp-3 text-xs leading-relaxed text-ink-soft">
                {answers(row, form)}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Tag
                  tone={
                    row.status === "approved"
                      ? "moss"
                      : row.status === "rejected"
                        ? "rose"
                        : "gold"
                  }
                >
                  {SUBMISSION_STATUS_LABELS[row.status]}
                </Tag>
                <span className="text-xs text-ink-faint">
                  {formatDate(row.createdAt)}
                </span>
              </div>
              <div className="mt-auto border-t border-line pt-3">
                <RowActions reveal={false} actions={actions(row)} />
              </div>
            </article>
          ))}
        </div>
      )}
      {!submissions.isError && (
        <ListPaginationFooter
          page={page}
          perPage={perPage}
          total={total}
          onPageChange={setPage}
          onPerPageChange={(value) => {
            setPerPage(value);
            setPage(1);
          }}
          itemName="responses"
          pending={submissions.isFetching}
        />
      )}
      <SubmissionDetailDialog
        form={form}
        submission={detail ?? undefined}
        open={!!detail}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      />
      {reject && (
        <SubmissionStatusDialog
          key={reject.id}
          intent="reject"
          respondentName={submissionRespondent(reject, form.fields).name}
          formId={form.id}
          submission={reject}
          open
          onOpenChange={(open) => {
            if (!open) setReject(null);
          }}
        />
      )}
    </section>
  );
}
