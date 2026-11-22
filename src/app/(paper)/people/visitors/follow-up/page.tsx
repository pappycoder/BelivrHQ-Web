"use client";

import { formatStatusLabel } from "@/lib/status-label";


import { ListToolbar } from "@/components/shared/list-toolbar";

import { useManageConfirmation } from "@/components/shared/manage-confirmation";

import { ListTable } from "@/components/shared/list-table";
import * as React from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  ArrowLeft,
  Check,
  Columns3,
  GripVertical,
  Phone,
  Rows3,
  UserRoundPlus,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { PageHeader } from "@/components/paper/section";
import { PageTour, type TourStep } from "@/components/tours/page-tour";
import { useCurrentProfile } from "@/hooks/use-profile";
import { StatCard, Tag } from "@/components/paper/stat";
import {
  EmptyState,
  PersonAvatar,
  SearchField,
  ViewToggle,
} from "@/components/paper/primitives";
import { ActionTooltip } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VisitorFormDialog } from "@/components/visitors/visitor-form-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useVisitorsList,
  useVisitorsStats,
  useUpdateVisitorById,
  FOLLOW_UP_STATUSES,
  type FollowUpStatus,
  type Visitor,
} from "@/hooks/use-visitors";
import { formatDate } from "@/hooks/use-media";

const FOLLOW_UP_TOUR_STEPS: TourStep[] = [
  { target: ".follow-up-tour-heading", title: "Plan the next hello", description: "Follow-up organises the guests your account can access by their current stage. Use the board for an overview or switch to a list. This tour explains the controls without changing guest records." },
  { target: ".follow-up-tour-summary", title: "Read the current workload", description: "These figures describe the loaded guests matching your search. Awaiting first hello counts New status, In conversation combines Scheduled and Interested, and Unassigned counts guests without an assigned team member. The page loads up to 200 guests and is not limited to this week." },
  { target: ".follow-up-tour-search", title: "Find someone to follow up", description: "After the tour, search by name or email. Filtering happens immediately within the guests loaded on this page and also updates the summary and column counts. Clear search brings those guests back; it changes no records." },
  { target: ".follow-up-tour-view", title: "Choose board or list", description: "Kanban board groups guests into stages. List view shows the same search results in rows with a stage dropdown. Switching views keeps your search. On smaller screens, scroll the board or list horizontally to see more columns." },
  { target: ".follow-up-tour-column-new", title: "Read the board columns", description: "New, Contacted, Scheduled and Interested show the steps in an ongoing conversation. Each heading counts the matching guests in that column. Nothing here means that column is empty, not that the register failed to load." },
  { target: ".follow-up-tour-card", title: "Open a guest or change a stage", description: "A card shows the guest, time since their first visit and assignment when present. Select their name to open the full guest record. If your account can update visitors, use the stage dropdown or drag handle to propose a move. Review the confirmation before saving; Cancel keeps the original stage." },
  { target: ".follow-up-tour-column-terminal", title: "Understand the final column", description: "Converted / Dropped groups two different statuses. Use the dropdown to choose Converted or Dropped off explicitly. Dropping a card here proposes Converted unless it was already Dropped off. This changes follow-up status only; use Convert to member on the guest record or Pipeline to create a member." },
  { target: "[data-list-table='people-visitors-follow-up-1'] > [data-export-ignore]", title: "Choose columns and selected rows", description: "In List view, Columns chooses the visible fields. Checkboxes select loaded rows and offer exports for your selection. Selecting a guest alone does not change their status. Exports contain the displayed data, not additional pages of the visitor register." },
  { target: ".follow-up-tour-list-stage", title: "Update from the list", description: "Accounts with update access can propose a follow-up stage using this dropdown. Check the guest and requested stage in the confirmation. Confirm action saves the change; Cancel leaves it unchanged. Converted here does not create a member record." },
  { target: ".follow-up-tour-empty", title: "When no guests are shown", description: "An empty result means no loaded guests match your search, or the loaded register is empty. It does not prove everyone has been contacted. Clear the search to review the board again, or return to Pipeline to inspect the register." },
  { target: ".follow-up-tour-add", title: "Register another guest", description: "Add a guest opens the visitor form. First name and branch are required. Review the details and assignment before saving. Cancel closes the form without creating a guest. This button appears only for accounts that can create visitors." },
  { target: ".follow-up-tour-back", title: "Return to the visitor register", description: "People · Visitors returns to Pipeline for the full visitor register, search and stage filters, archive controls and pending registrations. Your account's permissions still determine which records and actions are available." },
];

