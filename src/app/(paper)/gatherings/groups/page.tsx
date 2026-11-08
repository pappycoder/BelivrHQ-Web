"use client";

import { ListTable } from "@/components/shared/list-table";
import * as React from "react";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  ArrowUpRight,
  CalendarPlus,
  Layers,
  PencilLine,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { PageHeader } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import {
  EmptyState,
  ListPaginationFooter,
  ManageHeading,
  PersonAvatar,
  RowActions,
} from "@/components/paper/primitives";
import { AvatarStack } from "@/components/paper/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DepartmentFormDialog } from "@/components/departments/department-form-dialog";
import { DeleteDepartmentDialog } from "@/components/departments/delete-department-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import { useCurrentProfile } from "@/hooks/use-profile";
import {
  useDepartmentsList,
  useDeleteDepartment,
  useArchiveDepartment,
  useRestoreArchiveDepartment,
  type Department,
} from "@/hooks/use-admin";
import {
  GroupRegisterControls,
  useGroupRegister,
} from "@/components/departments/group-register-controls";
import { number } from "@/lib/paper/format";

export default function DepartmentsPage() {
  const { can, ready } = usePermissions();
  const { data: profile } = useCurrentProfile();
  const canCreate = ready && can("departments", "create");
  const canUpdate = ready && can("departments", "update");
  const canDelete = ready && can("departments", "delete");

  const [archived, setArchived] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Department | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Department | null>(
    null,
  );
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(12);

  const departments = useDepartmentsList({ archived });
  const archive = useArchiveDepartment();
  const bulkDelete = useDeleteDepartment();
  const restore = useRestoreArchiveDepartment();

  const isDepartmentHead = !!profile?.role.includes("department_head");

  const all = departments.data ?? [];
  const controls = useGroupRegister(all);
  const { rows, view } = controls;
  React.useEffect(() => {
    setPage((value) =>
      Math.min(value, Math.max(1, Math.ceil(rows.length / perPage))),
    );
  }, [rows.length, perPage]);
  const paged = rows.slice(
    (page - 1) * perPage,
    (page - 1) * perPage + perPage,
  );

  const covered = rows.reduce(
    (sum, d) => sum + (d.members?.length ?? d.memberCount ?? 0),
    0,
  );

  const renderCard = (dept: Department) => {
    const head = dept.headMemberId
      ? `${dept.headFirstName ?? ""} ${dept.headLastName ?? ""}`.trim()
      : "";
    const isOwn =
      isDepartmentHead &&
      !!profile?.memberId &&
      dept.headMemberId === profile.memberId;
    const canEditDept = canUpdate && (!isDepartmentHead || isOwn);
    return (
      <div
        key={dept.id}
        className="paper-card flex h-full flex-col rounded-2xl p-4"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold">
              {dept.name}
            </p>
            <p className="mt-0.5 text-[10px] text-ink-faint">
              {dept.branchName ?? "Church-wide"} ·{" "}
              {number(dept.members?.length ?? dept.memberCount ?? 0)} serving
            </p>
          </div>
          <RowActions
            reveal={false}
            actions={[
              canEditDept && {
                label: "Edit department",
                icon: <PencilLine />,
                onSelect: () => {
                  setEditing(dept);
                  setFormOpen(true);
                },
              },
              canEditDept &&
                !dept.archivedAt && {
                  label: "Archive department",
                  confirmation: { subject: dept.name },
                  icon: <Archive />,
                  bulk: {
                    key: "archive",
                    label: "Archive selected departments",
                    run: () => archive.mutateAsync(dept.id),
                  },
                  onSelect: () =>
                    archive.mutateAsync(dept.id, {
                      onSuccess: () => toast(`${dept.name} archived.`),
                      onError: () => toast.error("Couldn't archive."),
                    }),
                },
              canEditDept &&
                dept.archivedAt && {
                  label: "Restore department",
                  confirmation: { subject: dept.name },
                  icon: <ArchiveRestore />,
                  tone: "success",
                  bulk: {
                    key: "restore",
                    label: "Restore selected departments",
                    run: () => restore.mutateAsync(dept.id),
                  },
                  onSelect: () =>
                    restore.mutateAsync(dept.id, {
                      onSuccess: () => toast(`${dept.name} restored.`),
                      onError: () => toast.error("Couldn't restore."),
                    }),
                },
              canDelete &&
                !isDepartmentHead && {
                  label: "Delete department",
                  icon: <Trash2 />,
                  tone: "danger",
                  onSelect: () => setDeleteTarget(dept),
                  bulk: {
                    key: "delete",
                    label: "Delete selected departments",
                    destructive: true,
                    run: () => bulkDelete.mutateAsync(dept.id),
                  },
                },
            ]}
          />
        </div>
        {dept.description ? (
          <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-ink-soft">
            {dept.description}
          </p>
        ) : null}
        <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-3">
          {head ? (
            <span className="flex min-w-0 items-center gap-2 text-[11px] text-ink-soft">
              <PersonAvatar name={head} size="xs" />{" "}
              <span className="truncate">{head}</span>
            </span>
          ) : (
            <span className="text-[10px] text-ink-faint">No head assigned</span>
          )}
          <AvatarStack
            people={(dept.members ?? [])
              .slice(0, 4)
              .map((m) => ({ name: `${m.firstName} ${m.lastName}` }))}
            size="xs"
            max={4}
          />
        </div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="mt-2 h-8 justify-between rounded-lg text-[11px] text-brand"
        >
          <Link href={`/gatherings/groups/${dept.id}`}>
            Roster &amp; meeting attendance <CalendarPlus className="size-3" />
          </Link>
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gatherings · Groups"
        title="Departments — the teams that run Sundays."
        description="Every serving team, who heads it, and who's carrying the work inside it."
        actions={
          canCreate && !isDepartmentHead ? (
            <Button
              className="h-9 gap-1.5 rounded-full text-xs"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-3.5" /> New department
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {departments.isLoading ? (
          Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))
        ) : (
          <>
            <StatCard
              label="Departments"
              value={rows.length}
              tone="brand"
              icon={<Layers className="size-4" />}
            />
            <StatCard
              label="Serving people"
              value={covered}
              tone="moss"
              deltaLabel="across all teams"
            />
            <StatCard
              label="With a head"
              value={rows.filter((d) => d.headMemberId).length}
              tone="sky"
            />
            <StatCard
              label="Branch-tied"
              value={rows.filter((d) => d.branchId).length}
              tone="gold"
            />
          </>
        )}
      </div>

      <GroupRegisterControls
        controls={controls}
        kind="department"
        hq={!!profile?.isAdminHq}
        archived={archived}
        onArchivedChange={setArchived}
        onResetPage={() => setPage(1)}
      />

      {departments.isError ? (
        <EmptyState
          title="Departments could not be loaded"
          description="Try loading the register again."
          action={
            <Button variant="outline" onClick={() => departments.refetch()}>
              Retry
            </Button>
          }
        />
      ) : departments.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Layers />}
          title="No departments match"
          description="Departments turn Sunday's many jobs into owned teams."
          action={
            canCreate ? (
              <Button
                size="sm"
                variant="outline"
                className="rounded-full border-line text-xs"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Create the first
              </Button>
            ) : undefined
          }
        />
      ) : view === "table" ? (
        <ListTable
          className="paper-card divide-y divide-line/70 overflow-hidden rounded-2xl"
          tableId="gatherings-groups-1"
          records={paged ?? []}
          recordKey="id"
          recordType="department"
        >
          <div className="rule-label grid grid-cols-[minmax(0,2fr)_1fr_1fr_0.7fr_auto] items-center gap-3 border-b border-line px-5 py-2.5">
            <span>Department</span>
            <span>Branch</span>
            <span>Head</span>
            <span className="text-right">Serving</span>
            <ManageHeading />
          </div>
          {paged.map((dept) => {
            const head = dept.headMemberId
              ? `${dept.headFirstName ?? ""} ${dept.headLastName ?? ""}`.trim()
              : "";
            const isOwn =
              isDepartmentHead &&
              !!profile?.memberId &&
              dept.headMemberId === profile.memberId;
            const canEditDept = canUpdate && (!isDepartmentHead || isOwn);
            return (
              <div
                key={dept.id}
                className="group grid grid-cols-[minmax(0,2fr)_1fr_1fr_0.7fr_auto] items-center gap-3 px-5 py-3"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-ink-faint">
                    <Layers className="size-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">
                      {dept.name}
                    </p>
                    {dept.description ? (
                      <p className="truncate text-[10px] text-ink-faint">
                        {dept.description}
                      </p>
                    ) : null}
                  </div>
                  {dept.archivedAt ? <Tag tone="neutral">Archived</Tag> : null}
                </div>
                <span className="truncate text-[11px] text-ink-soft">
                  {dept.branchName ?? "Church-wide"}
                </span>
                <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-ink-soft">
                  {head ? (
                    <>
                      <PersonAvatar name={head} size="xs" />{" "}
                      <span className="truncate">{head}</span>
                    </>
                  ) : (
                    <span className="text-ink-faint">Unheaded</span>
                  )}
                </span>
                <span className="num text-right text-[11px]">
                  {number(dept.members?.length ?? dept.memberCount ?? 0)}
                </span>
                <RowActions
                  actions={[
                    {
                      label: "Open department",
                      icon: <ArrowUpRight />,
                      href: `/gatherings/groups/${dept.id}`,
                    },
                    canEditDept && {
                      label: `Edit ${dept.name}`,
                      icon: <PencilLine />,
                      onSelect: () => {
                        setEditing(dept);
                        setFormOpen(true);
                      },
                    },
                    canEditDept &&
                      !dept.archivedAt && {
                        label: `Archive ${dept.name}`,
                        confirmation: { subject: dept.name },
                        icon: <Archive />,
                        bulk: {
                          key: "archive",
                          label: "Archive selected departments",
                          run: () => archive.mutateAsync(dept.id),
                        },
                        onSelect: () =>
                          archive.mutateAsync(dept.id, {
                            onSuccess: () => toast(`${dept.name} archived.`),
                            onError: () => toast.error("Couldn't archive."),
                          }),
                      },
                    canEditDept &&
                      dept.archivedAt && {
                        label: `Restore ${dept.name}`,
                        confirmation: { subject: dept.name },
                        icon: <ArchiveRestore />,
                        tone: "success",
                        bulk: {
                          key: "restore",
                          label: "Restore selected departments",
                          run: () => restore.mutateAsync(dept.id),
                        },
                        onSelect: () =>
                          restore.mutateAsync(dept.id, {
                            onSuccess: () => toast(`${dept.name} restored.`),
                            onError: () => toast.error("Couldn't restore."),
                          }),
                      },
                    canDelete &&
                      !isDepartmentHead &&
                      !dept.archivedAt && {
                        label: `Delete ${dept.name}`,
                        icon: <Trash2 />,
                        tone: "danger",
                        onSelect: () => setDeleteTarget(dept),
                        bulk: {
                          key: "delete",
                          label: "Delete selected departments",
                          destructive: true,
                          run: () => bulkDelete.mutateAsync(dept.id),
                        },
                      },
                  ]}
                />
              </div>
            );
          })}
        </ListTable>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {paged.map(renderCard)}
        </div>
      )}

      <ListPaginationFooter
        page={page}
        perPage={perPage}
        total={rows.length}
        onPageChange={setPage}
        onPerPageChange={setPerPage}
        perPageOptions={[12, 24, 48]}
        itemName="departments"
      />

      <DepartmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        department={editing}
        departments={all}
        lockedLeaderBranch={isDepartmentHead && !editing}
      />
      <DeleteDepartmentDialog
        open={!!deleteTarget}
        onOpenChange={(value) => !value && setDeleteTarget(null)}
        department={deleteTarget}
      />
    </div>
  );
}
