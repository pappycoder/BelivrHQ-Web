"use client";

import { ListToolbar } from "@/components/shared/list-toolbar";

import { formatRecordDate } from "@/lib/record-date";

import { ListTable } from "@/components/shared/list-table";
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
import { PageTour, type TourStep } from "@/components/tours/page-tour";
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
  useDeleteFamily,
  useArchiveFamily,
  useRestoreArchiveFamily,
  type Family,
  type ListFamiliesParams,
} from "@/hooks/use-families";

const PAGE_SIZE = 15;

const FAMILIES_TOUR_STEPS: TourStep[] = [
  { target: ".families-tour-heading", title: "Keep households together", description: "Families groups existing members into households. Use this page to find a household, review its members and open its details. This guide keeps you on the page without changing any records." },
  { target: ".families-tour-summary", title: "Read the household summary", description: "Households counts all households matching your filters. People on this page and Average size are calculated only from the households on the current page. Page shows your position in the filtered list." },
  { target: ".families-tour-search", title: "Find a household", description: "After the tour, type a household name. The list updates after a short pause and returns to page one. Search combines with the branch and Archived filters." },
  { target: ".families-tour-archive", title: "Include the archived register", description: "Archived switches to archived households. Turn it off to return to the regular register. Archiving keeps the household record; authorised users can restore it using the row actions." },
  { target: ".families-tour-branch", title: "Choose a branch", description: "HQ accounts can narrow the list to a branch or choose All branches. Other accounts stay within the scope assigned to them. Changing the branch returns to the first page." },
  { target: ".families-tour-display", title: "Sort and choose a layout", description: "Sort by Household name, Date created or Members, then use the direction button to reverse the order. Cards and Table show the same filtered households. Cards are useful on smaller screens; tables can scroll horizontally." },
  { target: ".families-tour-preview", title: "Preview a household", description: "After the tour, select a household's name for a side preview; the crown identifies its head. Full household opens the complete record. Available actions depend on your role: Archive keeps the household for restoration; Delete removes the group and its associations, while member records remain. Opening the preview changes nothing." },
  { target: "[data-list-table='people-families-1'] > [data-export-ignore]", title: "Columns and selected households", description: "In Table view, Columns chooses visible fields. Checkboxes select households on this page and reveal the bulk actions available to your account. Selecting rows alone makes no changes. Review the confirmation before applying an action." },
  { target: ".families-tour-empty", title: "When the list is empty", description: "An empty list may mean no households match your filters. Clear the search, turn off Archived and choose All branches if available before creating a new household. Your account's access limits still apply." },
  { target: ".families-tour-page [aria-label='Pagination']", title: "Browse more households", description: "Prev and Next move through the filtered households. Rows per page changes the page size. The range shows which households are currently displayed, and navigation is disabled when there are no more pages." },
  { target: ".families-tour-export button", title: "Export the current view", description: "Export offers PDF, Excel and CSV. Check the filters before downloading. The button is disabled when no matching households are shown." },
  { target: ".families-tour-new", title: "Create a household", description: "New household opens a form with a required family name and an optional head chosen from existing members. Saving creates the group; members can be added afterwards. This control appears only if your account can create families." },
];

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
  const { open, close, isOpen: inspectorOpen } = useInspector();
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
  const bulkDelete = useDeleteFamily();
  const restoreArchive = useRestoreArchiveFamily();

  const families = list.data?.data ?? [];
  const total = list.data?.meta?.total ?? 0;
  const totalPages = Math.max(1, list.data?.meta?.totalPages ?? 1);
  const people = families.reduce((sum, f) => sum + f.members.length, 0);

  const toggleArchive = (family: Family) => {
    if (family.archivedAt) {
      return restoreArchive.mutateAsync(family.familyId, {
        onSuccess: () => toast(`${family.name} restored to the active register.`),
      });
    } else {
      return archive.mutateAsync(family.familyId, {
        onSuccess: () => toast(`${family.name} archived. Records are kept.`),
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
      label: family.archivedAt ? "Restore household" : "Archive household", confirmation: { subject: family.name },
      icon: family.archivedAt ? <ArchiveRestore /> : <Archive />,
      onSelect: () => toggleArchive(family),
      bulk: { key: family.archivedAt ? "restore" : "archive", label: family.archivedAt ? "Restore selected" : "Archive selected", run: () => family.archivedAt ? restoreArchive.mutateAsync(family.familyId) : archive.mutateAsync(family.familyId) },
    },
    canDelete && !family.archivedAt && {
      label: "Delete household",
      icon: <Trash2 />,
      tone: "danger",
      onSelect: () => setDeleteTarget([family]),
      bulk: { key: "delete", label: "Delete selected", destructive: true, run: () => bulkDelete.mutateAsync(family.familyId) },
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
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {member.firstName} {member.lastName}
                  </span>
                  {member.isHead ? (
                    <span className="flex items-center gap-1 text-xs text-gold">
                      <Crown className="size-2.5" /> head
                    </span>
                  ) : (
                    <span className="text-xs capitalize text-ink-faint">{member.relationship}</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
          <DataList>
            <FieldRow label="Created">{formatRecordDate(family.createdAt)}</FieldRow>
            {family.archivedAt ? <FieldRow label="Archived">{formatRecordDate(family.archivedAt)}</FieldRow> : null}
          </DataList>
          <div className="grid grid-cols-2 gap-2">
            <Button asChild size="sm" className="h-9 rounded-lg text-sm">
              <Link href={`/people/families/${family.familyId}`}>Full household</Link>
            </Button>
            {canUpdate ? (
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-lg border-line text-sm"
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
                className="h-9 gap-1.5 rounded-lg border-line text-sm"
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
                className="h-9 rounded-lg border-line text-sm"
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
              className="w-full rounded-lg border-line text-sm text-destructive"
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

  const tourSteps = React.useMemo(() => FAMILIES_TOUR_STEPS.map((step) =>
    step.target === ".families-tour-export button"
      ? { ...step, description: `Export offers PDF, Excel and CSV. ${canDelete || canUpdate ? "Your access allows all households matching the filters to be fetched, not only this page." : "Your export includes only households on the current page."} Check the filters before downloading. It is disabled when no matching households are shown.` }
      : step,
  ), [canDelete, canUpdate]);

  return (
    <div className="families-tour-page space-y-6">
      <PageHeader
        className="families-tour-heading"
        eyebrow="People · Families"
        title="Households, not just individuals."
        description="View household members, addresses and family care information together."
        actions={
          <>
            <PageTour page="Families" account={profile ? `${profile.churchId}:${profile.profileId}` : undefined} ready={ready && list.isSuccess && !inspectorOpen && !formOpen && !deleteTarget && !addMemberTarget} steps={tourSteps} />
            <div className="families-tour-export inline-flex">
            <ExportDropdown
              tableId="families"
              columns={EXPORT_COLUMNS}
              data={toExportRows(families)}
              title="Families"
              filename="families-export"
              disabled={!families.length}
              fetchAllRows={canDelete || canUpdate ? fetchAllExportRows : undefined}
            />
            </div>
            {canCreate ? (
              <Button className="families-tour-new h-9 gap-1.5 rounded-full text-sm" onClick={() => { setEditTarget(null); setFormOpen(true); }}>
                <UserRoundPlus className="size-3.5" /> New household
              </Button>
            ) : null}
          </>
        }
      />

      <div className="families-tour-summary grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Households" value={total} tone="brand" icon={<Home className="size-4" />} deltaLabel={archivedView ? "archived" : "matching filters"} />
        <StatCard label="People on this page" value={people} tone="moss" icon={<Users className="size-4" />} />
        <StatCard label="Average size" value={families.length ? Math.round((people / families.length) * 10) / 10 : 0} decimals={1} tone="sky" />
        <StatCard label="Page" value={page} suffix={` / ${totalPages}`} tone="gold" />
      </div>

      <ListToolbar
 search={<SearchField value={searchInput} onChange={setSearchInput} placeholder="Search households…" className="families-tour-search w-full max-w-xs" />}
 controls={<>
<div className="families-tour-archive">
        <FilterChip active={archivedView} onClick={() => { setArchivedView((v) => !v); setPage(1); }}>
          Archived
        </FilterChip>
        </div>
{isHq ? (
            <Select value={branchId} onValueChange={(value) => { setBranchId(value); setPage(1); }}>
              <SelectTrigger aria-label="Filter households by branch" className="families-tour-branch h-9 w-44 rounded-full border-line bg-card text-sm shadow-none">
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
<div className="families-tour-display flex flex-wrap items-center gap-2">
          <Select value={sortBy} onValueChange={(value) => { setSortBy(value as typeof sortBy); setPage(1); }}>
            <SelectTrigger aria-label="Sort households" className="h-9 w-44 rounded-full border-line bg-card text-sm shadow-none">
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
</>}
>

</ListToolbar>

      {list.isError ? (
        <EmptyState icon={<Home />} title="Couldn't load the households" description="The register didn't answer." action={<Button variant="outline" size="sm" className="rounded-full border-line text-sm" onClick={() => list.refetch()}>Retry</Button>} />
      ) : list.isLoading ? (
        view === "cards" ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
          </div>
        ) : (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        )
      ) : families.length === 0 ? (
        <div className="families-tour-empty">
        <EmptyState
          icon={<Home />}
          title="No households yet"
          description="Families link people who share a home, so care and giving read better together."
          action={canCreate ? <Button size="sm" variant="outline" className="rounded-full border-line text-sm" onClick={() => { setEditTarget(null); setFormOpen(true); }}>Start one</Button> : undefined}
        />
        </div>
      ) : view === "table" ? (
        <div className="paper-card overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <ListTable className="min-w-[680px]" tableId="people-families-1" records={families ?? []} recordKey="familyId">
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
                      <button type="button" onClick={() => peek(family)} className="families-tour-preview flex min-w-0 items-center gap-3 text-left">
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-ink-faint"><Home className="size-3.5" /></span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{family.name}</span>
                          <span className="block truncate text-sm text-ink-faint">
                            {head ? `${head.firstName} ${head.lastName}` : "No head assigned"}
                          </span>
                        </span>
                      </button>
                      <span className="flex items-center gap-2">
                        <AvatarStack people={family.members.map((m) => ({ name: `${m.firstName} ${m.lastName}` }))} size="xs" max={4} />
                        <span className="num text-sm text-ink-soft">{family.members.length}</span>
                        {family.archivedAt ? <Tag tone="neutral">Archived</Tag> : null}
                      </span>
                      <span className="num text-sm text-ink-soft">{formatRecordDate(family.createdAt)}</span>
                      <RowActions actions={manageActions(family)} />
                    </div>
                  );
                })}
              </div>
            </ListTable>
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
                      <button type="button" onClick={() => peek(family)} className="families-tour-preview flex min-w-0 items-center gap-2 text-left">
                        <div className="min-w-0">
                          <p className="truncate font-display text-sm font-semibold">{family.name}</p>
                          {head ? (
                            <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-ink-faint">
                              <Crown className="size-3 shrink-0 text-gold" /> {head.firstName} {head.lastName}
                            </p>
                          ) : (
                            <p className="mt-0.5 text-sm text-ink-faint">No head assigned</p>
                          )}
                        </div>
                      </button>
                      <RowActions reveal={false} actions={manageActions(family)} />
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-3 text-sm">
                      <span className="flex items-center gap-2">
                        <AvatarStack people={family.members.map((m) => ({ name: `${m.firstName} ${m.lastName}` }))} size="xs" max={4} />
                        <span className="text-ink-soft">{family.members.length} people</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-ink-faint">
                        {family.archivedAt ? <Tag tone="neutral">Archived</Tag> : null}
                        <span className="num">{formatRecordDate(family.createdAt)}</span>
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
