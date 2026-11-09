"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  BellOff,
  Cake,
  Gift,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { StatCard, Tag } from "@/components/paper/stat";
import {
  EmptyState,
  FilterChip,
  PersonAvatar,
} from "@/components/paper/primitives";
import { StaggerGroup, StaggerItem } from "@/components/paper/motion/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LifeEventFormDialog } from "@/components/pastoral/life-event-form-dialog";
import { ConfirmDeleteDialog } from "@/components/pastoral/confirm-delete-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useLifeEvents,
  useDeleteLifeEvent,
  LIFE_EVENT_TYPES,
  type LifeEvent,
  type LifeEventType,
} from "@/hooks/use-pastoral";
import { cn } from "@/lib/utils";

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
}

function groupLabel(value: string) {
  const target = new Date(value);
  const now = new Date();
  const diff = Math.round((target.getTime() - now.getTime()) / 86_400_000);
  if (Number.isNaN(diff)) return "Undated";
  if (diff < 0) return "Recently passed";
  if (diff <= 7) return "This week";
  if (diff <= 30) return "Next thirty days";
  return "Further ahead";
}

export default function LifeEventsPage() {
  const { can, ready } = usePermissions();
  const canCreate = ready && can("pastoral", "create");
  const canDelete = ready && can("pastoral", "delete");

  const [type, setType] = React.useState<LifeEventType | "all">("all");
  const [upcoming, setUpcoming] = React.useState(true);
  const [formOpen, setFormOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<LifeEvent | null>(null);

  const deleteEvent = useDeleteLifeEvent();

  const events = useLifeEvents({
    limit: 100,
    type: type === "all" ? undefined : type,
    upcoming: upcoming ? "true" : undefined,
    sortBy: "date",
    sortOrder: "asc",
  });

  const rows = React.useMemo(() => events.data?.data ?? [], [events.data]);
  const grouped = React.useMemo(() => {
    const map = new Map<string, LifeEvent[]>();
    for (const event of rows) {
      const key = groupLabel(event.date);
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    return [...map.entries()];
  }, [rows]);

  const upcomingSoon = rows.filter((e) => {
    const diff = (new Date(e.date).getTime() - Date.now()) / 86_400_000;
    return diff >= 0 && diff <= 7;
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/people/pastoral"
            className="inline-flex items-center gap-1.5 text-[11px] text-ink-faint hover:text-ink"
          >
            <ArrowLeft className="size-3" /> People · Pastoral care
          </Link>
          <h1 className="mt-1 font-display text-[clamp(1.65rem,2.4vw,2.1rem)] font-semibold tracking-tight">
            Milestones the church should not miss.
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            Remember birthdays, healings, homecomings and losses with a card, call or meal.
          </p>
        </div>
        {canCreate ? (
          <Button className="h-9 gap-1.5 rounded-full text-xs" onClick={() => setFormOpen(true)}>
            <Plus className="size-3.5" /> Mark an event
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="On the calendar" value={events.data?.meta?.total ?? rows.length} tone="brand" icon={<Gift className="size-4" />} />
        <StatCard label="Within seven days" value={upcomingSoon} tone="gold" deltaLabel="send something" />
        <StatCard label="Types tracked" value={LIFE_EVENT_TYPES.length} tone="sky" />
        <div className="paper-card flex flex-col justify-between gap-4 rounded-2xl p-5">
          <span className="rule-label">Filter</span>
          <span className="font-display text-lg font-semibold">{upcoming ? "Upcoming only" : "All dates"}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip active={type === "all"} onClick={() => setType("all")}>All types</FilterChip>
        {LIFE_EVENT_TYPES.map((item) => (
          <FilterChip key={item} active={type === item} onClick={() => setType(item)}>
            <span className="capitalize">{item}</span>
          </FilterChip>
        ))}
        <FilterChip active={upcoming} onClick={() => setUpcoming((v) => !v)}>
          {upcoming ? "Upcoming only" : "Show past too"}
        </FilterChip>
      </div>

      {events.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      ) : grouped.length === 0 ? (
        <EmptyState
          icon={<Cake />}
          title="No milestones recorded"
          description="Life events are how a church learns to celebrate and mourn on time."
          action={canCreate ? <Button variant="outline" size="sm" className="rounded-full border-line text-xs" onClick={() => setFormOpen(true)}>Add the first</Button> : undefined}
        />
      ) : (
        <div className="space-y-6">
          {grouped.map(([label, items]) => (
            <section key={label}>
              <p className="rule-label mb-2">{label}</p>
              <StaggerGroup className="paper-card divide-y divide-line/70 overflow-hidden rounded-2xl">
                {items.map((event) => (
                  <StaggerItem key={event.id}>
                    <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                      <span className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-xl",
                        event.type === "birthday" || event.type === "anniversary" ? "bg-gold-soft text-gold"
                          : event.type === "death" ? "bg-muted text-ink-soft"
                          : "bg-moss-soft text-moss",
                      )}>
                        {event.notified ? <Bell className="size-3.5" /> : <BellOff className="size-3.5" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-xs font-semibold capitalize">{event.type.replace(/[_-]/g, " ")}</p>
                          <Tag tone={event.notified ? "moss" : "neutral"}>{event.notified ? "Noted" : "To acknowledge"}</Tag>
                        </div>
                        <div className="mt-0.5 flex min-w-0 items-center gap-2 text-[11px] text-ink-faint">
                          <PersonAvatar name={`${event.memberFirstName} ${event.memberLastName}`} size="xs" />
                          <Link href={`/people/members/${event.memberId}`} className="truncate hover:text-brand">
                            {event.memberFirstName} {event.memberLastName}
                          </Link>
                        </div>
                      </div>
                      <span className="num shrink-0 text-[11px] text-ink-soft">{formatDate(event.date)}</span>
                      {canDelete ? (
                        <button
                          type="button"
                          aria-label="Remove milestone"
                          onClick={() => setDeleteTarget(event)}
                          className="grid size-7 shrink-0 place-items-center rounded-full text-ink-faint transition-colors hover:bg-rose-soft hover:text-rose"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </StaggerItem>
                ))}
              </StaggerGroup>
            </section>
          ))}
        </div>
      )}

      <LifeEventFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(value) => !value && setDeleteTarget(null)}
        title="Remove this milestone?"
        description={deleteTarget ? `${deleteTarget.type.replace(/[_-]/g, " ")} for ${deleteTarget.memberFirstName} ${deleteTarget.memberLastName} will leave the care calendar. The record itself is kept.` : ""}
        confirmLabel="Remove"
        pending={deleteEvent.isPending}
        pendingLabel="Removing…"
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteEvent.mutate(deleteTarget.id, {
            onSuccess: () => {
              setDeleteTarget(null);
              toast("Milestone removed from the calendar.");
            },
            onError: () => toast.error("Couldn't remove it. Please try again."),
          });
        }}
      />
    </div>
  );
}
