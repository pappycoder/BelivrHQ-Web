"use client";

import { LoadingState } from "@/components/shared/loading-state";
import { useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExportDropdown } from "@/components/shared/export-dropdown";
import type { CellGroupAttendanceRecord } from "@/hooks/use-admin";

export function MeetingAttendanceTable({ records, loading, error, date, onDateChange, title, action }: {
  records: CellGroupAttendanceRecord[]; loading?: boolean; error?: boolean; date: string;
  onDateChange: (date: string) => void; title: string; action?: ReactNode;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const rows = useMemo(() => records.map(record => ({
    id: record.id, attendee: record.memberId ? `${record.firstName} ${record.lastName}`.trim() : record.visitorName || "Visitor",
    type: record.memberId ? "Member" : "Visitor", date: record.meetingDate.slice(0,10), status: record.status, notes: record.notes ?? "",
  })).filter(row => (!status || row.status === status) && (!search || `${row.attendee} ${row.notes}`.toLowerCase().includes(search.toLowerCase()))), [records, search, status]);
  return <section className="rounded-lg border p-4 space-y-4">
    <div className="flex flex-wrap justify-between gap-2 items-center"><h3 className="font-medium">{title} ({rows.length})</h3><div className="flex flex-wrap gap-2">
      <ExportDropdown columns={[{ key: "attendee", label: "Attendee" }, { key: "type", label: "Type" }, { key: "date", label: "Meeting date" }, { key: "status", label: "Status" }, { key: "notes", label: "Notes" }]} data={rows} title={title} filename="meeting-attendance" disabled={loading || error} />{action}
    </div></div>
    <div className="flex flex-wrap items-end gap-3">
      <Label className="grid gap-2">Meeting date<Input aria-label={`${title} meeting date`} type="date" value={date} onChange={event => onDateChange(event.target.value)} /></Label>
      <Label className="grid gap-2">Search<Input aria-label={`${title} search`} placeholder="Attendee or notes" value={search} onChange={event => setSearch(event.target.value)} /></Label>
      <Label className="grid gap-2">Status<select aria-label={`${title} status`} className="h-10 rounded-md border bg-background px-3" value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option>{["present", "late", "absent", "excused"].map(value => <option key={value} value={value}>{value}</option>)}</select></Label>
      <Button variant="ghost" onClick={() => { onDateChange(""); setSearch(""); setStatus(""); }}>Clear filters</Button>
    </div>
    {error ? <p role="alert">Unable to load attendance records.</p> : <Table selectable exportable={false} aria-label={title}><TableHeader><TableRow><TableHead>Attendee</TableHead><TableHead>Type</TableHead><TableHead>Meeting date</TableHead><TableHead>Status</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
      <TableBody>{loading ? <TableRow><TableCell colSpan={5}><LoadingState label="Loading attendance" variant="table" rows={3} className="p-0 sm:p-0" /></TableCell></TableRow> : rows.length ? rows.map(row => <TableRow key={row.id}><TableCell>{row.attendee}</TableCell><TableCell>{row.type}</TableCell><TableCell>{row.date}</TableCell><TableCell>{row.status}</TableCell><TableCell>{row.notes}</TableCell></TableRow>) : <TableRow><TableCell colSpan={5}>No attendance records match the filters.</TableCell></TableRow>}</TableBody>
    </Table>}
  </section>;
}
