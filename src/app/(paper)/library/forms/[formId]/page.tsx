"use client";

import { useManageConfirmation } from "@/components/shared/manage-confirmation";

import * as React from "react";
import Link from "next/link";
import { hasLivePublicFormLink } from "@/lib/public-form-link";
import {
  ArrowLeft,
  SlidersHorizontal,
  Copy,
  Inbox,
  Link2,
  RefreshCcw,
  Users,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { SectionCard } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import {
  DataList,
  EmptyState,
  FieldRow,
} from "@/components/paper/primitives";
import { Button } from "@/components/ui/button";
import { SubmissionsRegister } from "@/components/forms/submissions-register";
import { FormStatusDialog } from "@/components/forms/form-status-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useForm,
  useRegenerateLink,
  FIELD_TYPE_LABELS,
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

  const form = useForm(formId);
  const regenerate = useRegenerateLink();

  const [statusOpen, setStatusOpen] = React.useState(false);

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
  const shareUrl = hasLivePublicFormLink(f) ? `${typeof window !== "undefined" ? window.location.origin : ""}/forms/public/${f.publicToken}` : null;

  const copyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard?.writeText(shareUrl).catch(() => undefined);
    toast("Public link copied.");
  };

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
            {canUpdate && !f.archivedAt && <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full border-line bg-card text-xs" onClick={() => setStatusOpen(true)}><SlidersHorizontal className="size-3.5" /> Change form status</Button>}
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
              ? "Publish this form to activate its public link."
              : "Reopen this form to activate its public link."}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Answers" value={f.submissionCount ?? 0} tone="brand" icon={<Inbox className="size-4" />} />
        <StatCard label="Questions" value={f.fields?.length ?? 0} tone="moss" icon={<Users className="size-4" />} deltaLabel={f.uniqueField ? "one response per person" : "unlimited responses"} />
        <StatCard label="Limit" value={f.submissionLimit ?? 0} tone="sky" deltaLabel={f.submissionLimit ? "caps at this many answers" : "no cap set"} />
      </div>

      <div className="space-y-6">
        <SubmissionsRegister key={f.id} form={f} />

        <aside className="grid gap-4 md:grid-cols-2">
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

      {statusOpen && <FormStatusDialog key={f.id} form={f} onClose={() => setStatusOpen(false)} />}
    </div>
  );
}
