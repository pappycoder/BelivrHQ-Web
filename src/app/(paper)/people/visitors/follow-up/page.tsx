"use client";

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
  const { can, ready } = usePermissions();
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
    if (visitor.followUpStatus === next) return;
    updateVisitor.mutate(
      { visitorId: visitor.id, input: { followUpStatus: next } },
      {
        onSuccess: () => toast(`${visitor.firstName} moved to ${COLUMNS.find((c) => c.statuses.includes(next))?.label ?? next}.`),
        onError: () => toast.error("Couldn't move that card — it snapped back."),
      },
    );
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
      <PageHeader
        eyebrow={
          <Link href="/people/visitors" className="flex items-center gap-1.5 hover:text-ink">
            <ArrowLeft className="size-3" /> People · Visitors
          </Link>
        }
        title="This week's hellos."
        description="Drag a card, or use its dropdown — the conversation should move as fast as the care behind it."
        actions={
          canCreate ? (
            <Button className="h-9 gap-1.5 rounded-full text-xs" onClick={() => setFormOpen(true)}>
              <UserRoundPlus className="size-3.5" /> Add a guest
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="On the board" value={rows.length} tone="brand" />
        <StatCard label="Awaiting first hello" value={(byColumn.get("new") ?? []).length} tone="gold" deltaLabel="under 48h old" />
        <StatCard label="In conversation" value={(byColumn.get("interested") ?? []).length + (byColumn.get("scheduled") ?? []).length} tone="sky" />
        <StatCard label="Unassigned" value={unassigned} tone={unassigned ? "rose" : "moss"} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchField value={query} onChange={setQuery} placeholder="Find a guest…" className="w-full max-w-xs" />
        <ViewToggle
          value={view}
          onChange={setView}
          options={[
            { value: "board", label: "Kanban board", icon: <Columns3 className="size-3.5" /> },
            { value: "list", label: "List view", icon: <Rows3 className="size-3.5" /> },
          ]}
        />
        <span className="text-[10px] text-ink-faint">
          {stats.data?.converted ?? 0} joined this year · follow-up beats spreadsheets
        </span>
      </div>

      {view === "list" ? (
        <div className="paper-card divide-y divide-line/70 overflow-hidden rounded-2xl">
          <div className="rule-label grid grid-cols-[minmax(0,2.2fr)_1.2fr_1fr_150px] items-center gap-3 border-b border-line px-5 py-2.5">
            <span>Guest</span>
            <span>Assigned</span>
            <span>First visit</span>
            <span className="text-right">Follow-up</span>
          </div>
          {rows.map((visitor) => (
            <div key={visitor.id} className="flex items-center gap-3 px-5 py-3">
              <Link href={`/people/visitors/${visitor.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <PersonAvatar name={fullName(visitor)} size="xs" />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium">{fullName(visitor)}</span>
                  <span className="block truncate text-[10px] text-ink-faint">{visitor.phone ?? visitor.email ?? "No contact on file"}</span>
                </span>
              </Link>
              <span className="hidden w-36 truncate text-[11px] text-ink-soft md:block">
                {visitor.assignedToName ?? <span className="text-brand">Unassigned</span>}
              </span>
              <span className="num hidden w-24 text-right text-[10px] text-ink-faint sm:block">{formatDate(visitor.firstVisitDate)}</span>
              <select
                value={visitor.followUpStatus}
                aria-label={`Follow-up stage for ${fullName(visitor)}`}
                onChange={(event) =>
                  updateVisitor.mutate(
                    { visitorId: visitor.id, input: { followUpStatus: event.target.value as FollowUpStatus } },
                    { onSuccess: () => toast("Follow-up updated."), onError: () => toast.error("Couldn't update the stage.") },
                  )
                }
                className="ml-auto h-8 shrink-0 rounded-full border border-line bg-card px-2.5 text-[11px] outline-none hover:border-ink/20"
              >
                {FOLLOW_UP_STATUSES.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
              </select>
            </div>
          ))}
          <div className="bg-muted/20 px-5 py-2.5 text-[10px] text-ink-faint">
            Same live mutations as the board — switch back whenever the picture helps more than the list.
          </div>
        </div>
      ) : list.isLoading ? (
        <div className="grid min-w-0 gap-3 md:grid-cols-5">
          {COLUMNS.map((c) => <Skeleton key={c.key} className="h-64 rounded-2xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Check />}
          title="The board is clear"
          description={query ? "No guest matches that search." : "Every guest has been greeted. Rare, and worth savouring."}
        />
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
            <div className="grid min-w-[980px] gap-3 md:grid-cols-5">
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

      <p className="text-[10px] text-ink-faint">
        Converted guests keep their history; the member profile carries the story from here.
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
      <div className="flex items-center justify-between px-2 pb-1">
        <p className="text-xs font-semibold">{column.label}</p>
        <span className="num rounded-full bg-card px-1.5 text-[10px] text-ink-faint">{cards.length}</span>
      </div>
      <p className="px-2 pb-2 text-[9px] uppercase tracking-wider text-ink-faint">{column.hint}</p>
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
          <p className="rounded-xl border border-dashed border-line/70 py-6 text-center text-[10px] text-ink-faint">
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
    <div className="paper-card group rounded-xl p-3">
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
            className="block truncate text-[11px] font-semibold hover:text-brand"
          >
            {visitor.firstName} {visitor.lastName ?? ""}
          </Link>
          <p className="truncate text-[10px] text-ink-faint">
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
          className="mt-2 w-full rounded-md border border-line bg-card px-1.5 py-1 text-[10px] text-ink-soft outline-none"
          aria-label={`Status for ${visitor.firstName}`}
        >
          {COLUMNS.flatMap((c) => c.statuses).map((value) => (
            <option key={value} value={value}>
              {COLUMNS.find((c) => c.statuses.includes(value))?.label.split(" /")[0] ?? value}
            </option>
          ))}
        </select>
      ) : dragging ? null : (
        <Tag tone={visitor.followUpStatus === "converted" ? "moss" : "neutral"} className="mt-2">
          {COLUMNS.find((c) => c.statuses.includes(visitor.followUpStatus))?.label ?? visitor.followUpStatus}
        </Tag>
      )}
    </div>
  );
}
