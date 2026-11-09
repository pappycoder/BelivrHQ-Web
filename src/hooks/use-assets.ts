"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/use-permissions";
import { api } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────

export type AssetStatus = "active" | "maintenance" | "retired" | "lost" | "disposed";
export type AssetCondition = "new" | "good" | "fair" | "poor" | "damaged";
export type DepreciationMethod = "straight_line" | "reducing_balance";
export type MaintenanceStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
export type AssetLoanStatus = "borrowed" | "returned" | "overdue";

export interface Asset {
  id: string;
  churchId: string;
  assetTag: string;
  name: string;
  description?: string;
  imageUrl?: string;
  categoryId?: string;
  categoryName?: string;
  serialNumber?: string;
  brand?: string;
  model?: string;
  departmentId?: string;
  departmentName?: string;
  branchId?: string;
  branchName?: string;
  custodianId?: string;
  custodianName?: string;
  condition: AssetCondition;
  status: AssetStatus;
  purchaseDate?: string;
  purchasePrice?: number;
  salvageValue: number;
  usefulLifeYears?: number;
  depreciationMethod: DepreciationMethod;
  currentValue?: number;
  location?: string;
  qrCode?: string;
  notes?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssetCategory {
  id: string;
  churchId: string;
  name: string;
  description?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssetMaintenance {
  id: string;
  assetId: string;
  type: string;
  description?: string;
  status: MaintenanceStatus;
  scheduledDate: string;
  completedDate?: string;
  cost?: number;
  performedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssetLoan {
  id: string;
  assetId: string;
  borrowerMemberId?: string;
  borrowerName?: string;
  loanDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  status: AssetLoanStatus;
  conditionBefore?: AssetCondition;
  conditionAfter?: AssetCondition;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QrData {
  assetId: string;
  qrData: string;
}

export interface DepreciationEntry {
  id: string;
  assetId: string;
  year: number;
  openingValue: number;
  depreciationAmount: number;
  closingValue: number;
  createdAt: string;
}

export interface DepreciationSummary {
  assetId: string;
  purchasePrice: number;
  totalDepreciation: number;
  currentValue: number;
  entries: DepreciationEntry[];
}

export interface AssetsListParams {
  page?: number;
  limit?: number;
  status?: AssetStatus;
  condition?: AssetCondition;
  categoryId?: string;
  branchId?: string;
  departmentId?: string;
  search?: string;
  archived?: boolean;
}

export interface AssetsListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AssetsListResponse {
  data: Asset[];
  meta: AssetsListMeta;
}

/** Shape returned by GET /assets/stats (AssetSummaryResponseDto). */
export interface AssetSummary {
  totalAssets: number;
  totalPurchaseValue: number;
  totalCurrentValue: number;
}

export interface CreateAssetInput {
  assetTag: string;
  name: string;
  description?: string;
  imageUrl?: string;
  categoryId?: string;
  serialNumber?: string;
  brand?: string;
  model?: string;
  departmentId?: string;
  branchId?: string;
  custodianId?: string;
  condition?: AssetCondition;
  status?: AssetStatus;
  purchaseDate?: string;
  purchasePrice?: number;
  salvageValue?: number;
  usefulLifeYears?: number;
  depreciationMethod?: DepreciationMethod;
  currentValue?: number;
  location?: string;
  notes?: string;
}

export type UpdateAssetInput = Partial<CreateAssetInput>;

export interface CreateAssetCategoryInput {
  name: string;
  description?: string;
}

export type UpdateAssetCategoryInput = Partial<CreateAssetCategoryInput>;

export interface CreateMaintenanceInput {
  type: string;
  scheduledDate: string;
  description?: string;
  status?: MaintenanceStatus;
  completedDate?: string;
  cost?: number;
  performedBy?: string;
  notes?: string;
}

export type UpdateMaintenanceInput = CreateMaintenanceInput;

export interface CreateLoanInput {
  expectedReturnDate: string;
  borrowerMemberId?: string;
  borrowedByName?: string;
  conditionBefore?: AssetCondition;
  notes?: string;
}

export interface ReturnLoanInput {
  actualReturnDate?: string;
  conditionAfter?: AssetCondition;
  notes?: string;
}

// ─── Display maps ────────────────────────────────────────

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  active: "Active",
  maintenance: "In Maintenance",
  retired: "Retired",
  lost: "Lost",
  disposed: "Disposed",
};

export const ASSET_STATUS_STYLES: Record<AssetStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  maintenance: "bg-amber-50 text-amber-700 border-amber-200",
  retired: "bg-slate-100 text-slate-600 border-slate-200",
  lost: "bg-red-50 text-red-700 border-red-200",
  disposed: "bg-slate-100 text-slate-500 border-slate-200",
};

export const ASSET_CONDITION_LABELS: Record<AssetCondition, string> = {
  new: "New",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  damaged: "Damaged",
};

export const ASSET_CONDITION_STYLES: Record<AssetCondition, string> = {
  new: "bg-emerald-50 text-emerald-700 border-emerald-200",
  good: "bg-green-50 text-green-700 border-green-200",
  fair: "bg-amber-50 text-amber-700 border-amber-200",
  poor: "bg-orange-50 text-orange-700 border-orange-200",
  damaged: "bg-red-50 text-red-700 border-red-200",
};

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const MAINTENANCE_STATUS_STYLES: Record<MaintenanceStatus, string> = {
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
};

export const LOAN_STATUS_LABELS: Record<AssetLoanStatus, string> = {
  borrowed: "Borrowed",
  returned: "Returned",
  overdue: "Overdue",
};

export const LOAN_STATUS_STYLES: Record<AssetLoanStatus, string> = {
  borrowed: "bg-blue-50 text-blue-700 border-blue-200",
  returned: "bg-emerald-50 text-emerald-700 border-emerald-200",
  overdue: "bg-red-50 text-red-700 border-red-200",
};

export const DEPRECIATION_METHOD_LABELS: Record<DepreciationMethod, string> = {
  straight_line: "Straight Line",
  reducing_balance: "Reducing Balance",
};

// ─── Helpers ─────────────────────────────────────────────

function buildQuery(params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null) return "Not available";
  const formatted = value.toLocaleString("en-NG", { maximumFractionDigits: 0 });
  const prefix = formatted.startsWith("-") ? "-₦" : "₦";
  return `${prefix}${formatted.replace(/^-/, "")}`;
}

// ─── Queries ─────────────────────────────────────────────

export function useAssetsList(params: AssetsListParams = {}) {
  const query = buildQuery({
    page: params.page,
    limit: params.limit,
    status: params.status,
    condition: params.condition,
    categoryId: params.categoryId,
    branchId: params.branchId,
    departmentId: params.departmentId,
    search: params.search,
    archived: params.archived ? "true" : undefined,
  });
  return useQuery({
    queryKey: ["assets-list", params],
    queryFn: ({ signal }) => api.get<AssetsListResponse>(`/assets${query}`, { signal }),
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useAsset(assetId: string | undefined) {
  return useQuery({
    queryKey: ["assets", assetId],
    queryFn: ({ signal }) => api.get<Asset>(`/assets/${assetId}`, { signal }),
    enabled: Boolean(assetId),
    staleTime: 60 * 1000,
  });
}

export function useAssetStats(branchId?: string) {
  return useQuery({
    queryKey: ["assets-stats", branchId],
    queryFn: ({ signal }) => api.get<AssetSummary>(`/assets/stats${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ""}`, { signal }),
    staleTime: 60 * 1000,
  });
}

export function useAssetCategories(archived?: boolean) {
  const { can } = usePermissions();
  return useQuery({
    enabled: can("assets:categories", "read"),
    queryKey: ["assets-categories", archived ?? false],
    queryFn: ({ signal }) =>
      api.get<AssetCategory[]>(`/assets/categories${archived ? "?archived=true" : ""}`, { signal }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAssetMaintenance(assetId: string | undefined) {
  return useQuery({
    queryKey: ["assets", assetId, "maintenance"],
    queryFn: ({ signal }) => api.get<AssetMaintenance[]>(`/assets/${assetId}/maintenance`, { signal }),
    enabled: Boolean(assetId),
    staleTime: 60 * 1000,
  });
}

export function useAssetLoans(assetId: string | undefined) {
  return useQuery({
    queryKey: ["assets", assetId, "loans"],
    queryFn: ({ signal }) => api.get<AssetLoan[]>(`/assets/${assetId}/loans`, { signal }),
    enabled: Boolean(assetId),
    staleTime: 60 * 1000,
  });
}

export function useAssetDepreciationSummary(assetId: string | undefined) {
  return useQuery({
    queryKey: ["assets", assetId, "depreciation"],
    queryFn: ({ signal }) => api.get<DepreciationSummary>(`/assets/${assetId}/depreciation/summary`, { signal }),
    enabled: Boolean(assetId),
    staleTime: 60 * 1000,
  });
}

export function useAssetQr(assetId: string | undefined) {
  return useQuery({
    queryKey: ["assets", assetId, "qr"],
    queryFn: ({ signal }) => api.get<QrData>(`/assets/${assetId}/qr`, { signal }),
    enabled: Boolean(assetId),
    staleTime: 60 * 1000,
  });
}

// ─── Mutations ───────────────────────────────────────────

function invalidateAssetQueries(client: ReturnType<typeof useQueryClient>) {
  client.invalidateQueries({ queryKey: ["assets-worklist"] });
  client.invalidateQueries({ queryKey: ["assets-list"] });
  client.invalidateQueries({ queryKey: ["assets-categories"] });
  client.invalidateQueries({ queryKey: ["assets-stats"] });
  client.invalidateQueries({ queryKey: ["assets"] });
}

export function useCreateAsset() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAssetInput) => api.post<Asset>("/assets", input),
    onSuccess: () => invalidateAssetQueries(client),
  });
}

export function useUpdateAsset(assetId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateAssetInput) => api.patch<Asset>(`/assets/${assetId}`, input),
    onSuccess: () => invalidateAssetQueries(client),
  });
}

export function useDeleteAsset() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (assetId: string) => api.delete<{ success: boolean }>(`/assets/${assetId}`),
    onSuccess: () => invalidateAssetQueries(client),
  });
}

