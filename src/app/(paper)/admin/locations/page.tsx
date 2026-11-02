"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Building2, LayoutGrid, MapPin, PencilLine, Plus, Archive, ArchiveRestore, Rows3, Trash2, Users } from "lucide-react";
import { toast } from "@/lib/toast";
import { PageHeader } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import {
  EmptyState,
  FilterChip,
  ListPaginationFooter,
  ManageHeading,
  PersonAvatar,
  RowActions,
  SearchField,
  ViewToggle,
  type RowAction,
} from "@/components/paper/primitives";
import { StaggerGroup, StaggerItem } from "@/components/paper/motion/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArchiveConfirmDialog, type ArchiveDialogKind } from "@/components/shared/archive-confirm-dialog";
import { BranchFormDialog } from "@/components/branches/branch-form-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useBranchesList,
  useArchiveBranch,
  useRestoreArchiveBranch,
  useDeleteBranch,
  type Branch,
} from "@/hooks/use-branches";
import { formatDate } from "@/hooks/use-media";
import { number } from "@/lib/paper/format";

const PAGE_SIZE = 15;

type DialogState = { kind: ArchiveDialogKind; branch: Branch } | null;

export default function AdminBranchesPage() {
  const router = useRouter();
  const { can, ready } = usePermissions();
  const canCreate = ready && can("branches", "create");
  const canUpdate = ready && can("branches", "update");
  const canDelete = ready && can("branches", "delete");

  const [query, setQuery] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [archivedView, setArchivedView] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(PAGE_SIZE);
  const [view, setView] = React.useState<"table" | "cards">("table");
  const [formTarget, setFormTarget] = React.useState<{ open: boolean; branch: Branch | null }>({ open: false, branch: null });
  const [archiveState, setArchiveState] = React.useState<DialogState>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setSearch(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  React.useEffect(() => {
    setPage(1);
  }, [search, archivedView, perPage]);

  const branches = useBranchesList({ page, limit: perPage, search: search || undefined, archived: archivedView ? true : undefined, sortBy: "name", sortOrder: "asc" });
  const archive = useArchiveBranch();
  const restore = useRestoreArchiveBranch();
  const del = useDeleteBranch();

  const rows = branches.data?.data ?? [];
  const total = branches.data?.total ?? 0;
  const membersCovered = rows.reduce((sum, b) => sum + (b.memberCount ?? 0), 0);

  const archiveMutation =
    archiveState?.kind === "restore" ? restore : archiveState?.kind === "purge" ? del : archive;

  // One Manage grammar shared by the table rows and the cards.
  const manageActions = (branch: Branch): (RowAction | false | "" | undefined)[] => [
    { label: `Open ${branch.name}`, icon: <ArrowUpRight />, href: `/admin/locations/${branch.branchId}` },
    canUpdate && !branch.archivedAt && { label: "Edit branch", icon: <PencilLine />, onSelect: () => setFormTarget({ open: true, branch }) },
    canDelete && !branch.archivedAt && { label: "Archive branch — keeps history", icon: <Archive />, onSelect: () => setArchiveState({ kind: "archive", branch }) },
    canUpdate && branch.archivedAt && { label: "Restore branch", icon: <ArchiveRestore />, tone: "success", onSelect: () => setArchiveState({ kind: "restore", branch }) },
    canDelete && branch.archivedAt && { label: "Delete forever", icon: <Trash2 />, tone: "danger", onSelect: () => setArchiveState({ kind: "purge", branch }) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/admin/church" className="flex items-center gap-1.5 hover:text-ink">
            <ArrowLeft className="size-3" /> Admin · Church
          </Link>
        }
        title="Many rooms, one register."
        description="Every campus and meeting place — members, services and reports follow the branch they belong to."
        actions={
          canCreate ? (
            <Button className="h-9 gap-1.5 rounded-full text-xs" onClick={() => setFormTarget({ open: true, branch: null })}>
              <Plus className="size-3.5" /> Add branch
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Branches" value={total} tone="brand" icon={<Building2 className="size-4" />} deltaLabel={archivedView ? "archived" : "active"} />
        <StatCard label="Headquarters" value={rows.filter((b) => b.isHeadquarters).length} tone="gold" />
        <StatCard label="Members covered" value={membersCovered} tone="moss" icon={<Users className="size-4" />} deltaLabel="on this page" />
        <StatCard label="Locations named" value={rows.filter((b) => b.city).length} tone="sky" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchField value={query} onChange={setQuery} placeholder="Search name, city or address…" className="w-full max-w-xs" />
        <FilterChip active={archivedView} onClick={() => setArchivedView((v) => !v)}>Archived</FilterChip>
        <span className="ml-auto">
          <ViewToggle
            value={view}
            onChange={setView}
            options={[
              { value: "table", label: "Table", icon: <Rows3 /> },
              { value: "cards", label: "Cards", icon: <LayoutGrid /> },
            ]}
          />
        </span>
      </div>

      {branches.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Building2 />}
          title={archivedView ? "No archived branches" : "One church, no branches yet"}
          description="A branch is a room people gather in — add one when the second Sunday service starts."
          action={canCreate ? <Button size="sm" variant="outline" className="rounded-full border-line text-xs" onClick={() => setFormTarget({ open: true, branch: null })}>Add the first branch</Button> : undefined}
        />
      ) : view === "table" ? (
        <div className="paper-card overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="rule-label grid grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_0.9fr_0.9fr_auto] items-center gap-3 border-b border-line px-5 py-2.5">
                <span>Branch</span>
                <span>Address</span>
                <span>Members</span>
                <span>Added</span>
                <ManageHeading />
              </div>
              <div className="divide-y divide-line/70">
                {rows.map((branch) => (
                  <div key={branch.branchId} className="group grid grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_0.9fr_0.9fr_auto] items-center gap-3 px-5 py-3.5 text-xs transition-colors hover:bg-muted/40">
                    <button type="button" onClick={() => router.push(`/admin/locations/${branch.branchId}`)} className="flex min-w-0 items-center gap-3 text-left">
                      <PersonAvatar name={branch.name} size="sm" />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-semibold">{branch.name}</span>
                          {branch.isHeadquarters ? <Tag tone="gold">HQ</Tag> : null}
                          {branch.archivedAt ? <Tag tone="neutral">Archived</Tag> : null}
                        </span>
                      </span>
                    </button>
                    <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-ink-faint">
                      <MapPin className="size-2.5 shrink-0" />
                      <span className="truncate">{[branch.city, branch.state].filter(Boolean).join(", ") || "No address on file"}</span>
                    </span>
                    <span className="num text-[11px] text-ink-soft">{number(branch.memberCount ?? 0)}</span>
                    <span className="text-[10px] text-ink-faint">{formatDate(branch.createdAt)}</span>
                    <div className="flex justify-end">
                      <RowActions actions={manageActions(branch)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <StaggerGroup className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((branch) => (
            <StaggerItem key={branch.branchId}>
              <div className="paper-card flex h-full flex-col rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <button type="button" onClick={() => router.push(`/admin/locations/${branch.branchId}`)} className="flex min-w-0 items-center gap-3 text-left">
                    <PersonAvatar name={branch.name} size="md" />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-xs font-semibold">{branch.name}</span>
                        {branch.isHeadquarters ? <Tag tone="gold">HQ</Tag> : null}
                        {branch.archivedAt ? <Tag tone="neutral">Archived</Tag> : null}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-ink-faint">
                        <MapPin className="size-2.5" />
                        <span className="truncate">{[branch.city, branch.state].filter(Boolean).join(", ") || "No address on file"}</span>
                      </span>
                    </span>
                  </button>
                  <RowActions reveal={false} actions={manageActions(branch)} />
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-3 text-[10px] text-ink-faint">
                  <span className="num">{number(branch.memberCount ?? 0)} members</span>
                  <span>added {formatDate(branch.createdAt)}</span>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      )}

      <div className="paper-card rounded-2xl">
        <ListPaginationFooter
          page={page}
          perPage={perPage}
          total={total}
          onPageChange={setPage}
          onPerPageChange={setPerPage}
          itemName="branches"
          pending={branches.isFetching}
        />
      </div>

      <div className="rounded-2xl border border-dashed border-line p-5 text-[11px] leading-relaxed text-ink-soft">
        <p className="mb-1 font-display text-xs font-semibold text-ink">Branch scope is real</p>
        Staff see their branch&apos;s people and numbers; Admin HQ reads across all of them. Archiving keeps the
        history intact — deleting forever only works once no members are still assigned.
      </div>

      <BranchFormDialog
        open={formTarget.open}
        onOpenChange={(value) => setFormTarget({ open: value, branch: value ? formTarget.branch : null })}
        branch={formTarget.branch}
      />

      <ArchiveConfirmDialog
        open={!!archiveState}
        onOpenChange={(value) => { if (!value) setArchiveState(null); }}
        kind={archiveState?.kind ?? "archive"}
        entityLabel="branch"
        targetName={archiveState?.branch.name ?? null}
        targetId={archiveState?.branch.branchId ?? ""}
        mutation={archiveMutation}
        onConfirmed={() => { setArchiveState(null); toast.success("Register updated."); }}
      />
    </div>
  );
}
