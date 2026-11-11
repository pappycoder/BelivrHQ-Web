"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, CheckCheck } from "lucide-react";
import {
  useNotificationsList,
  useNotificationsUnread,
  useMarkAllAsRead,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATIONS_LIST_LIMIT,
  formatRelativeTime,
  type Notification,
  type NotificationType,
} from "@/hooks/use-notifications";
import { NotificationsDrawer } from "@/components/notifications/notifications-drawer";
import { NotificationDetailDialog } from "@/components/notifications/notification-detail-dialog";

const PREVIEW_LIMIT = 5;

let lastSeenUnreadCount: number | undefined;

interface NotificationBellProps {
  /**
   * Compact trigger for the mobile header. Uses a slightly smaller trigger
   * size and no outer margin so it fits the narrow mobile actions row.
   */
  compact?: boolean;
}

export function NotificationBell({ compact = false }: NotificationBellProps) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Notification | null>(null);

  const queryClient = useQueryClient();
  const unread = useNotificationsUnread();
  const { data, isLoading } = useNotificationsList(
    { page: 1, limit: NOTIFICATIONS_LIST_LIMIT, read: "all" },
    { enabled: previewOpen }
  );
  const markAllAsRead = useMarkAllAsRead();

  const unreadCount = unread.data?.count ?? 0;
  const preview = (data?.data ?? []).slice(0, PREVIEW_LIMIT);

  React.useEffect(() => {
    if (lastSeenUnreadCount !== undefined && unreadCount !== lastSeenUnreadCount) {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
    lastSeenUnreadCount = unreadCount;
  }, [unreadCount, queryClient]);

  const handleOpenNotification = (n: Notification) => {
    setSelected(n);
  };

  const handleMarkAllRead = () => {
    markAllAsRead.mutate(undefined, {
      onError: (error: Error) => toast.error(error.message || "Failed to mark all as read"),
    });
  };

  return (
    <>
      <div className={compact ? "" : "me-2"}>
        <DropdownMenu open={previewOpen} onOpenChange={setPreviewOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" id="notification_popup" aria-label="Notifications" disableTooltip>
              <Bell className="size-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80 p-0" align="end">
            <DropdownMenuLabel className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold">
                Notifications {unreadCount > 0 ? `(${unreadCount})` : ""}
              </span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={markAllAsRead.isPending}
                  className="text-xs text-primary inline-flex items-center gap-1 disabled:opacity-50"
                >
                  {markAllAsRead.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <CheckCheck className="h-3 w-3" />
                  )}
                  Mark all as read
                </button>
              )}
            </DropdownMenuLabel>

            <div className="max-h-80 overflow-y-auto">
              {isLoading ? (
                <div className="p-3 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded" />
                  ))}
                </div>
              ) : preview.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No notifications yet.
                </p>
              ) : (
                preview.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleOpenNotification(n)}
                    className="flex w-full items-start gap-2 border-b border-border px-4 py-3 text-left hover:bg-accent"
                  >
                    <span className="pt-1">
                      {!n.readAt && (
                        <span className="block h-2 w-2 rounded-full bg-primary" aria-hidden />
                      )}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-foreground truncate">
                        {n.title}
                      </span>
                      <span className="block text-sm text-muted-foreground line-clamp-2">
                        {n.body}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {NOTIFICATION_TYPE_LABELS[n.type as NotificationType] ?? n.type} ·{" "}
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>

            <DropdownMenuSeparator />
            <div className="p-2">
              <DropdownMenuItem
                onSelect={() => setDrawerOpen(true)}
                className="justify-center rounded-md text-center text-sm font-medium"
              >
                View all
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <NotificationsDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onOpenNotification={handleOpenNotification}
      />

      <NotificationDetailDialog
        notification={selected}
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </>
  );
}
