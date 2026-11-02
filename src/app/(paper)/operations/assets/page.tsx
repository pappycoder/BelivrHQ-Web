"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Boxes, Download, Plus, QrCode } from "lucide-react";
import { api } from "@/lib/api";
import { fetchAllPages, listUrl } from "@/lib/export-all";
import type { ExportColumn } from "@/lib/export-utils";
import { PageHeader } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import { EmptyState, FilterChip, ListPaginationFooter, SearchField } from "@/components/paper/primitives";
import { StaggerGroup, StaggerItem } from "@/components/paper/motion/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExportDropdown } from "@/components/shared/export-dropdown";
import { AssetDetailDrawer } from "@/components/assets/asset-detail-drawer";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useAssetsList,
  useAssetStats,
  useAssetCategories,
  ASSET_STATUS_LABELS,
  ASSET_CONDITION_LABELS,
  type Asset,
  type AssetStatus,
} from "@/hooks/use-assets";
import { formatNaira } from "@/hooks/use-analytics";

const PAGE_SIZE = 15;

const STATUS_TONES: Record<AssetStatus, "moss" | "gold" | "neutral" | "rose"> = {
  active: "moss",
  maintenance: "gold",
  retired: "neutral",
  lost: "rose",
  disposed: "neutral",
};

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: "assetTag", label: "Tag" },
  { key: "name", label: "Name" },
  { key: "category", label: "Category" },
  { key: "status", label: "Status" },
  { key: "condition", label: "Condition" },
  { key: "custodian", label: "Custodian" },
  { key: "location", label: "Location" },
  { key: "currentValue", label: "Current value" },
];

function exportRows(rows: Asset[]) {
  return rows.map((a) => ({
    assetTag: a.assetTag,
    name: a.name,
    category: a.categoryName ?? "",
    status: ASSET_STATUS_LABELS[a.status] ?? a.status,
    condition: ASSET_CONDITION_LABELS[a.condition] ?? a.condition,
    custodian: a.custodianName ?? "",
    location: a.location ?? "",
    currentValue: a.currentValue ?? "",
  }));
}

