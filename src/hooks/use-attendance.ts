"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/use-permissions";
import { api } from "@/lib/api";
import type { ScheduleRecurrence } from "@/lib/schedule-occurrence";

// ─── Types ───────────────────────────────────────────────

export type ServiceCategory = "adult" | "children" | "mixed";
export type AttendanceCategory = "adult" | "children" | "unspecified";
export const ATTENDANCE_CATEGORIES: {
  value: AttendanceCategory;
  label: string;
}[] = [
  { value: "adult", label: "Adult" },
  { value: "children", label: "Children" },
  { value: "unspecified", label: "Unspecified" },
];

export const SERVICE_CATEGORIES: { value: ServiceCategory; label: string }[] = [
  { value: "adult", label: "Adult" },
  { value: "children", label: "Children" },
  { value: "mixed", label: "Mixed (Adults & Children)" },
];

/** Shape returned by GET /services (ServiceResponseDto). */
export interface ChurchService {
  serviceId: string;
  churchId: string;
  branchId?: string;
  name: string;
  category?: ServiceCategory;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  /** How the schedule repeats; the API treats a missing value as `weekly`. */
  recurrence?: ScheduleRecurrence;
  /** `YYYY-MM-DD` start of the schedule window (required for one-time/range). */
  startsOn?: string;
  /** `YYYY-MM-DD` end of the schedule window (required for date ranges). */
  endsOn?: string;
  isActive: boolean;
  /** All-time check-in count (populated by list/detail endpoints). */
  attendanceCount?: number;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListServicesParams {
  page?: number;
  limit?: number;
  branchId?: string;
  category?: string;
  isActive?: boolean;
  archived?: boolean;
  dayOfWeek?: number;
}

/** Shape returned by GET /attendance (AttendanceResponseDto). */
export interface AttendanceRecord {
  attendanceId: string;
  churchId: string;
  serviceId?: string;
  eventId?: string;
  memberId?: string;
  visitorId?: string;
  visitorName?: string;
  category?: AttendanceCategory;
  checkInAt: string;
  source: string;
  createdAt: string;
  memberName?: string;
  serviceName?: string;
  eventName?: string;
}

export interface ListAttendanceParams {
  page?: number;
  limit?: number;
  serviceId?: string;
  branchId?: string;
  memberId?: string;
  visitorId?: string;
  category?: string;
  source?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: "checkinAt" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AttendanceSummary {
  generalAttendance?: GeneralAttendanceSummary;
  totalCheckIns: number;
  memberCheckIns: number;
  visitorCheckIns: number;
  bySource: Record<string, number>;
  byCategory: Record<string, number>;
  byGender: Record<string, number>;
}

export interface AttendanceTrendPoint {
  date: string;
  total: number;
  members: number;
  visitors: number;
}

export interface BulkAttendanceResult {
  recorded: number;
  skipped: number;
  errors: Array<{ index: number; message: string }>;
}

export interface CreateServiceInput {
  name: string;
  branchId?: string;
  category?: ServiceCategory;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  recurrence?: ScheduleRecurrence;
  startsOn?: string;
  endsOn?: string;
  isActive?: boolean;
}

export interface UpdateServiceInput extends Partial<
  Omit<CreateServiceInput, "dayOfWeek" | "startTime" | "endTime" | "startsOn" | "endsOn">
> {
  /** Explicit `null` clears the stored value; `undefined` leaves it unchanged. */
  dayOfWeek?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  startsOn?: string | null;
  endsOn?: string | null;
}

export interface RecordAttendanceInput {
  serviceId?: string;
  eventId?: string;
  memberId?: string;
  visitorId?: string;
  visitorName?: string;
  category?: AttendanceCategory;
  source?: string;
  /** Calendar day to record against (`YYYY-MM-DD`); defaults to today. */
  attendanceDate?: string;
}

export interface RecordBulkAttendanceInput {
  attendanceDate?: string;
  serviceId?: string;
  eventId?: string;
  records: Array<{
    memberId?: string;
    visitorId?: string;
    visitorName?: string;
  }>;
  category?: AttendanceCategory;
  source?: string;
}

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

function invalidateAttendanceCaches(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  queryClient.invalidateQueries({ queryKey: ["general-attendance"] });
  queryClient.invalidateQueries({ queryKey: ["general-attendance-summary"] });
  queryClient.invalidateQueries({ queryKey: ["reports"] });
  queryClient.invalidateQueries({ queryKey: ["attendance-records"] });
  queryClient.invalidateQueries({ queryKey: ["attendance-summary"] });
  queryClient.invalidateQueries({ queryKey: ["attendance-trends"] });
  queryClient.invalidateQueries({ queryKey: ["service-attendance"] });
}

// ─── Services ────────────────────────────────────────────

export function useAttendanceServices(
  params: ListServicesParams = {},
  options: { enabled?: boolean } = {},
) {
  const { can } = usePermissions();
  return useQuery({
    queryKey: ["attendance-services", params],
    queryFn: ({ signal }) =>
      api.get<PaginatedResponse<ChurchService>>(
        `/services${buildQuery({ ...params })}`,
        { signal },
      ),
    enabled: (options.enabled ?? true) && can("attendance:services", "read"),
  });
}

export function useService(serviceId: string) {
  return useQuery({
    queryKey: ["attendance-service", serviceId],
    queryFn: ({ signal }) =>
      api.get<ChurchService>(`/services/${serviceId}`, { signal }),
    enabled: !!serviceId,
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateServiceInput) =>
      api.post<ChurchService>("/services", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-services"] });
      invalidateAttendanceCaches(queryClient);
    },
  });
}

export function useUpdateService(serviceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateServiceInput) =>
      api.patch<ChurchService>(`/services/${serviceId}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-services"] });
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (serviceId: string) =>
      api.delete<{ success: boolean }>(`/services/${serviceId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-services"] });
    },
  });
}

