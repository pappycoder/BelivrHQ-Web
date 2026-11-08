"use client";

import { ListTable } from "@/components/shared/list-table";
import * as React from "react";
import Link from "next/link";
import { hasLivePublicFormLink } from "@/lib/public-form-link";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown as ArrowUpDownIcon,
  ClipboardList,
  Inbox,
  LayoutGrid,
  PencilLine,
  Plus,
  Rows3,
  Share2,
  Trash2,
} from "lucide-react";
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
  type RowAction,
} from "@/components/paper/primitives";
import { StaggerGroup, StaggerItem } from "@/components/paper/motion/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDeleteDialog } from "@/components/pastoral/confirm-delete-dialog";
import { ExportDropdown } from "@/components/shared/export-dropdown";
import { fetchAllPages, listUrl } from "@/lib/export-all";
import { api } from "@/lib/api";
import { usePermissions } from "@/hooks/use-permissions";
import { useCurrentProfile } from "@/hooks/use-profile";
import { useBranchesList } from "@/hooks/use-branches";
import {
  useFormsList,
  useDeleteForm,
  useArchiveForm,
  useRestoreForm,
  FORM_STATUS_LABELS,
  type Form,
  type FormStatus,
  type ListFormsParams,
  type PaginatedResponse,
} from "@/hooks/use-forms";
import { formatDate } from "@/hooks/use-media";
import { number } from "@/lib/paper/format";

const PAGE_SIZE = 12;

const SORT_OPTIONS = [
  { value: "updatedAt", label: "Recently updated" },
  { value: "title", label: "Title" },
  { value: "createdAt", label: "Date created" },
  { value: "submissionCount", label: "Answers" },
] as const;
type SortValue = (typeof SORT_OPTIONS)[number]["value"];

const EXPORT_COLUMNS = [
  { key: "title", label: "Form" },
  { key: "status", label: "Status" },
  { key: "branchName", label: "Branch" },
  { key: "questions", label: "Questions" },
  { key: "submissionCount", label: "Answers" },
  { key: "isPublic", label: "Public link" },
  { key: "updatedAt", label: "Updated" },
  { key: "createdAt", label: "Created" },
];

