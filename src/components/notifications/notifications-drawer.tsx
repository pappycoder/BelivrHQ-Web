"use client";

import { Input } from "@/components/ui/input";

import * as React from "react";
import { toast } from "@/lib/toast";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { BellOff, Trash2, CheckCheck, X, ChevronLeft, ChevronRight, CalendarRange } from "lucide-react";
import { format, startOfDay, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import {
  useNotificationsList,
  useMarkAsRead,
  useDeleteNotification,
  useBulkMarkAsRead,
  useBulkDeleteNotifications,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATIONS_LIST_LIMIT,
  formatRelativeTime,
  type Notification,
  type NotificationType,
} from "@/hooks/use-notifications";

const PAGE_SIZE = NOTIFICATIONS_LIST_LIMIT;

interface NotificationsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenNotification: (notification: Notification) => void;
}

type PresetKey = "all" | "today" | "last-7" | "last-30";

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "last-7", label: "Last 7 days" },
  { key: "last-30", label: "Last 30 days" },
];

function presetRange(key: PresetKey): { startDate: string; endDate: string } {
  const today = new Date();
  switch (key) {
    case "today":
      return { startDate: format(startOfDay(today), "yyyy-MM-dd"), endDate: format(today, "yyyy-MM-dd") };
    case "last-7":
      return { startDate: format(subDays(startOfDay(today), 6), "yyyy-MM-dd"), endDate: format(today, "yyyy-MM-dd") };
    case "last-30":
      return { startDate: format(subDays(startOfDay(today), 29), "yyyy-MM-dd"), endDate: format(today, "yyyy-MM-dd") };
    default:
      return { startDate: "", endDate: "" };
  }
}

