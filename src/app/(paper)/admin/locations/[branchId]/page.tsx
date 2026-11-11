"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  MapPin,
  MoreHorizontal,
  PencilLine,
  Phone,
  Users,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { SectionCard } from "@/components/paper/section";
import { Tag } from "@/components/paper/stat";
import { DataList, EmptyState, FieldRow, PersonAvatar } from "@/components/paper/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ActionTooltip } from "@/components/ui/tooltip";
import { ArchiveConfirmDialog, type ArchiveDialogKind } from "@/components/shared/archive-confirm-dialog";
import { BranchFormDialog } from "@/components/branches/branch-form-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useBranchesList,
  useArchiveBranch,
  useRestoreArchiveBranch,
  useDeleteBranch,
} from "@/hooks/use-branches";
import { formatDate } from "@/hooks/use-media";
import { number } from "@/lib/paper/format";

export default function BranchDetailPage({
  params,
}: {
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = React.use(params);
  const { can, ready } = usePermissions();
  const canUpdate = ready && can("branches", "update");
  const canDelete = ready && can("branches", "delete");

  const [editOpen, setEditOpen] = React.useState(false);
  const [archiveState, setArchiveState] = React.useState<ArchiveDialogKind | null>(null);

  const activeList = useBranchesList({ limit: 100 });
  const archivedList = useBranchesList({ limit: 100, archived: true });
  const archive = useArchiveBranch();
  const restore = useRestoreArchiveBranch();
  const del = useDeleteBranch();

  const branch =
    (activeList.data?.data ?? []).find((b) => b.branchId === branchId) ??
    (archivedList.data?.data ?? []).find((b) => b.branchId === branchId);
  const isLoading = activeList.isLoading && archivedList.isLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  if (!branch) {
    return (
      <EmptyState
        icon={<Building2 />}
        title="We couldn&apos;t find this branch"
        description="It may have been deleted forever, or the link is old."
        action={<Button asChild variant="outline" size="sm" className="rounded-full border-line text-sm"><Link href="/admin/locations">Back to locations</Link></Button>}
      />
    );
  }

  const mutation = archiveState === "restore" ? restore : archiveState === "purge" ? del : archive;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/admin/locations" className="inline-flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink">
          <ArrowLeft className="size-3" /> Admin · Locations
        </Link>
        {canUpdate || canDelete ? (
          <div className="flex gap-2">
            {canUpdate ? (
              <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full border-line bg-card text-sm" onClick={() => setEditOpen(true)}>
                <PencilLine className="size-3.5" /> Edit
              </Button>
            ) : null}
            <DropdownMenu>
              <ActionTooltip label="Manage branch">
                <DropdownMenuTrigger asChild>
                  <button type="button" aria-label="Manage branch" className="grid h-8 w-8 place-items-center rounded-full border border-line bg-card text-ink-faint hover:text-ink">
                    <MoreHorizontal className="size-3.5" />
                  </button>
                </DropdownMenuTrigger>
              </ActionTooltip>
              <DropdownMenuContent align="end" className="w-44">
                {!branch.archivedAt && canDelete ? (
                  <DropdownMenuItem className="text-sm" onClick={() => setArchiveState("archive")}>Archive branch</DropdownMenuItem>
                ) : null}
                {branch.archivedAt && canUpdate ? (
                  <DropdownMenuItem className="text-sm" onClick={() => setArchiveState("restore")}>Restore branch</DropdownMenuItem>
                ) : null}
                {branch.archivedAt && canDelete ? (
                  <DropdownMenuItem className="text-sm text-rose" onClick={() => setArchiveState("purge")}>Delete forever</DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}
      </div>

      <div className="paper-card rounded-2xl p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-4">
          <PersonAvatar name={branch.name} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-[clamp(1.4rem,2.4vw,2rem)] font-semibold tracking-tight">{branch.name}</h1>
              {branch.isHeadquarters ? <Tag tone="gold">Headquarters</Tag> : null}
              {branch.archivedAt ? <Tag tone="neutral">Archived</Tag> : null}
            </div>
            <p className="flex items-center gap-1.5 text-sm text-ink-soft">
              <MapPin className="size-3" />
              {[branch.address, branch.city, branch.state, branch.country].filter(Boolean).join(", ") || "No address on file"}
            </p>
          </div>
          <div className="num rounded-xl bg-muted/40 px-5 py-3 text-center">
            <p className="font-display text-xl font-semibold">{number(branch.memberCount ?? 0)}</p>
            <p className="text-xs uppercase tracking-wider text-ink-faint">members</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard eyebrow="Contact" title="How the branch answers">
          <DataList>
            <FieldRow label="Email">{branch.email || "Not available"}</FieldRow>
            <FieldRow label="Phone">{branch.phone || "Not available"}</FieldRow>
            <FieldRow label="City">{branch.city || "Not available"}</FieldRow>
            <FieldRow label="State">{branch.state || "Not available"}</FieldRow>
            <FieldRow label="Country">{branch.country || "Not available"}</FieldRow>
          </DataList>
        </SectionCard>

        <SectionCard eyebrow="Record" title="On the register">
          <DataList>
            <FieldRow label="Members"><span className="flex items-center gap-1.5"><Users className="size-3" />{number(branch.memberCount ?? 0)} assigned</span></FieldRow>
            <FieldRow label="Role">{branch.isHeadquarters ? "Headquarters (church-wide access)" : "Gathering place"}</FieldRow>
            <FieldRow label="Opened">{formatDate(branch.createdAt)}</FieldRow>
            <FieldRow label="Last changed">{formatDate(branch.updatedAt)}</FieldRow>
          </DataList>
          <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-ink-faint">
            <Phone className="mt-0.5 size-3 shrink-0" />
            Branch scope is enforced everywhere. Staff see their branch&apos;s people, Admin HQ reads across all of them.
          </p>
        </SectionCard>
      </div>

      <BranchFormDialog open={editOpen} onOpenChange={setEditOpen} branch={branch} onSaved={() => { setEditOpen(false); toast("Branch updated."); }} />
      <ArchiveConfirmDialog
        open={!!archiveState}
        onOpenChange={(value) => !value && setArchiveState(null)}
        kind={archiveState ?? "archive"}
        entityLabel="branch"
        targetName={branch.name}
        targetId={branch.branchId}
        mutation={mutation}
        onConfirmed={() => { setArchiveState(null); toast.success("Register updated."); }}
      />
    </div>
  );
}
