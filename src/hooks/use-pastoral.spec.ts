import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRiskScoresAll } from "./use-pastoral";

const mocks = vi.hoisted(() => ({ query: vi.fn(), get: vi.fn(), can: vi.fn() }));
vi.mock("@tanstack/react-query", () => ({ useQuery: mocks.query, useMutation: vi.fn(), useQueryClient: vi.fn() }));
vi.mock("@/hooks/use-permissions", () => ({ usePermissions: () => ({ can: mocks.can }) }));
vi.mock("@/lib/api", () => ({ api: { get: mocks.get } }));

describe("complete risk radar collection", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.can.mockReturnValue(true); });

  it("walks API-capped pages without truncating the radar", async () => {
    const records = Array.from({ length: 201 }, (_, index) => ({ id: String(index) }));
    mocks.get.mockImplementation(async (path: string) => {
      const query = new URL(path, "http://local.test").searchParams;
      expect(query.get("limit")).toBe("100");
      const page = Number(query.get("page"));
      return { data: records.slice((page - 1) * 100, page * 100), meta: { total: records.length } };
    });
    useRiskScoresAll({ sortBy: "score", sortOrder: "desc" });
    const signal = new AbortController().signal;
    const result = await mocks.query.mock.calls[0][0].queryFn({ signal });
    expect(result).toEqual(records);
    expect(mocks.get).toHaveBeenCalledTimes(3);
    expect(mocks.get.mock.calls.every(([path, options]) => path.includes("sortOrder=desc") && options.signal === signal)).toBe(true);
  });

  it("rejects a failed later page rather than presenting a partial summary", async () => {
    mocks.get.mockResolvedValueOnce({ data: [{ id: "one" }], meta: { total: 2 } }).mockRejectedValueOnce(new Error("cancelled"));
    useRiskScoresAll();
    await expect(mocks.query.mock.calls[0][0].queryFn({ signal: undefined })).rejects.toThrow("cancelled");
    expect(mocks.get).toHaveBeenCalledTimes(2);
  });

  it("retains the existing risk-read permission requirement", () => {
    mocks.can.mockReturnValue(false);
    useRiskScoresAll();
    expect(mocks.query.mock.calls[0][0].enabled).toBe(false);
    expect(mocks.can).toHaveBeenCalledWith("pastoral:risk-scores", "read");
  });
});
