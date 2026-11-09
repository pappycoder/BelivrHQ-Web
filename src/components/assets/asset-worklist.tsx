"use client";

import { LoadingState } from "@/components/shared/loading-state";

import * as React from "react";
import Link from "next/link";
import { WorkspaceHeader as PageHeader } from "@/components/workspace/workspace-presentation";
import { ErrorState } from "@/components/shared/error-state";
import { TableCard } from "@/components/shared/table-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useAssetsList,
  useAssetWorklist,
  type Asset,
  type AssetWorklistRecord,
} from "@/hooks/use-assets";
import { LoanFormDialog } from "./loan-form-dialog";
import { MaintenanceFormDialog } from "./maintenance-form-dialog";
import { ReturnLoanDialog } from "./return-loan-dialog";

function date(value?: string) {
  return value ? new Date(value).toLocaleDateString() : "Not available";
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

export function AssetWorklist({ kind }: { kind: "loans" | "maintenance" }) {
  const { can } = usePermissions();
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
        count={query.data?.meta.total ?? 0}
        title={isLoan ? "Asset loans" : "Asset maintenance"}
        breadcrumbs={[
          { label: "Assets", href: "/operations/assets" },
          { label: isLoan ? "Loans" : "Maintenance" },
        ]}
        action={
          canCreate && (
            <Button onClick={() => setPickerOpen(true)}>
              {isLoan ? "Loan an asset" : "Schedule maintenance"}
            </Button>
          )
        }
      />
      <TableCard
        title={isLoan ? "Loan records" : "Maintenance jobs"}
        description={
          isLoan
            ? "Borrowers, expected returns and completed loans across your permitted branches. Overdue is based on the expected return date."
            : "Scheduled, ongoing and completed work across your permitted branches, including archived equipment history."
        }
        page={page}
        perPage={limit}
        total={query.data?.meta.total ?? 0}
        onPageChange={setPage}
        onPerPageChange={(size) => {
          setLimit(size);
          setPage(1);
        }}
        itemName={isLoan ? "loans" : "jobs"}
        toolbar={
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              Status
              <select
                aria-label="Worklist status"
                className="h-9 rounded-md border bg-background px-3"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All records</option>
                {(isLoan
                  ? ["active", "borrowed", "overdue", "returned"]
                  : ["scheduled", "in_progress", "completed", "cancelled"]
                ).map((value) => (
                  <option key={value} value={value}>
                    {value.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <Input
              className="max-w-sm"
              aria-label="Search asset worklist"
              placeholder="Search asset name or tag…"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
            <Button
              variant="ghost"
              onClick={() => {
                setStatus("");
                setSearch("");
                setPage(1);
              }}
            >
              Reset filters
            </Button>
          </div>
        }
      >
        {query.error ? (
          <ErrorState
            title={`Unable to load ${isLoan ? "loans" : "maintenance jobs"}`}
          />
        ) : query.isLoading ? (
          <LoadingState label="Loading records" variant="table" />
        ) : (
          <Table exportable records={query.data?.data ?? []} recordKey="id" recordType="assetWorklist">
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>{isLoan ? "Borrower" : "Work / provider"}</TableHead>
                <TableHead>{isLoan ? "Loan date" : "Scheduled"}</TableHead>
                <TableHead>
                  {isLoan ? "Expected return" : "Completed"}
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!query.data?.data.length && (
                <TableRow>
                  <TableCell colSpan={6} className="p-8 text-center">
                    {search
                      ? "No records match this search."
                      : `No ${isLoan ? "loans" : "maintenance jobs"} recorded.`}
                  </TableCell>
                </TableRow>
              )}
              {query.data?.data.map((record) => {
                const loan = "loanDate" in record ? record : null;
                const job = "scheduledDate" in record ? record : null;
                const overdue =
                  loan &&
                  loan.status !== "returned" &&
                  new Date(loan.expectedReturnDate).getTime() < Date.now();
                return (
                  <TableRow key={record.id}>
                    <TableCell>
                      {canReadAsset ? (
                        <Link
                          className="font-medium underline underline-offset-4"
                          href={`/operations/assets/${record.assetId}`}
                        >
                          {record.assetName}
                        </Link>
                      ) : (
                        record.assetName
                      )}
                      <p className="text-xs text-muted-foreground">
                        {record.assetTag}
                        {record.assetArchived ? " · Archived asset" : ""}
                      </p>
                    </TableCell>
                    <TableCell>
                      {loan?.borrowerName ?? job?.type ?? "Not available"}
                      {job?.performedBy && (
                        <p className="text-xs text-muted-foreground">
                          {job.performedBy}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {date(loan?.loanDate ?? job?.scheduledDate)}
                    </TableCell>
                    <TableCell>
                      {date(loan?.expectedReturnDate ?? job?.completedDate)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          overdue
                            ? "font-medium text-destructive"
                            : "capitalize"
                        }
                      >
                        {overdue
                          ? "Overdue"
                          : record.status.replaceAll("_", " ")}
                      </span>
                      {loan?.actualReturnDate && (
                        <p className="text-xs">
                          Returned {date(loan.actualReturnDate)}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {canUpdate &&
                        !record.assetArchived &&
                        (job || loan?.status !== "returned") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditing(record)}
                          >
                            {isLoan ? "Record return" : "Update job"}
                          </Button>
                        )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </TableCard>
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
