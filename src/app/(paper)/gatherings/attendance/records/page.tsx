"use client";

import * as React from "react";
import {
  CalendarDays,
  Download,
  LogIn,
  Undo2,
  UserRound,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { fetchAllPages, listUrl } from "@/lib/export-all";
import type { ExportColumn } from "@/lib/export-utils";
import { toast } from "@/lib/toast";
import { PageHeader } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import {
  EmptyState,
  FilterChip,
  ManageHeading,
  PersonAvatar,
  RowActions,
  SearchField,
} from "@/components/paper/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ExportDropdown } from "@/components/shared/export-dropdown";
import { ConfirmDeleteDialog } from "@/components/pastoral/confirm-delete-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import { useAttendanceRecords, useAttendanceServices, useDeleteAttendance, ATTENDANCE_CATEGORIES, attendanceCategoryLabel, type AttendanceRecord, type AttendanceCategory } from "@/hooks/use-attendance";
import { number } from "@/lib/paper/format";

const PAGE_SIZE = 20;

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: "name", label: "Name" },
  { key: "type", label: "Type" },
  { key: "service", label: "Gathering" },
  { key: "category", label: "Category" },
  { key: "source", label: "Source" },
  { key: "when", label: "Checked in" },
];

function toExportRow(record: AttendanceRecord) {
  return {
    name: record.memberName ?? record.visitorName ?? "Member",
    type: record.memberId ? "member" : "visitor",
    service: record.serviceName ?? record.eventName ?? "",
    category: attendanceCategoryLabel(record.category) ?? "",
    source: record.source ?? "",
    when: new Date(record.checkInAt).toISOString(),
  };
}

