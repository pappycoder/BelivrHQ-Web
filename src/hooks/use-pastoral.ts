"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fetchAllPages } from "@/lib/export-all";
import { usePermissions } from "@/hooks/use-permissions";

// ─── Types ───────────────────────────────────────────────

export type ConfidentialityLevel = "standard" | "confidential" | "restricted";

export const LIFE_EVENT_TYPES = [
  "birthday",
  "wedding",
  "death",
  "dedication",
  "baptism",
  "anniversary",
  "other",
] as const;

export type LifeEventType = (typeof LIFE_EVENT_TYPES)[number];

export interface PastoralNote {
  id: string;
  churchId: string;
  memberId: string;
  memberFirstName: string;
  memberLastName: string;
  authorId: string;
  authorFirstName: string;
  authorLastName: string;
  content: string;
  confidentiality: ConfidentialityLevel;
  tags: string[];
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LifeEvent {
  id: string;
  churchId: string;
  memberId: string;
  memberFirstName: string;
  memberLastName: string;
  type: LifeEventType;
  date: string;
  details?: Record<string, unknown>;
  notified: boolean;
  archivedAt?: string;
  createdAt: string;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
}

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface RiskScore {
  id: string;
  churchId: string;
  memberId: string;
  memberFirstName: string;
  memberLastName: string;
  memberEmail?: string;
  memberPhone?: string;
  memberStatus?: string;
  score: number;
  level: RiskLevel;
  factors: Record<string, number>;
  calculatedAt: string;
}

export type EngagementBucket =
  | "highly_engaged"
  | "moderately_engaged"
  | "low_engagement"
  | "disengaged";

export interface EngagementScore {
  id: string;
  churchId: string;
  memberId: string;
  memberFirstName: string;
  memberLastName: string;
  memberEmail?: string;
  score: number;
  factors: Record<string, number>;
  calculatedAt: string;
}

export interface EngagementDistribution {
  highly_engaged: number;
  moderately_engaged: number;
  low_engagement: number;
  disengaged: number;
}

export interface MemberScoring {
  risk: {
    score: number;
    level: string;
    factors: Record<string, number>;
    calculatedAt: string;
  } | null;
  engagement: {
    score: number;
    factors: Record<string, number>;
    calculatedAt: string;
  } | null;
  suggestions: string[];
}

export interface ListPastoralNotesParams {
  page?: number;
  limit?: number;
  memberId?: string;
  confidentiality?: ConfidentialityLevel | "all";
  tags?: string[];
  sortBy?: "created_at" | "updated_at";
  sortOrder?: "asc" | "desc";
  archived?: boolean;
}

export interface ListLifeEventsParams {
  page?: number;
  limit?: number;
  memberId?: string;
  type?: LifeEventType | "all";
  upcoming?: "true" | "false";
  sortBy?: "date" | "created_at";
  sortOrder?: "asc" | "desc";
  archived?: boolean;
}

export interface ListRiskScoresParams {
  page?: number;
  limit?: number;
  search?: string;
  level?: RiskLevel | "all";
  sortBy?: "score" | "calculated_at";
  sortOrder?: "asc" | "desc";
}

export interface ListEngagementScoresParams {
  page?: number;
  limit?: number;
  search?: string;
  bucket?: EngagementBucket | "all";
  sortBy?: "score" | "calculated_at";
  sortOrder?: "asc" | "desc";
}

export interface CreatePastoralNoteInput {
  memberId: string;
  content: string;
  confidentiality: ConfidentialityLevel;
  tags?: string[];
}

export interface UpdatePastoralNoteInput {
  content?: string;
  confidentiality?: ConfidentialityLevel;
  tags?: string[];
}

export interface CreateLifeEventInput {
  memberId: string;
  type: LifeEventType;
  date: string;
  details?: Record<string, unknown>;
}

// ─── Display maps ─────────────────────────────────────────

export const CONFIDENTIALITY_LABELS: Record<ConfidentialityLevel, string> = {
  standard: "Standard",
  confidential: "Confidential",
  restricted: "Restricted",
};

export const CONFIDENTIALITY_TEXT: Record<ConfidentialityLevel, string> = {
  standard: "text-slate-600",
  confidential: "text-amber-600",
  restricted: "text-red-600",
};

export const LIFE_EVENT_TYPE_LABELS: Record<LifeEventType, string> = {
  birthday: "Birthday",
  wedding: "Wedding",
  death: "Death / Memorial",
  dedication: "Child Dedication",
  baptism: "Baptism",
  anniversary: "Anniversary",
  other: "Other",
};

export const LIFE_EVENT_TYPE_TEXT: Record<LifeEventType, string> = {
  birthday: "text-sky-600",
  wedding: "text-pink-600",
  death: "text-slate-600",
  dedication: "text-emerald-600",
  baptism: "text-indigo-600",
  anniversary: "text-amber-600",
  other: "text-gray-600",
};

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const RISK_LEVEL_TEXT: Record<RiskLevel, string> = {
  low: "text-emerald-600",
  medium: "text-yellow-600",
  high: "text-orange-600",
  critical: "text-red-600",
};

export const RISK_FACTOR_LABELS: Record<string, string> = {
  attendanceDecline: "Attendance decline",
  noGiving: "No giving",
  noCommunication: "No communication",
  inactiveStatus: "Inactive status",
  recentInactivity: "Recent inactivity",
};

export const ENGAGEMENT_BUCKET_LABELS: Record<EngagementBucket, string> = {
  highly_engaged: "Highly Engaged",
  moderately_engaged: "Moderately Engaged",
  low_engagement: "Low Engagement",
  disengaged: "Disengaged",
};

export const ENGAGEMENT_BUCKET_TEXT: Record<EngagementBucket, string> = {
  highly_engaged: "text-emerald-600",
  moderately_engaged: "text-sky-600",
  low_engagement: "text-yellow-600",
  disengaged: "text-red-600",
};

export const ENGAGEMENT_FACTOR_LABELS: Record<string, string> = {
  attendance: "Attendance",
  giving: "Giving",
  events: "Events",
  communication: "Communication",
  consistency: "Consistency",
};

const RISK_BUCKET_ORDER: RiskLevel[] = ["critical", "high", "medium", "low"];

export function engagementBucketFor(score: number): EngagementBucket {
  if (score >= 70) return "highly_engaged";
  if (score >= 40) return "moderately_engaged";
  if (score >= 20) return "low_engagement";
  return "disengaged";
}

export function orderedRiskLevels(): RiskLevel[] {
  return RISK_BUCKET_ORDER;
}

// ─── Helpers ─────────────────────────────────────────────

function buildQuery(params: object): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      if (Array.isArray(value)) {
        value.forEach((item) => searchParams.append(key, String(item)));
      } else {
        searchParams.set(key, String(value));
      }
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

function invalidatePastoralCaches(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["pastoral-notes"] });
  qc.invalidateQueries({ queryKey: ["pastoral-life-events"] });
  qc.invalidateQueries({ queryKey: ["pastoral-risk-scores"] });
  qc.invalidateQueries({ queryKey: ["pastoral-engagement"] });
  qc.invalidateQueries({ queryKey: ["pastoral-member-scoring"] });
}

