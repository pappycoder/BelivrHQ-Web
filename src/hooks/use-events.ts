"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/use-permissions";
import { api } from "@/lib/api";
import type { EventRecurrence } from "@/lib/schedule-occurrence";
export interface EventsListResponse {
  data: EventItem[];
  total: number;
}

// ─── Types ───────────────────────────────────────────────

export type EventType = "service" | "conference" | "lifecycle" | "training" | "social";

export const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: "service", label: "Service" },
  { value: "conference", label: "Conference" },
  { value: "lifecycle", label: "Lifecycle" },
  { value: "training", label: "Training" },
  { value: "social", label: "Social" },
];

export const EVENT_TYPE_MAP: Record<EventType, string> = {
  service: "Service",
  conference: "Conference",
  lifecycle: "Lifecycle",
  training: "Training",
  social: "Social",
};

/** Shape returned by GET /events (EventResponseDto). */
export interface EventItem {
  branchName?: string;
  eventId: string;
  churchId: string;
  branchId?: string;
  title: string;
  description?: string;
  type: EventType;
  startDate: string;
  endDate?: string;
  /** `one_time` (default) or `weekly`; the API treats a missing value as one-time. */
  recurrence?: EventRecurrence;
  location?: string;
  capacity?: number;
  isFree: boolean;
  price?: number;
  registrationCount: number;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** Shape returned by GET /events/:eventId/registrations (RegistrationResponseDto). */
export interface EventRegistration {
  registrationId: string;
  eventId: string;
  memberId: string;
  customData?: Record<string, unknown>;
  paymentStatus: string;
  ticketCode?: string;
  tierName?: string;
  quantity: number;
  checkedIn: boolean;
  authorizationUrl?: string;
  paymentReference?: string;
  createdAt: string;
  /** Display name returned with the scoped registration. */
  memberName?: string;
}

/** Shape returned by GET /events/:eventId/attendance (AttendanceResponseDto). */
export interface EventAttendanceRecord {
  attendanceId: string;
  churchId: string;
  serviceId?: string;
  eventId?: string;
  memberId?: string;
  visitorId?: string;
  visitorName?: string;
  category?: string;
  checkInAt: string;
  source: string;
  createdAt: string;
  memberName?: string;
  serviceName?: string;
  eventName?: string;
}

export interface EventStats {
  registered: number;
  attended: number;
  noShows: number;
  walkIns: number;
}

export interface ListEventsParams {
  startDate?: string;
  endDate?: string;
  branchId?: string;
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
  search?: string;
  archived?: boolean;
  sortBy?: "startDate" | "createdAt" | "title";
  sortOrder?: "asc" | "desc";
}

export interface CreateEventInput {
  branchId?: string;
  title: string;
  description?: string;
  type: EventType;
  startDate: string;
  /** `null` (update payloads) clears a saved window; omit leaves it untouched. */
  endDate?: string | null;
  recurrence?: EventRecurrence;
  location?: string;
  capacity?: number;
  isFree?: boolean;
  price?: number;
}

export type UpdateEventInput = Partial<CreateEventInput>;

export interface BulkCheckInInput {
  attendanceDate?: string;
  memberIds: string[];
}

export interface WalkInCheckInInput {
  attendanceDate?: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  gender?: string;
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

function invalidateEventCaches(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["events-list"] });
  qc.invalidateQueries({ queryKey: ["events-summary"] });
}

// ─── Event Summary (for dashboard / link-to pickers) ─────

export function useEventsSummary(branchId?: string) {
  return useQuery({
    queryKey: ["events-summary", branchId],
    queryFn: ({ signal }) => api.get<{ data: EventItem[]; total: number }>(`/events${buildQuery({ limit: 100, branchId })}`, { signal }),
  });
}

// ─── Events list (paginated) ─────────────────────────────

