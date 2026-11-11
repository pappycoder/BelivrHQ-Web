"use client";

import { useManageConfirmation } from "@/components/shared/manage-confirmation";

import { LoadingState } from "@/components/shared/loading-state";

import { ErrorState } from "@/components/shared/error-state";
import { UrlTabs } from "@/components/shared/url-tabs";
import { ContentImage } from "@/components/shared/content-image";

import * as React from "react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import QRCode from "qrcode";
import { format, parseISO } from "date-fns";
import { Boxes, RefreshCw } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePermissions } from "@/hooks/use-permissions";
import { StatusBadge } from "@/components/assets/status-badge";
import {
  DEPRECIATION_METHOD_LABELS,
  formatCurrency,
  useAsset,
  useAssetDepreciationSummary,
  useAssetLoans,
  useAssetMaintenance,
  useAssetQr,
  useGenerateAssetQr,
} from "@/hooks/use-assets";

function formatDate(value: string | undefined): string {
  if (!value) return "Not available";
  try {
    return format(parseISO(value), "dd MMM yyyy");
  } catch {
    return value;
  }
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right font-medium">{value ?? "Not available"}</span>
    </div>
  );
}

interface AssetDetailDrawerProps {
  presentation?: "drawer" | "page";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  assetId: string;
  /** Rendered in the footer (e.g. maintenance / loan actions). */
  children?: React.ReactNode;
}

function AssetTabs({
  page,
  values,
  children,
}: {
  page: boolean;
  values: string[];
  children: React.ReactNode;
}) {
  return page ? (
    <UrlTabs defaultValue="overview" values={values}>
      {children}
    </UrlTabs>
  ) : (
    <Tabs defaultValue="overview">{children}</Tabs>
  );
}

