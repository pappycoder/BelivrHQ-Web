"use client";

import { LoadingState } from "@/components/shared/loading-state";

import * as React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/paper/section";
import { EmptyState, FilterChip, ListPaginationFooter, ManageHeading, RowActions, SearchField } from "@/components/paper/primitives";
import { StatCard } from "@/components/paper/stat";
import { ListToolbar } from "@/components/shared/list-toolbar";
import { ListTable } from "@/components/shared/list-table";
import { VisibleDataExport } from "@/components/shared/visible-data-export";
import { useCurrentProfile } from "@/hooks/use-profile";
import { ArrowUpRight, RotateCcw, Wrench } from "lucide-react";
import { formatRecordDate } from "@/lib/record-date";
import { ErrorState } from "@/components/shared/error-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { usePermissions } from "@/hooks/use-permissions";
import {
  useAssetsList,
  useAssetWorklist,
  type Asset,
  type AssetWorklistRecord,
} from "@/hooks/use-assets";
import { StatusBadge } from "./status-badge";
import { LoanFormDialog } from "./loan-form-dialog";
import { MaintenanceFormDialog } from "./maintenance-form-dialog";
import { ReturnLoanDialog } from "./return-loan-dialog";

function date(value?: string) {
  return formatRecordDate(value);
}

