"use client";

import * as React from "react";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  CalendarClock,
  Heart,
  MapPin,
  PencilLine,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { PageHeader } from "@/components/paper/section";
import { StatCard } from "@/components/paper/stat";
import { EmptyState, ListPaginationFooter, PersonAvatar, RowActions, SearchField } from "@/components/paper/primitives";
import { AvatarStack } from "@/components/paper/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CellGroupFormDialog } from "@/components/departments/cell-group-form-dialog";
import { DeleteCellGroupDialog } from "@/components/departments/delete-cell-group-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import { useCurrentProfile } from "@/hooks/use-profile";
import {
  useCellGroupsList,
  useArchiveCellGroup,
  useRestoreArchiveCellGroup,
  type CellGroup,
} from "@/hooks/use-admin";

export default function CellGroupsPage() {
  const { can, ready } = usePermissions();
  const { data: profile } = useCurrentProfile();
  const canCreate = ready && can("cell_groups", "create");
  const canUpdate = ready && can("cell_groups", "update");
  const canDelete = ready && can("cell_groups", "delete");
  const isCellLeader = !!profile?.role.includes("cell_leader");

  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(12);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CellGroup | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<CellGroup | null>(null);

  const groups = useCellGroupsList({}, ready);
  const archive = useArchiveCellGroup();
  const restore = useRestoreArchiveCellGroup();

  const all = groups.data ?? [];
  const rows = query.trim()
    ? all.filter((g) => g.name.toLowerCase().includes(query.trim().toLowerCase()))
    : all;
  const paged = rows.slice((page - 1) * perPage, (page - 1) * perPage + perPage);

  const branchesCovered = new Set(all.map((g) => g.branchId ?? "unassigned")).size;
  const isOwn = (g: CellGroup) => isCellLeader && !!profile?.memberId && g.leaderId === profile.memberId;
  const canManageGroup = (g: CellGroup) => canUpdate && (!isCellLeader || isOwn(g));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/gatherings/groups" className="flex items-center gap-1.5 hover:text-ink">
            ← Gatherings · Groups
          </Link>
        }
        title="Cell groups — small circles, wide belonging."
        description="The weeknight rooms where Sundays turn into friendship. Each circle, its host and rhythm."
        actions={
          canCreate && !isCellLeader ? (
            <Button className="h-9 gap-1.5 rounded-full text-xs" onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="size-3.5" /> Start a group
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Circles" value={all.length} tone="brand" icon={<Heart className="size-4" />} />
        <StatCard label="Branches covered" value={branchesCovered} tone="moss" icon={<Users className="size-4" />} />
        <StatCard label="Gather weekly" value={all.filter((g) => g.meetingDay).length} tone="sky" deltaLabel="have a set day" />
        <StatCard label="With a host" value={all.filter((g) => g.leaderId).length} tone="gold" />
      </div>

      <SearchField value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="Search circles…" className="w-full max-w-xs" />

      {groups.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Heart />}
          title="No circles yet"
          description="A cell group is the smallest unit of church that still feels like family."
          action={canCreate ? <Button size="sm" variant="outline" className="rounded-full border-line text-xs" onClick={() => { setEditing(null); setFormOpen(true); }}>Start one</Button> : undefined}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {paged.map((group) => {
            const leader = group.leaderId ? `${group.leaderFirstName ?? ""} ${group.leaderLastName ?? ""}`.trim() : "";
            return (
              <div key={group.id} className="paper-card flex h-full flex-col rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-semibold">{group.name}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-ink-faint">
                      <MapPin className="size-2.5" />
                      {group.address ?? group.branchName ?? "Where two or three gather"}
                    </p>
                  </div>
                  <RowActions
                    reveal={false}
                    actions={[
                      canManageGroup(group) && {
                        label: "Edit group",
                        icon: <PencilLine />,
                        onSelect: () => { setEditing(group); setFormOpen(true); },
                      },
                      canManageGroup(group) && !group.archivedAt && {
                        label: "Archive group — records kept",
                        icon: <Archive />,
                        onSelect: () => archive.mutate(group.id, { onSuccess: () => toast(`${group.name} archived.`), onError: () => toast.error("Couldn't archive.") }),
                      },
                      canManageGroup(group) && group.archivedAt && {
                        label: "Restore group",
                        icon: <ArchiveRestore />,
                        tone: "success",
                        onSelect: () => restore.mutate(group.id, { onSuccess: () => toast(`${group.name} reopened.`), onError: () => toast.error("Couldn't restore.") }),
                      },
                      canDelete && !isCellLeader && {
                        label: "Delete group",
                        icon: <Trash2 />,
                        tone: "danger",
                        onSelect: () => setDeleteTarget(group),
                      },
                    ]}
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-soft">
                  {group.meetingDay ? (
                    <span className="flex items-center gap-1.5">
                      <CalendarClock className="size-3 text-ink-faint" />
                      {group.meetingDay}
                      {group.meetingTime ? ` · ${String(group.meetingTime).slice(0, 5)}` : ""}
                    </span>
                  ) : null}
                  <span className="ml-auto flex items-center gap-1.5 text-[10px] text-ink-faint">
                    <Users className="size-3" /> {group.meetingDay ? "meets weekly" : "rhythm TBD"}
                  </span>
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-line/70 pt-3 text-[11px]">
                  {leader ? (
                    <span className="flex min-w-0 items-center gap-2">
                      <PersonAvatar name={leader} size="xs" />
                      <span className="truncate">{leader}</span>
                    </span>
                  ) : (
                    <span className="text-ink-faint">Seeking a host</span>
                  )}
                  {group.branchName ? <span className="shrink-0 text-[10px] text-ink-faint">{group.branchName}</span> : null}
                </div>
                <Button asChild variant="ghost" size="sm" className="mt-2 h-8 justify-between rounded-lg text-[11px] text-brand">
                  <Link href={`/gatherings/groups/cell/${group.id}`}>
                    Roster &amp; attendance <AvatarStack people={[{ name: leader || group.name }]} size="xs" max={1} />
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <ListPaginationFooter
        page={page}
        perPage={perPage}
        total={rows.length}
        onPageChange={setPage}
        onPerPageChange={setPerPage}
        perPageOptions={[12, 24, 48]}
        itemName="circles"
      />

      <CellGroupFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        group={editing}
        lockedLeaderBranch={isCellLeader && !!editing && isOwn(editing)}
      />
      <DeleteCellGroupDialog
        open={!!deleteTarget}
        onOpenChange={(value) => !value && setDeleteTarget(null)}
        group={deleteTarget}
      />

      <p className="text-center text-[10px] text-ink-faint">
        Twelve is the ceiling — beyond that, people stop speaking honestly. Multiplication over accumulation.
      </p>
    </div>
  );
}
