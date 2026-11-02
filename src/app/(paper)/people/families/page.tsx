"use client";

import * as React from "react";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  ArrowUpRight,
  Crown,
  Home,
  LayoutGrid,
  PencilLine,
  Rows3,
  Trash2,
  UserRoundPlus,
  Users,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { api } from "@/lib/api";
import { fetchAllPages, listUrl } from "@/lib/export-all";
import type { ExportColumn } from "@/lib/export-utils";
import { PageHeader } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import {
  AvatarStack,
  DataList,
  EmptyState,
  FieldRow,
  FilterChip,
  ListPaginationFooter,
  ManageHeading,
  PersonAvatar,
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
import { ExportDropdown } from "@/components/shared/export-dropdown";
import { FamilyFormDialog } from "@/components/families/family-form-dialog";
import { DeleteFamilyDialog } from "@/components/families/delete-family-dialog";
import { AddFamilyMemberDialog } from "@/components/families/add-family-member-dialog";
import { useInspector } from "@/components/paper/shell/inspector-provider";
import { usePermissions } from "@/hooks/use-permissions";
import { useCurrentProfile } from "@/hooks/use-profile";
import { useBranchesList } from "@/hooks/use-branches";
import {
  useFamiliesList,
  useArchiveFamily,
  useRestoreArchiveFamily,
  type Family,
  type ListFamiliesParams,
} from "@/hooks/use-families";

const PAGE_SIZE = 15;

const SORT_OPTIONS: { value: NonNullable<ListFamiliesParams["sortBy"]>; label: string }[] = [
  { value: "name", label: "Household name" },
  { value: "createdAt", label: "Date created" },
  { value: "memberCount", label: "Members" },
];

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: "name", label: "Family" },
  { key: "head", label: "Head of Household" },
  { key: "members", label: "Members" },
  { key: "created", label: "Created" },
];

function toExportRows(families: Family[]): Record<string, unknown>[] {
  return families.map((family) => {
    const head = family.members.find((m) => m.isHead);
    return {
      name: family.name,
      head: head ? `${head.firstName} ${head.lastName}` : "",
      members: family.members.map((m) => `${m.firstName} ${m.lastName}`).join("; "),
      created: family.createdAt?.slice(0, 10) ?? "",
    };
  });
}