/** Board columns. The terminal column merges converted + dropped, mirroring the legacy board. */
const COLUMNS: { key: string; label: string; statuses: FollowUpStatus[]; hint: string }[] = [
  { key: "new", label: "New", statuses: ["new"], hint: "Just arrived" },
  { key: "contacted", label: "Contacted", statuses: ["contacted"], hint: "We said hello" },
  { key: "scheduled", label: "Scheduled", statuses: ["follow_up_scheduled"], hint: "Time set aside" },
  { key: "interested", label: "Interested", statuses: ["interested"], hint: "A conversation happening" },
  { key: "terminal", label: "Converted / Dropped", statuses: ["converted", "dropped_off"], hint: "The road forks here" },
];

function statusForDrop(columnKey: string, current: FollowUpStatus): FollowUpStatus {
  if (columnKey === "terminal") {
    // A dropped_off card stays dropped; anything else landing here converted.
    return current === "dropped_off" ? "dropped_off" : "converted";
  }
  return COLUMNS.find((c) => c.key === columnKey)!.statuses[0];
}

function fullName(v: Visitor) {
  return `${v.firstName} ${v.lastName ?? ""}`.trim();
}

function daysSince(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const days = Math.max(0, Math.round((Date.now() - then) / 86_400_000));
  if (days === 0) return "today";
  if (days < 30) return `${days}d ago`;
  return `${Math.round(days / 30)}w ago`;
}

