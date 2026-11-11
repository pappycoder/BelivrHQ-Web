"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────

export type NotificationType =
  | "system"
  | "attendance"
  | "giving"
  | "event"
  | "pastoral"
  | "broadcast";

export interface Notification {
  id: string;
  churchId: string;
  profileId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  readAt?: string;
  createdAt: string;
}

export interface NotificationsListResponse {
  data: Notification[];
  total: number;
  unreadCount: number;
}

export interface NotificationsListParams {
  page?: number;
  limit?: number;
  type?: NotificationType;
  read?: "all" | "unread";
  startDate?: string;
  endDate?: string;
}

/** Shared list page size for the bell preview, dashboard widget, and drawer, so all three share one cache entry. */
export const NOTIFICATIONS_LIST_LIMIT = 15;

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  system: "System",
  attendance: "Attendance",
  giving: "Giving",
  event: "Event",
  pastoral: "Pastoral",
  broadcast: "Broadcast",
};

// ─── Helpers ─────────────────────────────────────────────

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return formatDistanceToNow(date, { addSuffix: true });
}

// ─── Queries ─────────────────────────────────────────────

export function useNotificationsList(
  params: NotificationsListParams = {},
  options: { enabled?: boolean } = {}
) {
  const query = new URLSearchParams();
  if (params.page && params.page > 1) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.type) query.set("type", params.type);
  if (params.read === "unread") query.set("read", params.read);
  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);
  const qs = query.toString();
  return useQuery({
    queryKey: ["notifications", params],
    queryFn: ({ signal }) =>
      api.get<NotificationsListResponse>(`/notifications${qs ? `?${qs}` : ""}`, { signal }),
    enabled: options.enabled ?? true,
  });
}

export function useNotification(notificationId: string | null) {
  return useQuery({
    queryKey: ["notifications", "detail", notificationId],
    queryFn: ({ signal }) => api.get<Notification>(`/notifications/${encodeURIComponent(notificationId!)}`, { signal }),
    enabled: !!notificationId,
    staleTime: 0,
    retry: false,
    refetchOnMount: "always",
  });
}

export function useNotificationsUnread() {
  return useQuery({
    queryKey: ["notifications-unread"],
    queryFn: ({ signal }) => api.get<{ count: number }>("/notifications/unread-count", { signal }),
  });
}

// ─── Mutations ───────────────────────────────────────────

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) =>
      api.patch<Notification>(`/notifications/${notificationId}/read`),
    onSuccess: (notification) => {
      queryClient.setQueryData(["notifications", "detail", notification.id], notification);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.patch<{ updated: number }>("/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });
}

export function useBulkMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) =>
      api.patch<{ updated: number }>("/notifications/bulk-read", { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });
}

export function useBulkMarkAsUnread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) =>
      api.patch<{ updated: number }>("/notifications/bulk-unread", { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });
}

export function useBulkDeleteNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) =>
      api.post<{ deleted: number }>("/notifications/bulk-delete", { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) =>
      api.delete<{ success: boolean }>(`/notifications/${notificationId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });
}
