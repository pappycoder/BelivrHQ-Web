import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRolesSummary, useRolePermissions, useAllPermissions } from "./use-roles";
import { useAttendanceServices, useAttendanceRecords, useAttendanceSummary, useAttendanceTrends } from "./use-attendance";
import { useGivingCategories, useGivingSummary, useGivingTransactions, useGivingTransactionsAll } from "./use-giving";
import { useAssetCategories } from "./use-assets";
import { useMediaFolders } from "./use-media";
import { useFormSubmissions } from "./use-forms";
import { useCurrentProfile } from "./use-profile";
import { useEventsList, useEventRegistrations, useEventAttendance } from "./use-events";
import { useFamiliesList } from "./use-families";
import { useAnalyticsDashboard, useAnalyticsGiving, useAnalyticsAttendance, useAnalyticsMembers } from "./use-analytics";
import { api } from "@/lib/api";

const state = vi.hoisted(() => ({ grants: new Set<string>(), query: vi.fn((options: { enabled?: boolean; refetchOnWindowFocus?: boolean; refetchOnReconnect?: boolean }) => options) }));
vi.mock("@tanstack/react-query", () => ({ useQuery: state.query, useMutation: vi.fn(), useQueryClient: vi.fn() }));
vi.mock("@/hooks/use-permissions", () => ({ usePermissions: () => ({ can: (resource: string, action: string) => state.grants.has(`${resource}:${action}`) }) }));
vi.mock("@/lib/api", () => ({ api: { get: vi.fn() } }));

describe("permission-gated queries", () => {
  beforeEach(() => { state.grants.clear(); state.query.mockClear(); });

  it("does not request analytics without the matching effective grants", () => {
    useAnalyticsDashboard();
    useAnalyticsGiving();
    useAnalyticsAttendance();
    useAnalyticsMembers();
    expect(state.query.mock.calls.map(([options]) => options.enabled)).toEqual([
      false,
      false,
      false,
      false,
    ]);
    state.query.mockClear();
    for (const name of ["dashboard", "giving", "attendance", "members"])
      state.grants.add(`analytics:${name}:read`);
    useAnalyticsDashboard();
    useAnalyticsGiving();
    useAnalyticsAttendance();
    useAnalyticsMembers();
    useAnalyticsGiving({}, { enabled: false });
    expect(state.query.mock.calls.map(([options]) => options.enabled)).toEqual([
      true,
      true,
      true,
      true,
      false,
    ]);
  });

  it("does not fetch role administration data for unauthorized label consumers", () => {
    useRolesSummary(); useRolePermissions("secretary"); useAllPermissions();
    expect(state.query.mock.calls.map(([options]) => options.enabled)).toEqual([false, false, false]);
    state.query.mockClear(); state.grants.add("roles:read");
    useRolesSummary(); useRolePermissions("secretary"); useAllPermissions();
    expect(state.query.mock.calls.map(([options]) => options.enabled)).toEqual([true, true, true]);
  });

  it("does not request paid event pickers without effective event-list access", () => {
    useEventsList({}, { enabled: true });
    expect(state.query.mock.calls[0][0].enabled).toBe(false);
    state.grants.add("events:list:read");
    useEventsList();
    useEventsList({}, { enabled: false });
    expect(state.query.mock.calls.slice(1).map(([options]) => options.enabled)).toEqual([true, false]);
  });

  it("fetches event registrations and attendance independently by permission", () => {
    state.grants.add("events:registrations:read");
    useEventRegistrations("event"); useEventAttendance("event");
    expect(state.query.mock.calls.map(([options]) => options.enabled)).toEqual([true, false]);
    state.query.mockClear(); state.grants.add("events:checkin:read");
    useEventAttendance("event"); useEventRegistrations("");
    expect(state.query.mock.calls.map(([options]) => options.enabled)).toEqual([true, false]);
  });

  it("refreshes authorization state on focus and reconnect", () => {
    useCurrentProfile();
    expect(state.query.mock.calls[0][0]).toMatchObject({ refetchOnWindowFocus: true, refetchOnReconnect: true });
  });
});

// Read-only roles must load reference data without a create/update/delete grant.

describe("read-only workflow queries", () => {
  beforeEach(() => { state.grants.clear(); state.query.mockClear(); });

  it("passes the selected family branch and list filters to the API without write grants", async () => {
    useFamiliesList({ branchId: "branch-selected", page: 2, limit: 15, search: "Family & friends", archived: true });
    const options = state.query.mock.calls[0][0] as unknown as { queryFn: (context: { signal: AbortSignal }) => Promise<unknown> };
    const signal = new AbortController().signal;
    await options.queryFn({ signal });
    const request = vi.mocked(api.get).mock.calls.at(-1)!;
    const url = new URL(request[0], "https://belivrhq.invalid");
    expect(Object.fromEntries(url.searchParams)).toEqual({ branchId: "branch-selected", page: "2", limit: "15", search: "Family & friends", archived: "true" });
    expect(request[1]).toEqual({ signal });
  });

  it("loads authorized filter data without write grants", () => {
    for (const grant of ["attendance:services:read", "giving:categories:read", "assets:categories:read", "media:folders:read", "forms:submissions:read"]) state.grants.add(grant);
    useAttendanceServices(); useGivingCategories(); useAssetCategories(); useMediaFolders(); useFormSubmissions("form");
    expect(state.query.mock.calls.map(([options]) => options.enabled)).toEqual([true, true, true, true, true]);
  });

  it("does not request unauthorized optional filter datasets", () => {
    useAttendanceServices(); useGivingCategories(); useAssetCategories(); useMediaFolders(); useFormSubmissions("form");
    expect(state.query.mock.calls.every(([options]) => options.enabled === false)).toBe(true);
  });

  it("loads aggregate giving for dashboard-only roles without requesting transactions", () => {
    state.grants.add("giving:dashboard:read");
    useGivingSummary(); useGivingTransactions();
    expect(state.query.mock.calls.map(([options]) => options.enabled)).toEqual([true, false]);
  });

  it("fetches service-linked giving only with transaction read permission", () => {
    state.grants.add("attendance:services:read");
    useGivingTransactionsAll({ serviceId: "service" });
    expect(state.query.mock.calls[0][0].enabled).toBe(false);
    state.grants.add("giving:records:read");
    useGivingTransactionsAll({ serviceId: "service" });
    expect(state.query.mock.calls[1][0].enabled).toBe(true);
  });

  it("loads attendance totals without requiring records, reports or check-in writes", () => {
    state.grants.add("attendance:dashboard:read");
    useAttendanceSummary(); useAttendanceRecords(); useAttendanceTrends();
    expect(state.query.mock.calls.map(([options]) => options.enabled)).toEqual([true, false, false]);
  });
});
