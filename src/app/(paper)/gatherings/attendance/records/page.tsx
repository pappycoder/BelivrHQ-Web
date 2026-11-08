"use client";

import { ListTable } from "@/components/shared/list-table";
import * as React from "react";
import {
  CalendarDays,
  ArrowUpDown,
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
  ListPaginationFooter,
  ManageHeading,
  PersonAvatar,
  RowActions,
  SearchField,
  SortDirectionToggle,
} from "@/components/paper/primitives";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ExportDropdown } from "@/components/shared/export-dropdown";
import { ConfirmDeleteDialog } from "@/components/pastoral/confirm-delete-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useAttendanceRecords,
  useAttendanceServices,
  useDeleteAttendance,
  ATTENDANCE_CATEGORIES,
  attendanceCategoryLabel,
  type AttendanceRecord,
  type AttendanceCategory,
} from "@/hooks/use-attendance";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useCurrentProfile } from "@/hooks/use-profile";
import { useBranchesList } from "@/hooks/use-branches";

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
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AttendanceRecordsPage() {
  const { can, ready } = usePermissions();
  const canDelete =
    (ready && can("attendance:records", "delete")) ||
    (ready && can("attendance", "delete"));

  const { data: profile } = useCurrentProfile();
  const isHq = !!profile?.isAdminHq;
  const branches = useBranchesList({ limit: 100 }, { enabled: isHq });
  const [branchId, setBranchId] = React.useState("all");
  const [sortBy, setSortBy] = React.useState<"checkinAt" | "createdAt">(
    "checkinAt",
  );
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(PAGE_SIZE);
  const [serviceId, setServiceId] = React.useState("all");
  const [category, setCategory] = React.useState<"all" | AttendanceCategory>(
    "all",
  );
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [deleteTarget, setDeleteTarget] =
    React.useState<AttendanceRecord | null>(null);

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);
  const services = useAttendanceServices({
    limit: 100,
    branchId: isHq && branchId !== "all" ? branchId : undefined,
  });
  const params = React.useMemo(
    () => ({
      page,
      limit: perPage,
      serviceId: serviceId === "all" ? undefined : serviceId,
      category: category === "all" ? undefined : category,
      startDate: startDate
        ? new Date(`${startDate}T00:00:00`).toISOString()
        : undefined,
      endDate: endDate
        ? new Date(`${endDate}T23:59:59.999`).toISOString()
        : undefined,
      search: search || undefined,
      branchId: isHq && branchId !== "all" ? branchId : undefined,
      sortBy,
      sortOrder,
    }),
    [
      page,
      perPage,
      serviceId,
      category,
      startDate,
      endDate,
      search,
      branchId,
      isHq,
      sortBy,
      sortOrder,
    ],
  );
  const records = useAttendanceRecords(params);
  const del = useDeleteAttendance();

  const rows = records.data?.data ?? [];

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
        <StatCard
          label="Matching records"
          value={total}
          tone="brand"
          icon={<CalendarDays className="size-4" />}
          deltaLabel={`page ${page} of ${totalPages}`}
        />
        <StatCard
          label="Members this page"
          value={rows.filter((r) => r.memberId).length}
          tone="moss"
          icon={<Users className="size-4" />}
        />
        <StatCard
          label="Visitors this page"
          value={rows.filter((r) => !r.memberId).length}
          tone="gold"
          icon={<UserRound className="size-4" />}
        />
        <StatCard
          label="Children this page"
          value={rows.filter((r) => r.category === "children").length}
          tone="sky"
        />
      </div>

      <div
        role="group"
        aria-label="Attendance record filters"
        className="space-y-3"
      >
        <div className="flex flex-wrap items-center gap-2">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search by name…"
            className="w-full max-w-xs"
          />
          <div className="ml-auto flex max-w-full flex-wrap items-center gap-2">
            <Select
              value={serviceId}
              onValueChange={(value) => {
                setServiceId(value);
                setPage(1);
              }}
            >
              <SelectTrigger
                aria-label="Gathering"
                disabled={services.isLoading || services.isError}
                className="h-8 w-40 rounded-full border-line bg-card text-[11px] shadow-none"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All gatherings</SelectItem>
                {(services.data?.data ?? []).map((service) => (
                  <SelectItem key={service.serviceId} value={service.serviceId}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={category}
              onValueChange={(value) => {
                setCategory(value as typeof category);
                setPage(1);
              }}
            >
              <SelectTrigger
                aria-label="Attendance category"
                className="h-8 w-40 rounded-full border-line bg-card text-[11px] shadow-none"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {ATTENDANCE_CATEGORIES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isHq && (
              <Select
                value={branchId}
                onValueChange={(value) => {
                  setBranchId(value);
                  setServiceId("all");
                  setPage(1);
                }}
              >
                <SelectTrigger
                  aria-label="Attendance branch"
                  data-prefix-icon="building"
                  disabled={branches.isLoading || branches.isError}
                  className="h-8 w-40 rounded-full border-line bg-card text-[11px] shadow-none"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {(branches.data?.data ?? []).map((branch) => (
                    <SelectItem key={branch.branchId} value={branch.branchId}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select
              value={sortBy}
              onValueChange={(value) => {
                setSortBy(value as typeof sortBy);
                setPage(1);
              }}
            >
              <SelectTrigger
                aria-label="Sort attendance records"
                data-prefix-icon="none"
                className="h-8 w-40 rounded-full border-line bg-card text-[11px] shadow-none"
              >
                <ArrowUpDown className="size-3" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checkinAt">Check-in date</SelectItem>
                <SelectItem value="createdAt">Date added</SelectItem>
              </SelectContent>
            </Select>
            <SortDirectionToggle
              ascending={sortOrder === "asc"}
              onToggle={() => {
                setSortOrder((value) => (value === "asc" ? "desc" : "asc"));
                setPage(1);
              }}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[10px] text-ink-faint">
            From
            <Input
              picker="native"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="h-8 w-[155px] rounded-full border-line bg-card px-3 text-[11px] shadow-none"
              aria-label="From date"
            />
          </label>
          <label className="flex items-center gap-2 text-[10px] text-ink-faint">
            To
            <Input
              picker="native"
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="h-8 w-[155px] rounded-full border-line bg-card px-3 text-[11px] shadow-none"
              aria-label="To date"
            />
          </label>
          {(query ||
            serviceId !== "all" ||
            category !== "all" ||
            branchId !== "all" ||
            startDate ||
            endDate) && (
            <button
              className="text-xs text-ink-soft underline underline-offset-4"
              onClick={() => {
                setQuery("");
                setSearch("");
                setServiceId("all");
                setCategory("all");
                setBranchId("all");
                setStartDate("");
                setEndDate("");
                setPage(1);
              }}
            >
              Clear filters
            </button>
          )}
        </div>
        {services.isError && (
          <button
            className="text-xs text-ink-soft underline"
            onClick={() => services.refetch()}
          >
            Couldn’t load gatherings. Retry
          </button>
        )}
        {isHq && branches.isError && (
          <button
            className="text-xs text-ink-soft underline"
            onClick={() => branches.refetch()}
          >
            Couldn’t load branches. Retry
          </button>
        )}
      </div>

      {records.isError ? (
        <EmptyState
          icon={<CalendarDays />}
          title="Attendance records could not be loaded"
          description="Try loading the register again."
          action={
            <Button variant="outline" onClick={() => records.refetch()}>
              Retry
            </Button>
          }
        />
      ) : records.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Download />}
          title="No records match"
          description="Widen the date range, or choose another gathering."
        />
      ) : (
        <div className="paper-card overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <ListTable
              className="min-w-[620px]"
              tableId="gatherings-attendance-records-1"
              records={rows ?? []}
              recordKey="attendanceId"
            >
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
                  <div
                    key={record.attendanceId}
                    className="group grid grid-cols-[minmax(0,1.5fr)_0.8fr_minmax(0,1.2fr)_0.8fr_0.8fr_auto] items-center gap-3 px-5 py-2.5 text-xs"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <PersonAvatar
                        name={
                          record.memberName ?? record.visitorName ?? "Guest"
                        }
                        size="xs"
                      />
                      <span className="min-w-0 truncate font-medium">
                        {record.memberName ?? record.visitorName ?? "Member"}
                      </span>
                    </span>
                    <span>
                      <Tag tone={record.memberId ? "moss" : "gold"}>
                        {record.memberId ? "member" : "visitor"}
                      </Tag>
                    </span>
                    <span className="min-w-0 truncate text-[11px] text-ink-soft">
                      {record.serviceName ?? record.eventName ?? "—"}
                    </span>
                    <span className="text-[11px] capitalize text-ink-faint">
                      {attendanceCategoryLabel(record.category) ?? "—"}
                    </span>
                    <span className="num text-[10px] text-ink-faint">
                      {stamp(record.checkInAt)}
                    </span>
                    <div className="flex justify-end">
                      {canDelete ? (
                        <RowActions
                          actions={[
                            {
                              label: "Undo this check-in",
                              icon: <Undo2 />,
                              tone: "danger",
                              onSelect: () => setDeleteTarget(record),
                              bulk: {
                                key: "undo",
                                label: "Undo selected check-ins",
                                destructive: true,
                                run: () => del.mutateAsync(record.attendanceId),
                              },
                            },
                          ]}
                        />
                      ) : (
                        <span className="flex items-center gap-1 text-[9px] text-ink-faint opacity-0 group-hover:opacity-100">
                          <LogIn className="size-2.5" />{" "}
                          {record.source === "walk_in"
                            ? "walk-in"
                            : record.source || "—"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ListTable>
          </div>
          <ListPaginationFooter
            page={page}
            perPage={perPage}
            total={total}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
            itemName="records"
            pending={records.isFetching}
          />
        </div>
      )}

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(value) => !value && setDeleteTarget(null)}
        title="Undo this check-in?"
        description={
          deleteTarget
            ? `${deleteTarget.memberName ?? deleteTarget.visitorName ?? "This record"} will be removed from the count.`
            : ""
        }
        confirmLabel="Undo check-in"
        pending={del.isPending}
        pendingLabel="Undoing…"
        onConfirm={() => {
          if (!deleteTarget) return;
          del.mutate(deleteTarget.attendanceId, {
            onSuccess: () => {
              toast("Check-in reversed.");
              setDeleteTarget(null);
            },
            onError: () => toast.error("Couldn't undo it."),
          });
        }}
      />
    </div>
  );
}
