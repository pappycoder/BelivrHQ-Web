"use client";

import { ListTable } from "@/components/shared/list-table";
import { LoadingState } from "@/components/shared/loading-state";

import * as React from "react";
import { PencilLine } from "lucide-react";
import styles from "./general-attendance-panel.module.css";
import { format } from "date-fns";
import { ListPaginationFooter, ManageHeading, RowActions } from "@/components/paper/primitives";
import { cn } from "@/lib/utils";
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

/** Count fields as strings, ready for the entry form. */
function valuesFrom(
  record: Pick<
    GeneralAttendanceCounts,
    "total" | "adultCount" | "childrenCount" | "maleCount" | "femaleCount"
  >,
): typeof emptyCounts {
  return Object.fromEntries(
    countFields.map(([key]) => [
      key,
      record[key] == null ? "" : String(record[key]),
    ]),
  ) as typeof emptyCounts;
}

function sameValues(a: typeof emptyCounts, b: typeof emptyCounts): boolean {
  return countFields.every(([key]) => a[key] === b[key]);
}

export function GeneralAttendancePanel({
  service,
  context,
  attendanceDate,
  occursOn,
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
  /**
   * Controlled attendance day (`YYYY-MM-DD`). When supplied — e.g. from a
   * check-in desk's shared date picker — the panel drops its own date input
   * and every create/edit uses this day. The picker is expected to restrict
   * selectable days to the schedule's occurrences.
   */
  attendanceDate?: string;
  /** Occurrence rule for the controlled date; submit refuses a day it rejects. */
  occursOn?: (date: string) => boolean;
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
  const [perPage, setPerPage] = React.useState(20);
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
    limit: perPage,
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
  const [internalDate, setInternalDate] = React.useState(() =>
    service ? defaultServiceDate(service) : format(new Date(), "yyyy-MM-dd"),
  );
  // A desk's shared date picker drives the day when `attendanceDate` is set;
  // standalone hosts (detail pages) keep the panel's own date control.
  const controlled = !!attendanceDate;
  const date = attendanceDate ?? internalDate;
  const setDate = setInternalDate;
  const [recordBranch, setRecordBranch] = React.useState(
    target?.branchId ?? profile?.branchId ?? "",
  );
  const [values, setValues] = React.useState(emptyCounts);
  const [error, setError] = React.useState("");
  // A session already recorded for the selected day (in create mode) is
  // auto-loaded so the form edits it — the API keeps one session per
  // context/branch/date, and a second create would fail with a conflict.
  const [matched, setMatched] = React.useState<GeneralAttendanceRecord | null>(
    null,
  );
  const autoFilled = React.useRef<typeof emptyCounts | null>(null);
  const targetType = target?.type;
  const targetId = target?.id;
  const lookupDay = React.useCallback(
    async (day: string, branch: string, signal?: AbortSignal) => {
      if (!targetType || !targetId || !day) return null;
      const found = await fetchGeneralAttendance(
        {
          contextType: targetType,
          contextId: targetId,
          ...(targetType === "service" ? { serviceId: targetId } : {}),
          branchId: branch || undefined,
          startDate: day,
          endDate: day,
          page: 1,
          limit: 2,
        },
        signal,
      );
      return (found.data ?? []).find((r) => r.attendanceDate === day) ?? null;
    },
    [targetType, targetId],
  );
  React.useEffect(
    () => setPage(1),
    [target?.id, filters.branchId, filters.startDate, filters.endDate],
  );
  React.useEffect(() => {
    if (service && !editing && !controlled) {
      setInternalDate(defaultServiceDate(service));
    }
  }, [editing, service, controlled]);
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
  const autoLookupActive = canCreate && canRead && !editing && (inline || open);
  React.useEffect(() => {
    if (!autoLookupActive) {
      setMatched(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      lookupDay(date, recordBranch, controller.signal)
        .then((found) => {
          if (controller.signal.aborted) return;
          setMatched(found);
          if (found) {
            const next = valuesFrom(found);
            autoFilled.current = next;
            setValues(next);
          } else if (autoFilled.current) {
            // Only drop the prefilled numbers if nobody typed over them.
            const previous = autoFilled.current;
            autoFilled.current = null;
            setValues((current) =>
              sameValues(current, previous) ? { ...emptyCounts } : current,
            );
          }
        })
        .catch(() => {
          // A failed lookup keeps the form blank; the 409 retry on submit is
          // the safety net for a same-day record we could not preview.
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [autoLookupActive, date, recordBranch, lookupDay]);
  function begin(record?: GeneralAttendanceRecord) {
    setEditing(record ?? null);
    setMatched(null);
    autoFilled.current = null;
    setDate(
      record?.attendanceDate ??
        (service
          ? defaultServiceDate(service)
          : format(new Date(), "yyyy-MM-dd")),
    );
    setRecordBranch(
      record?.branchId ?? target?.branchId ?? profile?.branchId ?? "",
    );
    setValues(record ? valuesFrom(record) : { ...emptyCounts });
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
    if (!editing && !matched) {
      const guard =
        occursOn ??
        (service ? (day: string) => serviceOccursOn(service, day) : undefined);
      if (guard && !guard(date)) {
        setError(
          `${target?.name ?? service?.name ?? "This gathering"} ${
            target?.type === "event" ? "does not occur" : "does not meet"
          } on ${date}. Choose a scheduled day.`,
        );
        return;
      }
    }
    const recordId = editing?.id ?? matched?.id;
    const payload = {
      counts,
      contextType: target?.type ?? editing?.contextType ?? matched?.contextType,
      contextId: target?.id ?? editing?.contextId ?? matched?.contextId,
      ...(target?.type === "service" ||
      (!target && (editing?.serviceId ?? matched?.serviceId))
        ? { serviceId: target?.id ?? editing?.serviceId ?? matched?.serviceId }
        : {}),
      branchId: recordBranch,
      attendanceDate: date,
    };
    try {
      await save.mutateAsync({ ...payload, id: recordId });
      toast.success(
        recordId
          ? "General attendance updated"
          : "General attendance recorded",
      );
      setOpen(false);
      if (inline && !editing) setValues({ ...emptyCounts });
    } catch (err) {
      // A same-day session may have appeared after the prefill check
      // (another tablet at the door, offline sync). Instead of dead-ending
      // on the 409, adopt that record and save into it.
      const looksLikeConflict =
        (err as { statusCode?: number }).statusCode === 409 ||
        /already recorded/i.test(getToastErrorMessage(err, ""));
      if (!recordId && looksLikeConflict) {
        const found = await lookupDay(date, recordBranch).catch(() => null);
        if (found) {
          try {
            await save.mutateAsync({ ...payload, id: found.id });
            setMatched(found);
            autoFilled.current = valuesFrom(found);
            toast.success("General attendance updated");
            setOpen(false);
            if (inline && !editing) setValues({ ...emptyCounts });
          } catch (retryError) {
            setError(
              getToastErrorMessage(
                retryError,
                "Could not save general attendance.",
              ),
            );
          }
          return;
        }
      }
      setError(
        getToastErrorMessage(err, "Could not save general attendance."),
      );
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
            {controlled && !editing ? (
              <p
                id={id("date")}
                className="flex h-9 items-center rounded-lg border border-input bg-muted/40 px-3 text-sm text-muted-foreground"
              >
                {format(new Date(`${date}T00:00:00`), "EEE d MMM yyyy")}
              </p>
            ) : (
              <Input picker="wheel"
                id={id("date")}
                type="date"
                required
                value={date}
                disabled={!!editing || save.isPending}
                onChange={(e) => setDate(e.target.value)}
              />
            )}
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
        {matched && !editing ? (
          <p role="status" className="text-xs text-muted-foreground">
            {date} already has a recorded headcount — saving updates that
            record instead of adding a second one.
          </p>
        ) : null}
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
            ? controlled
              ? "Report totals separately from named check-ins. The headcount follows the date chosen above."
              : "Report totals separately from named check-ins. The headcount date is independent of the roster date."
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
              <Input picker="native"
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
              <Input picker="native"
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
            <LoadingState label="Loading general attendance" variant="table" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <ListTable className="min-w-[760px]" tableId="attendance-general-attendance-panel-1" recordType="generalAttendance" records={rows ?? []} recordKey="id">
                  <div
                    className={cn(
                      "rule-label grid items-center gap-3 border-b border-line px-2 py-2.5",
                      canUpdate
                        ? "grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,1fr)_repeat(5,minmax(0,0.7fr))_auto]"
                        : "grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,1fr)_repeat(5,minmax(0,0.7fr))]",
                    )}
                  >
                    <span>Date</span>
                    <span>Meeting</span>
                    <span>Branch</span>
                    {countFields.map(([, label]) => (
                      <span key={label} className="text-right">
                        {label}
                      </span>
                    ))}
                    {canUpdate ? <ManageHeading /> : null}
                  </div>
                  <div className="divide-y divide-line/70">
                    {rows.map((row) => (
                      <div
                        key={row.id}
                        className={cn(
                          "group grid items-center gap-3 px-2 py-2.5 text-xs transition-colors hover:bg-muted/40",
                          canUpdate
                            ? "grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,1fr)_repeat(5,minmax(0,0.7fr))_auto]"
                            : "grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,1fr)_repeat(5,minmax(0,0.7fr))]",
                        )}
                      >
                        <span className="num text-[11px]">{row.attendanceDate}</span>
                        <span className="min-w-0 truncate font-medium">
                          {row.contextName ?? "—"}
                        </span>
                        <span className="min-w-0 truncate text-[11px] text-ink-soft">
                          {row.branchName ?? "—"}
                        </span>
                        {countFields.map(([key]) => (
                          <span
                            key={key}
                            className="num text-right tabular-nums text-[11px]"
                          >
                            {String(
                              row[key as keyof GeneralAttendanceRecord] ?? "—",
                            )}
                          </span>
                        ))}
                        {canUpdate ? (
                          <div className="flex justify-end">
                            <RowActions
                              actions={[
                                {
                                  label: "Edit headcount",
                                  icon: <PencilLine />,
                                  onSelect: () => begin(row),
                                },
                              ]}
                            />
                          </div>
                        ) : null}
                      </div>
                    ))}
                    {!rows.length ? (
                      <p className="px-2 py-6 text-center text-xs text-ink-faint">
                        No general attendance recorded for this period.
                      </p>
                    ) : null}
                  </div>
                </ListTable>
              </div>
              <ListPaginationFooter
                page={page}
                perPage={perPage}
                total={query.data?.meta.total ?? 0}
                onPageChange={setPage}
                onPerPageChange={setPerPage}
                itemName="headcount records"
                pending={query.isFetching}
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
