"use client";
import { useListFilterState } from "@/hooks/use-list-filter-state";
import { CompactListSummary } from "@/components/shared/compact-list-summary";


import { formatStatusLabel } from "@/lib/status-label";


import { ListToolbar } from "@/components/shared/list-toolbar";

import { formatRecordDate } from "@/lib/record-date";

import { ListTable } from "@/components/shared/list-table";
import * as React from "react";
import { IntakeRegister, PublicRegistrationLink } from "@/components/intake/intake-register";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  ArrowUpRight,
  LayoutGrid,
  Mail,
  PencilLine,
  Phone,
  Rows3,
  UserRoundPlus,
  UserRoundX,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { api } from "@/lib/api";
import { fetchAllPages, listUrl } from "@/lib/export-all";
import type { ExportColumn } from "@/lib/export-utils";
import { PageHeader } from "@/components/paper/section";
import { PageTour, type TourStep } from "@/components/tours/page-tour";
import { StatCard, Tag } from "@/components/paper/stat";
import {
  EmptyState,
  FieldRow,
  DataList,
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
import { MemberFormDialog } from "@/components/members/member-form-dialog";
import { DeleteMemberDialog } from "@/components/members/delete-member-dialog";
import { useInspector } from "@/components/paper/shell/inspector-provider";
import { usePermissions } from "@/hooks/use-permissions";
import { useCurrentProfile } from "@/hooks/use-profile";
import { useBranchesList } from "@/hooks/use-branches";
import {
  useMembersList,
  useDeleteMember,
  useArchiveMember,
  useRestoreArchiveMember,
  type Member,
  type MemberStatus,
  type ListMembersParams,
} from "@/hooks/use-members";

const PAGE_SIZE = 15;

const DIRECTORY_TOUR_STEPS: TourStep[] = [
  { target: ".members-tour-heading", title: "Get to know your directory", description: "Find and review the members your account can access. This guide explains the controls while keeping records unchanged. You can replay it with Take a tour." },
  { target: ".members-tour-intake [role='tablist']", title: "Records and pending registrations", description: "Records contains existing members. Pending registrations contains public form responses waiting for review. The pending count is shown on its tab. Review controls appear only for accounts with the required access." },
  { target: ".members-tour-summary", title: "Understand the totals", description: "In the register counts members matching the current filters. On this page counts the records currently shown. Scope tells you which branch or branches the directory is showing." },
  { target: ".members-tour-search", title: "Find a person", description: "After the tour, type a name, email address or phone number. The directory updates after a short pause. Search works together with the status, branch and archive filters and returns to page one." },
  { target: ".members-tour-status", title: "Filter by member status", description: "Choose Active, Inactive, Suspended or Transferred to narrow the directory. All removes only the status filter; your search, branch and archive choices still apply." },
  { target: ".members-tour-scope", title: "Choose the register and branch", description: "Archived switches to archived member records; turn it off to return to the regular register. HQ accounts can also choose a branch. Other accounts remain within their assigned scope." },
  { target: ".members-tour-display", title: "Arrange the directory", description: "Choose a sort field and use the Sort order dropdown to reverse its order. List view and Card view show the same filtered records. Cards can be easier on small screens; tables can scroll horizontally." },
  { target: "[data-list-table='people-members-1'] > [data-export-ignore]", title: "Columns and selected records", description: "Columns lets you choose which fields to show. The checkboxes select records on this page and reveal available bulk actions. Selecting a row alone changes nothing. Review the confirmation before applying any bulk action." },
  { target: ".members-tour-preview", title: "Preview a member", description: "After the tour, select a person's name for a side preview. Full profile opens the detailed record. Depending on your permissions, Manage may also offer Edit, Archive, Restore or Deactivate. These are separate actions from viewing." },
  { target: ".members-tour-empty", title: "When nobody matches", description: "Try another search or loosen the filters. Clear filters resets the search, status, branch and archived view so you can start again. Your account's access restrictions still apply." },
  { target: ".members-tour-intake [aria-label='Pending registration summary']", title: "Review your registration queue", description: "These totals describe registrations waiting for review and the current branch scope. A pending response is not yet a member record. Use Records to return to the existing member directory." },
  { target: ".members-tour-intake [aria-label='Pending registration filters']", title: "Find a pending registration", description: "Search submitted names, email addresses or phone numbers. Use the available branch and sorting controls to narrow and arrange the queue. These filters are separate from the Records tab." },
  { target: ".members-tour-intake [data-list-table='pending-members'] > [data-export-ignore]", title: "Review before making a decision", description: "Open a response to review its details before deciding. Approval adds a member to the registration's original branch. Declining permanently removes the response. Selection and Columns help you review the queue; the tour does not approve or decline anything." },
  { target: ".members-tour-intake [aria-label='Pagination']", title: "Browse the rest of the list", description: "Prev and Next move through the matching records. Rows per page changes how many are shown. The range and total reflect the current filters, and page controls are disabled when there is nowhere else to go." },
  { target: ".members-tour-export button", title: "Export the filtered directory", description: "Export offers PDF, Excel and CSV. It fetches all members matching the directory filters, rather than only this page. Review the filters before downloading. The button is disabled when no matching rows are shown." },
  { target: ".members-tour-add", title: "Add a person", description: "Use Add a person to enter a member directly. Review and save the form to create the record. This control appears only if your account can create members. The tour does not open or submit a form." },
  { target: ".members-tour-public button", title: "Collect a public registration", description: "Public registration link lets an authorised user obtain a branch-specific form link. HQ accounts choose a branch first. Submitted responses go to Pending registrations for review before they become member records." },
];

const STATUS_OPTIONS: { value: "all" | MemberStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "suspended", label: "Suspended" },
  { value: "transferred", label: "Transferred" },
];