function AssetPicker({ onSelect }: { onSelect: (asset: Asset) => void }) {
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const query = useAssetsList({ page, limit: 15, search });
  return (
    <div className="space-y-3">
      <Input
        aria-label="Find an asset"
        placeholder="Search name or asset tag…"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
      />
      {query.error ? (
        <ErrorState title="Unable to load assets" />
      ) : query.isLoading ? (
        <LoadingState label="Loading assets" variant="cards" rows={3} />
      ) : (
        <>
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {query.data?.data.map((asset) => (
              <li key={asset.id}>
                <Button
                  variant="outline"
                  className="h-auto w-full justify-start whitespace-normal text-left"
                  onClick={() => onSelect(asset)}
                >
                  {asset.name} · {asset.assetTag}
                </Button>
              </li>
            ))}
          </ul>
          {!query.data?.data.length && <p>No matching assets.</p>}
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm">Page {page}</span>
            <Button
              variant="outline"
              disabled={!query.data || page * 15 >= query.data.meta.total}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export function AssetWorklist({ kind, heading }: { kind: "loans" | "maintenance"; heading?: Omit<React.ComponentProps<typeof PageHeader>, "children"> }) {
  const { can } = usePermissions();
  const { data: profile } = useCurrentProfile();
  const tableRoot = React.useRef<HTMLDivElement>(null);
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(15);
  const [status, setStatus] = React.useState("");
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [asset, setAsset] = React.useState<Asset | null>(null);
  const [editing, setEditing] = React.useState<AssetWorklistRecord | null>(
    null,
  );
  const query = useAssetWorklist(kind, {
    page,
    limit,
    search,
    status: status || undefined,
  });
  const canReadAsset = can("assets:list", "read");
  const canCreate = can(`assets:${kind}`, "create") && canReadAsset;
  const canUpdate = can(`assets:${kind}`, "update");
  const close = (open: boolean) => {
    if (!open) {
      setAsset(null);
      setEditing(null);
    }
  };
  const isLoan = kind === "loans";
  return (
    <div className="space-y-6">
      <PageHeader
        title={isLoan ? "Asset loans" : "Asset maintenance"}
        {...heading}
        actions={<>
          {heading?.actions}
          <VisibleDataExport getRoot={() => tableRoot.current} />
          {canCreate && (
            <Button size="sm" className="h-9 rounded-full" onClick={() => setPickerOpen(true)}>
              {isLoan ? "Loan an asset" : "Schedule maintenance"}
            </Button>
          )}
        </>}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label={isLoan ? "Loan records" : "Maintenance jobs"} value={query.data?.meta.total ?? 0} tone="brand" deltaLabel="matching filters" />
        <StatCard label="On this page" value={query.data?.data.length ?? 0} tone="neutral" />
        <div className="paper-card flex flex-col justify-between gap-4 rounded-2xl p-5"><span className="rule-label">Scope</span><span className="font-display text-lg font-semibold leading-tight">{profile?.isAdminHq ? "All branches" : profile?.branch?.name ?? "Your permitted branches"}</span></div>
      </div>
      <ListToolbar
        search={<SearchField className="w-full max-w-xs" aria-label="Search asset worklist" placeholder="Search asset name or tag…" value={search} onChange={(value) => { setSearch(value); setPage(1); }} />}
        controls={search || status ? <Button variant="outline" size="sm" className="h-9 rounded-full" onClick={() => { setStatus(""); setSearch(""); setPage(1); }}>Clear filters</Button> : undefined}
      >
        <div role="group" aria-label="Worklist status filters" className="flex flex-wrap gap-1.5">
          <FilterChip active={!status} onClick={() => { setStatus(""); setPage(1); }}>All</FilterChip>
          {(isLoan ? ["active", "borrowed", "overdue", "returned"] : ["scheduled", "in_progress", "completed", "cancelled"]).map((value) => <FilterChip key={value} active={status === value} onClick={() => { setStatus(value); setPage(1); }}><span className="capitalize">{value.replaceAll("_", " ")}</span></FilterChip>)}
        </div>
      </ListToolbar>
      {query.error ? <ErrorState title={`Unable to load ${isLoan ? "loans" : "maintenance jobs"}`} onRetry={() => void query.refetch()} /> : query.isLoading ? <LoadingState label="Loading records" variant="table" /> : !query.data?.data.length ? (
        <EmptyState title={isLoan ? "No loans recorded" : "No maintenance jobs recorded"} description={search || status ? "Try another search or clear the filters." : isLoan ? "Loan an asset to track its borrower and expected return." : "Schedule maintenance to track the next service and its progress."} action={search || status ? <Button variant="outline" size="sm" className="rounded-full" onClick={() => { setStatus(""); setSearch(""); setPage(1); }}>Clear filters</Button> : undefined} />
      ) : (
        <div className="paper-card overflow-hidden rounded-2xl">
          <div ref={tableRoot} className="overflow-x-auto">
            <ListTable tableId={`asset-${kind}`} className="min-w-[880px]" records={query.data.data} recordKey="id" recordType="assetWorklist">
              <div className="rule-label grid grid-cols-[minmax(0,1.8fr)_1.2fr_0.9fr_0.9fr_0.8fr_auto] items-center gap-4 border-b border-line px-5 py-2.5"><span>Asset</span><span>{isLoan ? "Borrower" : "Work / provider"}</span><span>{isLoan ? "Loan date" : "Scheduled"}</span><span>{isLoan ? "Expected return" : "Completed"}</span><span>Status</span><ManageHeading /></div>
              <div className="divide-y divide-line/70">
                {query.data.data.map((record) => {
                  const loan = "loanDate" in record ? record : null;
                  const job = "scheduledDate" in record ? record : null;
                  const overdue = !!loan && loan.status !== "returned" && new Date(loan.expectedReturnDate).getTime() < Date.now();
                  return <div key={record.id} className="group grid grid-cols-[minmax(0,1.8fr)_1.2fr_0.9fr_0.9fr_0.8fr_auto] items-center gap-4 px-5 py-3 text-sm transition-colors hover:bg-muted/40">
                    <div className="min-w-0">{canReadAsset ? <Link className="block truncate font-semibold" href={`/operations/assets/${record.assetId}`}>{record.assetName}</Link> : <span className="block truncate font-semibold">{record.assetName}</span>}<span className="block truncate text-ink-faint">{record.assetTag}{record.assetArchived ? " · Archived asset" : ""}</span></div>
                    <div className="min-w-0 text-ink-soft"><span className="block truncate">{loan?.borrowerName ?? job?.type ?? "Not available"}</span>{job?.performedBy && <span className="block truncate text-ink-faint">{job.performedBy}</span>}</div>
                    <span className="num text-ink-soft">{date(loan?.loanDate ?? job?.scheduledDate)}</span>
                    <span className="num text-ink-soft">{date(loan?.expectedReturnDate ?? job?.completedDate)}</span>
                    <div>{loan ? <StatusBadge kind="loan" value={overdue ? "overdue" : loan.status} /> : job ? <StatusBadge kind="maintenance" value={job.status} /> : null}{loan?.actualReturnDate && <span className="mt-1 block text-xs text-ink-faint">Returned {date(loan.actualReturnDate)}</span>}</div>
                    <div className="flex justify-end"><RowActions actions={[
                      canReadAsset && { label: "Open asset", href: `/operations/assets/${record.assetId}`, icon: <ArrowUpRight /> },
                      canUpdate && !record.assetArchived && (job || loan?.status !== "returned") && { label: isLoan ? "Record return" : "Update job", onSelect: () => setEditing(record), icon: isLoan ? <RotateCcw /> : <Wrench /> },
                    ]} /></div>
                  </div>;
                })}
              </div>
            </ListTable>
          </div>
          <ListPaginationFooter page={page} perPage={limit} total={query.data.meta.total} onPageChange={setPage} onPerPageChange={(size) => { setLimit(size); setPage(1); }} itemName={isLoan ? "loans" : "jobs"} pending={query.isFetching} />
        </div>
      )}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose equipment</DialogTitle>
            <DialogDescription>
              Select the asset for this {isLoan ? "loan" : "maintenance job"}.
            </DialogDescription>
          </DialogHeader>
          {pickerOpen && (
            <AssetPicker
              onSelect={(selected) => {
                setAsset(selected);
                setPickerOpen(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      {isLoan && asset && (
        <LoanFormDialog open assetId={asset.id} onOpenChange={close} />
      )}
      {!isLoan && (asset || editing) && (
        <MaintenanceFormDialog
          open
          assetId={asset?.id ?? editing!.assetId}
          maintenance={
            editing && "scheduledDate" in editing ? editing : undefined
          }
          onOpenChange={close}
        />
      )}
      {isLoan && editing && (
        <ReturnLoanDialog
          open
          assetId={editing.assetId}
          loanId={editing.id}
          assetName={editing.assetName}
          onOpenChange={close}
        />
      )}
    </div>
  );
}
