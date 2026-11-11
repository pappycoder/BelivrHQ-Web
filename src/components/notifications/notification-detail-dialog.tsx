"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCurrentProfile } from "@/hooks/use-profile";
import { usePermissions } from "@/hooks/use-permissions";
import { toast } from "@/lib/toast";
import { notificationContext, notificationLabel, notificationLink } from "@/lib/notification-details";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDeleteDialog } from "@/components/pastoral/confirm-delete-dialog";
import { useNotification, useMarkAsRead, useDeleteNotification, NOTIFICATION_TYPE_LABELS, type NotificationType } from "@/hooks/use-notifications";

interface NotificationDetailDialogProps {
  notification: { id: string; type: NotificationType; title: string; body: string; createdAt: string; readAt?: string; data?: Record<string, unknown> } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function NotificationDetailDialog({ notification, open, onOpenChange, onDeleted }: NotificationDetailDialogProps) {
  const { data: profile } = useCurrentProfile();
  const { ready, canAny } = usePermissions();
  const billingAdmin = !!profile?.role.some(role => role === "church_admin" || role === "super_admin");
  const notificationId = notification?.id ?? null;
  const detail = useNotification(open ? notificationId : null);
  const read = useMarkAsRead();
  const { mutate: markRead, reset: resetRead } = read;
  const deletion = useDeleteNotification();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const attempted = useRef<string | null>(null);

  useEffect(() => {
    attempted.current = null;
    resetRead();
    setDeleteOpen(false);
  }, [open, notificationId, resetRead]);

  // Fetch the owned notification successfully before persisting its read state.
  useEffect(() => {
    const item = detail.data;
    if (open && notificationId && item && detail.isSuccess && !detail.isFetching && !detail.isError && item.id === notificationId && !item.readAt && attempted.current !== item.id) {
      attempted.current = item.id;
      markRead(item.id);
    }
  }, [open, notificationId, detail.data, detail.isSuccess, detail.isFetching, detail.isError, markRead]);

  if (!notification) return null;
  const item = detail.data?.id === notification.id ? detail.data : undefined;
  const readAt = item?.readAt || (read.data?.id === item?.id ? read.data?.readAt : undefined);
  const context = notificationContext(item?.data);
  const destination = ready ? notificationLink(item?.data, permission => canAny(permission), billingAdmin) : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{NOTIFICATION_TYPE_LABELS[item?.type ?? notification.type] ?? notificationLabel(item?.type ?? notification.type)}</Badge>
              {item && !detail.isError && <Badge role="status" variant={readAt ? "secondary" : "outline"}>{read.isPending ? "Marking as read…" : readAt ? "Read" : "Unread"}</Badge>}
            </div>
            <DialogTitle className="break-words text-xl leading-snug">{item?.title ?? notification.title}</DialogTitle>
            <DialogDescription>
              {item ? <>Received <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}</time></> : "Loading the full notification."}
            </DialogDescription>
          </DialogHeader>
          {detail.isError ? (
            <div role="alert" className="space-y-3 rounded-xl border border-line p-4 text-sm">
              <p>This notification could not be loaded. It has not been marked as read by opening this view.</p>
              <Button variant="outline" onClick={() => void detail.refetch()} disabled={detail.isFetching}>Retry loading</Button>
            </div>
          ) : !item ? (
            <div aria-label="Loading notification" className="space-y-3"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-28 w-full" /></div>
          ) : (
            <>
              <div className="rounded-xl border border-line bg-muted/20 p-4 sm:p-5"><p className="whitespace-pre-wrap break-words text-sm leading-7">{item.body}</p></div>
              {context.length > 0 && <dl className="grid gap-x-6 gap-y-4 rounded-xl border border-line p-4 text-sm sm:grid-cols-2">
                {context.map(field => <div key={field.label} className="min-w-0 space-y-1"><dt className="text-sm text-muted-foreground">{field.label}</dt><dd className="break-words font-medium">{field.value}</dd></div>)}
              </dl>}
              {read.isError && <div role="alert" className="space-y-2 rounded-xl border border-destructive/30 p-3 text-sm">
                <p>The notification opened, but its read status could not be saved.</p>
                <Button size="sm" variant="outline" onClick={() => markRead(item.id)} disabled={read.isPending}>Retry marking as read</Button>
              </div>}
            </>
          )}
          <DialogFooter className="flex-wrap gap-2">
            {item && !detail.isError && destination && <Button asChild><Link href={destination} onClick={() => onOpenChange(false)}>{["/subscription", "/settings/billing"].includes(destination.split("?")[0]) ? "Plan & Billing" : "Open related record"}</Link></Button>}
            {item && !detail.isError && <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>Delete</Button>}
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Delete this notification?"
        description="This notification will be permanently removed." pending={deletion.isPending} onConfirm={() => deletion.mutate(notification.id, {
          onSuccess: () => { setDeleteOpen(false); onOpenChange(false); onDeleted?.(); toast.success("Notification deleted."); },
          onError: (error: Error) => toast.error(error.message || "Failed to delete notification."),
        })} />
    </>
  );
}