export function useEventsList(
  params: ListEventsParams = {},
  options: { enabled?: boolean } = {}
) {
  const { can } = usePermissions();
  return useQuery({
    queryKey: ["events-list", params],
    queryFn: ({ signal }) =>
      api.get<EventsListResponse>(`/events${buildQuery({ ...params })}`, { signal }),
    enabled: (options.enabled ?? true) && can("events:list", "read"),
  });
}

// ─── Single event ────────────────────────────────────────

export function useEvent(eventId: string) {
  return useQuery({
    queryKey: ["events-detail", eventId],
    queryFn: ({ signal }) => api.get<EventItem>(`/events/${eventId}`, { signal }),
    enabled: !!eventId,
  });
}

// ─── Event registrations ─────────────────────────────────

export function useEventRegistrations(eventId: string, branchId?: string) {
  const { can } = usePermissions();
  return useQuery({
    queryKey: ["events-registrations", eventId, branchId],
    queryFn: ({ signal }) =>
      api.get<EventRegistration[]>(`/events/${eventId}/registrations${buildQuery({ branchId })}`, { signal }),
    enabled: !!eventId && can("events:registrations", "read"),
  });
}

// ─── Event attendance ────────────────────────────────────

export function useEventAttendance(eventId: string) {
  const { can } = usePermissions();
  return useQuery({
    queryKey: ["events-attendance", eventId],
    queryFn: ({ signal }) =>
      api.get<EventAttendanceRecord[]>(`/events/${eventId}/attendance`, { signal }),
    enabled: !!eventId && can("events:checkin", "read"),
  });
}

// ─── Event stats (derived from registrations + attendance) ─

export function useEventStats(eventId: string) {
  const regs = useEventRegistrations(eventId);
  const att = useEventAttendance(eventId);

  const registered = regs.data?.length ?? 0;
  const attended = att.data?.length ?? 0;
  const walkIns = att.data?.filter((r) => !r.memberId && r.visitorName).length ?? 0;
  const noShows = registered - (att.data?.filter((a) => a.memberId).length ?? 0);

  return {
    data: { registered, attended, noShows: noShows > 0 ? noShows : 0, walkIns },
    isLoading: regs.isLoading || att.isLoading,
  } as const;
}

// ─── CRUD mutations ──────────────────────────────────────

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEventInput) =>
      api.post<EventItem>("/events", input),
    onSuccess: () => invalidateEventCaches(qc),
  });
}

export function useUpdateEvent(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateEventInput) =>
      api.patch<EventItem>(`/events/${eventId}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events-detail", eventId] });
      invalidateEventCaches(qc);
    },
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) =>
      api.delete<void>(`/events/${eventId}`),
    onSuccess: () => invalidateEventCaches(qc),
  });
}

export function useArchiveEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) =>
      api.post<EventItem>(`/events/${eventId}/archive`, {}),
    onSuccess: () => {
      invalidateEventCaches(qc);
      qc.invalidateQueries({ queryKey: ["events-detail"] });
    },
  });
}

export function useRestoreArchiveEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) =>
      api.post<EventItem>(`/events/${eventId}/restore`, {}),
    onSuccess: () => {
      invalidateEventCaches(qc);
      qc.invalidateQueries({ queryKey: ["events-detail"] });
    },
  });
}

// ─── Registration mutations ──────────────────────────────

export function useRegisterForEvent(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { memberId: string; tierId?: string; quantity?: number }) =>
      api.post<EventRegistration>(`/events/${eventId}/register`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events-registrations", eventId] });
      qc.invalidateQueries({ queryKey: ["events-detail", eventId] });
      invalidateEventCaches(qc);
    },
  });
}

export function useCancelRegistration(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) =>
      api.delete<void>(`/events/${eventId}/register/${memberId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events-registrations", eventId] });
      qc.invalidateQueries({ queryKey: ["events-detail", eventId] });
    },
  });
}

// ─── Check-in mutations ──────────────────────────────────

