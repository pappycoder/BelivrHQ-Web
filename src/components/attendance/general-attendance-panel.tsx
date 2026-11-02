"use client";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import * as React from "react";
import styles from "./general-attendance-panel.module.css";
import { format } from "date-fns";
import { usePermissions } from "@/hooks/use-permissions";
import { useCurrentProfile } from "@/hooks/use-profile";
import {
  useGeneralAttendance,
  useSaveGeneralAttendance,
  fetchGeneralAttendance,
  attendanceSessionPermissions,
  type AttendanceSessionContext,
  type ChurchService,
  type GeneralAttendanceCounts,
  type GeneralAttendanceRecord,
  type GeneralAttendanceParams,
} from "@/hooks/use-attendance";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { BranchFilter } from "@/components/shared/branch-filter";
import { ExportDropdown } from "@/components/shared/export-dropdown";
import { toast, getToastErrorMessage } from "@/lib/toast";
import { TablePagination } from "@/components/shared/table-pagination";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { fetchAllPages } from "@/lib/export-all";
import {
  defaultServiceDate,
  serviceOccursOn,
} from "@/lib/schedule-occurrence";

const countFields = [
  ["total", "Total attendance"],
  ["adultCount", "Adults"],
  ["childrenCount", "Children"],
  ["maleCount", "Male"],
  ["femaleCount", "Female"],
] as const;
const columns = [
  { key: "attendanceDate", label: "Date" },
  { key: "contextName", label: "Meeting" },
  { key: "branchName", label: "Branch" },
  ...countFields.map(([key, label]) => ({ key, label })),
];
const emptyCounts = {
  total: "",
  adultCount: "",
  childrenCount: "",
  maleCount: "",
  femaleCount: "",
};

