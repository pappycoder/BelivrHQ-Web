import { describe, expect, it } from "vitest";
import { searchResultsState } from "./search-results-state";

describe("search result availability", () => {
  it("does not call an unreported or pending category empty", () => {
    expect(searchResultsState(["members"], {}).empty).toBe(false);
    expect(searchResultsState(["members"], { members: { status: "pending", count: 4 } })).toMatchObject({ settled: false, total: 0, empty: false });
  });
  it("does not count stale rows after failure or offer no-match guidance", () => {
    expect(searchResultsState(["members"], { members: { status: "error", count: 6 } })).toEqual({ settled: true, failed: ["members"], total: 0, empty: false });
  });
  it("keeps successful matches when another category fails", () => {
    expect(searchResultsState(["members", "events"], { members: { status: "success", count: 1 }, events: { status: "error", count: 4 } })).toEqual({ settled: true, failed: ["events"], total: 1, empty: false });
  });
  it("ignores categories outside the current scope or permissions", () => {
    expect(searchResultsState(["members"], { members: { status: "success", count: 0 }, events: { status: "error", count: 5 } })).toEqual({ settled: true, failed: [], total: 0, empty: true });
  });
  it("shows a successful empty result only after every category succeeds", () => {
    expect(searchResultsState(["members", "events"], { members: { status: "success", count: 0 }, events: { status: "success", count: 0 } }).empty).toBe(true);
  });
});