export function AssetDetailDrawer({
  open,
  presentation = "drawer",
  onOpenChange,
  returnFocusRef,
  assetId,
  children,
}: AssetDetailDrawerProps) {
  const { confirm, dialog } = useManageConfirmation();
  const { can } = usePermissions();
  const assetQuery = useAsset(open ? assetId : undefined);
  const qrQuery = useAssetQr(open ? assetId : undefined);
  const canReadMaintenance = can("assets:maintenance", "read");
  const canReadLoans = can("assets:loans", "read");
  const maintenanceQuery = useAssetMaintenance(
    open && canReadMaintenance ? assetId : undefined,
  );
  const loansQuery = useAssetLoans(open && canReadLoans ? assetId : undefined);
  const depreciationQuery = useAssetDepreciationSummary(
    open ? assetId : undefined,
  );
  const generateQrMutation = useGenerateAssetQr(assetId);

  const [qrDataUrl, setQrDataUrl] = React.useState<string>("");

  React.useEffect(() => {
    if (!qrQuery.data?.qrData) return;
    let cancelled = false;
    QRCode.toDataURL(qrQuery.data.qrData, {
      width: 180,
      margin: 1,
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [qrQuery.data?.qrData]);

  const asset = assetQuery.data;

  const content = (
    <div className="px-6 pb-6">
      {dialog}
      {assetQuery.isLoading ? (
        <div className="space-y-4 pt-4">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : assetQuery.error ? (
        <ErrorState title="Unable to load asset" />
      ) : !asset ? (
        <p className="pt-4 text-sm text-muted-foreground">Asset not found.</p>
      ) : (
        <>
          <div className="pt-1 space-y-1">
            <p className="text-lg font-semibold">{asset.name}</p>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="font-mono">
                {asset.assetTag}
              </Badge>
              {asset.brand && asset.model
                ? `${asset.brand} · ${asset.model}`
                : (asset.brand ?? asset.model ?? "")}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <StatusBadge kind="status" value={asset.status} />
              <StatusBadge kind="condition" value={asset.condition} />
            </div>
          </div>

          <AssetTabs
            page={presentation === "page"}
            values={[
              "overview",
              "qr",
              ...(canReadMaintenance ? ["maintenance"] : []),
              ...(canReadLoans ? ["loans"] : []),
              "depreciation",
            ]}
          >
            <TabsList className="flex w-full flex-wrap h-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="qr">QR</TabsTrigger>
              {canReadMaintenance && (
                <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              )}
              {canReadLoans && <TabsTrigger value="loans">Loans</TabsTrigger>}
              <TabsTrigger value="depreciation">Depreciation</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 pt-4">
              {asset.imageUrl && (
                <ContentImage
                  src={asset.imageUrl}
                  alt={asset.name}
                  className="max-h-48 w-full rounded-lg border object-cover"
                />
              )}
              <div className="rounded-lg border p-4">
                <InfoRow label="Category" value={asset.categoryName} />
                <InfoRow label="Department" value={asset.departmentName} />
                <InfoRow label="Branch" value={asset.branchName} />
                <InfoRow label="Custodian" value={asset.custodianName} />
                <InfoRow label="Serial number" value={asset.serialNumber} />
                <InfoRow label="Storage location" value={asset.location} />
              </div>
              <div className="rounded-lg border p-4">
                <InfoRow
                  label="Purchase date"
                  value={formatDate(asset.purchaseDate)}
                />
                <InfoRow
                  label="Purchase price"
                  value={formatCurrency(asset.purchasePrice)}
                />
                <InfoRow
                  label="Current value"
                  value={formatCurrency(asset.currentValue)}
                />
                <InfoRow
                  label="Depreciation"
                  value={
                    asset.depreciationMethod
                      ? DEPRECIATION_METHOD_LABELS[asset.depreciationMethod]
                      : undefined
                  }
                />
              </div>

              {asset.description && (
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium mb-1">Description</p>
                  <p className="text-sm text-muted-foreground">
                    {asset.description}
                  </p>
                </div>
              )}
              {asset.notes && (
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium mb-1">Notes</p>
                  <p className="text-sm text-muted-foreground">{asset.notes}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent
              value="qr"
              className="flex flex-col items-center gap-3 pt-4"
            >
              {qrDataUrl ? (
                <ContentImage
                  src={qrDataUrl}
                  alt={`QR code for ${asset.name}`}
                  className="rounded-lg border"
                  width={180}
                  height={180}
                />
              ) : (
                qrQuery.isLoading ? <div role="status" aria-label="Loading asset QR code" aria-busy="true"><Skeleton className="size-[180px] rounded-lg" /></div> : <p className="text-sm text-muted-foreground">No QR code generated yet.</p>
              )}
              <p className="text-center text-sm text-muted-foreground break-all">
                {qrQuery.data?.qrData}
              </p>
              {can("assets:list", "create") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => confirm({ title: "Generate or refresh asset QR?", subject: asset.name, onConfirm: () => generateQrMutation.mutateAsync(undefined, {
                      onSuccess: () => toast.success("QR code generated"),
                      onError: (e) =>
                        toast.error(
                          getToastErrorMessage(e, "Failed to generate QR code"),
                        ),
                    }) })}
                  disabled={generateQrMutation.isPending}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  {generateQrMutation.isPending
                    ? "Generating..."
                    : "Generate / Refresh QR"}
                </Button>
              )}
            </TabsContent>

            <TabsContent value="maintenance" className="space-y-3 pt-4">
              {maintenanceQuery.isError ? (
                <ErrorState title="Unable to load maintenance history" />
              ) : maintenanceQuery.isLoading ? (
                <LoadingState label="Loading maintenance history" variant="table" rows={3} />
              ) : maintenanceQuery.data?.length ? (
                maintenanceQuery.data.map((record) => (
                  <div key={record.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{record.type}</p>
                      <StatusBadge kind="maintenance" value={record.status} />
                    </div>
                    <p className="text-sm text-muted-foreground pt-1">
                      Scheduled {formatDate(record.scheduledDate)}
                      {record.completedDate
                        ? ` · completed ${formatDate(record.completedDate)}`
                        : ""}
                      {record.cost !== undefined
                        ? ` · ${formatCurrency(record.cost)}`
                        : ""}
                    </p>
                    {record.performedBy && (
                      <p className="text-sm text-muted-foreground">
                        by {record.performedBy}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No maintenance records.
                </p>
              )}
            </TabsContent>

            <TabsContent value="loans" className="space-y-3 pt-4">
              {loansQuery.isError ? (
                <ErrorState title="Unable to load loan history" />
              ) : loansQuery.isLoading ? (
                <LoadingState label="Loading loan history" variant="table" rows={3} />
              ) : loansQuery.data?.length ? (
                loansQuery.data.map((loan) => (
                  <div key={loan.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        {loan.borrowerName ?? "Unknown borrower"}
                      </p>
                      <StatusBadge kind="loan" value={loan.status} />
                    </div>
                    <p className="text-sm text-muted-foreground pt-1">
                      {formatDate(loan.loanDate)} →{" "}
                      {formatDate(loan.expectedReturnDate)}
                      {loan.actualReturnDate
                        ? ` · returned ${formatDate(loan.actualReturnDate)}`
                        : ""}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No loan records.
                </p>
              )}
            </TabsContent>
            <TabsContent value="depreciation" className="space-y-3 pt-4">
              {depreciationQuery.isError ? (
                <ErrorState title="Unable to load depreciation history" />
              ) : depreciationQuery.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : !depreciationQuery.data ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No depreciation records.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2 rounded-lg border p-3">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Purchase Price
                      </p>
                      <p className="font-semibold">
                        {formatCurrency(depreciationQuery.data.purchasePrice)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Depreciated
                      </p>
                      <p className="font-semibold">
                        {formatCurrency(
                          depreciationQuery.data.totalDepreciation,
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Current Value
                      </p>
                      <p className="font-semibold">
                        {formatCurrency(depreciationQuery.data.currentValue)}
                      </p>
                    </div>
                  </div>
                  {depreciationQuery.data.entries.length > 0 && (
                    <div className="rounded-md border">
                      <Table records={depreciationQuery.data.entries ?? []} recordKey="id" recordType="assetDepreciation">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Year</TableHead>
                            <TableHead className="text-right">
                              Opening
                            </TableHead>
                            <TableHead className="text-right">
                              Depreciation
                            </TableHead>
                            <TableHead className="text-right">
                              Closing
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {depreciationQuery.data.entries.map((entry) => (
                            <TableRow key={entry.id}>
                              <TableCell>{entry.year}</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(entry.openingValue)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(entry.depreciationAmount)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(entry.closingValue)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </AssetTabs>

          {children && <div className="pt-4">{children}</div>}
        </>
      )}
    </div>
  );
  if (presentation === "page") return content;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        onCloseAutoFocus={
          returnFocusRef
            ? (event) => {
                const target = returnFocusRef.current;
                if (target?.isConnected) {
                  event.preventDefault();
                  requestAnimationFrame(() => target.focus());
                }
              }
            : undefined
        }
        className="w-full sm:max-w-md overflow-y-auto"
      >
        <SheetHeader className="px-6 pt-6 pb-3">
          <SheetTitle className="flex items-center gap-2">
            <Boxes className="h-5 w-5" />
            Asset Details
          </SheetTitle>
        </SheetHeader>

        {content}
      </SheetContent>
    </Sheet>
  );
}
