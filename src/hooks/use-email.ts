"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────

export type EmailBox = "inbox" | "sent";

export interface EmailItem {
  id: string;
  subject: string;
  preview: string;
  senderId: string;
  senderName?: string;
  senderAvatarUrl?: string;
  recipientId: string;
  recipientName: string;
  readAt?: string;
  deletedAt?: string;
  createdAt: string;
}

export interface EmailDetail {
  id: string;
  subject: string;
  body: string;
  senderId: string;
  senderName?: string;
  senderAvatarUrl?: string;
  recipientIds: string[];
  readAt?: string;
  deletedAt?: string;
  replyToId?: string;
  createdAt: string;
}

export interface EmailListResponse {
  data: EmailItem[];
  total: number;
  unreadCount: number;
}

export interface EmailContact {
  id: string;
  name: string;
  role: string;
  email?: string;
  branchId?: string;
  branchName?: string;
  avatarUrl?: string;
}

export interface EmailContactsResponse {
  data: EmailContact[];
  total: number;
}

export interface SendEmailInput {
  recipientIds: string[];
  subject: string;
  body: string;
  replyToId?: string;
}

export interface ListEmailsParams {
  page?: number;
  limit?: number;
  box?: EmailBox;
  includeTrashed?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────

function buildEmailQuery(params: ListEmailsParams): string {
  const searchParams = new URLSearchParams();
  if (params.page && params.page > 1) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.box) searchParams.set("box", params.box);
  if (params.includeTrashed) searchParams.set("includeTrashed", "true");
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

function invalidateEmails(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["email-list"] });
  qc.invalidateQueries({ queryKey: ["email-detail"] });
  qc.invalidateQueries({ queryKey: ["email-unread"] });
}

/**
 * Flip a message's read flag in every mounted INBOX list cache so the dot and
 * bold react instantly (the list only refetches on mutation success; a failed
 * call resyncs below). Sent rows carry no read state — they are skipped.
 */
function applyOptimisticRead(
  qc: ReturnType<typeof useQueryClient>,
  messageId: string,
  read: boolean,
) {
  for (const query of qc.getQueryCache().getAll()) {
    const key = query.queryKey;
    if (!Array.isArray(key) || key[0] !== "email-list") continue;
    const params = key[1] as ListEmailsParams | undefined;
    if (params?.box === "sent") continue;
    const current = query.state.data as EmailListResponse | undefined;
    if (!current) continue;
    const row = current.data.find((m) => m.id === messageId);
    if (!row || !!row.readAt === read) continue;
    const wasUnread = row.readAt ? 0 : 1;
    qc.setQueryData<EmailListResponse>(key, {
      ...current,
      data: current.data.map((m) =>
        m.id === messageId
          ? { ...m, readAt: read ? new Date().toISOString() : undefined }
          : m,
      ),
      unreadCount: Math.max(0, current.unreadCount - wasUnread + (read ? 0 : 1)),
    });
  }
}

// ─── Queries ─────────────────────────────────────────────

/** List emails for the current mailbox view. */
export function useEmails(params: ListEmailsParams = {}) {
  return useQuery({
    queryKey: ["email-list", params],
    queryFn: ({ signal }) =>
      api.get<EmailListResponse>(`/email${buildEmailQuery(params)}`, { signal }),
  });
}

/** Fetch a single email detail. */
export function useEmailDetail(messageId: string | null) {
  return useQuery({
    queryKey: ["email-detail", messageId],
    queryFn: ({ signal }) => api.get<EmailDetail>(`/email/${messageId}`, { signal }),
    enabled: !!messageId,
  });
}

/** Fetch the unread inbox count for the header badge + sidebar item. */
export function useEmailUnread(enabled = true) {
  return useQuery({
    queryKey: ["email-unread"],
    queryFn: ({ signal }) => api.get<{ count: number }>("/email/unread-count", { signal }),
    enabled,
  });
}

/** List selectable recipient contacts for the compose picker. */
export function useEmailContacts(
  params: { search?: string; branchId?: string; role?: string } = {}
) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.branchId) query.set("branchId", params.branchId);
  if (params.role) query.set("role", params.role);
  const qs = query.toString();
  return useQuery({
    queryKey: ["email-contacts", params],
    queryFn: ({ signal }) =>
      api.get<EmailContactsResponse>(`/email/contacts${qs ? `?${qs}` : ""}`, { signal }),
    staleTime: 30_000,
  });
}

// ─── Mutations ───────────────────────────────────────────

/** Send a new internal email. */
export function useSendEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SendEmailInput) => api.post<EmailDetail>("/email", input),
    onSuccess: () => invalidateEmails(queryClient),
  });
}

/** Mark a received email as read (optimistic — the inbox dot clears instantly). */
export function useMarkEmailRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) =>
      api.post<{ success: boolean }>(`/email/${messageId}/read`),
    onMutate: async (messageId) => {
      applyOptimisticRead(queryClient, messageId, true);
    },
    onSuccess: () => {
      invalidateEmails(queryClient);
    },
    onError: () => {
      // The optimistic flag may be wrong (offline, 4xx) — resync from the server.
      invalidateEmails(queryClient);
    },
  });
}

/** Mark a received email as unread (optimistic; reopening the detail re-marks it read). */
export function useMarkEmailUnread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) =>
      api.post<{ success: boolean }>(`/email/${messageId}/unread`),
    onMutate: async (messageId) => {
      applyOptimisticRead(queryClient, messageId, false);
    },
    onSuccess: () => invalidateEmails(queryClient),
    onError: () => invalidateEmails(queryClient),
  });
}

/** Trash (soft-delete) a message. */
export function useTrashEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) =>
      api.delete<{ success: boolean }>(`/email/${messageId}`),
    onSuccess: () => invalidateEmails(queryClient),
  });
}

/** Restore a trashed message. */
export function useRestoreEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) =>
      api.post<{ success: boolean }>(`/email/${messageId}/restore`),
    onSuccess: () => invalidateEmails(queryClient),
  });
}

/** Permanently delete a trashed message. */
export function useDeleteEmailForever() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) =>
      api.delete<{ success: boolean }>(`/email/${messageId}/permanent`),
    onSuccess: () => invalidateEmails(queryClient),
  });
}
