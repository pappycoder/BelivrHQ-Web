"use client";

import { ListToolbar } from "@/components/shared/list-toolbar";

import { formatRecordDate } from "@/lib/record-date";

import { useManageConfirmation } from "@/components/shared/manage-confirmation";

import { ListTable } from "@/components/shared/list-table";
import * as React from "react";
import { IntakeRegister, PublicRegistrationLink } from "@/components/intake/intake-register";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  ArrowUpRight,
  CalendarDays,
  HandCoins,
  LayoutGrid,
  PencilLine,
  RefreshCw,
  Rows3,
  Search,
  Trash2,
  UserRoundCheck,
  UserRoundPlus,
  Users,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { PageHeader } from "@/components/paper/section";
import { PageTour, type TourStep } from "@/components/tours/page-tour";
import { useCurrentProfile } from "@/hooks/use-profile";
import { StatCard, Tag } from "@/components/paper/stat";
import {
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useVisitorsList,
  useVisitorsStats,
  useUpdateVisitorById,
  useDeleteVisitor,
  useArchiveVisitor,
  useRestoreArchiveVisitor,
  type Visitor,
  type FollowUpStatus,
  type ListVisitorsParams,
} from "@/hooks/use-visitors";
import { VisitorFormDialog } from "@/components/visitors/visitor-form-dialog";
import { ConvertVisitorDialog } from "@/components/visitors/convert-visitor-dialog";
import { DeleteVisitorDialog } from "@/components/visitors/delete-visitor-dialog";
import { useInspector } from "@/components/paper/shell/inspector-provider";

const PAGE_SIZE = 15;

const VISITORS_TOUR_STEPS: TourStep[] = [
  { target: ".visitors-tour-heading", title: "Welcome guests and track follow-up", description: "The visitor pipeline brings guest records, follow-up stages and assigned team members together. This guide explains the controls without changing any records. Replay it anytime with Take a tour." },
  { target: ".visitors-tour-intake [role='tablist']", title: "Records and pending registrations", description: "Records shows existing guests. Pending registrations holds public form responses waiting for review, with a count when available. Review controls appear only for accounts with the required access." },
  { target: ".visitors-tour-summary", title: "Understand the guest overview", description: "These totals come from the visitor summary within your account's access. They do not change with the search, status or Archived filters below. In follow-up includes New, Contacted, Scheduled and Interested guests who have not been converted. Use the list's pagination total for the current filters." },
  { target: ".visitors-tour-search", title: "Find a guest", description: "After the tour, type a name, email address or phone number. The register updates after a short pause and returns to page one. Search combines with the status and Archived filters." },
  { target: ".visitors-tour-status", title: "Filter by follow-up stage", description: "Choose New, Contacted, Scheduled, Interested, Converted or Dropped off to narrow the register. These buttons filter the list; they do not update anyone's status. All clears only the stage filter." },
  { target: ".visitors-tour-archive", title: "Review archived guests", description: "Archived switches to archived guest records. Turn it off to return to the regular register. Archiving retains a record for restoration; deleting a guest is permanent. Available actions depend on your account." },
  { target: ".visitors-tour-display", title: "Arrange the register", description: "Sort by First name, Last name, First visit, Status or Date added, then reverse the order with the direction button. Table and Cards show the same filtered guests. Cards are useful on small screens; tables can scroll horizontally." },
  { target: "[data-list-table='people-visitors-1'] > [data-export-ignore]", title: "Columns and selected guests", description: "Columns chooses the fields shown in Table view. Checkboxes select guests on this page and reveal available bulk actions and exports. Selection alone changes nothing. Review the confirmation carefully before applying any action." },
  { target: ".visitors-tour-preview", title: "Preview a guest", description: "After the tour, select a guest's name for a side preview of their first visit, contact details and assignment. Full record opens the detailed page. Mark contacted, Edit and Convert are separate actions that can change records; opening the preview does not." },
  { target: ".visitors-tour-manage", title: "Understand the guest actions", description: "In Table view, hover a row or focus its controls to reveal actions. Manage offers Open guest record. Your account may also offer Edit, Convert to member, Archive, Restore or Delete. Conversion creates an active member and removes the visitor from this register. Archive keeps the guest for restoration; Delete permanently removes it. The tour performs none of these actions." },
  { target: ".visitors-tour-empty", title: "When no guests match", description: "Try a different search or loosen the filters. Clear filters resets the search, follow-up stage and Archived view and returns to page one. Your account's access restrictions still apply." },
  { target: ".visitors-tour-intake [aria-label='Pending registration summary']", title: "Read the review queue", description: "Awaiting review counts pending visitor registrations in the selected branch scope. On this page counts the responses currently displayed. A pending response is not yet a guest record; return to Records to view existing guests." },
  { target: ".visitors-tour-intake [aria-label='Pending registration filters']", title: "Find a registration to review", description: "Search submitted names, email addresses or phone numbers. Use the available branch and sorting controls to arrange the queue. These filters are separate from those on the Records tab." },
  { target: ".visitors-tour-intake [data-list-table='pending-visitors'] > [data-export-ignore]", title: "Review before deciding", description: "View opens a submitted response for review. Approval creates a guest in the registration's original branch. Declining permanently removes the response. Columns and selection help you review the queue; this guide does not approve or decline anything." },
  { target: ".visitors-tour-intake [aria-label='Pagination']", title: "Browse the matching records", description: "Prev and Next move through the current list. Rows per page changes how many records are shown. The range and total reflect the current filters. Navigation is disabled when there are no more pages." },
  { target: ".visitors-tour-add", title: "Add a guest directly", description: "Add a guest opens a form with required first name and branch. HQ accounts choose a branch; other accounts use their assigned branch. You can add contact details and assign follow-up to a team member. Review the form before saving, or Cancel to leave without creating a guest." },
  { target: ".visitors-tour-public button", title: "Collect a public registration", description: "Authorised users can obtain a branch-specific public form link. HQ accounts choose a branch first. Anyone with the link can submit a response, which waits in Pending registrations for review before becoming a guest record." },
];

