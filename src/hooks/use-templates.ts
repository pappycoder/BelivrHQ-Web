"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────

export type TemplateChannel = "whatsapp" | "sms" | "email";
export type TemplateStatus = "draft" | "published" | "archived";
export type TemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION";

export interface Template {
  branchName?: string;
  branchId?: string;
  templateId: string;
  churchId: string;
  name: string;
  content: string;
  channel: TemplateChannel;
  language?: string;
  status: TemplateStatus;
  category?: TemplateCategory;
  variables?: string[];
  externalId?: string;
  externalStatus?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TemplateListResponse {
  data: Template[];
  meta: PaginatedMeta;
}

export interface ListTemplatesParams {
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'channel' | 'status';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  channel?: TemplateChannel;
  status?: "draft" | "published";
  search?: string;
  archived?: boolean;
  branchId?: string;
}

export interface CreateTemplateInput {
  branchId?: string;
  name: string;
  content: string;
  channel: TemplateChannel;
  language?: string;
  category?: TemplateCategory;
  variables?: string[];
  status?: "draft" | "published";
  externalId?: string;
}

export type UpdateTemplateInput = Partial<CreateTemplateInput>;

export const TEMPLATE_CHANNELS: TemplateChannel[] = ["whatsapp", "sms", "email"];

export const TEMPLATE_CHANNEL_LABELS: Record<TemplateChannel, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
};

export const TEMPLATE_CHANNEL_TEXT: Record<TemplateChannel, string> = {
  whatsapp: "text-emerald-600",
  sms: "text-sky-600",
  email: "text-amber-600",
};

export const TEMPLATE_STATUS_LABELS: Record<TemplateStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

export const TEMPLATE_STATUS_TEXT: Record<TemplateStatus, string> = {
  draft: "text-yellow-600",
  published: "text-emerald-600",
  archived: "text-slate-500",
};

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  MARKETING: "Marketing",
  UTILITY: "Utility",
  AUTHENTICATION: "Authentication",
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

function invalidateTemplateCaches(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["templates-list"] });
  qc.invalidateQueries({ queryKey: ["templates-detail"] });
}

// ─── Queries ─────────────────────────────────────────────

export function useTemplatesList(params: ListTemplatesParams = {}) {
  return useQuery({
    queryKey: ["templates-list", params],
    queryFn: ({ signal }) =>
      api.get<TemplateListResponse>(`/templates${buildQuery({ ...params })}`, { signal }),
  });
}

export function useTemplate(templateId: string) {
  return useQuery({
    queryKey: ["templates-detail", templateId],
    queryFn: ({ signal }) => api.get<Template>(`/templates/${templateId}`, { signal }),
    enabled: !!templateId,
  });
}

// ─── Mutations ───────────────────────────────────────────

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTemplateInput) =>
      api.post<Template>("/templates", input),
    onSuccess: () => invalidateTemplateCaches(qc),
  });
}

export function useUpdateTemplate(templateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTemplateInput) =>
      api.patch<Template>(`/templates/${templateId}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates-detail", templateId] });
      invalidateTemplateCaches(qc);
    },
  });
}

export function usePublishTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) =>
      api.post<Template>(`/templates/${templateId}/publish`, {}),
    onSuccess: () => invalidateTemplateCaches(qc),
  });
}

export function useArchiveTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) =>
      api.post<{ success: boolean }>(`/templates/${templateId}/archive`, {}),
    onSuccess: () => invalidateTemplateCaches(qc),
  });
}

export function useRestoreTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) =>
      api.post<{ success: boolean }>(`/templates/${templateId}/restore`, {}),
    onSuccess: () => invalidateTemplateCaches(qc),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) =>
      api.delete<{ success: boolean }>(`/templates/${templateId}`),
    onSuccess: () => invalidateTemplateCaches(qc),
  });
}
