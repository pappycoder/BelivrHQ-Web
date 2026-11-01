"use client";

import * as React from "react";
import { Ban, CalendarClock, Pause, PlayCircle, Repeat, ShieldOff } from "lucide-react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { PageHeader } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import { EmptyState, FilterChip, ManageHeading, PersonAvatar, RowActions } from "@/components/paper/primitives";
import { StaggerGroup, StaggerItem } from "@/components/paper/motion/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDeleteDialog } from "@/components/pastoral/confirm-delete-dialog";
import { RecurringGivingDialog } from "@/components/giving/recurring-giving-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useRecurringGiving,
  usePauseRecurringGiving,
  useResumeRecurringGiving,
  useCancelRecurringGiving,
  type RecurringGiving,
} from "@/hooks/use-giving";
import { formatDate } from "@/hooks/use-media";
import { formatNaira } from "@/hooks/use-analytics";
import { number } from "@/lib/paper/format";

const PAGE_SIZE = 15;

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
};

export default function GivingSchedulesPage() {
  const { can, ready } = usePermissions();
  const canManage = ready && can("giving", "update");
  const canCreate = ready && can("giving", "create");

  const [page, setPage] = React.useState(1);
  const [activeFilter, setActiveFilter] = React.useState<"" | "true" | "false">("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [cancelTarget, setCancelTarget] = React.useState<RecurringGiving | null>(null);

  const recurring = useRecurringGiving({
    page,
    limit: PAGE_SIZE,
    isActive: activeFilter === "" ? undefined : activeFilter === "true",
  });
  const pause = usePauseRecurringGiving();
  const resume = useResumeRecurringGiving();
  const cancel = useCancelRecurringGiving();

  const rows = recurring.data?.data ?? [];
  const total = recurring.data?.meta?.total ?? 0;
  const totalPages = Math.max(1, recurring.data?.meta?.totalPages ?? 1);
  const activeMonthly = rows
    .filter((r) => r.isActive)
    .reduce((sum, r) => sum + (r.frequency === "monthly" ? r.amount : r.frequency === "quarterly" ? Math.round(r.amount / 3) : Math.round(r.amount / 4)), 0);

  const act = (mutation: typeof pause, id: string, message: string) =>
    mutation.mutate(id, {
      onSuccess: () => toast(message),
      onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't reach the schedule.")),
    });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Giving · Recurring"
        title="The floor under the year."
        description="Standing gifts, scheduled and steady — pause with care, never let a failure go unnoticed."
        actions={
          canCreate ? (
            <Button className="h-9 gap-1.5 rounded-full text-xs" onClick={() => setDialogOpen(true)}>
              <Repeat className="size-3.5" /> New schedule
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Schedules" value={total} tone="brand" icon={<CalendarClock className="size-4" />} deltaLabel="in the book" />
        <StatCard label="Projected / month" value={activeMonthly} prefix="₦" tone="moss" deltaLabel="this page" />
        <StatCard label="Paused" value={rows.filter((r) => !r.isActive).length} tone="gold" deltaLabel="this page" />
        <StatCard label="Needing attention" value={rows.filter((r) => r.failedAttemptCount > 0).length} tone="rose" icon={<ShieldOff className="size-4" />} deltaLabel="failed attempts" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip active={activeFilter === ""} onClick={() => { setActiveFilter(""); setPage(1); }}>All</FilterChip>
        <FilterChip active={activeFilter === "true"} onClick={() => { setActiveFilter("true"); setPage(1); }}>Active</FilterChip>
        <FilterChip active={activeFilter === "false"} onClick={() => { setActiveFilter("false"); setPage(1); }}>Paused & ended</FilterChip>
        <span className="ml-auto text-[10px] text-ink-faint">New recurring gifts are set up online by the giver.</span>
      </div>

      {recurring.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Repeat />}
          title={activeFilter ? "Nothing in this state" : "No standing gifts yet"}
          description="Recurring giving is the calmest money in the church — one household at a time."
        />
      ) : (
        <StaggerGroup className="paper-card divide-y divide-line/70 overflow-hidden rounded-2xl">
          <div className="rule-label grid grid-cols-[minmax(0,1.6fr)_1fr_0.9fr_1fr_1fr_auto] items-center gap-3 border-b border-line px-5 py-2.5">
            <span>Giver</span>
            <span>Fund</span>
            <span className="text-right">Amount</span>
            <span>Frequency</span>
            <span>Next charge</span>
            <ManageHeading />
          </div>
          {rows.map((schedule) => (
            <StaggerItem key={schedule.id}>
              <div className="group flex flex-wrap items-center gap-3 px-5 py-3 sm:grid sm:grid-cols-[minmax(0,1.6fr)_1fr_0.9fr_1fr_1fr_auto] sm:gap-3">
                <span className="flex min-w-0 flex-1 items-center gap-2.5">
                  <PersonAvatar name={schedule.memberName ?? "A giver"} size="xs" />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-xs font-medium">{schedule.memberName ?? `Member ${schedule.memberId.slice(0, 6)}`}</span>
                      <Tag tone={schedule.isActive ? "moss" : "neutral"} dot>{schedule.isActive ? "Active" : "Paused"}</Tag>
                      {schedule.failedAttemptCount > 0 ? <Tag tone="rose">{schedule.failedAttemptCount} failed</Tag> : null}
                    </span>
                    <span className="block truncate text-[10px] text-ink-faint">
                      {schedule.lastChargeDate ? `last charged ${formatDate(schedule.lastChargeDate)}` : "not yet charged"}
                    </span>
                  </span>
                </span>
                <span className="truncate text-[11px] text-ink-soft">{schedule.categoryName}</span>
                <span className="num text-right text-xs font-semibold">{formatNaira(schedule.amount)}</span>
                <span className="text-[11px] text-ink-soft">{FREQUENCY_LABELS[schedule.frequency] ?? schedule.frequency}</span>
                <span className="num text-[11px] text-ink-soft">{schedule.nextChargeDate ? formatDate(schedule.nextChargeDate) : "—"}</span>
                <RowActions
                  actions={[
                    canManage && schedule.isActive && {
                      label: "Pause schedule",
                      icon: <Pause />,
                      onSelect: () => act(pause, schedule.id, "Schedule paused — the giver can breathe."),
                    },
                    canManage && !schedule.isActive && {
                      label: "Resume schedule",
                      icon: <PlayCircle />,
                      tone: "success",
                      onSelect: () => act(resume, schedule.id, "Schedule resumed — the floor rebuilds quietly."),
                    },
                    canManage && schedule.isActive && {
                      label: "Cancel schedule",
                      icon: <Ban />,
                      tone: "danger",
                      onSelect: () => setCancelTarget(schedule),
                    },
                  ]}
                />
              </div>
            </StaggerItem>
          ))}
          <div className="flex items-center justify-between bg-muted/20 px-5 py-2.5 text-[11px] text-ink-faint">
            <span>Page <span className="num font-medium text-ink">{page}</span> of <span className="num">{totalPages}</span> · {number(total)} schedules</span>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="xs" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-full border-line bg-card">Prev</Button>
              <Button variant="outline" size="xs" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded-full border-line bg-card">Next</Button>
            </div>
          </div>
        </StaggerGroup>
      )}

      <RecurringGivingDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <ConfirmDeleteDialog
        open={!!cancelTarget}
        onOpenChange={(value) => !value && setCancelTarget(null)}
        title="Cancel this standing gift?"
        description={cancelTarget ? `${cancelTarget.memberName ?? "The giver"}'s ${FREQUENCY_LABELS[cancelTarget.frequency] ?? cancelTarget.frequency} gift of ${formatNaira(cancelTarget.amount)} toward ${cancelTarget.categoryName} stops here. Past charges keep their receipts.` : ""}
        confirmLabel="Cancel schedule"
        pending={cancel.isPending}
        pendingLabel="Cancelling…"
        onConfirm={() => {
          if (!cancelTarget) return;
          cancel.mutate(cancelTarget.id, {
            onSuccess: () => { toast("Schedule cancelled."); setCancelTarget(null); },
            onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't cancel it.")),
          });
        }}
      />
    </div>
  );
}
