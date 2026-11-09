"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/use-permissions";
import { api } from "@/lib/api";
import { getToastErrorMessage } from "@/lib/toast";

// ─── Types ───────────────────────────────────────────────

export const FORM_STATUSES = ["draft", "published", "closed"] as const;
export type FormStatus = (typeof FORM_STATUSES)[number];

export const SUBMISSION_STATUSES = ["pending", "approved", "rejected"] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "date",
  "dropdown",
  "checkbox",
  "email",
  "phone",
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Text",
  textarea: "Text Area",
  number: "Number",
  date: "Date",
  dropdown: "Dropdown",
  checkbox: "Checkbox",
  email: "Email",
  phone: "Phone",
};

export const FORM_STATUS_LABELS: Record<FormStatus, string> = {
  draft: "Draft",
  published: "Published",
  closed: "Closed",
};

export const FORM_STATUS_TEXT: Record<FormStatus, string> = {
  draft: "text-yellow-600",
  published: "text-emerald-600",
  closed: "text-slate-500",
};

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export const SUBMISSION_STATUS_TEXT: Record<SubmissionStatus, string> = {
  pending: "text-yellow-600",
  approved: "text-emerald-600",
  rejected: "text-red-600",
};

export interface FormFieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
}

export interface FormField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  validation?: FormFieldValidation;
}

export interface Form {
  churchName?: string;
  churchLogoUrl?: string | null;
  branchName?: string;
  branchId?: string;
  id: string;
  churchId: string;
  title: string;
  description?: string;
  fields: FormField[];
  status: FormStatus;
  isTemplate: boolean;
  isPublic: boolean;
  publicToken?: string;
  uniqueField?: string;
  submissionLimit: number;
  submissionCount: number;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionAttachment {
  assetId: string;
  url: string;
  filename: string;
  mimeType: string;
}

export interface FormSubmission {
  id: string;
  formId: string;
  churchId: string;
  data: Record<string, unknown>;
  submittedBy?: string;
  status: SubmissionStatus;
  approvedById?: string;
  approvedAt?: string;
  rejectionReason?: string;
  attachments: SubmissionAttachment[];
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

export interface ListFormsParams {
  status?: FormStatus;
  isTemplate?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  archived?: boolean;
  branchId?: string;
  sortBy?: 'title' | 'createdAt' | 'updatedAt' | 'submissionCount';
  sortOrder?: 'asc' | 'desc';
}

export interface ListSubmissionsParams {
  sortBy?: "createdAt" | "status" | "id";
  source?: "public" | "member";
  status?: SubmissionStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateFormInput {
  branchId?: string;
  title: string;
  description?: string;
  fields: FormField[];
  status?: FormStatus;
  isTemplate?: boolean;
  isPublic?: boolean;
  uniqueField?: string;
  submissionLimit?: number;
}

export type UpdateFormInput = Partial<CreateFormInput>;

export interface CreateSubmissionInput {
  data: Record<string, unknown>;
  attachmentAssetIds?: string[];
}

export interface UpdateSubmissionStatusInput {
  status: SubmissionStatus;
  rejectionReason?: string;
}

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

function invalidateFormCaches(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["forms-list"] });
  qc.invalidateQueries({ queryKey: ["form"] });
  qc.invalidateQueries({ queryKey: ["form-submissions"] });
}

// ─── Queries ─────────────────────────────────────────────

export function useFormsList(params: ListFormsParams = {}) {
  return useQuery({
    queryKey: ["forms-list", params],
    queryFn: ({ signal }) =>
      api.get<PaginatedResponse<Form>>(`/forms${buildQuery(params)}`, { signal }),
  });
}

export function useForm(formId: string | undefined) {
  return useQuery({
    queryKey: ["form", formId],
    queryFn: ({ signal }) => api.get<Form>(`/forms/${formId}`, { signal }),
    enabled: !!formId,
  });
}

export function useFormSubmissions(formId: string | undefined, params: ListSubmissionsParams = {}) {
  const { can } = usePermissions();
  return useQuery({
    queryKey: ["form-submissions", formId, params],
    queryFn: ({ signal }) =>
      api.get<PaginatedResponse<FormSubmission>>(
        `/forms/${formId}/submissions${buildQuery(params)}`,
        { signal },
      ),
    enabled: !!formId && can("forms:submissions", "read"),
  });
}

export function useFormSubmission(formId: string | undefined, submissionId: string | undefined) {
  return useQuery({
    queryKey: ["form-submission", formId, submissionId],
    queryFn: ({ signal }) =>
      api.get<FormSubmission>(`/forms/${formId}/submissions/${submissionId}`, { signal }),
    enabled: !!formId && !!submissionId,
  });
}

// ─── Mutations ───────────────────────────────────────────

export function useCreateForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFormInput) => api.post<Form>("/forms", input),
    onSuccess: () => invalidateFormCaches(qc),
  });
}

