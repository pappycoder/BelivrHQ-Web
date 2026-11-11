"use client";

import { useManageConfirmation } from "@/components/shared/manage-confirmation";

import { ListTable } from "@/components/shared/list-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import * as React from "react";
import { givingSource } from "@/lib/giving-source";
import { GivingSourceIdentity } from "@/components/giving/giving-source-identity";
import {
  CalendarDays,
  ChevronDown,
  Download,
  FileDown,
  HandCoins,
  Mail,
  MoreHorizontal,
  Send,
} from "lucide-react";
import { api } from "@/lib/api";
import { fetchAllPages, listUrl } from "@/lib/export-all";
import type { ExportColumn } from "@/lib/export-utils";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { PageHeader } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import {
  EmptyState,
  FilterChip,
  ListPaginationFooter,
} from "@/components/paper/primitives";
import {
  StaggerGroup,
  StaggerItem,
} from "@/components/paper/motion/primitives";
import { Button } from "@/components/ui/button";
import { ActionTooltip } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExportDropdown } from "@/components/shared/export-dropdown";
import { RecordCashDialog } from "@/components/giving/record-cash-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useGivingTransactions,
  useGivingCategories,
  useSendReceipt,
  type GivingTransaction,
} from "@/hooks/use-giving";
import { formatDate } from "@/hooks/use-media";
import { formatNaira } from "@/hooks/use-analytics";

const PAGE_SIZE = 15;

const STATUS_TONES: Record<
  GivingTransaction["status"],
  "moss" | "gold" | "rose" | "neutral"
> = {
  success: "moss",
  pending: "gold",
  failed: "rose",
  reversed: "neutral",
};

const TYPE_LABELS: Record<GivingTransaction["type"], string> = {
  digital: "Online",
  cash: "Cash",
  bank_transfer: "Bank",
};

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: "date", label: "Giving date" },
  { key: "giver", label: "Giving source" },
  { key: "context", label: "Service / event / group" },
  { key: "category", label: "Category" },
  { key: "amount", label: "Amount" },
  { key: "type", label: "Method" },
  { key: "status", label: "Status" },
  { key: "reference", label: "Reference" },
  { key: "receipt", label: "Receipt #" },
];

function exportRows(rows: GivingTransaction[]) {
  return rows.map((t) => ({
    date: (t.givingDate ?? t.createdAt).slice(0, 10),
    giver: givingSource(t).label,
    context: givingSource(t).context,
    category: t.categoryName,
    amount: t.amount,
    type: TYPE_LABELS[t.type] ?? t.type,
    status: t.status,
    reference: t.paymentReference ?? "",
    receipt: t.receiptNumber ?? "",
  }));
}

