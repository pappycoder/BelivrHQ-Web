"use client";

import { useManageConfirmation } from "@/components/shared/manage-confirmation";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BellOff,
  CalendarCheck,
  CalendarDays,
  Check,
  CheckCheck,
  HandCoins,
  HeartHandshake,
  Megaphone,
  Settings2,
  Trash2,
  Undo2,
} from "lucide-react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { PageHeader } from "@/components/paper/section";
import {
  EmptyState,
  FilterChip,
  ListPaginationFooter,
  RowActions,
} from "@/components/paper/primitives";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDeleteDialog } from "@/components/pastoral/confirm-delete-dialog";
import {
  NOTIFICATION_TYPE_LABELS,
  formatRelativeTime,
  useBulkDeleteNotifications,
  useBulkMarkAsRead,
  useBulkMarkAsUnread,
  useDeleteNotification,
  useMarkAllAsRead,
  useMarkAsRead,
  useNotificationsList,
  type NotificationType,
} from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<NotificationType, React.ElementType> = {
  system: Settings2,
  attendance: CalendarCheck,
  giving: HandCoins,
  event: CalendarDays,
  pastoral: HeartHandshake,
  broadcast: Megaphone,
};

const TYPE_TONES: Record<NotificationType, "sky" | "moss" | "brand" | "gold" | "rose" | "neutral"> = {
  system: "neutral",
  attendance: "moss",
  giving: "brand",
  event: "sky",
  pastoral: "rose",
  broadcast: "gold",
};

const FILTERS: { label: string; value: "all" | "unread" }[] = [
  { label: "All", value: "all" },
  { label: "Unread", value: "unread" },
];

const TYPES: ("all" | NotificationType)[] = [
  "all",
  "pastoral",
  "giving",
  "event",
  "attendance",
  "broadcast",
  "system",
];

type DeleteTarget = { ids: string[]; label: string };

