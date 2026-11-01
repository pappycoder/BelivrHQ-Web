"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Inbox,
  MoreHorizontal,
  Plus,
  Share2,
  Trash2,
} from "lucide-react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { PageHeader } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import {
  EmptyState,
  FilterChip,
  SearchField,
} from "@/components/paper/primitives";
import { StaggerGroup, StaggerItem } from "@/components/paper/motion/primitives";
import { Button } from "@/components/ui/button";
import { ActionTooltip } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDeleteDialog } from "@/components/pastoral/confirm-delete-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useFormsList,
  useDeleteForm,
  useArchiveForm,
  useRestoreForm,
  FORM_STATUS_LABELS,
  type Form,
  type FormStatus,
} from "@/hooks/use-forms";
import { formatDate } from "@/hooks/use-media";
import { number } from "@/lib/paper/format";

const PAGE_SIZE = 12;

export default function FormsListPage() {
  const router = useRouter();
  const { can, ready } = usePermissions();
  const canCreate = ready && can("forms:list", "create");
  const canDelete = ready && can("forms:list", "delete");

  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<FormStatus | "">("");
  const [page, setPage] = React.useState(1);
  const [archivedView, setArchivedView] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Form | null>(null);

  const forms = useFormsList({
    page,
    limit: PAGE_SIZE,
    search: query || undefined,
    status: status || undefined,
    archived: archivedView || undefined,
  });
  const del = useDeleteForm();
  const archive = useArchiveForm();
  const restore = useRestoreForm();

  const rows = forms.data?.data ?? [];
  const total = forms.data?.meta?.total ?? 0;
  const totalPages = Math.max(1, forms.data?.meta?.totalPages ?? 1);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Library · Forms"
        title="Ask once, read everything."
        description="Guest cards, RSVPs, requests — every answer lands on someone&apos;s desk, not in someone&apos;s inbox folder."
        actions={
          <>
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
        <StatCard label="Public links" value={rows.filter((f) => f.isPublic && f.publicToken).length} tone="sky" deltaLabel="fillable by anyone" />
        <StatCard label="Answers this page" value={rows.reduce((sum, f) => sum + (f.submissionCount ?? 0), 0)} tone="gold" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchField value={query} onChange={setQuery} placeholder="Search forms…" className="w-full max-w-[220px]" />
        <FilterChip active={status === ""} onClick={() => { setStatus(""); setPage(1); }}>Any state</FilterChip>
        {(["draft", "published", "closed"] as const).map((s) => (
          <FilterChip key={s} active={status === s} onClick={() => { setStatus(s); setPage(1); }}>{FORM_STATUS_LABELS[s]}</FilterChip>
        ))}
        <FilterChip active={archivedView} onClick={() => { setArchivedView((v) => !v); setPage(1); }}>Archived</FilterChip>
      </div>

      {forms.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<ClipboardList />}
          title={archivedView ? "Nothing archived" : "No forms yet"}
          description="A form is a question asked once and answered forever."
          action={canCreate ? <Button size="sm" variant="outline" className="rounded-full border-line text-xs" onClick={() => router.push("/library/forms/new")}>Build the first</Button> : undefined}
        />
      ) : (
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
                    {form.archivedAt ? <Tag tone="neutral">Archived</Tag> : <Tag tone={form.status === "published" ? "moss" : form.status === "draft" ? "gold" : "sky"} dot>{FORM_STATUS_LABELS[form.status]}</Tag>}
                    <DropdownMenu>
                      <ActionTooltip label="Manage form">
                        <DropdownMenuTrigger asChild>
                          <button type="button" aria-label="Manage form" className="grid size-7 place-items-center rounded-full text-ink-faint hover:bg-muted hover:text-ink">
                            <MoreHorizontal className="size-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                      </ActionTooltip>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem className="gap-2 text-xs" onClick={() => router.push(`/library/forms/${form.id}`)}>
                          <Inbox className="size-3.5" /> Open &amp; answers
                        </DropdownMenuItem>
                        {canCreate && !form.archivedAt ? (
                          <DropdownMenuItem className="gap-2 text-xs" onClick={() => router.push(`/library/forms/${form.id}/edit`)}>
                            <Plus className="size-3.5" /> Edit in builder
                          </DropdownMenuItem>
                        ) : null}
                        {form.isPublic && form.publicToken ? (
                          <DropdownMenuItem
                            className="gap-2 text-xs"
                            onClick={() => {
                              const url = `${window.location.origin}/forms/public/${form.publicToken}`;
                              navigator.clipboard?.writeText(url).catch(() => undefined);
                              toast("Public link copied.");
                            }}
                          >
                            <Share2 className="size-3.5" /> Copy public link
                          </DropdownMenuItem>
                        ) : null}
                        {canDelete && !form.archivedAt ? (
                          <DropdownMenuItem className="gap-2 text-xs" onClick={() => archive.mutate(form.id, { onSuccess: () => toast("Form archived."), onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't archive.")) })}>
                            <ClipboardList className="size-3.5" /> Archive
                          </DropdownMenuItem>
                        ) : null}
                        {form.archivedAt && canDelete ? (
                          <DropdownMenuItem className="gap-2 text-xs" onClick={() => restore.mutate(form.id, { onSuccess: () => toast("Form restored."), onError: () => toast.error("Couldn't restore.") })}>
                            Restore
                          </DropdownMenuItem>
                        ) : null}
                        {canDelete && !form.archivedAt ? (
                          <DropdownMenuItem className="gap-2 text-xs text-rose" onClick={() => setDeleteTarget(form)}>
                            <Trash2 className="size-3.5" /> Delete
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
      )}

      {rows.length ? (
        <div className="paper-card flex items-center justify-between rounded-2xl px-5 py-2.5 text-[11px] text-ink-faint">
          <span>Page <span className="num font-medium text-ink">{page}</span> of <span className="num">{totalPages}</span></span>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="xs" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-full border-line bg-card">Prev</Button>
            <Button variant="outline" size="xs" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded-full border-line bg-card">Next</Button>
          </div>
        </div>
      ) : null}

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
