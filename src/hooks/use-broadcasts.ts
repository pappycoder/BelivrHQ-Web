"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────

export type BroadcastChannel = "whatsapp" | "sms" | "email";
export type BroadcastStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "cancelled"
  | "failed";
export type MemberStatus = "active" | "inactive" | "suspended" | "transferred";

export interface BroadcastAudienceFilter {
  status?: MemberStatus;
  branchId?: string;
  gender?: "male" | "female";
  search?: string;
}

export interface Broadcast {
  branchId?: string;
  branchName?: string;
  broadcastId: string;
  churchId: string;
  name: string;
  templateId: string;
  templateName: string;
  channel: BroadcastChannel;
  status: BroadcastStatus;
  scheduledAt?: string;
  sentAt?: string;
  totalRecipients: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BroadcastListResponse {
  data: Broadcast[];
  meta: PaginatedMeta;
}

export interface ListBroadcastsParams {
  sortBy?: 'name' | 'createdAt' | 'scheduledAt' | 'sentAt' | 'totalRecipients' | 'channel' | 'status';
  sortOrder?: 'asc' | 'desc';
  branchId?: string;
  page?: number;
  limit?: number;
  status?: BroadcastStatus;
  channel?: BroadcastChannel;
  search?: string;
}

export interface CreateBroadcastInput {
  branchId?: string;
  name: string;
  templateId: string;
  channel: BroadcastChannel;
  audienceFilter?: BroadcastAudienceFilter;
  scheduledAt?: string;
}

export const BROADCAST_CHANNELS: BroadcastChannel[] = ["whatsapp", "sms", "email"];

export const BROADCAST_CHANNEL_LABELS: Record<BroadcastChannel, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
};

export const BROADCAST_CHANNEL_TEXT: Record<BroadcastChannel, string> = {
  whatsapp: "text-emerald-600",
  sms: "text-sky-600",
  email: "text-amber-600",
};

export const BROADCAST_STATUS_LABELS: Record<BroadcastStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  sending: "Sending",
  sent: "Sent",
  cancelled: "Cancelled",
  failed: "Failed",
};

export const BROADCAST_STATUS_TEXT: Record<BroadcastStatus, string> = {
  draft: "text-slate-500",
  scheduled: "text-blue-600",
  sending: "text-amber-600",
  sent: "text-emerald-600",
  cancelled: "text-red-600",
  failed: "text-red-600",
};

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  suspended: "Suspended",
  transferred: "Transferred",
};

// ─── Helpers ─────────────────────────────────────────────

function buildQuery(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

function invalidateBroadcastCaches(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["broadcasts-list"] });
  qc.invalidateQueries({ queryKey: ["broadcasts-detail"] });
  qc.invalidateQueries({ queryKey: ["broadcasts-stats"] });
}

// ─── Queries ─────────────────────────────────────────────

export function useBroadcastsList(params: ListBroadcastsParams = {}) {
  return useQuery({
    queryKey: ["broadcasts-list", params],
    queryFn: ({ signal }) =>
      api.get<BroadcastListResponse>(`/broadcasts${buildQuery({ ...params })}`, { signal }),
  });
}

export function useBroadcast(broadcastId: string) {
  return useQuery({
    queryKey: ["broadcasts-detail", broadcastId],
    queryFn: ({ signal }) => api.get<Broadcast>(`/broadcasts/${broadcastId}`, { signal }),
    enabled: !!broadcastId,
  });
}

// ─── Mutations ───────────────────────────────────────────

export function useCreateBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBroadcastInput) =>
      api.post<Broadcast>("/broadcasts", input),
    onSuccess: () => invalidateBroadcastCaches(qc),
  });
}

export function useCancelBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (broadcastId: string) =>
      api.patch<{ success: boolean }>(`/broadcasts/${broadcastId}/cancel`, {}),
    onSuccess: () => invalidateBroadcastCaches(qc),
  });
}

export function useUpdateBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ broadcastId, branchId }: { broadcastId: string; branchId: string }) =>
      api.patch<Broadcast>(`/broadcasts/${broadcastId}`, { branchId }),
    onSuccess: () => invalidateBroadcastCaches(qc),
  });
}