export default function VisitorFollowUpBoardPage() {
  const { confirm, dialog, isOpen: confirmationOpen } = useManageConfirmation();
  const { can, ready } = usePermissions();
  const { data: profile } = useCurrentProfile();
  const canUpdate = ready && (can("visitors:list", "update") || can("visitors", "update"));
  const canCreate = ready && can("visitors:new", "create");

  const list = useVisitorsList({ limit: 200 });
  const stats = useVisitorsStats();
  const updateVisitor = useUpdateVisitorById();

  const [query, setQuery] = React.useState("");
  const [dragging, setDragging] = React.useState<Visitor | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const rows = React.useMemo(() => {
    const all = list.data?.data ?? [];
    const q = query.trim().toLowerCase();
    return q
      ? all.filter((v) => fullName(v).toLowerCase().includes(q) || (v.email ?? "").toLowerCase().includes(q))
      : all;
  }, [list.data, query]);

  const byColumn = React.useMemo(() => {
    const map = new Map<string, Visitor[]>();
    for (const column of COLUMNS) map.set(column.key, []);
    for (const visitor of rows) {
      const column = COLUMNS.find((c) => c.statuses.includes(visitor.followUpStatus));
      if (column) map.get(column.key)!.push(visitor);
    }
    return map;
  }, [rows]);

  const setStatus = (visitor: Visitor, next: FollowUpStatus) => {
    if (!canUpdate || visitor.followUpStatus === next) return;
    confirm({ title: "Update follow-up status?", subject: fullName(visitor), description: `Change follow-up status to ${next.replaceAll("_", " ")}?`, onConfirm: () => updateVisitor.mutateAsync(
      { visitorId: visitor.id, input: { followUpStatus: next } },
      {
        onSuccess: () => toast(`${visitor.firstName} moved to ${COLUMNS.find((c) => c.statuses.includes(next))?.label ?? next}.`),
        onError: () => toast.error("Couldn't move that card. It snapped back."),
      },
    ) });
  };

  const onDragEnd = (event: DragEndEvent) => {
    setDragging(null);
    const visitor = rows.find((v) => v.id === String(event.active.id));
    const over = event.over?.id;
    if (!visitor || !over) return;
    const column = COLUMNS.find((c) => c.key === over);
    if (!column) return;
    setStatus(visitor, statusForDrop(column.key, visitor.followUpStatus));
  };

  const unassigned = rows.filter((v) => !v.assignedToId).length;
  const [view, setView] = React.useState<"board" | "list">("board");

  return (
    <div className="space-y-6">
      {dialog}
      <PageHeader
        className="follow-up-tour-heading"
        eyebrow={
          <Link href="/people/visitors" className="follow-up-tour-back flex items-center gap-1.5 hover:text-ink">
            <ArrowLeft className="size-3" /> People · Visitors
          </Link>
        }
        title="Every guest's next hello."
        description="Drag a card or use its dropdown to update the follow-up stage."
        actions={
          <>
          <PageTour page="Visitor follow-up" account={profile ? `${profile.churchId}:${profile.profileId}` : undefined} ready={ready && list.isSuccess && !formOpen && !dragging && !confirmationOpen} steps={FOLLOW_UP_TOUR_STEPS} />
          {canCreate ? (
            <Button className="follow-up-tour-add h-9 gap-1.5 rounded-full text-sm" onClick={() => setFormOpen(true)}>
              <UserRoundPlus className="size-3.5" /> Add a guest
            </Button>
          ) : null}
          </>
        }
      />

      <div className="follow-up-tour-summary grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="On the board" value={rows.length} tone="brand" />
        <StatCard label="Awaiting first hello" value={(byColumn.get("new") ?? []).length} tone="gold" deltaLabel="new status" />
        <StatCard label="In conversation" value={(byColumn.get("interested") ?? []).length + (byColumn.get("scheduled") ?? []).length} tone="sky" />
        <StatCard label="Unassigned" value={unassigned} tone={unassigned ? "rose" : "moss"} />
      </div>

      <ListToolbar
 search={<SearchField value={query} onChange={setQuery} placeholder="Find a guest…" className="follow-up-tour-search w-full max-w-xs" />}
 controls={<>
<div className="follow-up-tour-view inline-flex">
        <ViewToggle
          value={view}
          onChange={setView}
          options={[
            { value: "board", label: "Kanban board", icon: <Columns3 className="size-3.5" /> },
            { value: "list", label: "List view", icon: <Rows3 className="size-3.5" /> },
          ]}
        />
        </div>
</>}
>
<span className="text-xs text-ink-faint">
          {stats.data?.converted ?? 0} marked converted in the visitor summary
        </span>
</ListToolbar>

      {list.isError ? (
        <EmptyState icon={<Check />} title="Couldn't load follow-up" description="The visitor register could not be loaded. Please try again." action={<Button variant="outline" size="sm" onClick={() => void list.refetch()}>Retry</Button>} />
      ) : list.isLoading ? (
        <div className="grid min-w-0 gap-3 md:grid-cols-5">
          {COLUMNS.map((c) => <Skeleton key={c.key} className="h-64 rounded-2xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="follow-up-tour-empty">
          <EmptyState icon={<Check />} title="No guests to show" description={query ? "No guest matches that search. Clear it to review the loaded guests." : "No guests were returned. Open Pipeline to review the visitor register."} action={query ? <Button variant="outline" size="sm" onClick={() => setQuery("")}>Clear search</Button> : undefined} />
        </div>
      ) : view === "list" ? (
        <div className="overflow-x-auto">
        <ListTable className="paper-card min-w-[680px] divide-y divide-line/70 overflow-hidden rounded-2xl" tableId="people-visitors-follow-up-1" records={rows ?? []} recordKey="id">
          <div className="rule-label grid grid-cols-[minmax(0,2.2fr)_1.2fr_1fr_150px] items-center gap-3 border-b border-line px-5 py-2.5">
            <span>Guest</span>
            <span>Assigned</span>
            <span>First visit</span>
            <span className="text-right">Follow-up</span>
          </div>
          {rows.map((visitor) => (
            <div key={visitor.id} className="grid grid-cols-[minmax(0,2.2fr)_1.2fr_1fr_150px] items-center gap-3 px-5 py-3">
              <Link href={`/people/visitors/${visitor.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <PersonAvatar name={fullName(visitor)} size="xs" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{fullName(visitor)}</span>
                  <span className="block truncate text-xs text-ink-faint">{visitor.phone ?? visitor.email ?? "No contact on file"}</span>
                </span>
              </Link>
              <span className="hidden w-36 truncate text-sm text-ink-soft md:block">
                {visitor.assignedToName ?? <span className="text-brand">Unassigned</span>}
              </span>
              <span className="num hidden w-24 text-right text-xs text-ink-faint sm:block">{formatDate(visitor.firstVisitDate)}</span>
              <select
                disabled={!canUpdate || updateVisitor.isPending}
                value={visitor.followUpStatus}
                aria-label={`Follow-up stage for ${fullName(visitor)}`}
                onChange={(event) => setStatus(visitor, event.target.value as FollowUpStatus)}
                className="follow-up-tour-list-stage ml-auto h-9 shrink-0 rounded-full border border-line bg-card px-2.5 text-sm outline-none hover:border-ink/20 disabled:opacity-60"
              >
                {FOLLOW_UP_STATUSES.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
              </select>
            </div>
          ))}
        </ListTable>
        <p className="mt-2 text-xs text-ink-faint">Changes are shared with the board. Switch views whenever it helps.</p>
        </div>
      ) : (
        <DndContext
          sensors={canUpdate ? sensors : []}
          collisionDetection={pointerWithin}
          onDragStart={(event: DragStartEvent) => {
            if (!canUpdate) return;
            setDragging(rows.find((v) => v.id === String(event.active.id)) ?? null);
          }}
          onDragEnd={canUpdate ? onDragEnd : () => setDragging(null)}
        >
          <div className="overflow-x-auto pb-2">
            <div className="grid min-w-[980px] grid-cols-5 gap-3">
              {COLUMNS.map((column) => (
                <BoardColumn
                  key={column.key}
                  column={column}
                  cards={byColumn.get(column.key) ?? []}
                  canUpdate={canUpdate}
                  onMove={setStatus}
                />
              ))}
            </div>
          </div>
          <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
            {dragging ? (
              <div className="rotate-[1.5deg] opacity-95">
                <CardFace visitor={dragging} dragging />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <p className="text-xs text-ink-faint">
        Follow-up stages track conversations. Use Convert to member on a guest record to create a member profile.
      </p>

      <VisitorFormDialog open={formOpen} onOpenChange={setFormOpen} visitor={null} />
    </div>
  );
}

function BoardColumn({
  column,
  cards,
  canUpdate,
  onMove,
}: {
  column: (typeof COLUMNS)[number];
  cards: Visitor[];
  canUpdate: boolean;
  onMove: (visitor: Visitor, next: FollowUpStatus) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key, disabled: !canUpdate });
  return (
    <div
      ref={setNodeRef}
      className={
        isOver
          ? "flex flex-col rounded-2xl border-2 border-brand/50 bg-brand-soft/30 p-2"
          : "flex flex-col rounded-2xl border-2 border-transparent bg-paper-deep/40 p-2"
      }
    >
      <div className={`follow-up-tour-column-${column.key} flex items-center justify-between px-2 pb-1`}>
        <p className="text-sm font-semibold">{column.label}</p>
        <span className="num rounded-full bg-card px-1.5 text-xs text-ink-faint">{cards.length}</span>
      </div>
      <p className="px-2 pb-2 text-xs uppercase tracking-wider text-ink-faint">{column.hint}</p>
      <div className="flex flex-1 flex-col gap-2">
        {cards.map((visitor) => (
          <BoardCard
            key={visitor.id}
            visitor={visitor}
            canUpdate={canUpdate}
            onMove={(next) => onMove(visitor, next)}
          />
        ))}
        {!cards.length ? (
          <p className="rounded-xl border border-dashed border-line/70 py-6 text-center text-xs text-ink-faint">
            Nothing here
          </p>
        ) : null}
      </div>
    </div>
  );
}

function BoardCard({
  visitor,
  canUpdate,
  onMove,
}: {
  visitor: Visitor;
  canUpdate: boolean;
  onMove: (next: FollowUpStatus) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: visitor.id,
    disabled: !canUpdate,
  });

  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={isDragging ? "opacity-40" : undefined}
    >
      <CardFace visitor={visitor} canUpdate={canUpdate} onMove={onMove} dragHandleProps={canUpdate ? { ...listeners, ...attributes } : undefined} />
    </div>
  );
}

function CardFace({
  visitor,
  canUpdate,
  onMove,
  dragHandleProps,
  dragging,
}: {
  visitor: Visitor;
  canUpdate?: boolean;
  onMove?: (next: FollowUpStatus) => void;
  dragHandleProps?: Record<string, unknown>;
  dragging?: boolean;
}) {
  return (
    <div className="follow-up-tour-card paper-card group rounded-xl p-3">
      <div className="flex items-start gap-2.5">
        {dragHandleProps ? (
          <ActionTooltip label={`Drag ${visitor.firstName}`}>
            <button
              type="button"
              aria-label={`Drag ${visitor.firstName}`}
              className="mt-1 cursor-grab touch-none rounded text-ink-faint opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing"
              {...(dragHandleProps as object)}
            >
              <GripVertical className="size-3.5" />
            </button>
          </ActionTooltip>
        ) : (
          <span className="w-5" />
        )}
        <PersonAvatar name={`${visitor.firstName} ${visitor.lastName ?? ""}`.trim()} size="sm" />
        <div className="min-w-0 flex-1">
          <Link
            href={`/people/visitors/${visitor.id}`}
            onPointerDown={(event) => event.stopPropagation()}
            className="block truncate text-sm font-semibold hover:text-brand"
          >
            {visitor.firstName} {visitor.lastName ?? ""}
          </Link>
          <p className="truncate text-xs text-ink-faint">
            {visitor.phone ? <Phone className="mr-1 inline size-2.5" /> : null}
            {daysSince(visitor.firstVisitDate)}
            {visitor.assignedToName ? ` · ${visitor.assignedToName.split(" ")[0]}` : " · unassigned"}
          </p>
        </div>
      </div>
      {canUpdate && onMove ? (
        <select
          value={visitor.followUpStatus}
          onPointerDown={(event) => event.stopPropagation()}
          onChange={(event) => onMove(event.target.value as FollowUpStatus)}
          className="mt-2 w-full rounded-md border border-line bg-card px-1.5 py-1 text-xs text-ink-soft outline-none"
          aria-label={`Status for ${visitor.firstName}`}
        >
          {FOLLOW_UP_STATUSES.map((stage) => (
            <option key={stage.value} value={stage.value}>
              {stage.label}
            </option>
          ))}
        </select>
      ) : dragging ? null : (
        <Tag tone={visitor.followUpStatus === "converted" ? "moss" : "neutral"} className="mt-2">
          {COLUMNS.find((c) => c.statuses.includes(visitor.followUpStatus))?.label ?? formatStatusLabel(visitor.followUpStatus)}
        </Tag>
      )}
    </div>
  );
}
