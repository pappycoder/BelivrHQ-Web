import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAnalyticsDashboard, useAnalyticsMembers } from "./use-analytics";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  get: vi.fn(),
  can: vi.fn(),
}));
vi.mock("@tanstack/react-query", () => ({ useQuery: mocks.query }));
vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({ can: mocks.can }),
}));
vi.mock("@/lib/api", () => ({ api: { get: mocks.get } }));

describe("member analytics query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.can.mockReturnValue(true);
  });

  it("keeps no-parameter callers compatible", async () => {
    useAnalyticsMembers();
    const options = mocks.query.mock.calls[0][0];
    await options.queryFn({ signal: undefined });
    expect(mocks.get).toHaveBeenCalledWith("/analytics/members", {
      signal: undefined,
    });
  });

  it("isolates selected branches in the cache and sends the filter", async () => {
    useAnalyticsMembers({ branchId: "branch-a" });
    useAnalyticsMembers({ branchId: "branch-b" });
    const first = mocks.query.mock.calls[0][0];
    const second = mocks.query.mock.calls[1][0];
    expect(first.queryKey).not.toEqual(second.queryKey);
    const signal = new AbortController().signal;
    await second.queryFn({ signal });
    expect(mocks.get).toHaveBeenCalledWith(
      "/analytics/members?branchId=branch-b",
      { signal },
    );
  });

  it("does not enable requests without the existing analytics permission", () => {
    mocks.can.mockReturnValue(false);
    useAnalyticsMembers({ branchId: "branch-b" });
    expect(mocks.query.mock.calls[0][0].enabled).toBe(false);
    expect(mocks.can).toHaveBeenCalledWith("analytics:members", "read");
  });
});


describe("dashboard analytics query contract", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.can.mockReturnValue(true); });

  it("keeps an unfiltered aggregate request valid", async () => {
    useAnalyticsDashboard();
    await mocks.query.mock.calls[0][0].queryFn({ signal: undefined });
    expect(mocks.get).toHaveBeenCalledWith("/analytics/dashboard", { signal: undefined });
  });

  it("omits trend-only options from aggregate requests and cache keys", async () => {
    const scope = { startDate: "2026-01-01", endDate: "2026-11-20", branchId: "branch-a" };
    useAnalyticsDashboard({ ...scope, groupBy: "week", currency: "NGN" });
    useAnalyticsDashboard({ ...scope, groupBy: "month", currency: "USD" });
    const first = mocks.query.mock.calls[0][0];
    expect(first.queryKey).toEqual(mocks.query.mock.calls[1][0].queryKey);
    const signal = new AbortController().signal;
    await first.queryFn({ signal });
    expect(mocks.get).toHaveBeenCalledWith("/analytics/dashboard?startDate=2026-01-01&endDate=2026-11-20&branchId=branch-a", { signal });
  });
});