export default function FormsListPage() {
  const router = useRouter();
  const { can, ready } = usePermissions();
  const { data: profile } = useCurrentProfile();
  const isHq = !!profile?.isAdminHq;
  const canCreate = ready && can("forms:list", "create");
  const canUpdate = ready && can("forms:list", "update");
  const canDelete = ready && can("forms:list", "delete");

  const [searchInput, setSearchInput] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<FormStatus | "">("");
  const [branchId, setBranchId] = React.useState("all");
  const [sortBy, setSortBy] = React.useState<SortValue>("updatedAt");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(PAGE_SIZE);
  const [archivedView, setArchivedView] = React.useState(false);
  const [view, setView] = React.useState<"table" | "cards">("cards");
  const [deleteTarget, setDeleteTarget] = React.useState<Form | null>(null);

  // Debounced server search — every keystroke was a fresh query and could
  // strand the view on a page the new result set does not have.
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const queryParams = React.useMemo<ListFormsParams>(
    () => ({
      page,
      limit: perPage,
      search: query || undefined,
      status: status || undefined,
      archived: archivedView || undefined,
      branchId: isHq && branchId !== "all" ? branchId : undefined,
      sortBy,
      sortOrder,
    }),
    [page, perPage, query, status, archivedView, isHq, branchId, sortBy, sortOrder],
  );
  const forms = useFormsList(queryParams);
  const branches = useBranchesList({ limit: 100 }, { enabled: isHq });
  const del = useDeleteForm();
  const archive = useArchiveForm();
  const restore = useRestoreForm();

  const rows = forms.data?.data ?? [];
  const total = forms.data?.meta?.total ?? 0;

  const copyPublicLink = (form: Form) => {
    if (!hasLivePublicFormLink(form)) return;
    const url = `${window.location.origin}/forms/public/${form.publicToken}`;
    navigator.clipboard?.writeText(url).catch(() => undefined);
    toast("Public link copied.");
  };

  // One Manage builder feeds both the table rows and the cards, so the
  // affordances (and their gates) can never drift apart between views.
  const manageActions = (form: Form): (RowAction | false | "" | undefined)[] => [
    { label: "Open & answers", icon: <Inbox />, href: `/library/forms/${form.id}` },
    canUpdate && !form.archivedAt && {
      label: "Edit in builder",
      icon: <PencilLine />,
      href: `/library/forms/${form.id}/edit`,
    },
    hasLivePublicFormLink(form) && {
      label: "Copy public link",
      icon: <Share2 />,
      onSelect: () => copyPublicLink(form),
    },
    canDelete && !form.archivedAt && {
      label: "Archive form", confirmation: { subject: form.title },
      icon: <ClipboardList />,
      bulk: { key: "archive", label: "Archive selected forms", run: () => archive.mutateAsync(form.id) },
      onSelect: () => archive.mutateAsync(form.id, {
        onSuccess: () => toast("Form archived."),
        onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't archive.")),
      }),
    },
    canDelete && form.archivedAt && {
      label: "Restore form", confirmation: { subject: form.title },
      icon: <Plus />,
      tone: "success",
      bulk: { key: "restore", label: "Restore selected forms", run: () => restore.mutateAsync(form.id) },
      onSelect: () => restore.mutateAsync(form.id, {
        onSuccess: () => toast("Form restored."),
        onError: () => toast.error("Couldn't restore."),
      }),
    },
    canDelete && !form.archivedAt && {
      label: "Delete form",
      icon: <Trash2 />,
      tone: "danger",
      onSelect: () => setDeleteTarget(form),
      bulk: { key: "delete", label: "Delete selected forms", destructive: true, run: () => del.mutateAsync(form.id) },
    },
  ];

  const statusTag = (form: Form) =>
    form.archivedAt ? (
      <Tag tone="neutral">Archived</Tag>
    ) : (
      <Tag tone={form.status === "published" ? "moss" : form.status === "draft" ? "gold" : "sky"} dot>
        {FORM_STATUS_LABELS[form.status]}
      </Tag>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Library · Forms"
        title="Ask once, read everything."
        description="Guest cards, RSVPs, requests — every answer lands on someone&apos;s desk, not in someone&apos;s inbox folder."
        actions={
          <>
            <ExportDropdown
              columns={EXPORT_COLUMNS}
              data={rows.map((form) => ({
                title: form.title,
                status: FORM_STATUS_LABELS[form.status] ?? form.status,
                branchName: form.branchName ?? "All branches",
                questions: form.fields?.length ?? 0,
                submissionCount: form.submissionCount ?? 0,
                isPublic: form.isPublic && form.publicToken ? "Yes" : "No",
                updatedAt: form.updatedAt ? formatDate(form.updatedAt) : "—",
                createdAt: form.createdAt ? formatDate(form.createdAt) : "—",
              }))}
              title="Forms"
              filename="forms"
              disabled={!total}
              fetchAllRows={async () => {
                const all = await fetchAllPages<Form>((p) =>
                  api.get<PaginatedResponse<Form>>(
                    listUrl("/forms", { ...queryParams, page: p, limit: 100 }),
                  ),
                );
                return all.map((form) => ({
                  title: form.title,
                  status: FORM_STATUS_LABELS[form.status] ?? form.status,
                  branchName: form.branchName ?? "All branches",
                  questions: form.fields?.length ?? 0,
                  submissionCount: form.submissionCount ?? 0,
                  isPublic: form.isPublic && form.publicToken ? "Yes" : "No",
                  updatedAt: form.updatedAt ? formatDate(form.updatedAt) : "—",
                  createdAt: form.createdAt ? formatDate(form.createdAt) : "—",
                }));
              }}
            />
            <Button asChild variant="outline" className="h-9 gap-1.5 rounded-full border-line bg-card text-xs">
              <Link href="/library/forms/submissions">
                <Inbox className="size-3.5" /> Answers inbox
              </Link>
            </Button>
            {canCreate ? (
              <Button className="h-9 gap-1.5 rounded-full text-xs" onClick={() => router.push("/library/forms/new")}>
                <Plus className="size-3.5" /> New form
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Forms" value={total} tone="brand" icon={<ClipboardList className="size-4" />} deltaLabel={archivedView ? "archived" : "matching"} />
        <StatCard label="Published" value={rows.filter((f) => f.status === "published" && !f.archivedAt).length} tone="moss" deltaLabel="this page" />
        <StatCard label="Public links" value={rows.filter(hasLivePublicFormLink).length} tone="sky" deltaLabel="fillable by anyone" />
        <StatCard label="Answers this page" value={rows.reduce((sum, f) => sum + (f.submissionCount ?? 0), 0)} tone="gold" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchField value={searchInput} onChange={setSearchInput} placeholder="Search forms…" className="w-full max-w-xs" />
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={status === ""} onClick={() => { setStatus(""); setPage(1); }}>Any state</FilterChip>
          {(["draft", "published", "closed"] as const).map((s) => (
            <FilterChip key={s} active={status === s} onClick={() => { setStatus(s); setPage(1); }}>
              {FORM_STATUS_LABELS[s]}
            </FilterChip>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <FilterChip active={archivedView} onClick={() => { setArchivedView((v) => !v); setPage(1); }}>
            Archived
          </FilterChip>
          {isHq ? (
            <Select value={branchId} onValueChange={(value) => { setBranchId(value); setPage(1); }}>
              <SelectTrigger className="h-8 w-36 rounded-full border-line bg-card text-[11px] shadow-none">
                <SelectValue placeholder="All branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {(branches.data?.data ?? []).map((branch) => (
                  <SelectItem key={branch.branchId} value={branch.branchId}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Select value={sortBy} onValueChange={(value) => { setSortBy(value as SortValue); setPage(1); }}>
            <SelectTrigger className="h-8 w-40 rounded-full border-line bg-card text-[11px] shadow-none">
              <ArrowUpDownIcon /> <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <SortDirectionToggle ascending={sortOrder === "asc"} onToggle={() => { setSortOrder((o) => (o === "asc" ? "desc" : "asc")); setPage(1); }} />
          <ViewToggle
            value={view}
            onChange={setView}
            options={[
              { value: "table", label: "Table", icon: <Rows3 /> },
              { value: "cards", label: "Cards", icon: <LayoutGrid /> },
            ]}
          />
        </div>
      </div>

      {forms.isError ? (
        <EmptyState
          icon={<ClipboardList />}
          title="Couldn&apos;t load the forms"
          description="The register failed to reach the server."
          action={<Button size="sm" variant="outline" className="rounded-full border-line text-xs" onClick={() => forms.refetch()}>Retry</Button>}
        />
      ) : forms.isLoading ? (
        <div className={view === "cards" ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className={view === "cards" ? "h-44 rounded-2xl" : "h-14 rounded-xl"} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<ClipboardList />}
          title={archivedView ? "Nothing archived" : "No forms yet"}
          description="A form is a question asked once and answered forever."
          action={canCreate ? <Button size="sm" variant="outline" className="rounded-full border-line text-xs" onClick={() => router.push("/library/forms/new")}>Build the first</Button> : undefined}
        />
      ) : view === "table" ? (
        <div className="paper-card overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <ListTable className="min-w-[720px]" tableId="library-forms-1" records={rows ?? []} recordKey="id">
              <div className="rule-label grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.2fr)_repeat(3,minmax(0,0.7fr))_auto] items-center gap-3 border-b border-line px-5 py-2.5">
                <span>Form</span>
                <span>State</span>
                <span>Branch</span>
                <span className="text-right">Questions</span>
                <span className="text-right">Answers</span>
                <span>Updated</span>
                <ManageHeading />
              </div>
              <div className="divide-y divide-line/70">
                {rows.map((form) => (
                  <div
                    key={form.id}
                    className="group grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.2fr)_repeat(3,minmax(0,0.7fr))_auto] items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
                  >
                    <button
                      type="button"
                      onClick={() => router.push(`/library/forms/${form.id}`)}
                      className="min-w-0 text-left"
                    >
                      <p className="truncate text-xs font-semibold hover:text-brand">{form.title}</p>
                      {form.description ? (
                        <p className="truncate text-[10px] text-ink-faint">{form.description}</p>
                      ) : null}
                    </button>
                    <span>{statusTag(form)}</span>
                    <span className="truncate text-[11px] text-ink-soft">{form.branchName ?? "All branches"}</span>
                    <span className="num text-right text-[11px] tabular-nums">{form.fields?.length ?? 0}</span>
                    <span className="num text-right text-[11px] tabular-nums">{number(form.submissionCount ?? 0)}</span>
                    <span className="text-[11px] text-ink-faint">{form.updatedAt ? formatDate(form.updatedAt) : "—"}</span>
                    <div className="flex justify-end">
                      <RowActions actions={manageActions(form)} />
                    </div>
                  </div>
                ))}
              </div>
            </ListTable>
          </div>
          <div className="border-t border-line px-5 py-3">
            <ListPaginationFooter
              page={page}
              perPage={perPage}
              total={total}
              onPageChange={setPage}
              onPerPageChange={setPerPage}
              perPageOptions={[12, 24, 48]}
              itemName="forms"
              pending={forms.isFetching}
            />
          </div>
        </div>
      ) : (
        <>
          <StaggerGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((form) => (
              <StaggerItem key={form.id}>
                <div className="paper-card flex h-full flex-col rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <button type="button" onClick={() => router.push(`/library/forms/${form.id}`)} className="min-w-0 text-left">
                      <p className="truncate text-xs font-semibold hover:text-brand">{form.title}</p>
                      <p className="mt-0.5 text-[10px] text-ink-faint">
                        {form.fields?.length ?? 0} questions · {form.branchName ?? "all branches"}
                      </p>
                    </button>
                    <span className="flex shrink-0 items-center gap-1.5">
                      {statusTag(form)}
                      <RowActions reveal={false} actions={manageActions(form)} />
                    </span>
                  </div>
                  {form.description ? <p className="mt-2 line-clamp-2 flex-1 text-[11px] leading-relaxed text-ink-soft">{form.description}</p> : <p className="flex-1" />}
                  <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-3 text-[10px] text-ink-faint">
                    <span className="num">{number(form.submissionCount ?? 0)} answers</span>
                    <span>updated {formatDate(form.updatedAt)}</span>
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
              perPageOptions={[12, 24, 48]}
              itemName="forms"
              pending={forms.isFetching}
            />
          </div>
        </>
      )}

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(value) => !value && setDeleteTarget(null)}
        title="Delete this form?"
        description={deleteTarget ? `${deleteTarget.title} and its settings will be removed. Existing answers stay archived for the audit trail.` : ""}
        confirmLabel="Delete"
        pending={del.isPending}
        pendingLabel="Deleting…"
        onConfirm={() => {
          if (!deleteTarget) return;
          del.mutate(deleteTarget.id, {
            onSuccess: () => { toast("Form deleted."); setDeleteTarget(null); },
            onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't delete the form.")),
          });
        }}
      />
    </div>
  );
}