export default function FamiliesPage() {
  const { open, close } = useInspector();
  const { can, ready } = usePermissions();
  const { data: profile } = useCurrentProfile();
  const canUpdate = ready && can("families", "update");
  const canCreate = ready && can("families", "create");
  const canDelete = ready && can("families", "delete");
  const isHq = !!profile?.isAdminHq;

  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [branchId, setBranchId] = React.useState("all");
  const [sortBy, setSortBy] = React.useState<NonNullable<ListFamiliesParams["sortBy"]>>("name");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");
  const [archivedView, setArchivedView] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(PAGE_SIZE);
  const [view, setView] = React.useState<"cards" | "table">("cards");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<Family | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Family[] | null>(null);
  const [addMemberTarget, setAddMemberTarget] = React.useState<Family | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const params = React.useMemo<ListFamiliesParams>(
    () => ({
      page,
      limit: perPage,
      search: search || undefined,
      archived: archivedView ? true : undefined,
      branchId: isHq && branchId !== "all" ? branchId : undefined,
      sortBy,
      sortOrder,
    }),
    [page, perPage, search, archivedView, branchId, isHq, sortBy, sortOrder],
  );

  const list = useFamiliesList(params);
  const branches = useBranchesList({ limit: 100 }, { enabled: isHq });
  const archive = useArchiveFamily();
  const restoreArchive = useRestoreArchiveFamily();

  const families = list.data?.data ?? [];
  const total = list.data?.meta?.total ?? 0;
  const totalPages = Math.max(1, list.data?.meta?.totalPages ?? 1);
  const people = families.reduce((sum, f) => sum + f.members.length, 0);

  const toggleArchive = (family: Family) => {
    if (family.archivedAt) {
      restoreArchive.mutate(family.familyId, {
        onSuccess: () => toast(`${family.name} restored to the active register.`),
      });
    } else {
      archive.mutate(family.familyId, {
        onSuccess: () => toast(`${family.name} archived — records are kept.`),
      });
    }
  };

  // One Manage grammar shared by the table rows and the cards.
  const manageActions = (family: Family): (RowAction | false | "" | undefined)[] => [
    {
      label: "Open household",
      icon: <ArrowUpRight />,
      href: `/people/families/${family.familyId}`,
    },
    canUpdate && !family.archivedAt && {
      label: "Edit household",
      icon: <PencilLine />,
      onSelect: () => { setEditTarget(family); setFormOpen(true); },
    },
    canUpdate && {
      label: family.archivedAt ? "Restore household" : "Archive household",
      icon: family.archivedAt ? <ArchiveRestore /> : <Archive />,
      onSelect: () => toggleArchive(family),
    },
    canDelete && !family.archivedAt && {
      label: "Delete household",
      icon: <Trash2 />,
      tone: "danger",
      onSelect: () => setDeleteTarget([family]),
    },
  ];

  const peek = (family: Family) =>
    open({
      eyebrow: "Household",
      title: family.name,
      subtitle: `${family.members.length} ${family.members.length === 1 ? "person" : "people"}`,
      content: (
        <div className="space-y-5">
          <div>
            <p className="rule-label mb-2">Members</p>
            <div className="space-y-1.5">
              {family.members.map((member) => (
                <Link
                  key={member.id}
                  href={`/people/members/${member.memberId}`}
                  onClick={close}
                  className="flex items-center gap-2.5 rounded-lg border border-line bg-card px-3 py-2 transition-colors hover:border-ink/20"
                >
                  <PersonAvatar name={`${member.firstName} ${member.lastName}`} size="xs" />
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium">
                    {member.firstName} {member.lastName}
                  </span>
                  {member.isHead ? (
                    <span className="flex items-center gap-1 text-[9px] text-gold">
                      <Crown className="size-2.5" /> head
                    </span>
                  ) : (
                    <span className="text-[9px] capitalize text-ink-faint">{member.relationship}</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
          <DataList>
            <FieldRow label="Created">{family.createdAt?.slice(0, 10) ?? "—"}</FieldRow>
            {family.archivedAt ? <FieldRow label="Archived">{family.archivedAt.slice(0, 10)}</FieldRow> : null}
          </DataList>
          <div className="grid grid-cols-2 gap-2">
            <Button asChild size="sm" className="h-9 rounded-lg text-xs">
              <Link href={`/people/families/${family.familyId}`}>Full household</Link>
            </Button>
            {canUpdate ? (
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-lg border-line text-xs"
                onClick={() => {
                  close();
                  setAddMemberTarget(family);
                }}
              >
                <UserRoundPlus className="size-3.5" /> Add member
              </Button>
            ) : null}
            {canUpdate ? (
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-lg border-line text-xs"
                onClick={() => {
                  close();
                  setEditTarget(family);
                  setFormOpen(true);
                }}
              >
                <PencilLine className="size-3.5" /> Edit
              </Button>
            ) : null}
            {canUpdate ? (
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-lg border-line text-xs"
                onClick={() => toggleArchive(family)}
              >
                {family.archivedAt ? "Unarchive" : "Archive"}
              </Button>
            ) : null}
          </div>
          {canDelete && !family.archivedAt ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-lg border-line text-xs text-destructive"
              onClick={() => {
                close();
                setDeleteTarget([family]);
              }}
            >
              Delete household
            </Button>
          ) : null}
        </div>
      ),
    });

  const fetchAllExportRows = React.useCallback(async () => {
    const rows = await fetchAllPages<Family>((p) =>
      api.get(listUrl("/families", { ...params, page: p, limit: 100 })),
    );
    return toExportRows(rows);
  }, [params]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People · Families"
        title="Households, not just individuals."
        description="Care follows families — the whole story of who lives where and how they're doing."
        actions={
          <>
            <ExportDropdown
              tableId="families"
              columns={EXPORT_COLUMNS}
              data={toExportRows(families)}
              title="Families"
              filename="families-export"
              disabled={!families.length}
              fetchAllRows={canDelete || canUpdate ? fetchAllExportRows : undefined}
            />
            {canCreate ? (
              <Button className="h-9 gap-1.5 rounded-full text-xs" onClick={() => { setEditTarget(null); setFormOpen(true); }}>
                <UserRoundPlus className="size-3.5" /> New household
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Households" value={total} tone="brand" icon={<Home className="size-4" />} deltaLabel={archivedView ? "archived" : "matching filters"} />
        <StatCard label="People on this page" value={people} tone="moss" icon={<Users className="size-4" />} />
        <StatCard label="Average size" value={families.length ? Math.round((people / families.length) * 10) / 10 : 0} decimals={1} tone="sky" />
        <StatCard label="Page" value={page} suffix={` / ${totalPages}`} tone="gold" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchField value={searchInput} onChange={setSearchInput} placeholder="Search households…" className="w-full max-w-xs" />
        <FilterChip active={archivedView} onClick={() => { setArchivedView((v) => !v); setPage(1); }}>
          Archived
        </FilterChip>
        <div className="ml-auto flex flex-wrap items-center gap-2">
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
          <Select value={sortBy} onValueChange={(value) => { setSortBy(value as typeof sortBy); setPage(1); }}>
            <SelectTrigger className="h-8 w-36 rounded-full border-line bg-card text-[11px] shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <SortDirectionToggle ascending={sortOrder === "asc"} onToggle={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))} />
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

      {list.isError ? (
        <EmptyState icon={<Home />} title="Couldn't load the households" description="The register didn't answer." action={<Button variant="outline" size="sm" className="rounded-full border-line text-xs" onClick={() => list.refetch()}>Retry</Button>} />
      ) : list.isLoading ? (
        view === "cards" ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
          </div>
        ) : (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        )
      ) : families.length === 0 ? (
        <EmptyState
          icon={<Home />}
          title="No households yet"
          description="Families link people who share a home — care and giving read better together."
          action={canCreate ? <Button size="sm" variant="outline" className="rounded-full border-line text-xs" onClick={() => { setEditTarget(null); setFormOpen(true); }}>Start one</Button> : undefined}
        />
      ) : view === "table" ? (
        <div className="paper-card overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <div className="min-w-[680px]">
              <div className="rule-label grid grid-cols-[minmax(0,2fr)_1.2fr_1fr_auto] items-center gap-4 border-b border-line px-5 py-2.5">
                <span>Household</span>
                <span>People</span>
                <span>Created</span>
                <ManageHeading />
              </div>
              <div className="divide-y divide-line/70">
                {families.map((family) => {
                  const head = family.members.find((m) => m.isHead);
                  return (
                    <div key={family.familyId} className="group grid grid-cols-[minmax(0,2fr)_1.2fr_1fr_auto] items-center gap-4 px-5 py-3 transition-colors hover:bg-muted/40">
                      <button type="button" onClick={() => peek(family)} className="flex min-w-0 items-center gap-3 text-left">
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-ink-faint"><Home className="size-3.5" /></span>
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-semibold">{family.name}</span>
                          <span className="block truncate text-[11px] text-ink-faint">
                            {head ? `${head.firstName} ${head.lastName}` : "No head assigned"}
                          </span>
                        </span>
                      </button>
                      <span className="flex items-center gap-2">
                        <AvatarStack people={family.members.map((m) => ({ name: `${m.firstName} ${m.lastName}` }))} size="xs" max={4} />
                        <span className="num text-[11px] text-ink-soft">{family.members.length}</span>
                        {family.archivedAt ? <Tag tone="neutral">Archived</Tag> : null}
                      </span>
                      <span className="num text-[11px] text-ink-soft">{family.createdAt?.slice(0, 10) ?? "—"}</span>
                      <RowActions actions={manageActions(family)} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <ListPaginationFooter
            page={page}
            perPage={perPage}
            total={total}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
            itemName="households"
            pending={list.isFetching}
          />
        </div>
      ) : (
        <>
          <StaggerGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {families.map((family) => {
              const head = family.members.find((m) => m.isHead);
              return (
                <StaggerItem key={family.familyId}>
                  <div className="paper-card lift flex h-full flex-col rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-2">
                      <button type="button" onClick={() => peek(family)} className="flex min-w-0 items-center gap-2 text-left">
                        <div className="min-w-0">
                          <p className="truncate font-display text-sm font-semibold">{family.name}</p>
                          {head ? (
                            <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-ink-faint">
                              <Crown className="size-3 shrink-0 text-gold" /> {head.firstName} {head.lastName}
                            </p>
                          ) : (
                            <p className="mt-0.5 text-[11px] text-ink-faint">No head assigned</p>
                          )}
                        </div>
                      </button>
                      <RowActions reveal={false} actions={manageActions(family)} />
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-3 text-[11px]">
                      <span className="flex items-center gap-2">
                        <AvatarStack people={family.members.map((m) => ({ name: `${m.firstName} ${m.lastName}` }))} size="xs" max={4} />
                        <span className="text-ink-soft">{family.members.length} people</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-ink-faint">
                        {family.archivedAt ? <Tag tone="neutral">Archived</Tag> : null}
                        <span className="num">{family.createdAt?.slice(0, 10)}</span>
                      </span>
                    </div>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerGroup>
          <div className="paper-card rounded-2xl">
            <ListPaginationFooter
              page={page}
              perPage={perPage}
              total={total}
              onPageChange={setPage}
              onPerPageChange={setPerPage}
              itemName="households"
              pending={list.isFetching}
            />
          </div>
        </>
      )}

      <FamilyFormDialog open={formOpen} onOpenChange={setFormOpen} family={editTarget} />
      <DeleteFamilyDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)} families={deleteTarget ?? []} />
      {addMemberTarget ? (
        <AddFamilyMemberDialog
          open
          onOpenChange={(value) => !value && setAddMemberTarget(null)}
          family={addMemberTarget}
        />
      ) : null}
    </div>
  );
}
