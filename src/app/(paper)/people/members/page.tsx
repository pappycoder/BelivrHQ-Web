"use client";

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
  useArchiveMember,
  useRestoreArchiveMember,
  type Member,
  type MemberStatus,
  type ListMembersParams,
} from "@/hooks/use-members";

const PAGE_SIZE = 15;

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
  const { open, close: closeInspector } = useInspector();
  const { can, canAny, ready } = usePermissions();
  const { data: profile } = useCurrentProfile();
  const canUpdate = ready && can("members:all", "update");
  const canCreate = ready && canAny("members:new:create", "members:all:create", "members:create");
  const canDeactivate = ready && can("members:all", "delete");
  const isHq = !!profile?.isAdminHq;

  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<"all" | MemberStatus>("all");
  const [branchId, setBranchId] = React.useState("all");
  const [sortBy, setSortBy] = React.useState<NonNullable<ListMembersParams["sortBy"]>>("first_name");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");
  const [archivedView, setArchivedView] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(PAGE_SIZE);
  const [view, setView] = React.useState<"table" | "cards">("table");
  const [editTarget, setEditTarget] = React.useState<Member | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [deactivateTarget, setDeactivateTarget] = React.useState<Member[] | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

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
              <Tag tone={STATUS_TONES[member.status]} dot>{member.status}</Tag>
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
            <FieldRow label="Member since">{member.memberSince ?? "—"}</FieldRow>
            {member.dateOfBirth ? <FieldRow label="Birthday">{member.dateOfBirth}</FieldRow> : null}
          </DataList>
          {member.notes ? (
            <div className="rounded-lg border border-line bg-card p-3 text-[11px] leading-relaxed text-ink-soft">
              {member.notes}
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <Button asChild size="sm" className="h-9 rounded-lg text-xs">
              <Link href={`/people/members/${member.memberId}`}>Full profile</Link>
            </Button>
            {canUpdate && !member.archivedAt ? (
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-lg text-xs"
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
              <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-lg text-xs" asChild>
                <a href={`mailto:${member.email}`}>
                  <Mail className="size-3.5" /> Email
                </a>
              </Button>
            ) : null}
            {member.phone ? (
              <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-lg text-xs" asChild>
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
      restoreArchive.mutate(member.memberId, {
        onSuccess: () => toast(`${member.firstName} is back in the active register.`),
      });
    } else {
      archive.mutate(member.memberId, {
        onSuccess: () => toast(`${member.firstName} archived — records are kept.`),
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
      label: member.archivedAt ? "Restore member" : "Archive member",
      icon: member.archivedAt ? <ArchiveRestore /> : <Archive />,
      onSelect: () => toggleArchive(member),
    },
    canDeactivate && !member.archivedAt && {
      label: "Deactivate member",
      icon: <UserRoundX />,
      tone: "danger",
      onSelect: () => setDeactivateTarget([member]),
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
        eyebrow="People · Members"
        title="Everyone, held in one place."
        description="One directory for the whole church — people, households, and the story of how they're doing."
        actions={
          <>
            <PublicRegistrationLink kind="members" />
            <ExportDropdown
              tableId="members"
              columns={EXPORT_COLUMNS}
              data={buildExportRows(rows, branchNames)}
              title="Members"
              filename="members-export"
              disabled={!rows.length}
              fetchAllRows={fetchAllExportRows}
            />
            {canCreate ? (
              <Button className="h-9 gap-1.5 rounded-full text-xs" onClick={() => { setEditTarget(null); setFormOpen(true); }}>
                <UserRoundPlus className="size-3.5" /> Add a person
              </Button>
            ) : null}
          </>
        }
      />

      <IntakeRegister kind="members">
      <StaggerGroup className="grid grid-cols-2 gap-3 lg:grid-cols-3">
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
      </StaggerGroup>

      <div className="flex flex-wrap items-center gap-2">
        <SearchField value={searchInput} onChange={setSearchInput} placeholder="Search name, email or phone…" className="w-full max-w-xs" />
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map((item) => (
            <FilterChip key={item.value} active={status === item.value} onClick={() => { setStatus(item.value); setPage(1); }}>
              {item.label}
            </FilterChip>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <FilterChip active={archivedView} onClick={() => { setArchivedView((v) => !v); setPage(1); }} count={undefined}>
            Archived
          </FilterChip>
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
            <SelectTrigger className="h-8 w-32 rounded-full border-line bg-card text-[11px] shadow-none">
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
      </div>

      {list.isError ? (
        <EmptyState
          icon={<Rows3 />}
          title="Couldn&apos;t load the register"
          description="The directory failed to reach the server."
          action={<Button size="sm" variant="outline" className="rounded-full border-line text-xs" onClick={() => list.refetch()}>Retry</Button>}
        />
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Rows3 />}
          title="Nobody matches that"
          description={archivedView ? "Nothing archived under these filters." : "Try a different name, or loosen the filters."}
          action={
            <Button variant="outline" size="sm" className="rounded-full border-line text-xs" onClick={() => { setSearchInput(""); setSearch(""); setStatus("all"); setBranchId("all"); setArchivedView(false); setPage(1); }}>
              Clear filters
            </Button>
          }
        />
      ) : view === "table" ? (
        <div className="paper-card overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
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
                    <button type="button" onClick={() => peek(member)} className="flex min-w-0 items-center gap-3 text-left">
                      <PersonAvatar name={`${member.firstName} ${member.lastName}`} src={member.photoUrl} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold">
                          {member.firstName} {member.lastName}
                        </span>
                        <span className="block truncate text-[11px] text-ink-faint">
                          {member.email ?? member.phone ?? "No contact on file"}
                        </span>
                      </span>
                    </button>
                    <span>
                      <Tag tone={STATUS_TONES[member.status]} dot>{member.status}</Tag>
                    </span>
                    <span className="truncate text-[11px] text-ink-soft">
                      {(member.branchId && branchNames.get(member.branchId)) ?? (isHq ? "—" : profile?.branch?.name ?? "—")}
                    </span>
                    <span className="num text-[11px] text-ink-soft">{member.memberSince ?? "—"}</span>
                    <div className="flex items-center justify-end">
                      <RowActions actions={manageActions(member)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
                    <button type="button" onClick={() => peek(member)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <PersonAvatar name={`${member.firstName} ${member.lastName}`} src={member.photoUrl} size="md" />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">{member.firstName} {member.lastName}</p>
                        <p className="truncate text-[11px] text-ink-faint">{member.email ?? member.phone ?? "—"}</p>
                      </div>
                    </button>
                    <RowActions reveal={false} actions={manageActions(member)} />
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-3 text-[10px] text-ink-faint">
                    <Tag tone={STATUS_TONES[member.status]}>{member.status}</Tag>
                    <span className="num">{member.memberSince ?? ""}</span>
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
        <p className="text-center text-[11px] text-ink-faint">
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
