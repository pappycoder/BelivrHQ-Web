"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionCard } from "@/components/paper/section";
import { Tag } from "@/components/paper/stat";
import {
  EmptyState,
  ListPaginationFooter,
  PersonAvatar,
  SearchField,
} from "@/components/paper/primitives";
import { ListTable } from "@/components/shared/list-table";
import { ExportDropdown } from "@/components/shared/export-dropdown";
import type { CellGroupAttendanceRecord } from "@/hooks/use-admin";

export function MeetingAttendanceTable({
  records,
  loading,
  error,
  date,
  onDateChange,
  title,
  action,
  onRetry,
}: {
  records: CellGroupAttendanceRecord[];
  loading?: boolean;
  error?: boolean;
  date: string;
  onDateChange: (date: string) => void;
  title: string;
  action?: ReactNode;
  onRetry?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const rows = useMemo(
    () =>
      records
        .map((record) => ({
          ...record,
          attendee: record.memberId
            ? `${record.firstName} ${record.lastName}`.trim()
            : record.visitorName || "Visitor",
          type: record.memberId ? "Member" : "Visitor",
          date: record.meetingDate.slice(0, 10),
          notes: record.notes ?? "",
        }))
        .filter(
          (row) =>
            (status === "all" || row.status === status) &&
            (!search ||
              `${row.attendee} ${row.notes}`
                .toLowerCase()
                .includes(search.trim().toLowerCase())),
        ),
    [records, search, status],
  );
  const effectivePage = Math.min(
    page,
    Math.max(1, Math.ceil(rows.length / perPage)),
  );
  const paged = rows.slice(
    (effectivePage - 1) * perPage,
    effectivePage * perPage,
  );
  const tableId = title.toLowerCase().replaceAll(/\W+/g, "-");
  return (
    <SectionCard
      eyebrow="Meeting records"
      title={title}
      bodyClassName="p-0"
      actions={
        <>
          <ExportDropdown
            tableId={tableId}
            columns={[
              { key: "attendee", label: "Attendee" },
              { key: "type", label: "Type" },
              { key: "date", label: "Meeting date" },
              { key: "status", label: "Status" },
              { key: "notes", label: "Notes" },
            ]}
            data={rows}
            title={title}
            filename="meeting-attendance"
            disabled={loading || error}
          />
          {action}
        </>
      }
    >
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <SearchField
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search attendee or notes…"
            className="w-full max-w-xs"
          />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            >
              <SelectTrigger
                aria-label={`${title} status`}
                className="h-8 w-40 rounded-full border-line bg-card text-[11px] shadow-none"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {["present", "late", "absent", "excused"].map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[10px] text-ink-faint">
            Meeting date
            <Input
              picker="native"
              aria-label={`${title} meeting date`}
              type="date"
              value={date}
              onChange={(event) => {
                onDateChange(event.target.value);
                setPage(1);
              }}
              className="h-8 w-[155px] rounded-full border-line bg-card px-3 text-[11px] shadow-none"
            />
          </label>
          {(date || search || status !== "all") && (
            <Button
              variant="link"
              className="h-8 text-xs text-ink-soft"
              onClick={() => {
                onDateChange("");
                setSearch("");
                setStatus("all");
                setPage(1);
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>
      {error ? (
        <EmptyState
          title="Attendance records could not be loaded"
          description="Try loading the attendance records again."
          action={
            onRetry && (
              <Button variant="outline" onClick={onRetry}>
                Retry
              </Button>
            )
          }
        />
      ) : loading ? (
        <div className="space-y-2 p-5">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : !rows.length ? (
        <EmptyState
          title="No attendance records match"
          description="Choose another meeting date or clear the filters."
        />
      ) : (
        <>
          <ListTable
            label={title}
            tableId={tableId}
            records={paged}
            recordKey="id"
            recordType="meetingAttendance"
            className="min-w-[680px]"
          >
            <div className="rule-label grid grid-cols-[1.5fr_0.7fr_1fr_0.8fr_1.2fr] items-center gap-3 border-y border-line px-5 py-3">
              <span>Attendee</span>
              <span>Type</span>
              <span>Meeting date</span>
              <span>Status</span>
              <span>Notes</span>
            </div>
            {paged.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-[1.5fr_0.7fr_1fr_0.8fr_1.2fr] items-center gap-3 border-b border-line/70 px-5 py-3 text-xs"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <PersonAvatar name={row.attendee} size="xs" />
                  <span className="truncate font-medium">{row.attendee}</span>
                </div>
                <span>
                  <Tag tone={row.memberId ? "moss" : "gold"}>{row.type}</Tag>
                </span>
                <span className="text-ink-soft">{row.date}</span>
                <span>
                  <Tag
                    tone={
                      row.status === "present"
                        ? "moss"
                        : row.status === "absent"
                          ? "rose"
                          : "neutral"
                    }
                  >
                    {row.status}
                  </Tag>
                </span>
                <span className="truncate text-ink-faint">
                  {row.notes || "—"}
                </span>
              </div>
            ))}
          </ListTable>
          <ListPaginationFooter
            page={effectivePage}
            perPage={perPage}
            total={rows.length}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
            itemName="attendance records"
          />
        </>
      )}
    </SectionCard>
  );
}