export function useArchiveService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (serviceId: string) =>
      api.post<ChurchService>(`/services/${serviceId}/archive`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-services"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-service"] });
    },
  });
}

export function useRestoreArchiveService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (serviceId: string) =>
      api.post<ChurchService>(`/services/${serviceId}/restore`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-services"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-service"] });
    },
  });
}

// ─── Attendance records ──────────────────────────────────

export function useAttendanceRecords(params: ListAttendanceParams = {}) {
  const { can } = usePermissions();
  return useQuery({
    enabled: can("attendance:records", "read"),
    queryKey: ["attendance-records", params],
    queryFn: ({ signal }) =>
      api.get<PaginatedResponse<AttendanceRecord>>(
        `/attendance${buildQuery({ ...params })}`,
        { signal },
      ),
  });
}

export function useRecordAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RecordAttendanceInput) =>
      api.post<AttendanceRecord>("/attendance", input),
    onSuccess: () => invalidateAttendanceCaches(queryClient),
  });
}

export function useRecordBulkAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RecordBulkAttendanceInput) =>
      api.post<BulkAttendanceResult>("/attendance/bulk", input),
    onSuccess: () => invalidateAttendanceCaches(queryClient),
  });
}

export function useDeleteAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attendanceId: string) =>
      api.delete<{ success: boolean }>(`/attendance/${attendanceId}`),
    onSuccess: () => invalidateAttendanceCaches(queryClient),
  });
}

// ─── Analytics ───────────────────────────────────────────

export function useAttendanceSummary(
  params: { startDate?: string; endDate?: string; branchId?: string } = {},
  options: { enabled?: boolean } = {},
) {
  const { can } = usePermissions();
  return useQuery({
    enabled: can("attendance:dashboard", "read") && (options.enabled ?? true),
    queryKey: ["attendance-summary", params],
    queryFn: ({ signal }) =>
      api.get<AttendanceSummary>(
        `/attendance/summary${buildQuery({ ...params })}`,
        { signal },
      ),
  });
}

export function useAttendanceTrends(
  params: {
    days?: number;
    startDate?: string;
    endDate?: string;
    branchId?: string;
  } = {},
  options: { enabled?: boolean } = {},
) {
  const { can } = usePermissions();
  return useQuery({
    enabled: can("attendance:reports", "read") && (options.enabled ?? true),
    queryKey: ["attendance-trends", params],
    queryFn: ({ signal }) =>
      api.get<AttendanceTrendPoint[]>(
        `/attendance/trends${buildQuery({ ...params })}`,
        { signal },
      ),
  });
}

export function useServiceAttendance(serviceId: string) {
  const { can } = usePermissions();
  return useQuery({
    queryKey: ["service-attendance", serviceId],
    queryFn: ({ signal }) =>
      api.get<{ data: AttendanceRecord[]; total: number }>(
        `/attendance/by-service/${serviceId}`,
        { signal },
      ),
    enabled: !!serviceId && can("attendance:services", "read"),
  });
}

