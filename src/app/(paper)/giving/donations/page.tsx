"use client";

import { Input } from "@/components/ui/input";

import * as React from "react";
import {
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
import { EmptyState, FilterChip, ListPaginationFooter } from "@/components/paper/primitives";
import { StaggerGroup, StaggerItem } from "@/components/paper/motion/primitives";
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

const STATUS_TONES: Record<GivingTransaction["status"], "moss" | "gold" | "rose" | "neutral"> = {
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
  { key: "giver", label: "Giver" },
  { key: "category", label: "Fund" },
  { key: "amount", label: "Amount" },
  { key: "type", label: "Method" },
  { key: "status", label: "Status" },
  { key: "reference", label: "Reference" },
  { key: "receipt", label: "Receipt #" },
];

function exportRows(rows: GivingTransaction[]) {
  return rows.map((t) => ({
    date: (t.givingDate ?? t.createdAt).slice(0, 10),
    giver: t.memberName ?? t.cellGroupName ?? t.title ?? "Unattributed",
    category: t.categoryName,
    amount: t.amount,
    type: TYPE_LABELS[t.type] ?? t.type,
    status: t.status,
    reference: t.paymentReference ?? "",
    receipt: t.receiptNumber ?? "",
  }));
}

function ReceiptActions({ transaction }: { transaction: GivingTransaction }) {
  const send = useSendReceipt(transaction.transactionId);
  const [busy, setBusy] = React.useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const blob = await api.getBlob(`/giving/transactions/${transaction.transactionId}/receipt`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${(transaction.receiptNumber || transaction.transactionId).replace(/[^a-zA-Z0-9_.-]+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Receipt downloaded.");
    } catch (error) {
      toast.error("Failed to download receipt", { description: getToastErrorMessage(error, "Try again shortly.") });
    } finally {
      setBusy(false);
    }
  };

  const sendTo = (channel: "whatsapp" | "email") => {
    send.mutate(channel, {
      onSuccess: () => toast(`Receipt sent by ${channel}.`),
      onError: (e) => toast.error("Failed to send receipt", { description: getToastErrorMessage(e, "The delivery channel may need configuring.") }),
    });
  };

  return (
    <>
      <DropdownMenuItem className="gap-2 text-xs" disabled={busy} onClick={download}>
        <FileDown className="size-3.5" /> {busy ? "Preparing…" : "Download receipt"}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem className="gap-2 text-xs" disabled={send.isPending} onClick={() => sendTo("whatsapp")}>
        <Send className="size-3.5" /> Send via WhatsApp
      </DropdownMenuItem>
      <DropdownMenuItem className="gap-2 text-xs" disabled={send.isPending} onClick={() => sendTo("email")}>
        <Mail className="size-3.5" /> Send via Email
      </DropdownMenuItem>
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
  const [recordOpen, setRecordOpen] = React.useState(false);

  const params = React.useMemo(() => ({
    page,
    limit: perPage,
    status: status || undefined,
    type: type || undefined,
    categoryId: categoryId || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    sortBy: "giving_date" as const,
    sortOrder: "desc" as const,
  }), [page, perPage, status, type, categoryId, startDate, endDate]);

  const transactions = useGivingTransactions(params);
  const categories = useGivingCategories({ limit: 100 });
  const rows = transactions.data?.data ?? [];
  const total = transactions.data?.meta?.total ?? 0;
  const pageSum = rows.reduce((sum, t) => (t.status === "success" ? sum + t.amount : sum), 0);
  const activeCategories = (categories.data?.data ?? []).filter((c) => !c.archivedAt);

  const fetchAllExport = React.useCallback(async () => {
    const all = await fetchAllPages<GivingTransaction>((p) =>
      api.get(listUrl("/giving/transactions", { ...params, page: p, limit: 100 })),
    );
    return exportRows(all);
  }, [params]);

  const clearFilters = () => {
    setStatus(""); setType(""); setCategoryId(""); setStartDate(""); setEndDate(""); setPage(1);
  };
  const anyFilter = status || type || categoryId || startDate || endDate;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Giving · Donations"
        title="Every gift, one feed."
        description="Attributed where a name exists, counted once always — receipts stay one click away."
        actions={
          <>
            <ExportDropdown
              tableId="donations"
              columns={EXPORT_COLUMNS}
              data={exportRows(rows)}
              title="Donations"
              filename="giving-records"
              disabled={!rows.length}
              fetchAllRows={fetchAllExport}
            />
            {canRecord ? (
              <Button className="h-9 gap-1.5 rounded-full text-xs" onClick={() => setRecordOpen(true)}>
                <HandCoins className="size-3.5" /> Record Giving
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Matching gifts" value={total} tone="brand" icon={<HandCoins className="size-4" />} deltaLabel={anyFilter ? "filtered" : "all recorded"} />
        <StatCard label="On this page" value={pageSum} prefix="₦" tone="moss" deltaLabel="successful only" />
        <StatCard label="Pending" value={rows.filter((t) => t.status === "pending").length} tone="gold" deltaLabel="this page" />
        <StatCard label="Funds in use" value={activeCategories.length} tone="sky" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip active={!anyFilter} onClick={clearFilters}>All gifts</FilterChip>
        {(["success", "pending", "failed", "reversed"] as const).map((s) => (
          <FilterChip key={s} active={status === s} onClick={() => { setStatus(status === s ? "" : s); setPage(1); }}>{s}</FilterChip>
        ))}
        <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className="h-8 rounded-full border border-line bg-card px-3 text-[11px] outline-none" aria-label="Method filter">
          <option value="">Any method</option>
          <option value="cash">Cash</option>
          <option value="bank_transfer">Bank</option>
          <option value="digital">Online</option>
        </select>
        <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }} className="h-8 rounded-full border border-line bg-card px-3 text-[11px] outline-none" aria-label="Fund filter">
          <option value="">All funds</option>
          {activeCategories.map((c) => <option key={c.categoryId} value={c.categoryId}>{c.name}</option>)}
        </select>
        <span className="flex items-center gap-1.5 text-[11px] text-ink-faint">
          <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className="h-8 rounded-full border border-line bg-card px-2.5 text-[11px] outline-none" aria-label="From date" />
          →
          <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} className="h-8 rounded-full border border-line bg-card px-2.5 text-[11px] outline-none" aria-label="To date" />
        </span>
      </div>

      {transactions.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
      ) : transactions.isError ? (
        <EmptyState icon={<HandCoins />} title="The ledger couldn&apos;t open" action={<Button size="sm" variant="outline" className="rounded-full border-line text-xs" onClick={() => transactions.refetch()}>Retry</Button>} />
      ) : rows.length === 0 ? (
        <EmptyState icon={<HandCoins />} title={anyFilter ? "Nothing matches these filters" : "No gifts recorded yet"} description="Recording the Sunday plate is where the season's story starts." />
      ) : (
        <StaggerGroup className="paper-card divide-y divide-line/70 overflow-hidden rounded-2xl">
          <div className="rule-label grid grid-cols-[0.9fr_minmax(0,1.6fr)_1fr_0.9fr_1fr_auto] items-center gap-3 border-b border-line px-5 py-2.5">
            <span>Date</span>
            <span>Giver &amp; link</span>
            <span>Fund</span>
            <span>Method</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Receipt</span>
          </div>
          {rows.map((tx) => (
            <StaggerItem key={tx.transactionId}>
              <div className="group grid grid-cols-[0.9fr_minmax(0,1.6fr)_1fr_0.9fr_1fr_auto] items-center gap-3 px-5 py-3">
                <span className="num text-[11px] text-ink-soft">{formatDate(tx.givingDate ?? tx.createdAt)}</span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium">{tx.memberName ?? tx.title ?? "Unattributed"}</span>
                  <span className="flex items-center gap-1.5 truncate text-[10px] text-ink-faint">
                    {tx.givingType === "cell_group" ? <Tag tone="gold">cell group</Tag> : null}
                    {tx.serviceName ? <Tag tone="sky">{tx.serviceName}</Tag> : null}
                    {tx.eventName ? <Tag tone="brand">{tx.eventName}</Tag> : null}
                    {tx.cellGroupName ? <span className="truncate">{tx.cellGroupName}</span> : null}
                    {!tx.memberName && !tx.serviceName && !tx.eventName && !tx.cellGroupName ? "Sunday collection" : null}
                  </span>
                </span>
                <span className="truncate text-[11px] text-ink-soft">{tx.categoryName}</span>
                <span className="flex items-center gap-2">
                  <span className="text-[11px]">{TYPE_LABELS[tx.type] ?? tx.type}</span>
                  <Tag tone={STATUS_TONES[tx.status]} dot>{tx.status}</Tag>
                </span>
                <span className="num text-right text-xs font-semibold">{formatNaira(tx.amount)}</span>
                <span className="flex justify-end">
                  {tx.status === "success" ? (
                    <DropdownMenu>
                      <ActionTooltip label={`Receipt actions for gift of ${tx.amount}`}>
                        <DropdownMenuTrigger asChild>
                          <button type="button" aria-label={`Receipt actions for gift of ${tx.amount}`} className="grid size-7 place-items-center rounded-full text-ink-faint hover:bg-muted hover:text-ink">
                            <MoreHorizontal className="size-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                      </ActionTooltip>
                      <DropdownMenuContent align="end" className="w-52">
                        <ReceiptActions transaction={tx} />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <span className="num text-[9px] text-ink-faint">{tx.receiptNumber ?? "—"}</span>
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
      )}

      <p className="flex items-center justify-center gap-1.5 text-[10px] text-ink-faint">
        <Download className="size-3" /> Receipts carry the church branding; sending them honours the configured provider channels.
      </p>

      <RecordCashDialog open={recordOpen} onOpenChange={setRecordOpen} />
    </div>
  );
}