export function GeneralAttendancePanel({
  service,
  context,
  canManage = true,
  requireService = false,
  readOnly = false,
  filters = {},
  presentationClassName,
  entryMode = "dialog",
  showRecords = true,
  onDirtyChange,
  onBusyChange,
}: {
  service?: ChurchService;
  context?: AttendanceSessionContext;
  canManage?: boolean;
  requireService?: boolean;
  readOnly?: boolean;
  filters?: GeneralAttendanceParams;
  presentationClassName?: string;
  entryMode?: "dialog" | "inline" | "hidden";
  showRecords?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const { canAny } = usePermissions();
  const target =
    context ??
    (service
      ? {
          type: "service" as const,
          id: service.serviceId,
          name: service.name,
          branchId: service.branchId,
          active: service.isActive && !service.archivedAt,
        }
      : undefined);
  const grants = attendanceSessionPermissions(
    target?.type ?? filters.contextType,
  );
  const { data: profile } = useCurrentProfile();
  const canRead = canAny(grants.read);
  const canCreate =
    !readOnly &&
    canManage &&
    canAny(grants.create) &&
    !!target &&
    target.active !== false;
  const canUpdate =
    !readOnly && canManage && canAny(grants.update) && target?.active !== false;
  const [page, setPage] = React.useState(1);
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [branchId, setBranchId] = React.useState("");
  const params = {
    ...filters,
    contextType: target?.type ?? filters.contextType,
    contextId: target?.id ?? filters.contextId,
    serviceId: target?.type === "service" ? target.id : filters.serviceId,
    startDate: filters.startDate || startDate || undefined,
    endDate: filters.endDate || endDate || undefined,
    branchId: filters.branchId || branchId || undefined,
    page,
    limit: 20,
  };
  const query = useGeneralAttendance(
    params,
    showRecords && (!requireService || !!target),
  );
  const save = useSaveGeneralAttendance();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<GeneralAttendanceRecord | null>(
    null,
  );
  const [date, setDate] = React.useState(() =>
    service ? defaultServiceDate(service) : format(new Date(), "yyyy-MM-dd"),
  );
  const [recordBranch, setRecordBranch] = React.useState(
    target?.branchId ?? profile?.branchId ?? "",
  );
  const [values, setValues] = React.useState(emptyCounts);
  const [error, setError] = React.useState("");
  React.useEffect(
    () => setPage(1),
    [target?.id, filters.branchId, filters.startDate, filters.endDate],
  );
  React.useEffect(() => {
    if (service && !editing) setDate(defaultServiceDate(service));
  }, [editing, service]);
  const inline = entryMode === "inline";
  const fieldId = React.useId();
  const dirty =
    inline && canCreate && Object.values(values).some((value) => value !== "");
  useUnsavedChanges(dirty);
  React.useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);
  React.useEffect(() => {
    onBusyChange?.(save.isPending);
    return () => onBusyChange?.(false);
  }, [save.isPending, onBusyChange]);
  function begin(record?: GeneralAttendanceRecord) {
    setEditing(record ?? null);
    setDate(
      record?.attendanceDate ??
        (service
          ? defaultServiceDate(service)
          : format(new Date(), "yyyy-MM-dd")),
    );
    setRecordBranch(
      record?.branchId ?? target?.branchId ?? profile?.branchId ?? "",
    );
    setValues(
      record
        ? (Object.fromEntries(
            countFields.map(([key]) => [
              key,
              record[key] == null ? "" : String(record[key]),
            ]),
          ) as typeof emptyCounts)
        : { ...emptyCounts },
    );
    setError("");
    setOpen(true);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const counts = Object.fromEntries(
      countFields.map(([key]) => [
        key,
        values[key] === "" ? null : Number(values[key]),
      ]),
    ) as unknown as GeneralAttendanceCounts;
    if (
      values.total === "" ||
      countFields.some(
        ([key]) =>
          values[key] !== "" &&
          (!Number.isInteger(Number(values[key])) ||
            Number(values[key]) < 0 ||
            Number(values[key]) > 2147483647),
      )
    ) {
      setError(
        "Enter a total and non-negative whole numbers for any breakdowns.",
      );
      return;
    }
    if (
      (counts.adultCount ?? 0) + (counts.childrenCount ?? 0) > counts.total ||
      (counts.maleCount ?? 0) + (counts.femaleCount ?? 0) > counts.total
    ) {
      setError(
        "The adult/children and male/female subtotals must each be no greater than the total.",
      );
      return;
    }
    if (!recordBranch) {
      setError("Select the branch for this meeting attendance.");
      return;
    }
    if (!editing && service && !serviceOccursOn(service, date)) {
      setError(`${service.name} does not meet on ${date}. Choose a scheduled day.`);
      return;
    }
    try {
      await save.mutateAsync({
        id: editing?.id,
        counts,
        contextType: target?.type ?? editing?.contextType,
        contextId: target?.id ?? editing?.contextId,
        ...(target?.type === "service" || (!target && editing?.serviceId)
          ? { serviceId: target?.id ?? editing?.serviceId }
          : {}),
        branchId: recordBranch,
        attendanceDate: date,
      });
      toast.success(
        editing ? "General attendance updated" : "General attendance recorded",
      );
      setOpen(false);
      if (inline && !editing) setValues({ ...emptyCounts });
    } catch (err) {
      setError(getToastErrorMessage(err, "Could not save general attendance."));
    }
  }
  if (
    (!canRead && !canCreate) ||
    (requireService && !target) ||
    (!showRecords && (!inline || !canCreate)) ||
    (entryMode === "hidden" && !canRead)
  )
    return null;
  const rows = (query.data?.data ?? []).map((row) => ({
    ...row,
    contextName: row.contextName ?? row.serviceName,
  }));
  function renderForm(compact: boolean) {
    const id = (key: string) =>
      compact ? `general-inline-${fieldId}-${key}` : `general-${key}`;
    const countInput = (key: keyof typeof emptyCounts, label: string) => (
      <div key={key} className="space-y-1.5">
        <Label htmlFor={id(key)} className="text-xs">
          {label}
          {key === "total" ? " *" : " (optional)"}
        </Label>
        <Input
          id={id(key)}
          type="number"
          min={0}
          max={2147483647}
          step={1}
          required={key === "total"}
          value={values[key]}
          disabled={save.isPending}
          onChange={(event) =>
            setValues((previous) => ({
              ...previous,
              [key]: event.target.value,
            }))
          }
        />
      </div>
    );
    return (
      <form
        onSubmit={submit}
        aria-label={compact ? "Reported headcount" : undefined}
        className="space-y-3"
      >
        <div className="grid items-start gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={id("date")}>Attendance date</Label>
            <Input
              id={id("date")}
              type="date"
              required
              value={date}
              disabled={!!editing || save.isPending}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          {compact && countInput("total", "Total attendance")}
        </div>
        {!editing && !target?.branchId && profile?.isAdminHq && (
          <div>
            <Label>Branch</Label>
            <BranchFilter
              value={recordBranch}
              onChange={setRecordBranch}
              allLabel="Select a branch"
            />
          </div>
        )}
        <div
          className={
            compact
              ? "grid grid-cols-2 gap-3 lg:grid-cols-4"
              : "grid grid-cols-2 gap-4"
          }
        >
          {countFields
            .filter(([key]) => !compact || key !== "total")
            .map(([key, label]) => countInput(key, label))}
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {compact
              ? "Only the total is required. Age and gender describe the same total."
              : ""}
          </p>
          <Button type="submit" size="sm" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save attendance"}
          </Button>
        </div>
      </form>
    );
  }
  return (
    <Card className={`${styles.panel} py-4`}>
      <CardHeader className="px-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-sm">
            {inline
              ? "Reported headcount"
              : entryMode === "hidden"
                ? "Reported headcount records"
                : "General Attendance"}
          </CardTitle>
          <div className="flex gap-2">
            {canRead && showRecords && (
              <ExportDropdown
                columns={columns}
                data={rows.map((row) => ({ ...row }))}
                title="General Attendance"
                filename="general-attendance"
                disabled={!rows.length}
                fetchAllRows={async () => {
                  const all = await fetchAllPages<GeneralAttendanceRecord>(
                    (page) =>
                      fetchGeneralAttendance({ ...params, page, limit: 200 }),
                  );
                  return all.map((row) => ({
                    ...row,
                    contextName: row.contextName ?? row.serviceName,
                  }));
                }}
              />
            )}
            {canCreate && entryMode === "dialog" && (
              <Button size="sm" onClick={() => begin()}>
                Record general attendance
              </Button>
            )}
          </div>
        </div>
        <CardDescription className="text-xs leading-relaxed">
          {inline
            ? "Report totals separately from named check-ins. The headcount date is independent of the roster date."
            : "Reported meeting totals, separate from named check-ins. A dash means a breakdown was not supplied."}
        </CardDescription>
      </CardHeader>
      {inline && canCreate && (
        <CardContent className="px-4">{renderForm(true)}</CardContent>
      )}
      {canRead && showRecords && (
        <CardContent className="space-y-3 px-4">
          <div className="flex flex-wrap gap-3">
            <div>
              <Label htmlFor={`general-start-${target?.id ?? "all"}`}>
                From
              </Label>
              <Input
                id={`general-start-${target?.id ?? "all"}`}
                type="date"
                value={params.startDate ?? ""}
                disabled={!!filters.startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div>
              <Label htmlFor={`general-end-${target?.id ?? "all"}`}>To</Label>
              <Input
                id={`general-end-${target?.id ?? "all"}`}
                type="date"
                value={params.endDate ?? ""}
                disabled={!!filters.endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            {!filters.branchId && (
              <div className="self-end">
                <BranchFilter
                  value={branchId}
                  onChange={(v) => {
                    setBranchId(v);
                    setPage(1);
                  }}
                />
              </div>
            )}
          </div>
          {query.isError ? (
            <div role="alert">
              Could not load general attendance.{" "}
              <Button variant="outline" onClick={() => query.refetch()}>
                Retry
              </Button>
            </div>
          ) : query.isLoading ? (
            <p>Loading general attendance…</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table
                  selectable
                  aria-label="General attendance"
                  className="w-full text-sm"
                >
                  <TableHeader>
                    <TableRow>
                      {columns.map((c) => (
                        <TableHead
                          className={`p-2 text-xs ${countFields.some(([key]) => key === c.key) ? "text-right" : "text-left"}`}
                          key={c.key}
                        >
                          {c.label}
                        </TableHead>
                      ))}
                      {canUpdate && (
                        <TableHead className="p-2 text-left">Actions</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id} className="border-t">
                        {columns.map((c) => (
                          <TableCell
                            className={`p-2 text-xs ${countFields.some(([key]) => key === c.key) ? "text-right tabular-nums" : ""}`}
                            key={c.key}
                          >
                            {String(
                              row[c.key as keyof GeneralAttendanceRecord] ??
                                "—",
                            )}
                          </TableCell>
                        ))}
                        {canUpdate && (
                          <TableCell className="p-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => begin(row)}
                            >
                              Edit headcount
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    {!rows.length && (
                      <TableRow>
                        <TableCell
                          className="p-4"
                          colSpan={columns.length + (canUpdate ? 1 : 0)}
                        >
                          No general attendance recorded for this period.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                page={page}
                perPage={20}
                total={query.data?.meta.total ?? 0}
                itemName="records"
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={presentationClassName}>
          <DialogHeader>
            <DialogTitle>
              {editing
                ? "Edit general attendance"
                : "Record general attendance"}
            </DialogTitle>
            <DialogDescription>
              {editing?.contextName ?? editing?.serviceName ?? target?.name}.
              Only total attendance is required; all breakdowns are optional.
            </DialogDescription>
          </DialogHeader>
          {renderForm(false)}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
