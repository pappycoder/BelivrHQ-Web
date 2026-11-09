"use client";

import * as React from "react";
import { ListTable } from "@/components/shared/list-table";
import { CommunicationRegisterControls, useCommunicationRegister } from "@/components/communication/register-controls";
import { useCurrentProfile } from "@/hooks/use-profile";
import { useBranchesList } from "@/hooks/use-branches";
import {
  Archive,
  ArchiveRestore,
  FileText,
  PencilLine,
  Plus,
  Rocket,
  Search,
  Trash2,
} from "lucide-react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { PageHeader } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import { EmptyState, ListPaginationFooter, ManageHeading, RowActions } from "@/components/paper/primitives";
import { StaggerGroup, StaggerItem } from "@/components/paper/motion/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/pastoral/confirm-delete-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useTemplatesList,
  useCreateTemplate,
  useUpdateTemplate,
  usePublishTemplate,
  useArchiveTemplate,
  useRestoreTemplate,
  useDeleteTemplate,
  TEMPLATE_CHANNELS,
  TEMPLATE_CHANNEL_LABELS,
  TEMPLATE_STATUS_LABELS,
  type Template,
  type TemplateChannel,
  type ListTemplatesParams,
} from "@/hooks/use-templates";
import { cn } from "@/lib/utils";

const CHANNEL_TONES: Record<TemplateChannel, "moss" | "sky" | "gold"> = {
  whatsapp: "moss",
  sms: "sky",
  email: "gold",
};

interface Draft {
  name: string;
  channel: TemplateChannel;
  category: string;
  language: string;
  content: string;
  variables: string;
  publish: boolean;
}

const BLANK: Draft = { name: "", channel: "whatsapp", category: "MARKETING", language: "en", content: "", variables: "", publish: false };

function draftFrom(t: Template): Draft {
  return {
    name: t.name,
    channel: t.channel,
    category: t.category ?? "MARKETING",
    language: t.language ?? "en",
    content: t.content,
    variables: (t.variables ?? []).join(", "),
    publish: t.status === "published",
  };
}