export default function PaperNotificationsPage() {
  const { confirm, dialog } = useManageConfirmation();
  const router = useRouter();
  const [read, setRead] = React.useState<"all" | "unread">("all");
  const [type, setType] = React.useState<"all" | NotificationType>("all");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(20);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = React.useState<DeleteTarget | null>(null);

  const list = useNotificationsList({
    page,
    limit: perPage,
    read,
    type: type === "all" ? undefined : type,
  });
  const markRead = useMarkAsRead();
  const markAll = useMarkAllAsRead();
  const bulkRead = useBulkMarkAsRead();
  const bulkUnread = useBulkMarkAsUnread();
  const bulkDelete = useBulkDeleteNotifications();
  const deleteOne = useDeleteNotification();

  const items = list.data?.data ?? [];
  const total = list.data?.total ?? 0;
  const selectedIds = [...selected];

  // Any filter/page change drops the selection so actions never target
  // rows that left the visible page.
  React.useEffect(() => {
    setSelected(new Set());
  }, [read, type, page, perPage]);

  const open = (id: string, readAt: string | undefined, link?: string) => {
    if (!readAt) markRead.mutate(id);
    if (link?.startsWith("/")) router.push(link);
  };

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allOnPageSelected =
    items.length > 0 && items.every((item) => selected.has(item.id));

  const toggleAll = () =>
    setSelected(
      allOnPageSelected
        ? new Set()
        : new Set(items.map((item) => item.id)),
    );

  const runBulk = (mutation: typeof bulkRead, done: (n: number) => string, title: string) => {
    const ids = [...selectedIds];
    const names = items.filter((item) => ids.includes(item.id)).map((item) => item.title);
    confirm({ title, subject: names.join(" · "), description: `Update ${ids.length} selected notifications?`, onConfirm: () => mutation.mutateAsync(ids, {
      onSuccess: () => { toast(done(ids.length)); setSelected((current) => { const next = new Set(current); ids.forEach((id) => next.delete(id)); return next; }); },
      onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't complete that.")),
    }) });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const { ids } = deleteTarget;
    const onDone = () => {
      toast(
        ids.length > 1
          ? `${ids.length} notifications deleted.`
          : "Notification deleted.",
      );
      setSelected((current) => {
        const next = new Set(current);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      setDeleteTarget(null);
    };
    const onError = (e: Error) =>
      toast.error(getToastErrorMessage(e, "Couldn't delete it."));
    if (ids.length > 1) bulkDelete.mutate(ids, { onSuccess: onDone, onError });
    else deleteOne.mutate(ids[0], { onSuccess: onDone, onError });
  };

  return (
    <div className="space-y-6">
      {dialog}
      <PageHeader
        eyebrow="Today"
        title="Notifications"
        description={
          list.data?.unreadCount
            ? `${list.data.unreadCount} things that happened while you were elsewhere.`
            : "Everything is quiet."
        }
        actions={
          <Button
            variant="outline"
            className="h-9 gap-1.5 rounded-full border-line bg-card text-xs"
            disabled={!list.data?.unreadCount || markAll.isPending}
            onClick={() =>
              confirm({ title: "Mark all notifications read?", subject: "All unread notifications", onConfirm: () => markAll.mutateAsync(undefined, {
                onSuccess: () => toast("All caught up."),
              }) })
            }
          >
            <CheckCheck className="size-3.5" /> Mark all read
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((item) => (
          <FilterChip key={item.value} active={read === item.value} onClick={() => { setRead(item.value); setPage(1); }}>
            {item.label}
          </FilterChip>
        ))}
        <span className="mx-1 hidden h-4 w-px bg-line sm:block" />
        {TYPES.map((item) => (
          <FilterChip key={item} active={type === item} onClick={() => { setType(item); setPage(1); }}>
            <span className="capitalize">{item === "all" ? "all types" : NOTIFICATION_TYPE_LABELS[item] ?? item}</span>
          </FilterChip>
        ))}
      </div>

      {list.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<BellOff />}
          title="Nothing needs you"
          description="The rarest, best screen. New signals land here as they happen."
        />
      ) : (
        <div className="paper-card overflow-hidden rounded-2xl">
          <div
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 text-xs",
              selectedIds.length
                ? "bg-ink text-paper"
                : "border-b border-line text-ink-faint",
            )}
          >
            <Checkbox
              checked={allOnPageSelected}
              onCheckedChange={toggleAll}
              aria-label="Select all on this page"
              className={cn(
                "size-4 rounded border-line",
                selectedIds.length && "border-paper/50 data-[state=checked]:bg-paper data-[state=checked]:text-ink",
              )}
            />
            {selectedIds.length ? (
              <>
                <span className="num font-medium">{selectedIds.length} selected</span>
                <div className="ml-auto flex flex-wrap items-center gap-1.5">
                  <Button
                    size="xs"
                    className="gap-1.5 rounded-full bg-paper text-ink hover:bg-paper/90"
                    disabled={bulkRead.isPending}
                    onClick={() => runBulk(bulkRead, (n) => `${n} marked read.`, "Mark selected notifications read?")}
                  >
                    <CheckCheck className="size-3" /> Mark read
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    className="gap-1.5 rounded-full border-paper/30 bg-transparent text-paper hover:bg-paper/10 hover:text-paper"
                    disabled={bulkUnread.isPending}
                    onClick={() => runBulk(bulkUnread, (n) => `${n} marked unread.`, "Mark selected notifications unread?")}
                  >
                    <Undo2 className="size-3" /> Mark unread
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    className="gap-1.5 rounded-full border-paper/30 bg-transparent text-paper hover:bg-rose/80 hover:text-paper hover:border-rose/80"
                    onClick={() =>
                      setDeleteTarget({
                        ids: selectedIds,
                        label: `${selectedIds.length} selected notification${selectedIds.length === 1 ? "" : "s"}`,
                      })
                    }
                  >
                    <Trash2 className="size-3" /> Delete
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    className="rounded-full text-[11px] text-paper/70 hover:bg-paper/10 hover:text-paper"
                    onClick={() => setSelected(new Set())}
                  >
                    Clear
                  </Button>
                </div>
              </>
            ) : (
              <span className="num">{total.toLocaleString()} total</span>
            )}
          </div>

          <div className="divide-y divide-line/70">
            {items.map((item) => {
              const Icon = TYPE_ICONS[item.type] ?? Settings2;
              const link = typeof item.data?.link === "string" ? item.data.link : undefined;
              return (
                <div key={item.id} className="group flex items-center gap-3 px-4 py-2 transition-colors hover:bg-muted/40">
                  <Checkbox
                    checked={selected.has(item.id)}
                    onCheckedChange={() => toggle(item.id)}
                    aria-label={`Select ${item.title}`}
                    className="size-4 shrink-0 rounded border-line"
                  />
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-lg",
                      TYPE_TONES[item.type] === "brand" && "bg-brand-soft text-brand",
                      TYPE_TONES[item.type] === "moss" && "bg-moss-soft text-moss",
                      TYPE_TONES[item.type] === "gold" && "bg-gold-soft text-gold",
                      TYPE_TONES[item.type] === "sky" && "bg-sky-soft text-sky",
                      TYPE_TONES[item.type] === "rose" && "bg-rose-soft text-rose",
                      TYPE_TONES[item.type] === "neutral" && "bg-muted text-ink-soft",
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <button
                    type="button"
                    onClick={() => open(item.id, item.readAt, link)}
                    className="flex min-w-0 flex-1 items-baseline gap-2 text-left"
                  >
                    <span className={cn("flex min-w-0 items-center gap-1.5 text-xs", item.readAt ? "text-ink-soft" : "font-semibold text-ink")}>
                      {!item.readAt ? <span className="size-1.5 shrink-0 rounded-full bg-brand" /> : null}
                      <span className="truncate">{item.title}</span>
                    </span>
                    <span className="hidden min-w-0 flex-1 truncate text-[11px] text-ink-faint sm:block">{item.body}</span>
                  </button>
                  <span className="hidden w-24 shrink-0 text-right text-[10px] text-ink-faint sm:block">
                    {formatRelativeTime(item.createdAt)}
                  </span>
                  <RowActions
                    actions={[
                      !item.readAt && {
                        label: "Mark as read", confirmation: { subject: item.title },
                        icon: <Check />,
                        onSelect: () => markRead.mutateAsync(item.id),
                      },
                      item.readAt && {
                        label: "Mark as unread", confirmation: { subject: item.title },
                        icon: <Undo2 />,
                        onSelect: () =>
                          bulkUnread.mutateAsync([item.id], {
                            onSuccess: () => toast("Marked unread."),
                            onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't change that.")),
                          }),
                      },
                      {
                        label: "Delete notification",
                        icon: <Trash2 />,
                        tone: "danger",
                        onSelect: () => setDeleteTarget({ ids: [item.id], label: item.title }),
                      },
                    ]}
                  />
                </div>
              );
            })}
          </div>

          <ListPaginationFooter
            page={page}
            perPage={perPage}
            total={total}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
            perPageOptions={[10, 20, 50]}
            itemName="notifications"
            pending={list.isFetching}
          />
        </div>
      )}

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(value) => !value && setDeleteTarget(null)}
        title={deleteTarget && deleteTarget.ids.length > 1 ? "Delete these notifications?" : "Delete this notification?"}
        description="Notifications are removed for good — this cannot be undone."
        confirmLabel="Delete"
        pending={bulkDelete.isPending || deleteOne.isPending}
        pendingLabel="Deleting…"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