function ReceiptActions({ transaction }: { transaction: GivingTransaction }) {
  const { confirm, dialog } = useManageConfirmation();
  const send = useSendReceipt(transaction.transactionId);
  const [busy, setBusy] = React.useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const blob = await api.getBlob(
        `/giving/transactions/${transaction.transactionId}/receipt`,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${(transaction.receiptNumber || transaction.transactionId).replace(/[^a-zA-Z0-9_.-]+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Receipt downloaded.");
    } catch (error) {
      toast.error("Failed to download receipt", {
        description: getToastErrorMessage(error, "Try again shortly."),
      });
    } finally {
      setBusy(false);
    }
  };

  const sendTo = (channel: "whatsapp" | "email") => {
    confirm({
      title: `Send receipt via ${channel === "email" ? "email" : "WhatsApp"}?`,
      subject:
        transaction.memberName ??
        transaction.cellGroupName ??
        transaction.receiptNumber ??
        "Giving receipt",
      description:
        "The receipt will be sent using the configured delivery channel.",
      onConfirm: () =>
        send.mutateAsync(channel, {
          onSuccess: () => toast(`Receipt sent by ${channel}.`),
          onError: (e) =>
            toast.error("Failed to send receipt", {
              description: getToastErrorMessage(
                e,
                "The delivery channel may need configuring.",
              ),
            }),
        }),
    });
  };

  return (
    <>
      {dialog}
      <DropdownMenu>
        <ActionTooltip
          label={`Receipt actions for gift of ${transaction.amount}`}
        >
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Receipt actions for gift of ${transaction.amount}`}
              className="grid size-7 place-items-center rounded-full text-ink-faint hover:bg-muted hover:text-ink"
            >
              <MoreHorizontal className="size-3.5" />
            </button>
          </DropdownMenuTrigger>
        </ActionTooltip>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem
            className="gap-2 text-sm"
            disabled={busy}
            onClick={download}
          >
            <FileDown className="size-3.5" />{" "}
            {busy ? "Preparing…" : "Download receipt"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2 text-sm"
            disabled={send.isPending}
            onClick={() => sendTo("whatsapp")}
          >
            <Send className="size-3.5" /> Send via WhatsApp
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2 text-sm"
            disabled={send.isPending}
            onClick={() => sendTo("email")}
          >
            <Mail className="size-3.5" /> Send via Email
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export default function GivingDonationsPage() {
  const { can, ready } = usePermissions();
  const canRecord = ready && can("giving", "create");

  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(PAGE_SIZE);
  const [status, setStatus] = React.useState("");
  const [type, setType] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [dateOpen, setDateOpen] = React.useState(false);
  const [dateDraft, setDateDraft] = React.useState({ from: "", to: "" });
  const invalidRange = !!dateDraft.from && !!dateDraft.to && dateDraft.from > dateDraft.to;
  const [recordOpen, setRecordOpen] = React.useState(false);

  const params = React.useMemo(
    () => ({
      page,
      limit: perPage,
      status: status || undefined,
      type: type || undefined,
      categoryId: categoryId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      sortBy: "giving_date" as const,
      sortOrder: "desc" as const,
    }),
    [page, perPage, status, type, categoryId, startDate, endDate],
  );

  const transactions = useGivingTransactions(params);
  const categories = useGivingCategories({ limit: 100 });
  const rows = transactions.data?.data ?? [];
  const total = transactions.data?.meta?.total ?? 0;
  const pageSum = rows.reduce(
    (sum, t) => (t.status === "success" ? sum + t.amount : sum),
    0,
  );
  const activeCategories = (categories.data?.data ?? []).filter(
    (c) => !c.archivedAt,
  );

  const fetchAllExport = React.useCallback(async () => {
    const all = await fetchAllPages<GivingTransaction>((p) =>
      api.get(
        listUrl("/giving/transactions", { ...params, page: p, limit: 100 }),
      ),
    );
    return exportRows(all);
  }, [params]);

  const clearFilters = () => {
    setStatus("");
    setType("");
    setCategoryId("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };
  const anyFilter = status || type || categoryId || startDate || endDate;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Giving · Records"
        title="Every gift, one feed."
        description="Individual gifts, general collections and group giving, each with its source and receipt."
        actions={
          <>
            <ExportDropdown
              tableId="donations"
              columns={EXPORT_COLUMNS}
              data={exportRows(rows)}
              title="Giving records"
              filename="giving-records"
              disabled={!rows.length}
              fetchAllRows={fetchAllExport}
            />
            {canRecord ? (
              <Button
                className="h-9 gap-1.5 rounded-full text-sm"
                onClick={() => setRecordOpen(true)}
              >
                <HandCoins className="size-3.5" /> Record Giving
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Matching gifts"
          value={total}
          tone="brand"
          icon={<HandCoins className="size-4" />}
          deltaLabel={anyFilter ? "filtered" : "all recorded"}
        />
        <StatCard
          label="On this page"
          value={pageSum}
          prefix="₦"
          tone="moss"
          deltaLabel="successful only"
        />
        <StatCard
          label="Pending"
          value={rows.filter((t) => t.status === "pending").length}
          tone="gold"
          deltaLabel="this page"
        />
        <StatCard
          label="Categories in use"
          value={activeCategories.length}
          tone="sky"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip active={!anyFilter} onClick={clearFilters}>
          All gifts
        </FilterChip>
        {(["success", "pending", "failed", "reversed"] as const).map((s) => (
          <FilterChip
            key={s}
            active={status === s}
            onClick={() => {
              setStatus(status === s ? "" : s);
              setPage(1);
            }}
          >
            {s}
          </FilterChip>
        ))}
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
          className="h-8 rounded-full border border-line bg-card px-3 text-sm outline-none"
          aria-label="Method filter"
        >
          <option value="">Any method</option>
          <option value="cash">Cash</option>
          <option value="bank_transfer">Bank</option>
          <option value="digital">Online</option>
        </select>
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setPage(1);
          }}
          className="h-8 rounded-full border border-line bg-card px-3 text-sm outline-none"
          aria-label="Category filter"
        >
          <option value="">All categories</option>
          {activeCategories.map((c) => (
            <option key={c.categoryId} value={c.categoryId}>
              {c.name}
            </option>
          ))}
        </select>
        <Popover open={dateOpen} onOpenChange={open => {
          if (open) setDateDraft({ from: startDate, to: endDate });
          setDateOpen(open);
        }}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" aria-label={startDate || endDate ? `Date range, ${startDate || "any start"} to ${endDate || "any end"}` : "Date range"}
              className={`h-9 max-w-full gap-2 rounded-full border-line text-sm ${startDate || endDate ? "bg-brand/10 text-brand" : "bg-card"}`}>
              <CalendarDays className="size-3.5" />
              <span className="min-w-0 truncate">{startDate || endDate ? `${startDate || "Any start"} → ${endDate || "Any end"}` : "Date range"}</span>
              <ChevronDown className="size-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" aria-label="Filter giving dates" className="space-y-4">
            <p className="text-sm font-medium">Giving date range</p>
            <div className="space-y-2">
              <Label htmlFor="giving-date-from">From date</Label>
              <Input id="giving-date-from" name="fromDate" picker="native" type="date"
                value={dateDraft.from} max={dateDraft.to || undefined}
                onChange={event => setDateDraft(value => ({ ...value, from: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="giving-date-to">To date</Label>
              <Input id="giving-date-to" name="toDate" picker="native" type="date"
                value={dateDraft.to} min={dateDraft.from || undefined}
                aria-invalid={invalidRange || undefined} aria-describedby={invalidRange ? "giving-date-error" : undefined}
                onChange={event => setDateDraft(value => ({ ...value, to: event.target.value }))} />
            </div>
            {invalidRange && <p id="giving-date-error" role="alert" className="text-sm text-destructive">To date must be on or after From date.</p>}
            <div className="flex justify-between gap-2 border-t border-line pt-3">
              <Button type="button" variant="ghost" size="sm" onClick={() => {
                setStartDate(""); setEndDate(""); setDateDraft({ from: "", to: "" }); setPage(1); setDateOpen(false);
              }}>Clear dates</Button>
              <Button type="button" size="sm" disabled={invalidRange} onClick={() => {
                setStartDate(dateDraft.from); setEndDate(dateDraft.to); setPage(1); setDateOpen(false);
              }}>Apply dates</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {transactions.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : transactions.isError ? (
        <EmptyState
          icon={<HandCoins />}
          title="The ledger couldn't open"
          action={
            <Button
              size="sm"
              variant="outline"
              className="rounded-full border-line text-sm"
              onClick={() => transactions.refetch()}
            >
              Retry
            </Button>
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<HandCoins />}
          title={
            anyFilter
              ? "Nothing matches these filters"
              : "No gifts recorded yet"
          }
          description="Recording the Sunday plate is where the season's story starts."
        />
      ) : (
        <ListTable
          className="paper-card min-w-[900px] divide-y divide-line/70 rounded-2xl"
          tableId="giving-donations-1"
          recordType="givingTransaction"
          records={rows ?? []}
          recordKey="transactionId"
        >
          <StaggerGroup className="divide-y divide-line/70">
            <div className="rule-label grid grid-cols-[0.9fr_minmax(0,1.6fr)_1fr_0.9fr_1fr_auto] items-center gap-3 border-b border-line px-5 py-2.5">
              <span>Date</span>
              <span>Giving source</span>
              <span>Category</span>
              <span>Method</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Receipt</span>
            </div>
            {rows.map((tx) => (
              <StaggerItem key={tx.transactionId}>
                <div className="group grid grid-cols-[0.9fr_minmax(0,1.6fr)_1fr_0.9fr_1fr_auto] items-center gap-3 px-5 py-3">
                  <span className="num text-sm text-ink-soft">
                    {formatDate(tx.givingDate ?? tx.createdAt)}
                  </span>
                  <GivingSourceIdentity transaction={tx}>
                    <span className="flex items-center gap-1.5 truncate text-xs text-ink-faint">
                      {givingSource(tx).kind !== "member" ? (
                        <Tag
                          tone={
                            givingSource(tx).kind === "cell_group"
                              ? "gold"
                              : "neutral"
                          }
                        >
                          {givingSource(tx).typeLabel}
                        </Tag>
                      ) : null}
                      {tx.serviceName ? (
                        <Tag tone="sky">{tx.serviceName}</Tag>
                      ) : null}
                      {tx.eventName ? (
                        <Tag tone="brand">{tx.eventName}</Tag>
                      ) : null}
                      {tx.cellGroupMeetingDate ? (
                        <span className="num">
                          {formatDate(tx.cellGroupMeetingDate)}
                        </span>
                      ) : null}
                    </span>
                  </GivingSourceIdentity>
                  <span className="truncate text-sm text-ink-soft">
                    {tx.categoryName}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-sm">
                      {TYPE_LABELS[tx.type] ?? tx.type}
                    </span>
                    <Tag tone={STATUS_TONES[tx.status]} dot>
                      {tx.status}
                    </Tag>
                  </span>
                  <span className="num text-right text-sm font-semibold">
                    {formatNaira(tx.amount)}
                  </span>
                  <span className="flex justify-end">
                    {tx.status === "success" ? (
                      <ReceiptActions transaction={tx} />
                    ) : (
                      <span className="num text-xs text-ink-faint">
                        {tx.receiptNumber ?? "Not available"}
                      </span>
                    )}
                  </span>
                </div>
              </StaggerItem>
            ))}
            <ListPaginationFooter
              page={page}
              perPage={perPage}
              total={total}
              onPageChange={setPage}
              onPerPageChange={setPerPage}
              itemName="gifts"
              pending={transactions.isFetching}
            />
          </StaggerGroup>
        </ListTable>
      )}

      <p className="flex items-center justify-center gap-1.5 text-xs text-ink-faint">
        <Download className="size-3" /> Receipts carry the church branding;
        sending them honours the configured provider channels.
      </p>

      <RecordCashDialog open={recordOpen} onOpenChange={setRecordOpen} />
    </div>
  );
}