export function useUpdateForm(formId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateFormInput) => api.patch<Form>(`/forms/${formId}`, input),
    onSuccess: () => invalidateFormCaches(qc),
  });
}

export function useDeleteForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formId: string) => api.delete<void>(`/forms/${formId}`),
    onSuccess: () => invalidateFormCaches(qc),
  });
}

export function useArchiveForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formId: string) => api.post<Form>(`/forms/${formId}/archive`, {}),
    onSuccess: () => invalidateFormCaches(qc),
  });
}

export function useRestoreForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formId: string) => api.post<Form>(`/forms/${formId}/restore`, {}),
    onSuccess: () => invalidateFormCaches(qc),
  });
}

export function useCloneForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formId: string) => api.post<Form>(`/forms/${formId}/clone`, {}),
    onSuccess: () => invalidateFormCaches(qc),
  });
}

export function useRegenerateLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formId: string) => api.post<Form>(`/forms/${formId}/regenerate-link`, {}),
    onSuccess: () => invalidateFormCaches(qc),
  });
}

export function useSubmitForm(formId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSubmissionInput) =>
      api.post<FormSubmission>(`/forms/${formId}/submit`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["form-submissions"] });
    },
  });
}

export function useSubmitFormPublic(publicToken: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSubmissionInput) =>
      api.post<FormSubmission>(`/forms/public/${publicToken}/submit`, input, { skipAuth: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["form-submissions"] });
    },
  });
}

export function useCloseForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formId: string) => api.post<Form>(`/forms/${formId}/close`, {}),
    onSuccess: () => invalidateFormCaches(qc),
  });
}

export function useReopenForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formId: string) => api.post<Form>(`/forms/${formId}/reopen`, {}),
    onSuccess: () => invalidateFormCaches(qc),
  });
}

export function useUpdateSubmissionStatus(formId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      submissionId,
      input,
    }: {
      submissionId: string;
      input: UpdateSubmissionStatusInput;
    }) => api.patch<FormSubmission>(`/forms/${formId}/submissions/${submissionId}/status`, input),
    onSuccess: () => invalidateFormCaches(qc),
  });
}

// ─── Helpers ─────────────────────────────────────────────

export function makeFieldKey(label: string): string {
  const slug = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || `field_${Date.now()}`;
}

/** Review selected pending responses through the existing permission-checked endpoint. */
export function useBulkReviewSubmissions(formId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ids,
      status,
      rejectionReason,
    }: {
      ids: string[];
      status: "approved" | "rejected";
      rejectionReason?: string;
    }) => {
      const unique = [...new Set(ids)];
      if (!formId || !unique.length || unique.length > 100)
        throw new Error("Select between 1 and 100 responses.");
      if (status === "rejected" && !rejectionReason?.trim())
        throw new Error("A rejection reason is required.");
      const succeeded: string[] = [];
      const failed: { id: string; message: string }[] = [];
      for (let start = 0; start < unique.length; start += 3) {
        const batch = unique.slice(start, start + 3);
        const results = await Promise.allSettled(
          batch.map((id) =>
            api.patch(`/forms/${formId}/submissions/${id}/status`, {
              status,
              ...(status === "rejected" ? { rejectionReason: rejectionReason!.trim() } : {}),
            }),
          ),
        );
        results.forEach((result, index) => {
          if (result.status === "fulfilled") succeeded.push(batch[index]);
          else
            failed.push({
              id: batch[index],
              message: getToastErrorMessage(result.reason, "This response could not be updated."),
            });
        });
      }
      return { succeeded, failed };
    },
    onSuccess: () => invalidateFormCaches(qc),
  });
}