const STATUS_TONES: Record<MemberStatus, "moss" | "neutral" | "rose" | "sky"> = {
  active: "moss",
  inactive: "neutral",
  suspended: "rose",
  transferred: "sky",
};

const SORT_OPTIONS: { value: NonNullable<ListMembersParams["sortBy"]>; label: string }[] = [
  { value: "first_name", label: "First name" },
  { value: "last_name", label: "Last name" },
  { value: "member_since", label: "Member since" },
  { value: "created_at", label: "Date added" },
  { value: "status", label: "Status" },
];

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: "firstName", label: "First Name" },
  { key: "lastName", label: "Last Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "status", label: "Status" },
  { key: "branch", label: "Branch" },
  { key: "memberSince", label: "Member Since" },
];

function buildExportRows(
  rows: Member[],
  branchNames: Map<string, string>,
): Record<string, unknown>[] {
  return rows.map((m) => ({
    firstName: m.firstName,
    lastName: m.lastName,
    email: m.email ?? "",
    phone: m.phone ?? "",
    status: m.status,
    branch: (m.branchId && branchNames.get(m.branchId)) || "",
    memberSince: m.memberSince ?? "",
  }));
}

export default function PeopleMembersPage() {
  const { open, close: closeInspector, isOpen: inspectorOpen } = useInspector();
  const { can, canAny, ready } = usePermissions();
  const { data: profile } = useCurrentProfile();
  const canUpdate = ready && can("members:all", "update");
  const canCreate = ready && canAny("members:new:create", "members:all:create", "members:create");
  const canDeactivate = ready && can("members:all", "delete");
  const isHq = !!profile?.isAdminHq;

  const [searchInput, setSearchInput] = useListFilterState("searchInput", "");
  const [search, setSearch] = useListFilterState("search", "");
  const [status, setStatus] = useListFilterState<"all" | MemberStatus>("status", "all");
  const [branchId, setBranchId] = useListFilterState("branchId", "all");
  const [sortBy, setSortBy] = useListFilterState<NonNullable<ListMembersParams["sortBy"]>>("sortBy", "first_name");
  const [sortOrder, setSortOrder] = useListFilterState<"asc" | "desc">("sortOrder", "asc");
  const [archivedView, setArchivedView] = useListFilterState("archivedView", false);
  const [page, setPage] = useListFilterState("page", 1);
  const [perPage, setPerPage] = useListFilterState("perPage", PAGE_SIZE);
  const [view, setView] = useListFilterState<"table" | "cards">("view", "table");
  const [editTarget, setEditTarget] = React.useState<Member | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [deactivateTarget, setDeactivateTarget] = React.useState<Member[] | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput, setPage, setSearch]);

  const queryParams = React.useMemo<ListMembersParams>(
    () => ({
      page,
      limit: perPage,
      search: search || undefined,
      status: status === "all" ? undefined : status,
      branchId: isHq && branchId !== "all" ? branchId : undefined,
      sortBy,
      sortOrder,
      archived: archivedView ? true : undefined,
    }),
    [page, perPage, search, status, branchId, isHq, sortBy, sortOrder, archivedView],
  );

  const list = useMembersList(queryParams, { enabled: ready });
  const branches = useBranchesList({ limit: 100 }, { enabled: isHq });
  const branchNames = React.useMemo(
    () => new Map((branches.data?.data ?? []).map((b) => [b.branchId, b.name])),
    [branches.data],
  );

  const archive = useArchiveMember();
  const bulkDeactivate = useDeleteMember();
  const restoreArchive = useRestoreArchiveMember();

  const rows = list.data?.data ?? [];
  const total = list.data?.meta?.total ?? 0;

  const peek = (member: Member) =>
    open({
      eyebrow: `${member.status === "active" ? "Member" : STATUS_OPTIONS.find((s) => s.value === member.status)?.label} · ${
        (member.branchId && branchNames.get(member.branchId)) || (isHq ? "No branch" : profile?.branch?.name ?? "Your branch")
      }`,
      title: `${member.firstName} ${member.lastName}`,
      subtitle: member.email ?? member.phone ?? "No contact on file",
      content: (
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <PersonAvatar name={`${member.firstName} ${member.lastName}`} src={member.photoUrl} size="lg" />
            <div className="space-y-1.5">
              <Tag tone={STATUS_TONES[member.status]} dot>{formatStatusLabel(member.status)}</Tag>
              {member.archivedAt ? <Tag tone="neutral">Archived</Tag> : null}
            </div>
          </div>
          <DataList>
            {member.email ? <FieldRow label="Email">{member.email}</FieldRow> : null}
            {member.phone ? <FieldRow label="Phone">{member.phone}</FieldRow> : null}
            {member.whatsappNumber ? <FieldRow label="WhatsApp">{member.whatsappNumber}</FieldRow> : null}
            {member.city || member.state ? (
              <FieldRow label="Location">{[member.city, member.state].filter(Boolean).join(", ")}</FieldRow>
            ) : null}
            <FieldRow label="Member since">{formatRecordDate(member.memberSince)}</FieldRow>
            {member.dateOfBirth ? <FieldRow label="Birthday">{member.dateOfBirth}</FieldRow> : null}
          </DataList>
          {member.notes ? (
            <div className="rounded-lg border border-line bg-card p-3 text-sm leading-relaxed text-ink-soft">
              {member.notes}
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <Button asChild size="sm" className="h-9 rounded-lg text-sm">
              <Link href={`/people/members/${member.memberId}`}>Full profile</Link>
            </Button>
            {canUpdate && !member.archivedAt ? (
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-lg text-sm"
                onClick={() => {
                  closeInspector();
                  setEditTarget(member);
                  setFormOpen(true);
                }}
              >
                <PencilLine className="size-3.5" /> Edit
              </Button>
            ) : null}
            {member.email ? (
              <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-lg text-sm" asChild>
                <a href={`mailto:${member.email}`}>
                  <Mail className="size-3.5" /> Email
                </a>
              </Button>
            ) : null}
            {member.phone ? (
              <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-lg text-sm" asChild>
                <a href={`tel:${member.phone.replace(/[^\d+]/g, "")}`}>
                  <Phone className="size-3.5" /> Call
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      ),
    });

  const toggleArchive = (member: Member) => {
    if (member.archivedAt) {
      return restoreArchive.mutateAsync(member.memberId, {
        onSuccess: () => toast(`${member.firstName} is back in the active register.`),
      });
    } else {
      return archive.mutateAsync(member.memberId, {
        onSuccess: () => toast(`${member.firstName} archived. Records are kept.`),
      });
    }
  };

  // One Manage grammar shared by the table rows and the cards.
  const manageActions = (member: Member): (RowAction | false | "" | undefined)[] => [
    { label: "Open profile", icon: <ArrowUpRight />, href: `/people/members/${member.memberId}` },
    canUpdate && !member.archivedAt && {
      label: "Edit member",
      icon: <PencilLine />,
      onSelect: () => { setEditTarget(member); setFormOpen(true); },
    },
    canUpdate && {
      label: member.archivedAt ? "Restore member" : "Archive member", confirmation: { subject: `${member.firstName} ${member.lastName}` },
      icon: member.archivedAt ? <ArchiveRestore /> : <Archive />,
      onSelect: () => toggleArchive(member),
      bulk: { key: member.archivedAt ? "restore" : "archive", label: member.archivedAt ? "Restore selected" : "Archive selected", run: () => member.archivedAt ? restoreArchive.mutateAsync(member.memberId) : archive.mutateAsync(member.memberId) },
    },
    canDeactivate && !member.archivedAt && {
      label: "Deactivate member",
      icon: <UserRoundX />,
      tone: "danger",
      onSelect: () => setDeactivateTarget([member]),
      bulk: { key: "deactivate", label: "Deactivate selected", destructive: true, run: () => bulkDeactivate.mutateAsync(member.memberId) },
    },
  ];

  const fetchAllExportRows = React.useCallback(async () => {
    const fetched = await fetchAllPages<Member>((p) =>
      api.get(listUrl("/members", { ...queryParams, page: p, limit: 100 })),
    );
    return buildExportRows(fetched, branchNames);
  }, [queryParams, branchNames]);

  const isLoading = list.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        className="members-tour-heading"
        eyebrow="People · Members"
        title="Everyone, held in one place."
        description="Find people, households and member details in one church directory."
        actions={
          <>
            <PageTour page="Member directory" account={profile ? `${profile.churchId}:${profile.profileId}` : undefined} ready={ready && list.isSuccess && !formOpen && !deactivateTarget && !inspectorOpen} steps={DIRECTORY_TOUR_STEPS} />
            <div className="members-tour-public inline-flex"><PublicRegistrationLink kind="members" /></div>
            <div className="members-tour-export inline-flex">
            <ExportDropdown
              tableId="members"
              columns={EXPORT_COLUMNS}
              data={buildExportRows(rows, branchNames)}
              title="Members"
              filename="members-export"
              disabled={!rows.length}
              fetchAllRows={fetchAllExportRows}
            />
            </div>
            {canCreate ? (
              <Button className="members-tour-add h-9 gap-1.5 rounded-full text-sm" onClick={() => { setEditTarget(null); setFormOpen(true); }}>
                <UserRoundPlus className="size-3.5" /> Add a person
              </Button>
            ) : null}
          </>
        }
      />

      <div className="members-tour-intake">
      <IntakeRegister kind="members">
      <CompactListSummary className="members-tour-summary grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StaggerItem><StatCard label="In the register" value={total} tone="brand" icon={<Rows3 className="size-4" />} deltaLabel={archivedView ? "archived view" : "matching filters"} /></StaggerItem>
        <StaggerItem>
          <div className="paper-card flex h-full flex-col justify-between gap-4 rounded-2xl p-5">
            <span className="rule-label">On this page</span>
            <span className="num font-display text-[1.9rem] font-semibold leading-none tracking-tight">{rows.length}</span>
          </div>
        </StaggerItem>
        <StaggerItem>
          <div className="paper-card flex h-full flex-col justify-between gap-4 rounded-2xl p-5">
            <span className="rule-label">Scope</span>
            <span className="font-display text-lg font-semibold leading-tight">
              {isHq ? (branchId === "all" ? "All branches" : branchNames.get(branchId) ?? "Branch") : profile?.branch?.name ?? "Your branch"}
            </span>
          </div>
        </StaggerItem>
      </CompactListSummary>

      <ListToolbar
 search={<SearchField value={searchInput} onChange={setSearchInput} placeholder="Search name, email or phone…" className="members-tour-search w-full max-w-xs" />}
 controls={<>
<div className="members-tour-scope flex flex-wrap items-center gap-2">
          <FilterChip active={archivedView} onClick={() => { setArchivedView((v) => !v); setPage(1); }} count={undefined}>
            Archived
          </FilterChip>
          {isHq ? (
            <Select value={branchId} onValueChange={(value) => { setBranchId(value); setPage(1); }}>
              <SelectTrigger aria-label="Filter members by branch" className="h-9 w-44 rounded-full border-line bg-card text-sm shadow-none">
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
          </div>
<div className="members-tour-display flex flex-wrap items-center gap-2">
          <Select value={sortBy} onValueChange={(value) => { setSortBy(value as typeof sortBy); setPage(1); }}>
            <SelectTrigger aria-label="Sort members" className="h-9 w-48 rounded-full border-line bg-card text-sm shadow-none">
              <ArrowUpDownIcon /> <SelectValue />
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
<div className="members-tour-status flex flex-wrap gap-1.5" role="group" aria-label="Member status filters">
          {STATUS_OPTIONS.map((item) => (
            <FilterChip key={item.value} active={status === item.value} onClick={() => { setStatus(item.value); setPage(1); }}>
              {item.label}
            </FilterChip>
          ))}
        </div>
</ListToolbar>

      {list.isError ? (
        <EmptyState
          icon={<Rows3 />}
          title="Couldn&apos;t load the register"
          description="The directory failed to reach the server."
          action={<Button size="sm" variant="outline" className="rounded-full border-line text-sm" onClick={() => list.refetch()}>Retry</Button>}
        />
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="members-tour-empty">
        <EmptyState
          icon={<Rows3 />}
          title="Nobody matches that"
          description={archivedView ? "Nothing archived under these filters." : "Try a different name, or loosen the filters."}
          action={
            <Button variant="outline" size="sm" className="rounded-full border-line text-sm" onClick={() => { setSearchInput(""); setSearch(""); setStatus("all"); setBranchId("all"); setArchivedView(false); setPage(1); }}>
              Clear filters
            </Button>
          }
        />
        </div>
      ) : view === "table" ? (
        <div className="paper-card overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <ListTable className="min-w-[720px]" tableId="people-members-1" records={rows ?? []} recordKey="memberId">
              <div className="rule-label grid grid-cols-[minmax(0,2fr)_1fr_1.1fr_0.9fr_auto] items-center gap-4 border-b border-line px-5 py-2.5">
                <span>Person</span>
                <span>Status</span>
                <span>Branch</span>
                <span>Member since</span>
                <ManageHeading />
              </div>
              <div className="divide-y divide-line/70">
                {rows.map((member) => (
                  <div
                    key={member.memberId}
                    className="group grid grid-cols-[minmax(0,2fr)_1fr_1.1fr_0.9fr_auto] items-center gap-4 px-5 py-3 transition-colors hover:bg-muted/40"
                  >
                    <button type="button" onClick={() => peek(member)} className="members-tour-preview flex min-w-0 items-center gap-3 text-left">
                      <PersonAvatar name={`${member.firstName} ${member.lastName}`} src={member.photoUrl} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {member.firstName} {member.lastName}
                        </span>
                        <span className="block truncate text-sm text-ink-faint">
                          {member.email ?? member.phone ?? "No contact on file"}
                        </span>
                      </span>
                    </button>
                    <span>
                      <Tag tone={STATUS_TONES[member.status]} dot>{formatStatusLabel(member.status)}</Tag>
                    </span>
                    <span className="truncate text-sm text-ink-soft">
                      {(member.branchId && branchNames.get(member.branchId)) ?? (isHq ? "Not available" : profile?.branch?.name ?? "Not available")}
                    </span>
                    <span className="num text-sm text-ink-soft">{formatRecordDate(member.memberSince)}</span>
                    <div className="flex items-center justify-end">
                      <RowActions actions={manageActions(member)} />
                    </div>
                  </div>
                ))}
              </div>
            </ListTable>
          </div>
          <ListPaginationFooter
            page={page}
            perPage={perPage}
            total={total}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
            itemName="people"
            pending={list.isFetching}
          />
        </div>
      ) : (
        <>
          <StaggerGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rows.map((member) => (
              <StaggerItem key={member.memberId}>
                <div className="paper-card lift flex h-full flex-col rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <button type="button" onClick={() => peek(member)} className="members-tour-preview flex min-w-0 flex-1 items-center gap-3 text-left">
                      <PersonAvatar name={`${member.firstName} ${member.lastName}`} src={member.photoUrl} size="md" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{member.firstName} {member.lastName}</p>
                        <p className="truncate text-sm text-ink-faint">{member.email ?? member.phone ?? "Not available"}</p>
                      </div>
                    </button>
                    <RowActions reveal={false} actions={manageActions(member)} />
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-3 text-xs text-ink-faint">
                    <Tag tone={STATUS_TONES[member.status]}>{formatStatusLabel(member.status)}</Tag>
                    <span className="num">{formatRecordDate(member.memberSince)}</span>
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
              itemName="people"
              pending={list.isFetching}
            />
          </div>
        </>
      )}

      </IntakeRegister>
      </div>

      <MemberFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        member={editTarget}
        onSaved={(saved) =>
          toast(editTarget ? `${saved.firstName}'s profile is updated.` : `${saved.firstName} joined the family.`)
        }
      />
      <DeleteMemberDialog
        open={!!deactivateTarget}
        onOpenChange={(value) => !value && setDeactivateTarget(null)}
        members={deactivateTarget ?? []}
      />

      {archivedView && canUpdate ? (
        <p className="text-center text-sm text-ink-faint">
          Restoring returns someone to the active register. Delete Forever lives on the member&apos;s profile.
        </p>
      ) : null}
    </div>
  );
}

function ArrowUpDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mr-1.5 shrink-0 text-ink-faint">
      <path d="m21 16-4 4-4-4M17 20V4M3 8l4-4 4 4M7 4v16" />
    </svg>
  );
}