export function useArchiveAsset() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (assetId: string) => api.post<Asset>(`/assets/${assetId}/archive`, {}),
    onSuccess: () => invalidateAssetQueries(client),
  });
}

export function useRestoreAsset() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (assetId: string) => api.post<Asset>(`/assets/${assetId}/restore`, {}),
    onSuccess: () => invalidateAssetQueries(client),
  });
}

export function useCreateAssetCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAssetCategoryInput) =>
      api.post<AssetCategory>("/assets/categories", input),
    onSuccess: () => invalidateAssetQueries(client),
  });
}

export function useUpdateAssetCategory(categoryId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateAssetCategoryInput) =>
      api.patch<AssetCategory>(`/assets/categories/${categoryId}`, input),
    onSuccess: () => invalidateAssetQueries(client),
  });
}

export function useDeleteAssetCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: string) =>
      api.delete<{ success: boolean }>(`/assets/categories/${categoryId}`),
    onSuccess: () => invalidateAssetQueries(client),
  });
}

export function useArchiveAssetCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: string) =>
      api.post<AssetCategory>(`/assets/categories/${categoryId}/archive`, {}),
    onSuccess: () => invalidateAssetQueries(client),
  });
}

export function useRestoreAssetCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: string) =>
      api.post<AssetCategory>(`/assets/categories/${categoryId}/restore`, {}),
    onSuccess: () => invalidateAssetQueries(client),
  });
}