export default function TemplatesPage() {
  const { can, ready } = usePermissions();
  const canCreate = ready && can("templates", "create");
  const canUpdate = ready && can("templates", "update");
  const canDelete = ready && can("templates", "delete");

  const controls = useCommunicationRegister("name", true);
  const { data: profile } = useCurrentProfile();
  const branches = useBranchesList({ limit: 100 }, { enabled: !!profile?.isAdminHq });
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Template | null>(null);
  const [draft, setDraft] = React.useState<Draft>(BLANK);
  const [deleteTarget, setDeleteTarget] = React.useState<Template | null>(null);

  const templates = useTemplatesList({
    page: controls.page, limit: controls.perPage,
    search: controls.search || undefined,
    channel: controls.channel === "all" ? undefined : controls.channel as TemplateChannel,
    status: controls.status === "draft" || controls.status === "published" ? controls.status : undefined,
    archived: controls.status === "archived" || undefined,
    branchId: controls.branch === "all" ? undefined : controls.branch,
    sortBy: controls.sort as ListTemplatesParams["sortBy"], sortOrder: controls.ascending ? "asc" : "desc",
  });
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate(editing?.templateId ?? "");
  const publish = usePublishTemplate();
  const archive = useArchiveTemplate();
  const restore = useRestoreTemplate();
  const del = useDeleteTemplate();

  const rows = templates.data?.data ?? [];
  const total = templates.data?.meta?.total ?? 0;
  const { page, perPage, setPage } = controls;
  React.useEffect(() => {
    if (templates.data && page > Math.max(1, Math.ceil(total / perPage))) setPage(Math.max(1, Math.ceil(total / perPage)));
  }, [templates.data, total, page, perPage, setPage]);

  const openForm = (t: Template | null) => {
    setEditing(t);
    setDraft(t ? draftFrom(t) : BLANK);
    setFormOpen(true);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim() || !draft.content.trim()) { toast.error("A name and the words, please."); return; }
    const variables = draft.variables.split(",").map((v) => v.trim()).filter(Boolean);
    if (editing) {
      updateTemplate.mutate(
        {
          name: draft.name.trim(),
          content: draft.content,
          channel: draft.channel,
          language: draft.language || undefined,
          category: (draft.category || undefined) as never,
          variables: variables.length ? variables : undefined,
          status: draft.publish ? "published" : "draft",
        },
        { onSuccess: () => { toast("Template saved."); setFormOpen(false); }, onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't save the template.")) },
      );
    } else {
      createTemplate.mutate(
        {
          name: draft.name.trim(),
          content: draft.content,
          channel: draft.channel,
          language: draft.language || undefined,
          category: (draft.category || undefined) as never,
          variables: variables.length ? variables : undefined,
          status: draft.publish ? "published" : "draft",
        },
        { onSuccess: () => { toast("Template created."); setFormOpen(false); }, onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't create the template.")) },
      );
    }
  };

  const published = (templates.data?.data ?? []).filter((t) => t.status === "published" && !t.archivedAt).length;

  const actionsFor = (t: Template, reveal = false) => (
    <RowActions
                      reveal={reveal}
                      actions={[
                        canUpdate && !t.archivedAt && {
                          label: "Edit template",
                          icon: <PencilLine />,
                          onSelect: () => openForm(t),
                        },
                        canUpdate && !t.archivedAt && t.status === "draft" && {
                          label: "Publish — usable in broadcasts now", confirmation: { subject: t.name },
                          icon: <Rocket />,
                          tone: "success",
                          onSelect: () => publish.mutateAsync(t.templateId, { onSuccess: () => toast("Published — usable in broadcasts now.") }),
                        },
                        canUpdate && !t.archivedAt && {
                          label: "Archive template", confirmation: { subject: t.name },
                          icon: <Archive />,
                          onSelect: () => archive.mutateAsync(t.templateId, { onSuccess: () => toast("Archived.") }),
                        },
                        canUpdate && t.archivedAt && {
                          label: "Restore template", confirmation: { subject: t.name },
                          icon: <ArchiveRestore />,
                          tone: "success",
                          onSelect: () => restore.mutateAsync(t.templateId, { onSuccess: () => toast("Restored.") }),
                        },
                        canDelete && !t.archivedAt && {
                          label: "Delete template",
                          icon: <Trash2 />,
                          tone: "danger",
                          onSelect: () => setDeleteTarget(t),
                        },
                      ]}
                    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Connect · Templates"
        title="Words worth reusing."
        description="The team&apos;s best sentences — kind, consistent, and always personalised before sending."
        actions={
          canCreate ? (
            <Button className="h-9 gap-1.5 rounded-full text-xs" onClick={() => openForm(null)}>
              <Plus className="size-3.5" /> New template
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Templates" value={templates.data?.meta?.total ?? 0} tone="brand" icon={<FileText className="size-4" />} />
        <StatCard label="Published on page" value={published} tone="moss" deltaLabel="ready to send" />
        <StatCard label="WhatsApp on page" value={(templates.data?.data ?? []).filter((t) => t.channel === "whatsapp").length} tone="sky" />
        <StatCard label="Email on page" value={(templates.data?.data ?? []).filter((t) => t.channel === "email").length} tone="gold" />
      </div>

      <CommunicationRegisterControls controls={controls} kind="Templates"
        channels={TEMPLATE_CHANNELS.map(value => ({ value, label: TEMPLATE_CHANNEL_LABELS[value] }))}
        statuses={[{ value: "draft", label: "Draft" }, { value: "published", label: "Published" }, { value: "archived", label: "Archived" }]}
        sorts={[{ value: "name", label: "Name" }, { value: "createdAt", label: "Date added" }, { value: "updatedAt", label: "Last updated" }, { value: "channel", label: "Channel" }, { value: "status", label: "Status" }]}
        branches={profile?.isAdminHq ? (branches.data?.data ?? []).map(b => ({ value: b.branchId, label: b.name })) : undefined}
      />

      {templates.isError ? (
        <EmptyState title="Templates could not be loaded" description="Try loading the register again." action={<Button variant="outline" onClick={() => void templates.refetch()}>Retry</Button>} />
      ) : templates.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Search />}
          title="No templates match"
          description="Templates keep a small team sounding like one voice."
          action={canCreate ? <Button size="sm" variant="outline" className="rounded-full border-line text-xs" onClick={() => openForm(null)}>Write the first</Button> : undefined}
        />
      ) : controls.view === "table" ? (
        <ListTable tableId="connect-templates-1" label="Templates" records={rows} recordKey="templateId" recordType="template" className="paper-card min-w-[900px] overflow-hidden rounded-2xl">
          <div className="rule-label grid grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_1fr_1fr_auto] items-center gap-3 border-b border-line px-5 py-3">
            <span>Template</span><span>Channel</span><span>Status</span><span>Category</span><span>Branch</span><span>Last updated</span><ManageHeading />
          </div>
          {rows.map(t => <div key={t.templateId} className="group grid grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_1fr_1fr_auto] items-center gap-3 border-b border-line/70 px-5 py-4 text-xs">
            <div className="min-w-0"><p className="truncate font-semibold">{t.name}</p><p className="mt-1 truncate text-ink-faint">{t.content}</p></div>
            <span><Tag tone={CHANNEL_TONES[t.channel]}>{TEMPLATE_CHANNEL_LABELS[t.channel]}</Tag></span>
            <span><Tag tone={t.archivedAt ? "neutral" : t.status === "published" ? "moss" : "gold"}>{t.archivedAt ? "Archived" : TEMPLATE_STATUS_LABELS[t.status]}</Tag></span>
            <span className="truncate text-ink-soft">{t.category ?? "—"}</span>
            <span className="truncate text-ink-soft">{t.branchName ?? "All branches"}</span>
            <span className="text-ink-faint">{new Date(t.updatedAt).toLocaleDateString("en-GB")}</span>
            {actionsFor(t, true)}
          </div>)}
        </ListTable>
      ) : (
        <StaggerGroup className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((t) => (
            <StaggerItem key={t.templateId}>
              <div className={cn("paper-card flex h-full flex-col rounded-2xl p-4", t.archivedAt && "opacity-60")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{t.name}</p>
                    <p className="mt-0.5 flex items-center gap-1.5">
                      <Tag tone={CHANNEL_TONES[t.channel]}>{TEMPLATE_CHANNEL_LABELS[t.channel]}</Tag>
                      {t.archivedAt ? <Tag tone="neutral">Archived</Tag> : <Tag tone={t.status === "published" ? "moss" : "gold"}>{TEMPLATE_STATUS_LABELS[t.status]}</Tag>}
                    </p>
                  </div>
                </div>
                <p className="mt-3 line-clamp-3 flex-1 font-mono text-[10px] leading-relaxed text-ink-soft">{t.content}</p>
                {t.variables?.length ? (
                  <p className="mt-2 flex flex-wrap gap-1">
                    {t.variables.slice(0, 4).map((v) => (
                      <span key={v} className="rounded bg-brand-soft px-1.5 py-0.5 font-mono text-[9px] text-brand">{`{{${v}}}`}</span>
                    ))}
                  </p>
                ) : null}
                <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-3 text-[10px] text-ink-faint">
                  <span>{t.branchName ?? "All branches"}</span>
                  <span className="flex items-center gap-0.5">
                    {actionsFor(t)}
                  </span>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      )}

      {!templates.isError && <ListPaginationFooter page={controls.page} perPage={controls.perPage} total={total} onPageChange={controls.setPage} onPerPageChange={value => { controls.setPerPage(value); controls.setPage(1); }} perPageOptions={[12, 24, 48]} itemName="templates" />}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="rounded-2xl border-line bg-card sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? `Edit ${editing.name}` : "New template"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="First-time guest welcome" className="h-10 rounded-lg border-line bg-background text-sm shadow-none" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Channel</Label>
                <select value={draft.channel} onChange={(e) => setDraft((d) => ({ ...d, channel: e.target.value as TemplateChannel }))} className="h-10 w-full rounded-lg border border-line bg-background px-2 text-xs outline-none">
                  {TEMPLATE_CHANNELS.map((c) => <option key={c} value={c}>{TEMPLATE_CHANNEL_LABELS[c]}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <select value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))} className="h-10 w-full rounded-lg border border-line bg-background px-2 text-xs outline-none">
                  <option value="MARKETING">Marketing</option>
                  <option value="UTILITY">Utility</option>
                  <option value="AUTHENTICATION">Authentication</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Language</Label>
                <Input value={draft.language} onChange={(e) => setDraft((d) => ({ ...d, language: e.target.value }))} className="h-10 rounded-lg border-line bg-background text-xs shadow-none" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Content</Label>
              <Textarea rows={5} value={draft.content} onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))} placeholder="Hi {{first_name}}, it was lovely to meet you on Sunday…" className="resize-none rounded-lg border-line bg-background font-mono text-xs shadow-none" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Variables (comma separated)</Label>
              <Input value={draft.variables} onChange={(e) => setDraft((d) => ({ ...d, variables: e.target.value }))} placeholder="first_name, church" className="h-10 rounded-lg border-line bg-background font-mono text-xs shadow-none" />
            </div>
            <label className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5">
              <span className="text-xs">Published (usable in broadcasts)</span>
              <input type="checkbox" checked={draft.publish} onChange={(e) => setDraft((d) => ({ ...d, publish: e.target.checked }))} />
            </label>
            <Button type="submit" disabled={createTemplate.isPending || updateTemplate.isPending} className="h-10 w-full rounded-lg text-sm">
              {editing ? "Save template" : "Create template"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete this template?"
        description={deleteTarget ? `${deleteTarget.name} will be removed. Broadcasts already sent keep their copy.` : ""}
        confirmLabel="Delete"
        pending={del.isPending}
        pendingLabel="Deleting…"
        onConfirm={() => {
          if (!deleteTarget) return;
          del.mutate(deleteTarget.templateId, {
            onSuccess: () => { toast("Template deleted."); setDeleteTarget(null); },
            onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't delete it.")),
          });
        }}
      />
    </div>
  );
}
