"use client";

import * as React from "react";
import {
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  Clock,
  Plus,
  Video,
} from "lucide-react";
import { PageHeader } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import {
  EmptyState,
  FilterChip,
  PersonAvatar,
  SearchField,
} from "@/components/paper/primitives";
import { StaggerGroup, StaggerItem } from "@/components/paper/motion/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AppointmentDetailDialog,
} from "@/components/appointments/appointment-detail-dialog";
import { AppointmentFormDialog } from "@/components/appointments/appointment-form-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useAppointments,
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
  type Appointment,
} from "@/hooks/use-appointments";

const STATUS_TONES: Record<string, "moss" | "gold" | "sky" | "neutral"> = {
  confirmed: "moss",
  pending: "gold",
  completed: "sky",
  cancelled: "neutral",
};

function dayKey(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toISOString().slice(0, 10);
}

function dayLabel(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return target.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function timeOf(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function AppointmentsPage() {
  const { can, ready } = usePermissions();
  const canCreate = ready && can("appointments", "create");
  const canUpdate = ready && can("appointments", "update");

  const [status, setStatus] = React.useState<string>("all");
  const [query, setQuery] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [target, setTarget] = React.useState<Appointment | null>(null);

  const appointments = useAppointments({
    limit: 50,
    status: status === "all" ? undefined : status,
    search: query || undefined,
  });

  const rows = React.useMemo(() => {
    const list = [...(appointments.data?.data ?? [])];
    return list.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }, [appointments.data]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of rows) {
      const key = dayKey(a.scheduledAt);
      map.set(key, [...(map.get(key) ?? []), a]);
    }
    return [...map.entries()];
  }, [rows]);

  const summary = appointments.data?.summary ?? {};

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Connect · Appointments"
        title="Time set aside for people."
        description="Pastoral meetings, baptism chats, and wedding planning, with room to breathe between them."
        actions={
          canCreate ? (
            <Button className="h-9 gap-1.5 rounded-full text-sm" onClick={() => { setTarget(null); setFormOpen(true); }}>
              <Plus className="size-3.5" /> Book a time
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pending" value={summary.pending ?? 0} tone="gold" icon={<CircleDashed className="size-4" />} deltaLabel="to confirm" />
        <StatCard label="Confirmed" value={summary.confirmed ?? 0} tone="moss" icon={<CheckCircle2 className="size-4" />} />
        <StatCard label="Completed · page" value={rows.filter((a) => a.status === "completed").length} tone="sky" icon={<CalendarClock className="size-4" />} />
        <StatCard label="On the books" value={appointments.data?.total ?? 0} tone="brand" icon={<Clock className="size-4" />} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchField value={query} onChange={setQuery} placeholder="Search title or people…" className="w-full max-w-[240px]" />
        <FilterChip active={status === "all"} onClick={() => setStatus("all")}>Any state</FilterChip>
        {APPOINTMENT_STATUSES.map((s) => (
          <FilterChip key={s} active={status === s} onClick={() => setStatus(s)}>
            {APPOINTMENT_STATUS_LABELS[s]}
          </FilterChip>
        ))}
      </div>

      {appointments.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
      ) : grouped.length === 0 ? (
        <EmptyState
          icon={<CalendarClock />}
          title="Nothing booked"
          description="A quiet book means people are being met elsewhere, or the invitations need sending."
        />
      ) : (
        <div className="space-y-5">
          {grouped.map(([day, items]) => (
            <section key={day}>
              <p className="rule-label mb-2">{dayLabel(items[0]!.scheduledAt)}</p>
              <StaggerGroup className="paper-card divide-y divide-line/70 overflow-hidden rounded-2xl">
                {items.map((appointment) => {
                  const who = appointment.whoKind === "visitor" && appointment.visitorName
                    ? appointment.visitorName
                    : appointment.personName ?? "Someone";
                  return (
                    <StaggerItem key={appointment.id}>
                      <button
                        type="button"
                        onClick={() => { setTarget(appointment); setDetailOpen(true); }}
                        className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-muted/40"
                      >
                        <div className="w-14 shrink-0 text-right">
                          <p className="num text-sm font-semibold">{timeOf(appointment.scheduledAt)}</p>
                        </div>
                        <span className="h-8 w-px bg-line" />
                        <PersonAvatar name={who} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-semibold">{appointment.title}</span>
                            {appointment.whoKind === "visitor" ? <Tag tone="gold">visitor</Tag> : null}
                            {appointment.location?.toLowerCase().includes("video") || appointment.location?.toLowerCase().includes("zoom") ? (
                              <span className="flex items-center gap-1 text-xs text-sky"><Video className="size-2.5" /> remote</span>
                            ) : null}
                          </p>
                          <p className="truncate text-sm text-ink-soft">
                            {who} · with {appointment.pastorName ?? "unassigned"}
                            {appointment.location ? ` · ${appointment.location}` : ""}
                          </p>
                        </div>
                        <Tag tone={STATUS_TONES[appointment.status] ?? "neutral"} dot>
                          {APPOINTMENT_STATUS_LABELS[appointment.status as keyof typeof APPOINTMENT_STATUS_LABELS] ?? appointment.status}
                        </Tag>
                        {canUpdate && !appointment.archivedAt ? (
                          <span className="shrink-0 rounded-full px-2 py-1 text-xs text-brand opacity-0 transition-opacity [.paper-card:hover_&]:opacity-100 hover:underline">
                            Manage
                          </span>
                        ) : null}
                      </button>
                    </StaggerItem>
                  );
                })}
              </StaggerGroup>
            </section>
          ))}
        </div>
      )}

      <AppointmentFormDialog open={formOpen} onOpenChange={setFormOpen} appointment={target} />
      <AppointmentDetailDialog open={detailOpen} onOpenChange={setDetailOpen} appointment={target} />

      <p className="text-center text-xs text-ink-faint">
        Fifteen quiet minutes after each hard conversation is not inefficiency; it&apos;s how you carry the next one well.
      </p>
    </div>
  );
}
