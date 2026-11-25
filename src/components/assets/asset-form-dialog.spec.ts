import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import type { Asset } from "@/hooks/use-assets";
const state = vi.hoisted(() => ({ pending: false, create: vi.fn(), update: vi.fn() }));
vi.mock("@/hooks/use-assets", () => ({
  DEPRECIATION_METHOD_LABELS: { straight_line: "Straight Line", reducing_balance: "Reducing Balance" },
  useAssetCategories: () => ({ data: [] }),
  useCreateAsset: () => ({ isPending: false, mutate: state.create }),
  useUpdateAsset: () => ({ isPending: state.pending, mutate: state.update }),
}));
vi.mock("@/hooks/use-branches", () => ({ useBranchesList: () => ({ data: { data: [{ branchId: "branch", name: "Test branch" }] } }) }));
vi.mock("@/hooks/use-admin", () => ({ useDepartmentsList: () => ({ data: [] }) }));
vi.mock("@/hooks/use-profile", () => ({ useCurrentProfile: () => ({ data: { isAdminHq: true } }) }));
vi.mock("@/components/members/member-combobox", () => ({ MemberCombobox: () => null }));
vi.mock("./asset-image-field", () => ({ AssetImageField: () => null }));
import { AssetFormDialog } from "./asset-form-dialog";
const asset: Asset = {
  id: "synthetic-asset", churchId: "synthetic-church", name: "Test mixer", assetTag: "TEST-001", branchId: "branch",
  condition: "fair", status: "maintenance", salvageValue: 100, currentValue: 250, purchasePrice: 500,
  depreciationMethod: "straight_line", notes: "Existing notes", createdAt: "2026-01-01", updatedAt: "2026-01-01",
};
beforeEach(() => { state.pending = false; vi.clearAllMocks(); });
it("loads a populated asset into the edit preview without creating or saving a record", () => {
  const html = renderToStaticMarkup(createElement(AssetFormDialog, { open: true, presentation: "page", onOpenChange: vi.fn(), asset }));
  expect(html).toContain('data-create-preview');
  expect(html).toContain('value="Test mixer"');
  expect(html).toContain('value="TEST-001"');
  expect(html).toContain('value="250"');
  expect(html).toContain("Existing notes");
  expect(html).toContain("Test branch");
  expect(html).toContain("Save Changes");
  expect(html).toContain("The record updates only when you save.");
  expect(html).not.toContain("Register Asset");
  expect(state.create).not.toHaveBeenCalled(); expect(state.update).not.toHaveBeenCalled();
});
it("omits the footer cancel and keeps save disabled while an asset update is pending", () => {
  state.pending = true;
  const html = renderToStaticMarkup(createElement(AssetFormDialog, { open: true, presentation: "page", onOpenChange: vi.fn(), asset }));
  expect(html).not.toMatch(/<button[^>]*>Cancel<\/button>/);
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Saving\.\.\.<\/button>/);
  expect(state.update).not.toHaveBeenCalled();
});
