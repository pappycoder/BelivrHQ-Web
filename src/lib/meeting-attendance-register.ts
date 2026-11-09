import type { CellGroupAttendanceRecord } from "@/hooks/use-admin";

export type AttendanceSort = "date" | "attendee" | "type" | "status";
export function meetingAttendanceRows(
  records: CellGroupAttendanceRecord[],
  filters: {
    search: string;
    status: string;
    type: string;
    sort: AttendanceSort;
    ascending: boolean;
  },
) {
  const terms = filters.search
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  return records
    .map((record) => ({
      ...record,
      attendee:
        (record.memberId
          ? [record.firstName, record.lastName].filter(Boolean).join(" ")
          : record.visitorName ||
            [record.firstName, record.lastName].filter(Boolean).join(" ")
        ).trim() || (record.memberId ? "Member" : "Visitor"),
      type: record.memberId ? "Member" : "Visitor",
      date: record.meetingDate.slice(0, 10),
      notes: record.notes ?? "",
    }))
    .filter(
      (row) =>
        (filters.status === "all" || row.status === filters.status) &&
        (filters.type === "all" || row.type === filters.type) &&
        terms.every((term) =>
          `${row.attendee} ${row.notes}`.toLowerCase().includes(term),
        ),
    )
    .sort((a, b) => {
      const comparison = a[filters.sort].localeCompare(
        b[filters.sort],
        undefined,
        { numeric: true, sensitivity: "base" },
      );
      return (
        (filters.ascending ? comparison : -comparison) ||
        a.attendee.localeCompare(b.attendee) ||
        a.id.localeCompare(b.id)
      );
    });
}