// ─── Notes ───────────────────────────────────────────────

export function usePastoralNotes(params: ListPastoralNotesParams = {}) {
  return useQuery({
    queryKey: ["pastoral-notes", params],
    queryFn: ({ signal }) => api.get<PaginatedResponse<PastoralNote>>(`/pastoral/notes${buildQuery(params)}`, { signal }),
  });
}

export function useCreatePastoralNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePastoralNoteInput) => api.post<PastoralNote>("/pastoral/notes", input),
    onSuccess: () => invalidatePastoralCaches(qc),
  });
}

export function useUpdatePastoralNote(noteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdatePastoralNoteInput) =>
      api.patch<PastoralNote>(`/pastoral/notes/${noteId}`, input),
    onSuccess: () => invalidatePastoralCaches(qc),
  });
}

export function useDeletePastoralNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => api.delete<void>(`/pastoral/notes/${noteId}`),
    onSuccess: () => invalidatePastoralCaches(qc),
  });
}

export function useArchivePastoralNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => api.post<PastoralNote>(`/pastoral/notes/${noteId}/archive`, {}),
    onSuccess: () => invalidatePastoralCaches(qc),
  });
}

export function useRestorePastoralNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => api.post<PastoralNote>(`/pastoral/notes/${noteId}/restore`, {}),
    onSuccess: () => invalidatePastoralCaches(qc),
  });
}