export interface GeneralAttendanceCounts {
  total: number;
  adultCount?: number | null;
  childrenCount?: number | null;
  maleCount?: number | null;
  femaleCount?: number | null;
}
export type AttendanceContext =
  "service" | "event" | "department" | "cell_group";
export interface AttendanceSessionContext {
  type: AttendanceContext;
  id: string;
  name: string;
  branchId?: string;
  active?: boolean;
}
export interface GeneralAttendanceRecord extends GeneralAttendanceCounts {
  contextType?: AttendanceContext;
  contextId?: string;
  contextName?: string;
  id: string;
  serviceId?: string;
  serviceName?: string;
  branchId: string;
  branchName: string;
  attendanceDate: string;
}
export interface GeneralAttendanceSummary extends GeneralAttendanceCounts {
  reportCount: number;
  unspecifiedAgeCount: number;
  unspecifiedGenderCount: number;
}
export interface GeneralAttendanceParams {
  contextType?: AttendanceContext;
  contextId?: string;
  serviceId?: string;
  branchId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
export function attendanceSessionPermissions(
  type: AttendanceContext = "service",
) {
  return type === "department"
    ? {
        read: "departments:read",
        create: "departments:update",
        update: "departments:update",
      }
    : type === "cell_group"
      ? {
          read: "cell_groups:details:read",
          create: "cell_groups:create",
          update: "cell_groups:update",
        }
      : type === "event"
        ? {
            read: "events:checkin:read",
            create: "events:checkin:create",
            update: "events:checkin:update",
          }
        : {
            read: "attendance:records:read",
            create: "attendance:checkin:create",
            update: "attendance:records:update",
          };
}
function sessionPath(params: GeneralAttendanceParams) {
  if (!params.contextType || params.contextType === "service")
    return "/attendance/general";
  const prefix =
    params.contextType === "event"
      ? "/events"
      : params.contextType === "department"
        ? "/admin/departments"
        : "/admin/cell-groups";
  return `${prefix}/${params.contextId}/attendance-sessions`;
}
function sessionQuery(params: GeneralAttendanceParams) {
  return buildQuery(
    Object.fromEntries(
      Object.entries(params).filter(
        ([key]) => key !== "contextType" && key !== "contextId",
      ),
    ),
  );
}
export function fetchGeneralAttendance(
  params: GeneralAttendanceParams,
  signal?: AbortSignal,
) {
  return api.get<PaginatedResponse<GeneralAttendanceRecord>>(
    `${sessionPath(params)}${sessionQuery(params)}`,
    { signal },
  );
}
export function useGeneralAttendance(
  params: GeneralAttendanceParams,
  enabled = true,
) {
  const { canAny } = usePermissions();
  return useQuery({
    queryKey: ["general-attendance", params],
    queryFn: ({ signal }) => fetchGeneralAttendance(params, signal),
    enabled:
      enabled &&
      canAny(attendanceSessionPermissions(params.contextType).read) &&
      (params.contextType === undefined ||
        params.contextType === "service" ||
        !!params.contextId),
  });
}
export function useGeneralAttendanceSummary(params: GeneralAttendanceParams) {
  const { canAny } = usePermissions();
  return useQuery({
    queryKey: ["general-attendance-summary", params],
    queryFn: ({ signal }) =>
      api.get<GeneralAttendanceSummary>(
        `${sessionPath(params)}/summary${sessionQuery(params)}`,
        { signal },
      ),
    enabled: canAny(
      !params.contextType || params.contextType === "service"
        ? "attendance:reports:read"
        : attendanceSessionPermissions(params.contextType).read,
    ),
  });
}
export function useSaveGeneralAttendance() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      counts,
      contextType,
      contextId,
      ...context
    }: {
      id?: string;
      counts: GeneralAttendanceCounts;
      contextType?: AttendanceContext;
      contextId?: string;
      serviceId?: string;
      attendanceDate: string;
      branchId?: string;
    }) => {
      const path = sessionPath({ contextType, contextId });
      return id
        ? api.patch<GeneralAttendanceRecord>(`${path}/${id}`, counts)
        : api.post<GeneralAttendanceRecord>(path, { ...context, ...counts });
    },
    onSuccess: (_record, input) => {
      invalidateAttendanceCaches(client);
      if (input.contextType === "cell_group")
        client.invalidateQueries({
          queryKey: ["cell-group-summary", input.contextId],
        });
    },
  });
}