export default function AssetsPage() {
  const router = useRouter();
  const { can, ready } = usePermissions();
  const canCreate = ready && can("assets:list", "create");

  const [query, setQuery] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<AssetStatus | "">("");
  const [categoryId, setCategoryId] = React.useState("");
  const [archivedView, setArchivedView] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(PAGE_SIZE);
  const [drawerAssetId, setDrawerAssetId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => { setSearch(query); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const params = React.useMemo(() => ({
    page,
    limit: perPage,
    search: search || undefined,
    status: status || undefined,
    categoryId: categoryId || undefined,
    archived: archivedView ? true : undefined,
  }), [page, perPage, search, status, categoryId, archivedView]);

  const assets = useAssetsList(params);
  const stats = useAssetStats();
  const categories = useAssetCategories();

  const rows = assets.data?.data ?? [];
  const total = assets.data?.meta?.total ?? 0;
  const maintenanceTotal = useAssetsList({ status: "maintenance", limit: 1 }).data?.meta?.total ?? 0;

  const fetchAllExport = React.useCallback(async () => {
    const all = await fetchAllPages<Asset>((p) =>
      api.get(listUrl("/assets", { ...params, page: p, limit: 100 })),
    );
    return exportRows(all);
  }, [params]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations · Assets"
        title="Everything we hold in trust."
        description="The register of what the church owns — where it is, who&apos;s carrying it, and how it&apos;s faring."
        actions={
          <>
            <ExportDropdown
              tableId="assets"
              columns={EXPORT_COLUMNS}
              data={exportRows(rows)}
              title="Assets"
              filename="asset-register"
              disabled={!rows.length}
              fetchAllRows={fetchAllExport}
            />
            {canCreate ? (
              <Button className="h-9 gap-1.5 rounded-full text-xs" onClick={() => router.push("/operations/assets/new")}>
                <Plus className="size-3.5" /> Add asset
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Tracked items" value={total} tone="brand" icon={<Boxes className="size-4" />} deltaLabel={archivedView ? "archived" : "in the register"} />
        <StatCard label="Purchase value" value={stats.data?.totalPurchaseValue ?? 0} prefix="₦" tone="moss" />
        <StatCard label="Current value" value={stats.data?.totalCurrentValue ?? 0} prefix="₦" tone="sky" deltaLabel="after depreciation" />
        <StatCard label="Needs service" value={maintenanceTotal} tone="gold" deltaLabel="see schedule" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchField value={query} onChange={setQuery} placeholder="Search name, tag or serial…" className="w-full max-w-xs" />
        <FilterChip active={status === ""} onClick={() => { setStatus(""); setPage(1); }}>All</FilterChip>
        {(Object.keys(ASSET_STATUS_LABELS) as AssetStatus[]).map((s) => (
          <FilterChip key={s} active={status === s} onClick={() => { setStatus(s); setPage(1); }}>{ASSET_STATUS_LABELS[s]}</FilterChip>
        ))}
        <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }} className="h-8 rounded-full border border-line bg-card px-3 text-[11px] outline-none" aria-label="Category filter">
          <option value="">All categories</option>
          {(categories.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <FilterChip active={archivedView} onClick={() => { setArchivedView((v) => !v); setPage(1); }}>Archived</FilterChip>
      </div>

      {assets.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Boxes />}
          title={archivedView ? "Nothing archived" : "The register is empty"}
          description="Every sound system, bus and chair can be tracked — start with the things that walk out the door."
          action={canCreate ? <Button size="sm" variant="outline" className="rounded-full border-line text-xs" onClick={() => router.push("/operations/assets/new")}>Register the first asset</Button> : undefined}
        />
      ) : (
        <div className="paper-card overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="rule-label grid grid-cols-[minmax(0,1.8fr)_0.9fr_0.9fr_1fr_0.8fr_0.8fr] items-center gap-3 border-b border-line px-5 py-2.5">
                <span>Asset</span>
                <span>Category</span>
                <span>Status</span>
                <span>Custodian</span>
                <span className="text-right">Condition</span>
                <span className="text-right">Value</span>
              </div>
              <StaggerGroup className="divide-y divide-line/70">
                {rows.map((asset) => (
                  <StaggerItem key={asset.id}>
                    <button
                      type="button"
                      onClick={() => setDrawerAssetId(asset.id)}
                      className="grid w-full grid-cols-[minmax(0,1.8fr)_0.9fr_0.9fr_1fr_0.8fr_0.8fr] items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/40"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-ink-faint">
                          <QrCode className="size-3.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-medium">{asset.name}</span>
                          <span className="block font-mono text-[9px] text-ink-faint">{asset.assetTag}{asset.serialNumber ? ` · ${asset.serialNumber}` : ""}</span>
                        </span>
                      </span>
                      <span className="truncate text-[11px] text-ink-soft">{asset.categoryName ?? "—"}</span>
                      <span>
                        <Tag tone={asset.archivedAt ? "neutral" : STATUS_TONES[asset.status]} dot>
                          {asset.archivedAt ? "Archived" : ASSET_STATUS_LABELS[asset.status]}
                        </Tag>
                      </span>
                      <span className="truncate text-[11px] text-ink-soft">{asset.custodianName ?? asset.location ?? "Unassigned"}</span>
                      <span className="text-right text-[11px] text-ink-faint">{ASSET_CONDITION_LABELS[asset.condition]}</span>
                      <span className="num text-right text-xs font-semibold">{asset.currentValue ? formatNaira(asset.currentValue) : "—"}</span>
                    </button>
                  </StaggerItem>
                ))}
              </StaggerGroup>
            </div>
          </div>
          <ListPaginationFooter
            page={page}
            perPage={perPage}
            total={total}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
            itemName="assets"
            pending={assets.isFetching}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-4 text-[11px]">
        <Link href="/operations/assets/categories" className="flex items-center gap-1.5 text-brand hover:underline"><Boxes className="size-3" /> Categories</Link>
        <Link href="/operations/assets/maintenance" className="text-brand hover:underline">Maintenance schedule</Link>
        <Link href="/operations/assets/loans" className="text-brand hover:underline">Loans &amp; checkouts</Link>
        <Download className="ml-auto size-3 self-center text-ink-faint" />
      </div>

      <AssetDetailDrawer
        open={!!drawerAssetId}
        onOpenChange={(value) => !value && setDrawerAssetId(null)}
        assetId={drawerAssetId ?? ""}
      />
    </div>
  );
}