const FOLLOW_UP_OPTIONS: { value: FollowUpStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "follow_up_scheduled", label: "Scheduled" },
  { value: "interested", label: "Interested" },
  { value: "converted", label: "Converted" },
  { value: "dropped_off", label: "Dropped off" },
];

const STATUS_TONES: Record<FollowUpStatus, "moss" | "neutral" | "rose" | "sky" | "gold" | "brand"> = {
  new: "gold",
  contacted: "sky",
  follow_up_scheduled: "sky",
  interested: "brand",
  converted: "moss",
  dropped_off: "neutral",
};

const SORT_OPTIONS: { value: NonNullable<ListVisitorsParams["sortBy"]>; label: string }[] = [
  { value: "firstName", label: "First name" },
  { value: "lastName", label: "Last name" },
  { value: "firstVisitDate", label: "First visit" },
  { value: "followUpStatus", label: "Status" },
  { value: "createdAt", label: "Date added" },
];

function label(status: FollowUpStatus) {
  return FOLLOW_UP_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

function fullName(v: Visitor) {
  return `${v.firstName} ${v.lastName ?? ""}`.trim();
}

export default function VisitorsPage() {
  const { confirm, dialog } = useManageConfirmation();
  const { open, close, isOpen: inspectorOpen } = useInspector();
  const { can, ready } = usePermissions();
  const { data: profile } = useCurrentProfile();
  const canCreate = ready && can("visitors:new", "create");
  const canUpdate = ready && (can("visitors:list", "update") || can("visitors", "update"));
  const canDelete = ready && (can("visitors:list", "delete") || can("visitors", "delete"));

  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<FollowUpStatus | "all">("all");
  const [sortBy, setSortBy] = React.useState<NonNullable<ListVisitorsParams["sortBy"]>>("firstName");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");
  const [archivedView, setArchivedView] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(PAGE_SIZE);
  const [view, setView] = React.useState<"table" | "cards">("table");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<Visitor | null>(null);
  const [convertTarget, setConvertTarget] = React.useState<Visitor | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Visitor[] | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const params = React.useMemo<ListVisitorsParams>(
    () => ({
      page,
      limit: perPage,
      search: search || undefined,
      followUpStatus: status === "all" ? undefined : status,
      sortBy,
      sortOrder,
      archived: archivedView ? true : undefined,
    }),
    [page, perPage, search, status, sortBy, sortOrder, archivedView],
  );

  const list = useVisitorsList(params);
  const stats = useVisitorsStats();
  const updateVisitor = useUpdateVisitorById();
  const archive = useArchiveVisitor();
  const bulkDelete = useDeleteVisitor();
  const restoreArchive = useRestoreArchiveVisitor();

  const rows = list.data?.data ?? [];
  const total = list.data?.meta?.total ?? 0;

  const toggleArchive = (visitor: Visitor) => {
    if (visitor.archivedAt) {
      return restoreArchive.mutateAsync(visitor.id, {
        onSuccess: () => toast(`${visitor.firstName} restored to the active register.`),
      });
    } else {
      return archive.mutateAsync(visitor.id, {
        onSuccess: () => toast(`${visitor.firstName} archived. Records are kept.`),
      });
    }
  };

  // One Manage grammar shared by the table rows and the cards.
  const manageActions = (visitor: Visitor): (RowAction | false | "" | undefined)[] => [
    {
      label: "Open guest record",
      icon: <ArrowUpRight />,
      href: `/people/visitors/${visitor.id}`,
    },
    canUpdate && !visitor.archivedAt && {
      label: "Edit guest",
      icon: <PencilLine />,
      onSelect: () => { setEditTarget(visitor); setFormOpen(true); },
    },
    canUpdate && !visitor.archivedAt && !visitor.convertedMemberId && {
      label: "Convert to member",
      icon: <UserRoundCheck />,
      onSelect: () => setConvertTarget(visitor),
    },
    canUpdate && {
      label: visitor.archivedAt ? "Restore guest" : "Archive guest", confirmation: { subject: `${visitor.firstName} ${visitor.lastName ?? ""}`.trim() },
      icon: visitor.archivedAt ? <ArchiveRestore /> : <Archive />,
      onSelect: () => toggleArchive(visitor),
      bulk: { key: visitor.archivedAt ? "restore" : "archive", label: visitor.archivedAt ? "Restore selected" : "Archive selected", run: () => visitor.archivedAt ? restoreArchive.mutateAsync(visitor.id) : archive.mutateAsync(visitor.id) },
    },
    canDelete && !visitor.archivedAt && {
      label: "Delete guest",
      icon: <Trash2 />,
      tone: "danger",
      onSelect: () => setDeleteTarget([visitor]),
      bulk: { key: "delete", label: "Delete selected", destructive: true, run: () => bulkDelete.mutateAsync(visitor.id) },
    },
  ];

  const peek = (visitor: Visitor) =>
    open({
      eyebrow: `Visitor · ${label(visitor.followUpStatus)}`,
      title: fullName(visitor),
      subtitle: visitor.email ?? visitor.phone ?? "No contact on file",
      content: (
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <PersonAvatar name={fullName(visitor)} size="lg" />
            <div className="space-y-1.5">
              <Tag tone={STATUS_TONES[visitor.followUpStatus]} dot>{label(visitor.followUpStatus)}</Tag>
              <p className="text-xs text-ink-faint">First visit {formatRecordDate(visitor.firstVisitDate)}</p>
            </div>
          </div>
          <DataList>
            {visitor.email ? <FieldRow label="Email">{visitor.email}</FieldRow> : null}
            {visitor.phone ? <FieldRow label="Phone">{visitor.phone}</FieldRow> : null}
            {visitor.whatsappNumber ? <FieldRow label="WhatsApp">{visitor.whatsappNumber}</FieldRow> : null}
            {visitor.assignedToName ? <FieldRow label="Assigned to">{visitor.assignedToName}</FieldRow> : null}
          </DataList>
          {visitor.notes ? (
            <p className="rounded-lg border border-line bg-card p-3 text-sm leading-relaxed text-ink-soft">{visitor.notes}</p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <Button asChild size="sm" className="h-9 rounded-lg text-sm">
              <Link href={`/people/visitors/${visitor.id}`}>Full record</Link>
            </Button>
            {canUpdate ? (
              <Button
                size="sm"
                className="h-9 rounded-lg text-sm"
                disabled={updateVisitor.isPending}
                onClick={() => confirm({ title: "Mark guest contacted?", subject: [visitor.firstName, visitor.lastName].filter(Boolean).join(" "), onConfirm: () => updateVisitor.mutateAsync(
                    { visitorId: visitor.id, input: { followUpStatus: "contacted" } },
                    { onSuccess: () => toast(`${visitor.firstName} marked as contacted.`) },
                  ) })}
              >
                Mark contacted
              </Button>
            ) : null}
            {canUpdate ? (
              <Button variant="outline" size="sm" className="h-9 rounded-lg border-line text-sm" onClick={() => { close(); setEditTarget(visitor); setFormOpen(true); }}>
                Edit
              </Button>
            ) : null}
            {canUpdate && !visitor.convertedMemberId && !visitor.archivedAt ? (
              <Button variant="outline" size="sm" className="h-9 rounded-lg border-line text-sm" onClick={() => { close(); setConvertTarget(visitor); }}>
                Convert
              </Button>
            ) : null}
          </div>
          {canDelete && !visitor.archivedAt ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-lg border-line text-sm text-destructive"
              onClick={() => { close(); setDeleteTarget([visitor]); }}
            >
              Remove guest
            </Button>
          ) : null}
        </div>
      ),
    });

  return (
    <div className="space-y-6">
      {dialog}
      <PageHeader
        className="visitors-tour-heading"
        eyebrow="People · Visitors"
        title="Guests in the room."
        description="Every first-time guest, their follow-up status, and who&apos;s carrying the conversation."
        actions={<>
          <PageTour page="Visitor pipeline" account={profile ? `${profile.churchId}:${profile.profileId}` : undefined} ready={ready && list.isSuccess && !formOpen && !convertTarget && !deleteTarget && !inspectorOpen} steps={VISITORS_TOUR_STEPS} />
          <div className="visitors-tour-public inline-flex"><PublicRegistrationLink kind="visitors" /></div>{canCreate ? (
            <Button className="visitors-tour-add h-9 gap-1.5 rounded-full text-sm" onClick={() => { setEditTarget(null); setFormOpen(true); }}>
              <UserRoundPlus className="size-3.5" /> Add a guest
            </Button>
          ) : null}</>}

      />

      <div className="visitors-tour-intake">
      <IntakeRegister kind="visitors">
      <div className="visitors-tour-summary grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total guests" value={stats.data?.total ?? 0} tone="brand" icon={<Users className="size-4" />} />
        <StatCard label="New this month" value={stats.data?.newThisMonth ?? 0} tone="gold" icon={<CalendarDays className="size-4" />} deltaLabel="first visits" />
        <StatCard label="In follow-up" value={stats.data?.inFollowUp ?? 0} tone="sky" icon={<RefreshCw className="size-4" />} />
        <StatCard label="Converted" value={stats.data?.converted ?? 0} tone="moss" icon={<HandCoins className="size-4" />} deltaLabel="now members" />
      </div>

      <ListToolbar
 search={<SearchField value={searchInput} onChange={setSearchInput} placeholder="Search guests…" className="visitors-tour-search w-full max-w-xs" />}
 controls={<>
<div className="visitors-tour-archive inline-flex">
          <FilterChip active={archivedView} onClick={() => { setArchivedView((v) => !v); setPage(1); }}>
            Archived
          </FilterChip>
          </div>
<div className="visitors-tour-display flex flex-wrap items-center gap-2">
          <Select value={sortBy} onValueChange={(value) => { setSortBy(value as typeof sortBy); setPage(1); }}>
            <SelectTrigger aria-label="Sort guests" className="h-9 w-40 rounded-full border-line bg-card text-sm shadow-none">
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
<div className="visitors-tour-status flex flex-wrap gap-2" role="group" aria-label="Guest follow-up stage filters">
        <FilterChip active={status === "all"} onClick={() => { setStatus("all"); setPage(1); }}>All</FilterChip>
        {FOLLOW_UP_OPTIONS.map((item) => (
          <FilterChip key={item.value} active={status === item.value} onClick={() => { setStatus(item.value); setPage(1); }}>
            {item.label}
          </FilterChip>
        ))}
        </div>
</ListToolbar>

      {list.isError ? (
        <EmptyState icon={<Search />} title="Couldn&apos;t load the register" description="The visitor list didn&apos;t answer." action={<Button size="sm" variant="outline" className="rounded-full border-line text-sm" onClick={() => list.refetch()}>Retry</Button>} />
      ) : list.isLoading ? (
        view === "table" ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
          </div>
        )
      ) : rows.length === 0 ? (
        <div className="visitors-tour-empty">
        <EmptyState
          icon={<Users />}
          title="No guests match"
          description={archivedView ? "Nothing archived under these filters." : "Try a different name, or loosen the filter."}
          action={<Button variant="outline" size="sm" className="rounded-full border-line text-sm" onClick={() => { setSearchInput(""); setSearch(""); setStatus("all"); setArchivedView(false); setPage(1); }}>Clear filters</Button>}
        />
        </div>
      ) : view === "table" ? (
        <div className="paper-card overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <ListTable className="min-w-[680px]" tableId="people-visitors-1" records={rows ?? []} recordKey="id">
              <div className="rule-label grid grid-cols-[minmax(0,2fr)_1fr_1.1fr_0.9fr_auto] items-center gap-4 border-b border-line px-5 py-2.5">
                <span>Guest</span>
                <span>Status</span>
                <span>First visit</span>
                <span>Assigned</span>
                <div className="visitors-tour-manage text-right"><ManageHeading /></div>
              </div>
              <div className="divide-y divide-line/70">
                {rows.map((visitor) => (
                  <div key={visitor.id} className="group grid grid-cols-[minmax(0,2fr)_1fr_1.1fr_0.9fr_auto] items-center gap-4 px-5 py-3 transition-colors hover:bg-muted/40">
                    <button type="button" onClick={() => peek(visitor)} className="visitors-tour-preview flex min-w-0 items-center gap-3 text-left">
                      <PersonAvatar name={fullName(visitor)} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{fullName(visitor)}</span>
                        <span className="block truncate text-sm text-ink-faint">{visitor.email ?? visitor.phone ?? "No contact"}</span>
                      </span>
                    </button>
                    <span><Tag tone={STATUS_TONES[visitor.followUpStatus]} dot>{label(visitor.followUpStatus)}</Tag></span>
                    <span className="num text-sm text-ink-soft">{formatRecordDate(visitor.firstVisitDate)}</span>
                    <span className="truncate text-sm text-ink-faint">{visitor.assignedToName ?? "Not available"}</span>
                    <RowActions actions={manageActions(visitor)} />
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
            itemName="guests"
            pending={list.isFetching}
          />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((visitor) => (
              <div key={visitor.id} className="paper-card lift flex h-full flex-col rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <button type="button" onClick={() => peek(visitor)} className="visitors-tour-preview flex min-w-0 flex-1 items-center gap-3 text-left">
                    <PersonAvatar name={fullName(visitor)} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{fullName(visitor)}</p>
                      <p className="truncate text-sm text-ink-faint">{visitor.email ?? visitor.phone ?? "No contact"}</p>
                    </div>
                  </button>
                  <RowActions className="visitors-tour-manage" reveal={false} actions={manageActions(visitor)} />
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-3 text-xs text-ink-faint">
                  <Tag tone={STATUS_TONES[visitor.followUpStatus]}>{label(visitor.followUpStatus)}</Tag>
                  <span className="num">{formatRecordDate(visitor.firstVisitDate)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="paper-card rounded-2xl">
            <ListPaginationFooter
              page={page}
              perPage={perPage}
              total={total}
              onPageChange={setPage}
              onPerPageChange={setPerPage}
              itemName="guests"
              pending={list.isFetching}
            />
          </div>
        </>
      )}

      </IntakeRegister>
      </div>

      <VisitorFormDialog open={formOpen} onOpenChange={setFormOpen} visitor={editTarget} />
      <ConvertVisitorDialog open={!!convertTarget} onOpenChange={(v) => !v && setConvertTarget(null)} visitor={convertTarget} />
      <DeleteVisitorDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)} visitors={deleteTarget ?? []} />
    </div>
  );
}