export function NotificationsDrawer({
  open,
  onOpenChange,
  onOpenNotification,
}: NotificationsDrawerProps) {
  const [page, setPage] = React.useState(1);
  const [readFilter, setReadFilter] = React.useState<"all" | "unread">("all");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const { data, isLoading, isFetching } = useNotificationsList(
    {
      page,
      limit: PAGE_SIZE,
      read: readFilter,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    },
    { enabled: open }
  );

  const markAsRead = useMarkAsRead();
  const deleteNotification = useDeleteNotification();
  const bulkMarkAsRead = useBulkMarkAsRead();
  const bulkDelete = useBulkDeleteNotifications();

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const activePreset = PRESETS.find((p) => {
    const r = presetRange(p.key);
    return r.startDate === startDate && r.endDate === endDate;
  })?.key;

  const resetPage = () => setPage(1);

  const applyPreset = (key: PresetKey) => {
    const r = presetRange(key);
    setStartDate(r.startDate);
    setEndDate(r.endDate);
    setSelected(new Set());
    resetPage();
  };

  const clearRange = () => {
    setStartDate("");
    setEndDate("");
    setSelected(new Set());
    resetPage();
  };

  const toggleAll = (checked: boolean) => {
    const next = new Set(selected);
    if (checked) {
      rows.forEach((n) => next.add(n.id));
    } else {
      rows.forEach((n) => next.delete(n.id));
    }
    setSelected(next);
  };

  const toggleOne = (id: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    setSelected(next);
  };

  const handleOpen = (n: Notification) => {
    onOpenNotification(n);
  };

  const handleMarkRead = (id: string) => {
    markAsRead.mutate(id, {
      onError: (error: Error) => toast.error(error.message || "Failed to mark as read"),
    });
  };

  const handleDelete = (id: string) => {
    deleteNotification.mutate(id, {
      onError: (error: Error) => toast.error(error.message || "Failed to delete notification"),
    });
  };

  const handleBulkMarkRead = () => {
    const ids = Array.from(selected);
    bulkMarkAsRead.mutate(ids, {
      onSuccess: (res) => {
        toast.success(`Marked ${res.updated} notification${res.updated === 1 ? "" : "s"} as read`);
        setSelected(new Set());
      },
      onError: (error: Error) => toast.error(error.message || "Failed to mark as read"),
    });
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selected);
    bulkDelete.mutate(ids, {
      onSuccess: (res) => {
        toast.success(`Deleted ${res.deleted} notification${res.deleted === 1 ? "" : "s"}`);
        setSelected(new Set());
      },
      onError: (error: Error) => toast.error(error.message || "Failed to delete notifications"),
    });
  };

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" showCloseButton={false} className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-border">
          <SheetTitle className="flex items-center justify-between">
            <span>All notifications</span>
            <span className="flex items-center gap-2">
              <Badge variant="secondary">{total}</Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-accent"
                onClick={() => onOpenChange(false)}
                aria-label="Close notifications"
              >
                <X className="h-4 w-4" />
              </Button>
            </span>
          </SheetTitle>
          <SheetDescription>Your in-app activity and updates.</SheetDescription>
        </SheetHeader>

        {/* Filters */}
        <div className="border-b border-border px-5 py-3 space-y-3">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-muted-foreground" />
            {PRESETS.map((p) => (
              <Button
                key={p.key}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 px-2.5 text-xs",
                  activePreset === p.key
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => applyPreset(p.key)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input picker="native"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setSelected(new Set());
                resetPage();
              }}
              className="h-8 w-36 rounded-md border border-input bg-transparent px-2 text-xs text-foreground"
              aria-label="Start date"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input picker="native"
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setSelected(new Set());
                resetPage();
              }}
              className="h-8 w-36 rounded-md border border-input bg-transparent px-2 text-xs text-foreground"
              aria-label="End date"
            />
            {(startDate || endDate) && (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={clearRange}>
                Clear
              </Button>
            )}
          </div>
          <div className="flex items-center gap-1">
            {(["all", "unread"] as const).map((r) => (
              <Button
                key={r}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 px-3 text-xs capitalize",
                  readFilter === r
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => {
                  setReadFilter(r);
                  setSelected(new Set());
                  resetPage();
                }}
              >
                {r === "unread" ? "Unread" : "All"}
              </Button>
            ))}
          </div>
        </div>

        {/* Batch bar */}
        {selected.size > 0 && (
          <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-5 py-2">
            <span className="text-sm font-medium">{selected.size} selected</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={handleBulkMarkRead}
                disabled={bulkMarkAsRead.isPending}
              >
                {bulkMarkAsRead.isPending ? (
                  <span className="flex items-center gap-1">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Marking…
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <CheckCheck className="h-3.5 w-3.5" /> Mark as read
                  </span>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={handleBulkDelete}
                disabled={bulkDelete.isPending}
               loading={bulkDelete.isPending}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground"
                onClick={() => setSelected(new Set())}
                aria-label="Clear selection"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading || isFetching ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="h-full flex items-center justify-center p-6">
              <EmptyState
                icon={<BellOff className="h-8 w-8" />}
                title="No notifications"
                description="You're all caught up."
              />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-border px-5 py-2">
                <Checkbox
                  checked={rows.length > 0 && rows.every((n) => selected.has(n.id))}
                  onCheckedChange={(c) => toggleAll(!!c)}
                  aria-label="Select all on page"
                />
                <span className="text-xs text-muted-foreground">Select all on this page</span>
              </div>
              <ul className="divide-y divide-border">
              {rows.map((n) => (
                <li key={n.id} className="flex items-start gap-3 px-5 py-3">
                  <div className="pt-1.5 flex-shrink-0">
                    <Checkbox
                      checked={selected.has(n.id)}
                      onCheckedChange={(c) => toggleOne(n.id, !!c)}
                      aria-label={`Select ${n.title}`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpen(n)}
                    className="flex-1 text-left group"
                  >
                    <span className="flex items-center gap-2">
                      {!n.readAt && (
                        <span className="h-2 w-2 flex-shrink-0 rounded-full bg-primary" aria-hidden />
                      )}
                      <span
                        className={`text-sm font-medium ${n.readAt ? "text-foreground/80" : "text-foreground"}`}
                      >
                        {n.title}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-sm text-muted-foreground line-clamp-2">
                      {n.body}
                    </span>
                    <span className="mt-1 flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {NOTIFICATION_TYPE_LABELS[n.type as NotificationType] ?? n.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </span>
                  </button>
                  <div className="flex flex-shrink-0 flex-col gap-1 pt-1">
                    {!n.readAt && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Mark as read"
                        aria-label="Mark as read"
                        onClick={() => handleMarkRead(n.id)}
                        disabled={markAsRead.isPending}
                      >
                        <CheckCheck className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      title="Delete notification"
                      aria-label="Delete notification"
                      onClick={() => handleDelete(n.id)}
                      disabled={deleteNotification.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
              </ul>
            </>
          )}
        </div>

        {/* Slim footer */}
        {total > 0 && (
          <div className="border-t border-border px-5 py-3 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Showing {from}–{to} of {total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                disabled={page >= totalPages || isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
