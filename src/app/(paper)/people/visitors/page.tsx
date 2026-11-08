"use client";

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
  const { open, close } = useInspector();
  const { can, ready } = usePermissions();
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
        onSuccess: () => toast(`${visitor.firstName} archived — records are kept.`),
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
              <p className="text-[10px] text-ink-faint">First visit {visitor.firstVisitDate.slice(0, 10)}</p>
            </div>
          </div>
          <DataList>
            {visitor.email ? <FieldRow label="Email">{visitor.email}</FieldRow> : null}
            {visitor.phone ? <FieldRow label="Phone">{visitor.phone}</FieldRow> : null}
            {visitor.whatsappNumber ? <FieldRow label="WhatsApp">{visitor.whatsappNumber}</FieldRow> : null}
            {visitor.assignedToName ? <FieldRow label="Assigned to">{visitor.assignedToName}</FieldRow> : null}
          </DataList>
          {visitor.notes ? (
            <p className="rounded-lg border border-line bg-card p-3 text-[11px] leading-relaxed text-ink-soft">{visitor.notes}</p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <Button asChild size="sm" className="h-9 rounded-lg text-xs">
              <Link href={`/people/visitors/${visitor.id}`}>Full record</Link>
            </Button>
            {canUpdate ? (
              <Button
                size="sm"
                className="h-9 rounded-lg text-xs"
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
              <Button variant="outline" size="sm" className="h-9 rounded-lg border-line text-xs" onClick={() => { close(); setEditTarget(visitor); setFormOpen(true); }}>
                Edit
              </Button>
            ) : null}
            {canUpdate && !visitor.convertedMemberId && !visitor.archivedAt ? (
              <Button variant="outline" size="sm" className="h-9 rounded-lg border-line text-xs" onClick={() => { close(); setConvertTarget(visitor); }}>
                Convert
              </Button>
            ) : null}
          </div>
          {canDelete && !visitor.archivedAt ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-lg border-line text-xs text-destructive"
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
        eyebrow="People · Visitors"
        title="Guests in the room."
        description="Every first-time guest, their follow-up status, and who&apos;s carrying the conversation."
        actions={<><PublicRegistrationLink kind="visitors" />{canCreate ? (
            <Button className="h-9 gap-1.5 rounded-full text-xs" onClick={() => { setEditTarget(null); setFormOpen(true); }}>
              <UserRoundPlus className="size-3.5" /> Add a guest
            </Button>
          ) : null}</>}

      />

      <IntakeRegister kind="visitors">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total guests" value={stats.data?.total ?? 0} tone="brand" icon={<Users className="size-4" />} />
        <StatCard label="New this month" value={stats.data?.newThisMonth ?? 0} tone="gold" icon={<CalendarDays className="size-4" />} deltaLabel="first visits" />
        <StatCard label="In follow-up" value={stats.data?.inFollowUp ?? 0} tone="sky" icon={<RefreshCw className="size-4" />} />
        <StatCard label="Converted" value={stats.data?.converted ?? 0} tone="moss" icon={<HandCoins className="size-4" />} deltaLabel="now members" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchField value={searchInput} onChange={setSearchInput} placeholder="Search guests…" className="w-full max-w-xs" />
        <FilterChip active={status === "all"} onClick={() => { setStatus("all"); setPage(1); }}>All</FilterChip>
        {FOLLOW_UP_OPTIONS.map((item) => (
          <FilterChip key={item.value} active={status === item.value} onClick={() => { setStatus(item.value); setPage(1); }}>
            {item.label}
          </FilterChip>
        ))}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <FilterChip active={archivedView} onClick={() => { setArchivedView((v) => !v); setPage(1); }}>
            Archived
          </FilterChip>
          <Select value={sortBy} onValueChange={(value) => { setSortBy(value as typeof sortBy); setPage(1); }}>
            <SelectTrigger className="h-8 w-32 rounded-full border-line bg-card text-[11px] shadow-none">
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
        <EmptyState icon={<Search />} title="Couldn&apos;t load the register" description="The visitor list didn&apos;t answer." action={<Button size="sm" variant="outline" className="rounded-full border-line text-xs" onClick={() => list.refetch()}>Retry</Button>} />
      ) : list.isLoading ? (
        view === "table" ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
          </div>
        )
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="No guests match"
          description={archivedView ? "Nothing archived under these filters." : "Try a different name, or loosen the filter."}
          action={<Button variant="outline" size="sm" className="rounded-full border-line text-xs" onClick={() => { setSearchInput(""); setSearch(""); setStatus("all"); setArchivedView(false); setPage(1); }}>Clear filters</Button>}
        />
      ) : view === "table" ? (
        <div className="paper-card overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <ListTable className="min-w-[680px]" tableId="people-visitors-1" records={rows ?? []} recordKey="id">
              <div className="rule-label grid grid-cols-[minmax(0,2fr)_1fr_1.1fr_0.9fr_auto] items-center gap-4 border-b border-line px-5 py-2.5">
                <span>Guest</span>
                <span>Status</span>
                <span>First visit</span>
                <span>Assigned</span>
                <ManageHeading />
              </div>
              <div className="divide-y divide-line/70">
                {rows.map((visitor) => (
                  <div key={visitor.id} className="group grid grid-cols-[minmax(0,2fr)_1fr_1.1fr_0.9fr_auto] items-center gap-4 px-5 py-3 transition-colors hover:bg-muted/40">
                    <button type="button" onClick={() => peek(visitor)} className="flex min-w-0 items-center gap-3 text-left">
                      <PersonAvatar name={fullName(visitor)} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold">{fullName(visitor)}</span>
                        <span className="block truncate text-[11px] text-ink-faint">{visitor.email ?? visitor.phone ?? "No contact"}</span>
                      </span>
                    </button>
                    <span><Tag tone={STATUS_TONES[visitor.followUpStatus]} dot>{label(visitor.followUpStatus)}</Tag></span>
                    <span className="num text-[11px] text-ink-soft">{visitor.firstVisitDate.slice(0, 10)}</span>
                    <span className="truncate text-[11px] text-ink-faint">{visitor.assignedToName ?? "—"}</span>
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
                  <button type="button" onClick={() => peek(visitor)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <PersonAvatar name={fullName(visitor)} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">{fullName(visitor)}</p>
                      <p className="truncate text-[11px] text-ink-faint">{visitor.email ?? visitor.phone ?? "No contact"}</p>
                    </div>
                  </button>
                  <RowActions reveal={false} actions={manageActions(visitor)} />
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-3 text-[10px] text-ink-faint">
                  <Tag tone={STATUS_TONES[visitor.followUpStatus]}>{label(visitor.followUpStatus)}</Tag>
                  <span className="num">{visitor.firstVisitDate.slice(0, 10)}</span>
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

      <VisitorFormDialog open={formOpen} onOpenChange={setFormOpen} visitor={editTarget} />
      <ConvertVisitorDialog open={!!convertTarget} onOpenChange={(v) => !v && setConvertTarget(null)} visitor={convertTarget} />
      <DeleteVisitorDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)} visitors={deleteTarget ?? []} />
    </div>
  );
}