function stamp(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function AttendanceRecordsPage() {
  const { can, ready } = usePermissions();
  const canDelete = ready && can("attendance:records", "delete") || ready && can("attendance", "delete");

  const [page, setPage] = React.useState(1);
  const [serviceId, setServiceId] = React.useState("all");
  const [category, setCategory] = React.useState<"all" | AttendanceCategory>("all");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState<AttendanceRecord | null>(null);

  const services = useAttendanceServices({ limit: 100 });
  const params = React.useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      serviceId: serviceId === "all" ? undefined : serviceId,
      category: category === "all" ? undefined : category,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    [page, serviceId, category, startDate, endDate],
  );
  const records = useAttendanceRecords(params);
  const del = useDeleteAttendance();

  const rows = React.useMemo(() => {
    const all = records.data?.data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((r) => (r.memberName ?? r.visitorName ?? "").toLowerCase().includes(q));
  }, [records.data, query]);

  const total = records.data?.meta?.total ?? 0;
  const totalPages = Math.max(1, records.data?.meta?.totalPages ?? 1);

  const fetchAllRows = React.useCallback(async () => {
    const all = await fetchAllPages<AttendanceRecord>((p) =>
      api.get(listUrl("/attendance", { ...params, page: p, limit: 100 })),
    );
    return all.map(toExportRow);
  }, [params]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gatherings · Attendance"
        title="The record book."
        description="Every counted head, filterable and exportable — the paper trail of a church that shows up."
        actions={
          <ExportDropdown
            tableId="attendance-records"
            columns={EXPORT_COLUMNS}
            data={rows.map(toExportRow)}
            title="Attendance records"
            filename="attendance-records"
            disabled={!rows.length}
            fetchAllRows={fetchAllRows}
          />
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Matching records" value={total} tone="brand" icon={<CalendarDays className="size-4" />} deltaLabel={`page ${page} of ${totalPages}`} />
        <StatCard label="Members this page" value={rows.filter((r) => r.memberId).length} tone="moss" icon={<Users className="size-4" />} />
        <StatCard label="Visitors this page" value={rows.filter((r) => !r.memberId).length} tone="gold" icon={<UserRound className="size-4" />} />
        <StatCard label="Children this page" value={rows.filter((r) => r.category === "children").length} tone="sky" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchField value={query} onChange={setQuery} placeholder="Filter by name…" className="w-full max-w-[200px]" />
        <select value={serviceId} onChange={(e) => { setServiceId(e.target.value); setPage(1); }} className="h-8 rounded-full border border-line bg-card px-3 text-[11px] outline-none">
          <option value="all">All gatherings</option>
          {(services.data?.data ?? []).map((s) => <option key={s.serviceId} value={s.serviceId}>{s.name}</option>)}
        </select>
        <FilterChip active={category === "all"} onClick={() => { setCategory("all"); setPage(1); }}>All</FilterChip>
        {ATTENDANCE_CATEGORIES.map((item) => (
          <FilterChip key={item.value} active={category === item.value} onClick={() => { setCategory(item.value); setPage(1); }}>
            {item.label}
          </FilterChip>
        ))}
        <span className="mx-1 hidden h-4 w-px bg-line sm:block" />
        <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className="h-8 w-[140px] rounded-full border-line bg-card px-3 text-[11px] shadow-none" aria-label="From date" />
        <span className="text-[10px] text-ink-faint">to</span>
        <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} className="h-8 w-[140px] rounded-full border-line bg-card px-3 text-[11px] shadow-none" aria-label="To date" />
      </div>

      {records.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={<Download />} title="No records match" description="Widen the date range, or choose another gathering." />
      ) : (
        <div className="paper-card overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <div className="min-w-[620px]">
              <div className="rule-label grid grid-cols-[minmax(0,1.5fr)_0.8fr_minmax(0,1.2fr)_0.8fr_0.8fr_auto] items-center gap-3 border-b border-line px-5 py-2.5">
                <span>Name</span>
                <span>Type</span>
                <span>Gathering</span>
                <span>Category</span>
                <span>When</span>
                <ManageHeading />
              </div>
              <div className="divide-y divide-line/70">
                {rows.map((record) => (
                  <div key={record.attendanceId} className="group grid grid-cols-[minmax(0,1.5fr)_0.8fr_minmax(0,1.2fr)_0.8fr_0.8fr_auto] items-center gap-3 px-5 py-2.5 text-xs">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <PersonAvatar name={record.memberName ?? record.visitorName ?? "Guest"} size="xs" />
                      <span className="min-w-0 truncate font-medium">{record.memberName ?? record.visitorName ?? "Member"}</span>
                    </span>
                    <span><Tag tone={record.memberId ? "moss" : "gold"}>{record.memberId ? "member" : "visitor"}</Tag></span>
                    <span className="min-w-0 truncate text-[11px] text-ink-soft">{record.serviceName ?? record.eventName ?? "—"}</span>
                    <span className="text-[11px] capitalize text-ink-faint">{attendanceCategoryLabel(record.category) ?? "—"}</span>
                    <span className="num text-[10px] text-ink-faint">{stamp(record.checkInAt)}</span>
                    <div className="flex justify-end">
                      {canDelete ? (
                        <RowActions
                          actions={[
                            {
                              label: "Undo this check-in",
                              icon: <Undo2 />,
                              tone: "danger",
                              onSelect: () => setDeleteTarget(record),
                            },
                          ]}
                        />
                      ) : (
                        <span className="flex items-center gap-1 text-[9px] text-ink-faint opacity-0 group-hover:opacity-100">
                          <LogIn className="size-2.5" /> {record.source === "walk_in" ? "walk-in" : record.source || "—"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-line px-5 py-2.5 text-[11px] text-ink-faint">
            <span>
              <span className="num font-medium text-ink">{number((page - 1) * PAGE_SIZE + rows.length)}</span> of <span className="num">{total}</span> shown so far
            </span>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="xs" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-full border-line bg-card">Prev</Button>
              <span className="num">{page} / {totalPages}</span>
              <Button variant="outline" size="xs" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded-full border-line bg-card">Next</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(value) => !value && setDeleteTarget(null)}
        title="Undo this check-in?"
        description={deleteTarget ? `${deleteTarget.memberName ?? deleteTarget.visitorName ?? "This record"} will be removed from the count.` : ""}
        confirmLabel="Undo check-in"
        pending={del.isPending}
        pendingLabel="Undoing…"
        onConfirm={() => {
          if (!deleteTarget) return;
          del.mutate(deleteTarget.attendanceId, {
            onSuccess: () => { toast("Check-in reversed."); setDeleteTarget(null); },
            onError: () => toast.error("Couldn't undo it."),
          });
        }}
      />
    </div>
  );
}
