import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AssetWorklistRecord } from "@/hooks/use-assets";

const state = vi.hoisted(() => ({
  records: [] as AssetWorklistRecord[],
  grants: new Set<string>(),
}));
vi.mock("@/hooks/use-assets", async (original) => ({
  ...await original<typeof import("@/hooks/use-assets")>(),
  useAssetWorklist: () => ({ data: { data: state.records, meta: { total: state.records.length } }, isLoading: false, isFetching: false, error: null }),
  useAssetsList: () => ({ data: { data: [], meta: { total: 0 } }, isLoading: false }),
}));
vi.mock("@/hooks/use-permissions", () => ({ usePermissions: () => ({ ready: true, can: (resource: string, action: string) => state.grants.has(`${resource}:${action}`) }) }));
vi.mock("@/hooks/use-profile", () => ({ useCurrentProfile: () => ({ data: { isAdminHq: true } }) }));
vi.mock("@/components/tours/navigation-page-tour", () => ({ NavigationPageTour: () => null }));
vi.mock("@/components/shared/visible-data-export", () => ({ VisibleDataExport: () => null }));
vi.mock("@/components/shared/list-table", () => ({ ListTable: ({ children }: { children: import("react").ReactNode }) => createElement("div", null, children) }));
vi.mock("@/components/paper/primitives", async (original) => ({
  ...await original<typeof import("@/components/paper/primitives")>(),
  RowActions: ({ actions }: { actions: Array<false | null | undefined | { label: string }> }) => createElement("div", null, actions.filter((action) => !!action).map((action) => createElement("button", { key: action!.label }, action!.label))),
}));
import { AssetWorklist } from "./asset-worklist";

const loan = (id: string, status: "borrowed" | "returned", archived = false): AssetWorklistRecord => ({
  id, assetId: `asset-${id}`, assetName: `Equipment ${id}`, assetTag: id, assetArchived: archived,
  borrowerName: "Test borrower", status, loanDate: "2026-01-01", expectedReturnDate: "2099-01-01",
  createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
});
beforeEach(() => {
  state.records = [];
  state.grants = new Set(["assets:list:read", "assets:loans:create", "assets:loans:update", "assets:maintenance:update"]);
});
describe("asset worklist register actions", () => {
  it("renders loan data in the register while retaining returned/archived action guards", () => {
    state.records = [loan("open", "borrowed"), loan("returned", "returned"), loan("archived", "borrowed", true)];
    const html = renderToStaticMarkup(createElement(AssetWorklist, { kind: "loans" }));
    expect(html).toContain("Test borrower");
    expect(html).toContain("1 Jan 2026");
    expect(html.match(/Record return/g)).toHaveLength(1);
    expect(html.match(/Open asset/g)).toHaveLength(3);
  });
  it("does not expose asset opening or creation without the asset read grant", () => {
    state.records = [loan("open", "borrowed")];
    state.grants = new Set(["assets:loans:update", "assets:loans:create"]);
    const html = renderToStaticMarkup(createElement(AssetWorklist, { kind: "loans" }));
    expect(html).not.toContain("Open asset");
    expect(html).not.toContain("Loan an asset");
    expect(html).toContain("Record return");
  });
  it("keeps maintenance update availability, excluding archived equipment", () => {
    state.records = [false, true].map((archived, index) => ({ id: `job-${index}`, assetId: `asset-${index}`, assetName: "Mixer", assetTag: `AUD-${index}`, assetArchived: archived, type: "Service", status: "completed", scheduledDate: "2026-01-01", completedDate: "2026-01-02", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-02T00:00:00Z" }));
    const html = renderToStaticMarkup(createElement(AssetWorklist, { kind: "maintenance" }));
    expect(html.match(/Update job/g)).toHaveLength(1);
    expect(html).toContain("2 Jan 2026");
    expect(html).not.toContain("Record return");
  });
});