export function useCreateMaintenance(assetId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMaintenanceInput) =>
      api.post<AssetMaintenance>(`/assets/${assetId}/maintenance`, input),
    onSuccess: () => {
      invalidateAssetQueries(client);
      client.invalidateQueries({ queryKey: ["assets", assetId, "maintenance"] });
    },
  });
}

export function useUpdateMaintenance(assetId: string, maintenanceId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateMaintenanceInput) =>
      api.patch<AssetMaintenance>(`/assets/${assetId}/maintenance/${maintenanceId}`, input),
    onSuccess: () => {
      invalidateAssetQueries(client);
      client.invalidateQueries({ queryKey: ["assets", assetId, "maintenance"] });
    },
  });
}

export function useCreateLoan(assetId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLoanInput) => api.post<AssetLoan>(`/assets/${assetId}/loans`, input),
    onSuccess: () => {
      invalidateAssetQueries(client);
      client.invalidateQueries({ queryKey: ["assets", assetId, "loans"] });
    },
  });
}

export function useReturnLoan(assetId: string, loanId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: ReturnLoanInput) =>
      api.patch<AssetLoan>(`/assets/${assetId}/loans/${loanId}/return`, input),
    onSuccess: () => {
      invalidateAssetQueries(client);
      client.invalidateQueries({ queryKey: ["assets", assetId, "loans"] });
    },
  });
}

export function useGenerateAssetQr(assetId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<QrData>(`/assets/${assetId}/qr`),
    onSuccess: () => {
      invalidateAssetQueries(client);
      client.invalidateQueries({ queryKey: ["assets", assetId, "qr"] });
    },
  });
}

export type AssetWorklistRecord = (AssetLoan | AssetMaintenance) & { assetName: string; assetTag: string; assetArchived: boolean };
export function useAssetWorklist(kind: "loans" | "maintenance", params: { page: number; limit: number; search: string; status?: string }) {
  const { can } = usePermissions();
  return useQuery({ queryKey: ["assets-worklist", kind, params], enabled: can(`assets:${kind}`, "read"),
    queryFn: ({ signal }) => api.get<{ data: AssetWorklistRecord[]; meta: AssetsListMeta }>(`/assets/worklists/${kind}${buildQuery(params)}`, { signal }) });
}
