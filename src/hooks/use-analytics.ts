"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { usePermissions } from "@/hooks/use-permissions";

// ─── Types ───────────────────────────────────────────────
// Mirror the backend `analytics-response.dto.ts` shapes exactly.

export interface CategoryBreakdownEntry {
  categoryId: string;
  categoryName: string;
  total: number;
  count: number;
}

export interface BranchBreakdownEntry {
  branchId?: string;
  branchName: string;
  total: number;
  count: number;
}

export interface TypeBreakdownEntry {
  type: string;
  total: number;
  count: number;
}

export interface TopDonorEntry {
  memberId: string;
  memberName: string;
  total: number;
  count: number;
}

export interface DatePointEntry {
  date: string;
  total: number;
  members: number;
  visitors: number;
}

export interface ServiceBreakdownEntry {
  serviceId: string;
  serviceName: string;
  total: number;
  members: number;
  visitors: number;
}

export interface DashboardOverview {
  totalMembers: number;
  activeMembers: number;
  newMembers: number;
  totalBranches: number;
  totalAttendance: number;
  totalGiving: number;
  atRiskCount: number;
  upcomingEvents: number;
  pendingSubmissions: number;
  engagementDistribution: Record<string, number>;
}

export interface GivingAnalytics {
  total: number;
  count: number;
  average: number;
  byCategory: CategoryBreakdownEntry[];
  byBranch: BranchBreakdownEntry[];
  byType: TypeBreakdownEntry[];
  byStatus: Record<string, number>;
  topDonors: TopDonorEntry[];
  recurring: {
    active: number;
    totalMonthlyAmount: number;
    totalScheduled: number;
  };
  trend: DatePointEntry[];
}

export interface AttendanceAnalytics {
  total: number;
  members: number;
  visitors: number;
  bySource: Record<string, number>;
  byBranch: BranchBreakdownEntry[];
  byService: ServiceBreakdownEntry[];
  firstTimeVisitors: number;
  returningVisitors: number;
  trend: DatePointEntry[];
}

export interface MemberAnalytics {
  total: number;
  byStatus: Record<string, number>;
  byGender: Record<string, number>;
  byAgeGroup: Record<string, number>;
  growth: DatePointEntry[];
}

export interface AnalyticsDateRangeParams {
  currency?: string;
  startDate?: string;
  endDate?: string;
  branchId?: string;
  groupBy?: "day" | "week" | "month";
}

// ─── Helpers ─────────────────────────────────────────────

function buildQuery(params: AnalyticsDateRangeParams): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

export function periodLabel(date: string): string {
  // date arrives as YYYY-MM-DD (day) / YYYY-Wxx or YYYY-MM (month). Default
  // to displaying it as-is but shorten ISO month parts.
  if (/^\d{4}-\d{2}$/.test(date)) {
    const [y, m] = date.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleString("en-NG", {
      month: "short",
    });
  }
  return date;
}

// ─── Queries ─────────────────────────────────────────────

export function useAnalyticsDashboard(params: AnalyticsDateRangeParams = {}) {
  const { can } = usePermissions();
  // The aggregate endpoint accepts date/branch scope, not trend grouping or currency.
  const filters = { startDate: params.startDate, endDate: params.endDate, branchId: params.branchId };
  return useQuery({
    queryKey: ["analytics", "dashboard", filters],
    enabled: can("analytics:dashboard", "read"),
    queryFn: ({ signal }) =>
      api.get<DashboardOverview>(`/analytics/dashboard${buildQuery(filters)}`, {
        signal,
      }),
    staleTime: 3 * 60 * 1000,
  });
}

export function useAnalyticsGiving(
  params: AnalyticsDateRangeParams = {},
  options: { enabled?: boolean } = {},
) {
  const { can } = usePermissions();
  return useQuery({
    queryKey: ["analytics", "giving", params],
    queryFn: ({ signal }) =>
      api.get<GivingAnalytics>(`/analytics/giving${buildQuery(params)}`, {
        signal,
      }),
    staleTime: 5 * 60 * 1000,
    enabled: can("analytics:giving", "read") && (options.enabled ?? true),
  });
}

export function useAnalyticsAttendance(params: AnalyticsDateRangeParams = {}, options: {enabled?: boolean} = {}) {
  const { can } = usePermissions();
  return useQuery({
    queryKey: ["analytics", "attendance", params],
    enabled: can("analytics:attendance", "read") && (options.enabled ?? true),
    queryFn: ({ signal }) =>
      api.get<AttendanceAnalytics>(
        `/analytics/attendance${buildQuery(params)}`,
        { signal },
      ),
    staleTime: 3 * 60 * 1000,
  });
}

export function useAnalyticsMembers(params: Pick<AnalyticsDateRangeParams, "branchId"> = {}) {
  const { can } = usePermissions();
  return useQuery({
    queryKey: ["analytics", "members", params],
    enabled: can("analytics:members", "read"),
    queryFn: ({ signal }) =>
      api.get<MemberAnalytics>(`/analytics/members${buildQuery(params)}`, { signal }),
    staleTime: 10 * 60 * 1000,
  });
}

export function formatNaira(value: number): string {
  return `₦${value.toLocaleString("en-NG")}`;
}