// ─── Life events ─────────────────────────────────────────

export function useLifeEvents(params: ListLifeEventsParams = {}) {
  return useQuery({
    queryKey: ["pastoral-life-events", params],
    queryFn: ({ signal }) =>
      api.get<PaginatedResponse<LifeEvent>>(`/pastoral/life-events${buildQuery(params)}`, { signal }),
  });
}

export function useCreateLifeEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLifeEventInput) =>
      api.post<LifeEvent>("/pastoral/life-events", input),
    onSuccess: () => invalidatePastoralCaches(qc),
  });
}

export function useDeleteLifeEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => api.delete<void>(`/pastoral/life-events/${eventId}`),
    onSuccess: () => invalidatePastoralCaches(qc),
  });
}

export function useArchiveLifeEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) =>
      api.post<LifeEvent>(`/pastoral/life-events/${eventId}/archive`, {}),
    onSuccess: () => invalidatePastoralCaches(qc),
  });
}

export function useRestoreLifeEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) =>
      api.post<LifeEvent>(`/pastoral/life-events/${eventId}/restore`, {}),
    onSuccess: () => invalidatePastoralCaches(qc),
  });
}

// ─── Risk & engagement scoring ───────────────────────────

export function useRiskScores(params: ListRiskScoresParams = {}) {
  return useQuery({
    queryKey: ["pastoral-risk-scores", params],
    queryFn: ({ signal }) =>
      api.get<PaginatedResponse<RiskScore>>(`/pastoral/risk-scores${buildQuery(params)}`, { signal }),
  });
}

/** Complete readable collection for the radar's client-side counts and filters. */
export function useRiskScoresAll(params: Omit<ListRiskScoresParams, "page" | "limit"> = {}) {
  const { can } = usePermissions();
  return useQuery({
    queryKey: ["pastoral-risk-scores", "all", params],
    enabled: can("pastoral:risk-scores", "read"),
    queryFn: ({ signal }) => fetchAllPages<RiskScore>((page) =>
      api.get<PaginatedResponse<RiskScore>>(
        `/pastoral/risk-scores${buildQuery({ ...params, page, limit: 100 })}`,
        { signal },
      ),
    ),
  });
}

export function useEngagementScores(params: ListEngagementScoresParams = {}) {
  return useQuery({
    queryKey: ["pastoral-engagement", params],
    queryFn: ({ signal }) =>
      api.get<PaginatedResponse<EngagementScore>>(
        `/pastoral/engagement-scores${buildQuery(params)}`, { signal }
      ),
  });
}

export function useEngagementDistribution() {
  return useQuery({
    queryKey: ["pastoral-engagement-distribution"],
    queryFn: ({ signal }) => api.get<EngagementDistribution>("/pastoral/engagement/summary", { signal }),
  });
}

export function useMemberScoring(memberId: string) {
  return useQuery({
    queryKey: ["pastoral-member-scoring", memberId],
    queryFn: ({ signal }) => api.get<MemberScoring>(`/pastoral/members/${memberId}/scoring`, { signal }),
    enabled: !!memberId,
  });
}

export function useRecalculateScores() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<{ engagementScored: number; riskScored: number }>(
        "/admin/dashboard/recalculate-scores",
        {}
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pastoral-risk-scores"] });
      qc.invalidateQueries({ queryKey: ["pastoral-engagement"] });
      qc.invalidateQueries({ queryKey: ["pastoral-engagement-distribution"] });
      qc.invalidateQueries({ queryKey: ["pastoral-member-scoring"] });
    },
  });
}