"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface FamilyMemberInfo {
  id: string;
  memberId: string;
  firstName: string;
  lastName: string;
  relationship: string;
  isHead: boolean;
}

export interface Family {
  familyId: string;
  churchId: string;
  name: string;
  headId?: string;
  members: FamilyMemberInfo[];
  archivedAt?: string;
  createdAt: string;
}

/** Shape returned by GET /families (`{ data, meta }`). */
export interface FamilyListResponse {
  data: Family[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ListFamiliesParams {
  page?: number;
  limit?: number;
  search?: string;
  archived?: boolean;
  branchId?: string;
  sortBy?: "name" | "createdAt" | "memberCount";
  sortOrder?: "asc" | "desc";
}

export interface CreateFamilyInput {
  name: string;
  headId?: string;
  branchId?: string;
}

export type UpdateFamilyInput = Partial<CreateFamilyInput>;

export interface AddFamilyMemberInput {
  memberId: string;
  relationship: string;
  isHead?: boolean;
}

function buildListPath(params: ListFamiliesParams): string {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.search) searchParams.set("search", params.search);
  if (params.archived) searchParams.set("archived", "true");
  if (params.branchId) searchParams.set("branchId", params.branchId);
  if (params.sortBy) searchParams.set("sortBy", params.sortBy);
  if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder);
  const queryString = searchParams.toString();
  return `/families${queryString ? `?${queryString}` : ""}`;
}

function invalidateFamilyCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  familyId?: string
) {
  queryClient.invalidateQueries({ queryKey: ["families-list"] });
  queryClient.invalidateQueries({ queryKey: ["family"] });
  if (familyId) queryClient.removeQueries({ queryKey: ["family", familyId] });
}

export function useFamiliesList(params: ListFamiliesParams = {}) {
  return useQuery({
    queryKey: ["families-list", params],
    queryFn: ({ signal }) => api.get<FamilyListResponse>(buildListPath(params), { signal }),
  });
}

export function useFamily(familyId: string) {
  return useQuery({
    queryKey: ["family", familyId],
    queryFn: ({ signal }) => api.get<Family>(`/families/${familyId}`, { signal }),
    enabled: !!familyId,
  });
}

export function useCreateFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFamilyInput) => api.post<Family>("/families", input),
    onSuccess: () => invalidateFamilyCaches(queryClient),
  });
}

export function useUpdateFamily(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateFamilyInput) =>
      api.patch<Family>(`/families/${familyId}`, input),
    onSuccess: () => invalidateFamilyCaches(queryClient, familyId),
  });
}

export function useDeleteFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (familyId: string) =>
      api.delete<{ success: boolean }>(`/families/${familyId}`),
    onSuccess: (_data, familyId) => invalidateFamilyCaches(queryClient, familyId),
  });
}

export function useArchiveFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (familyId: string) =>
      api.post<Family>(`/families/${familyId}/archive`, {}),
    onSuccess: () => invalidateFamilyCaches(queryClient),
  });
}

export function useRestoreArchiveFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (familyId: string) =>
      api.post<Family>(`/families/${familyId}/restore`, {}),
    onSuccess: () => invalidateFamilyCaches(queryClient),
  });
}

export function useAddFamilyMember(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddFamilyMemberInput) =>
      api.post<Family>(`/families/${familyId}/members`, input),
    onSuccess: () => invalidateFamilyCaches(queryClient, familyId),
  });
}

export function useRemoveFamilyMember(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) =>
      api.delete<Family>(`/families/${familyId}/members/${memberId}`),
    onSuccess: () => invalidateFamilyCaches(queryClient, familyId),
  });
}