export function useBulkCheckIn(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkCheckInInput) =>
      api.post<{ checkedIn: number; skipped: number }>(
        `/events/${eventId}/check-in`,
        input,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events-attendance", eventId] });
      qc.invalidateQueries({ queryKey: ["events-registrations", eventId] });
    },
  });
}

export function useWalkInCheckIn(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: WalkInCheckInInput) =>
      api.post<EventAttendanceRecord>(
        `/events/${eventId}/check-in/walk-in`,
        input,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events-attendance", eventId] });
      qc.invalidateQueries({ queryKey: ["events-registrations", eventId] });
    },
  });
}

export function useValidateTicket(eventId: string) {
  return useMutation({
    mutationFn: (code: string) =>
      api.post<{ valid: boolean; registration?: EventRegistration; message: string }>(
        `/events/${eventId}/tickets/validate`,
        { code },
      ),
  });
}

// ─── Ticket tier types & hooks ────────────────────────

export interface EventTicketTier {
  id: string;
  event_id: string;
  name: string;
  price: number;
  capacity: number | null;
  description: string | null;
  display_order: number;
  created_at: string;
}

export interface CreateTierInput {
  name: string;
  price: number;
  capacity?: number;
  description?: string;
}

export interface UpdateTierInput {
  name?: string;
  price?: number;
  capacity?: number | null;
  description?: string | null;
  displayOrder?: number;
}

export function useEventTiers(eventId: string) {
  return useQuery({
    queryKey: ["events-tiers", eventId],
    queryFn: ({ signal }) =>
      api.get<EventTicketTier[]>(`/events/${eventId}/tiers`, { signal }),
    enabled: !!eventId,
  });
}

export function useCreateTier(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTierInput) =>
      api.post<{ tierId: string }>(`/events/${eventId}/tiers`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events-tiers", eventId] });
      qc.invalidateQueries({ queryKey: ["events-detail", eventId] });
    },
  });
}

export function useUpdateTier(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tierId, input }: { tierId: string; input: UpdateTierInput }) =>
      api.patch<EventTicketTier>(`/events/${eventId}/tiers/${tierId}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events-tiers", eventId] });
      qc.invalidateQueries({ queryKey: ["events-detail", eventId] });
    },
  });
}

export function useDeleteTier(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tierId: string) =>
      api.delete<void>(`/events/${eventId}/tiers/${tierId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events-tiers", eventId] });
      qc.invalidateQueries({ queryKey: ["events-detail", eventId] });
    },
  });
}

// ─── Management: all tickets ─────────────────────────

export interface AllTicketItem {
  ticketId: string;
  code: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  eventLocation: string | null;
  eventType: EventType;
  memberId: string | null;
  memberName: string | null;
  visitorId: string | null;
  visitorName: string | null;
  registrationId: string | null;
  tierName: string | null;
  pricePaid: number | null;
  status: "reserved" | "paid" | "cancelled" | "refunded";
  isUsed: boolean;
  usedAt: string | null;
  createdAt: string;
}

export interface AllTicketsResponse {
  data: AllTicketItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListAllTicketsParams {
  branchId?: string;
  eventId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useAllTickets(params: ListAllTicketsParams = {}) {
  return useQuery({
    queryKey: ["events-all-tickets", params],
    queryFn: ({ signal }) =>
      api.get<AllTicketsResponse>(`/events/management/tickets${buildQuery({ ...params })}`, { signal }),
  });
}

// ─── Create ticket (admin manual) ────────────────────────

export interface CreateTicketInput {
  memberId?: string;
  visitorId?: string;
  tierId?: string;
}

export interface CreatedTicket {
  ticketId: string;
  code: string;
  eventId: string;
  memberId: string | null;
  visitorId: string | null;
  tierName: string;
  pricePaid: number;
  status: string;
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, input }: { eventId: string; input: CreateTicketInput }) =>
      api.post<CreatedTicket>(`/events/${eventId}/tickets`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events-all-tickets"] });
    },
  });
}
