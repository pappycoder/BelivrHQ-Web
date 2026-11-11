"use client";

import { ValidatedForm } from "@/components/ui/validated-form";

import { ListTable } from "@/components/shared/list-table";
import { LoadingState } from "@/components/shared/loading-state";

import * as React from "react";
import {
  PencilLine,
  CalendarDays,
  ChevronDown,
  TriangleAlert,
} from "lucide-react";
import styles from "./general-attendance-panel.module.css";
import { format } from "date-fns";
import {
  ListPaginationFooter,
  ManageHeading,
  RowActions,
  EmptyState,
} from "@/components/paper/primitives";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { defaultServiceDate, serviceOccursOn } from "@/lib/schedule-occurrence";

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
  const [dateFilterOpen, setDateFilterOpen] = React.useState(false);
  const [dateDraft, setDateDraft] = React.useState({ from: "", to: "" });
  const dateTriggerRef = React.useRef<HTMLButtonElement>(null);
  const restoreDateFocus = React.useRef(false);
  const invalidDateRange =
    !!dateDraft.from && !!dateDraft.to && dateDraft.from > dateDraft.to;
  const datesLocked = !!filters.startDate && !!filters.endDate;
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
  const [entryEditing, setEntryEditing] = React.useState(true);
  const [lookingUp, setLookingUp] = React.useState(false);
  const [lookupFailed, setLookupFailed] = React.useState(false);
  const [lookupVersion, setLookupVersion] = React.useState(0);
  const [conflictingRecord, setConflictingRecord] =
    React.useState<GeneralAttendanceRecord | null>(null);
  const [error, setError] = React.useState("");
  // A session already recorded for the selected day (in create mode) is
  // loaded in view mode; explicit edit intent is required. The API keeps one session per
  // context/branch/date, and a second create would fail with a conflict.
  const [matched, setMatched] = React.useState<GeneralAttendanceRecord | null>(
    null,
  );
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
  React.useEffect(() => {
    setPage(1);
    setDateFilterOpen(false);
  }, [target?.id, filters.branchId, filters.startDate, filters.endDate]);
  React.useEffect(() => {
    if (service && !editing && !controlled) {
      setInternalDate(defaultServiceDate(service));
    }
  }, [editing, service, controlled]);
  const inline = entryMode === "inline";
  const fieldId = React.useId();
  const savedRecord = editing ?? matched;
  const canEditEntry = savedRecord ? canUpdate : canCreate;
  const entryEditable =
    entryEditing && canEditEntry && !lookingUp && !lookupFailed;
  const dirty =
    inline &&
    entryEditable &&
    !sameValues(values, savedRecord ? valuesFrom(savedRecord) : emptyCounts);
  useUnsavedChanges(dirty);
  React.useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);
  React.useEffect(() => {
    onBusyChange?.(save.isPending);
    return () => onBusyChange?.(false);
  }, [save.isPending, onBusyChange]);
  const autoLookupActive =
    canRead && !!recordBranch && !editing && (inline || open);
  React.useEffect(() => {
    if (!autoLookupActive) {
      setLookingUp(false);
      setLookupFailed(false);
      return;
    }
    const controller = new AbortController();
    setLookingUp(true);
    setError("");
    setMatched(null);
    setValues({ ...emptyCounts });
    setEntryEditing(false);
    setLookupFailed(false);
    setConflictingRecord(null);
    const timer = setTimeout(() => {
      lookupDay(date, recordBranch, controller.signal)
        .then((found) => {
          if (controller.signal.aborted) return;
          setMatched(found ?? null);
          const next = found ? valuesFrom(found) : { ...emptyCounts };
          setValues(next);
          setEntryEditing(!found);
          setError("");
        })
        .catch(() => {
          if (!controller.signal.aborted) setLookupFailed(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLookingUp(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [autoLookupActive, date, recordBranch, lookupDay, lookupVersion]);
  function begin(record?: GeneralAttendanceRecord) {
    setEntryEditing(true);
    setConflictingRecord(null);
    setLookupFailed(false);
    setEditing(record ?? null);
    setMatched(null);
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
    if (!entryEditable || save.isPending) return;
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
      const persisted = await save.mutateAsync({ ...payload, id: recordId });
      toast.success(
        recordId ? "General attendance updated" : "General attendance recorded",
      );
      setOpen(false);
      if (inline) {
        setEditing(null);
        setMatched(persisted);
        setValues(valuesFrom(persisted));
        setEntryEditing(false);
      }
    } catch (err) {
      const conflict =
        (err as { statusCode?: number }).statusCode === 409 ||
        /already recorded/i.test(getToastErrorMessage(err, ""));
      if (!recordId && conflict) {
        const found = canRead
          ? await lookupDay(date, recordBranch).catch(() => null)
          : null;
        setConflictingRecord(found);
        setError(
          "A headcount has already been saved for this date. Your draft has not changed it. Review the saved headcount before editing. Reviewing will replace the draft values.",
        );
        return;
      }
      setError(getToastErrorMessage(err, "Could not save general attendance."));
    }
  }
  if (
    (!canRead && !canCreate) ||
    (requireService && !target) ||
    (!showRecords && (!inline || (!canCreate && !canRead))) ||
    (entryMode === "hidden" && !canRead)
  )
    return null;
  const rows = (query.data?.data ?? []).map((row) => ({
    ...row,
    contextName: row.contextName ?? row.serviceName,
  }));
  function renderForm(compact: boolean) {
    const id = (key: string) =>
      compact
        ? `general-inline-${fieldId}-${key}`
        : `general-${fieldId}-${key}`;
    const countInput = (key: keyof typeof emptyCounts, label: string) => (
      <div className="min-w-0 space-y-2" key={key}>
        <Label
          required={key === "total"}
          htmlFor={id(key)}
          className="text-sm text-ink-muted"
        >
          {label}
        </Label>
        <Input
          id={id(key)}
          type="number"
          min={0}
          max={2147483647}
          step={1}
          required={key === "total"}
          value={values[key]}
          placeholder={
            key === "total" ? "0" : entryEditable ? "Optional" : "Not supplied"
          }
          readOnly={!entryEditable}
          disabled={save.isPending || lookingUp}
          className={cn(
            "rounded-xl border-line bg-card font-display tabular-nums shadow-none",
            key === "total" ? styles.totalInput : styles.breakdownInput,
            key === "total"
              ? "h-20 text-4xl md:text-4xl"
              : "h-12 text-xl md:text-xl",
            !entryEditable && "bg-muted/20 text-ink-muted",
          )}
          onChange={(event) =>
            setValues((previous) => ({
              ...previous,
              [key]: event.target.value,
            }))
          }
        />
      </div>
    );
    const cancelEditing = () => {
      setValues(savedRecord ? valuesFrom(savedRecord) : { ...emptyCounts });
      setEntryEditing(false);
      setError("");
    };
    return (
      <ValidatedForm
        onSubmit={submit}
        aria-label={compact ? "Reported headcount" : "Headcount entry"}
        className="space-y-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-line bg-muted/20 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-faint">
              {savedRecord ? "Saved headcount" : "New headcount"}
            </p>
            <p className="mt-1 text-sm font-semibold">
              {target?.name ??
                savedRecord?.contextName ??
                savedRecord?.serviceName ??
                "Meeting attendance"}
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              {entryEditable
                ? "Edit mode. Review the counts before saving."
                : savedRecord
                  ? "View mode. Saved counts are protected from accidental changes."
                  : "View mode. Choose Edit attendance to enter counts."}
            </p>
          </div>
          {!entryEditable && !lookingUp && !lookupFailed && canEditEntry && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEntryEditing(true)}
            >
              Edit attendance
            </Button>
          )}
        </div>
        {lookingUp && (
          <p role="status" className="text-sm text-ink-muted">
            Checking saved attendance for this date…
          </p>
        )}
        {lookupFailed && (
          <div
            role="alert"
            className="rounded-xl border border-destructive/30 p-3 text-sm"
          >
            Saved attendance could not be checked.{" "}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLookupVersion((value) => value + 1)}
            >
              Retry saved headcount
            </Button>
          </div>
        )}
        <div className="grid items-start gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-xl border border-brand/20 bg-brand/5 p-4">
            {countInput("total", "Total attendance")}
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              The number of people present. Named check-ins are recorded
              separately.
            </p>
          </div>
          <div className="space-y-4 rounded-xl border border-line p-4">
            <div className="space-y-2">
              <Label required htmlFor={id("date")} className="text-sm">
                Attendance date
              </Label>
              {controlled || !!editing ? (
                <p id={id("date")} className="text-sm font-medium">
                  {date
                    ? format(new Date(`${date}T00:00:00`), "EEE d MMM yyyy")
                    : "Choose a date"}
                </p>
              ) : (
                <Input
                  picker="wheel"
                  id={id("date")}
                  type="date"
                  required
                  value={date}
                  disabled={save.isPending}
                  onChange={(event) => {
                    if (
                      dirty &&
                      !window.confirm(
                        "Discard unsaved headcount changes before changing the date?",
                      )
                    )
                      return;
                    setMatched(null);
                    setValues({ ...emptyCounts });
                    setDate(event.target.value);
                  }}
                />
              )}
            </div>
            {!editing && !target?.branchId && profile?.isAdminHq && (
              <fieldset disabled={save.isPending || !!editing}>
                <Label required className="text-sm">
                  Branch
                </Label>
                <BranchFilter
                  value={recordBranch}
                  onChange={(value) => {
                    if (
                      dirty &&
                      !window.confirm(
                        "Discard unsaved headcount changes before changing the branch?",
                      )
                    )
                      return;
                    setRecordBranch(value);
                  }}
                  allLabel="Select a branch"
                />
              </fieldset>
            )}
            <p className="text-sm leading-relaxed text-ink-muted">
              Only the total is required. Add age or gender breakdowns when
              available.
            </p>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <section
            className="space-y-3 rounded-xl border border-line p-4"
            aria-label="Age breakdown"
          >
            <div>
              <h3 className="text-sm font-semibold">Age breakdown</h3>
              <p className="mt-1 text-sm text-ink-muted">
                Optional counts within the total.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {countInput("adultCount", "Adults")}
              {countInput("childrenCount", "Children")}
            </div>
          </section>
          <section
            className="space-y-3 rounded-xl border border-line p-4"
            aria-label="Gender breakdown"
          >
            <div>
              <h3 className="text-sm font-semibold">Gender breakdown</h3>
              <p className="mt-1 text-sm text-ink-muted">
                Another breakdown of the same total.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {countInput("maleCount", "Male")}
              {countInput("femaleCount", "Female")}
            </div>
          </section>
        </div>
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {error}
            {conflictingRecord && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setMatched(conflictingRecord);
                  setValues(valuesFrom(conflictingRecord));
                  setEntryEditing(false);
                  setConflictingRecord(null);
                  setError("");
                }}
              >
                Review saved headcount
              </Button>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="text-sm text-ink-muted">
            {lookingUp
              ? "Checking saved attendance…"
              : entryEditable
                ? "Saving locks this headcount for viewing."
                : savedRecord
                  ? "Choose Edit attendance to change these counts."
                  : "No saved headcount for this date."}
          </p>
          {entryEditable && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={save.isPending}
                onClick={cancelEditing}
              >
                Cancel editing
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={save.isPending || lookingUp}
              >
                {save.isPending
                  ? "Saving…"
                  : savedRecord
                    ? "Save changes"
                    : "Save headcount"}
              </Button>
            </div>
          )}
        </div>
      </ValidatedForm>
    );
  }
  return (
    <Card
      className={`${styles.panel} paper-card rounded-2xl bg-card py-4`}
      style={{ backgroundColor: "var(--card)" }}
    >
      <CardHeader className="px-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-lg">
            {inline
              ? "Reported headcount"
              : entryMode === "hidden"
                ? "Reported headcount records"
                : "Headcount"}
          </CardTitle>
          <div className="flex gap-2">
            {canRead && showRecords && (
              <ExportDropdown
                columns={columns}
                data={rows.map((row) => ({ ...row }))}
                title="Headcount"
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
                Record headcount
              </Button>
            )}
          </div>
        </div>
        <CardDescription className="text-sm leading-relaxed">
          {inline
            ? controlled
              ? "Report totals separately from named check-ins. The headcount follows the date chosen above."
              : "Report totals separately from named check-ins. The headcount date is independent of the roster date."
            : "Reported meeting totals, separate from named check-ins. A dash means a breakdown was not supplied."}
        </CardDescription>
      </CardHeader>
      {inline && (canCreate || canRead) && (
        <CardContent className="px-4">{renderForm(true)}</CardContent>
      )}
      {canRead && showRecords && (
        <CardContent className="space-y-3 px-4">
          <div
            className="flex flex-wrap items-center gap-3"
            role="group"
            aria-label="Headcount record filters"
          >
            <Popover
              open={dateFilterOpen}
              onOpenChange={(value) => {
                if (value) {
                  setDateDraft({
                    from: params.startDate ?? "",
                    to: params.endDate ?? "",
                  });
                  restoreDateFocus.current = false;
                }
                setDateFilterOpen(value);
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  ref={dateTriggerRef}
                  disableTooltip
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={
                    params.startDate || params.endDate
                      ? `Date range, ${params.startDate || "any start"} to ${params.endDate || "any end"}`
                      : "Date range"
                  }
                  className={cn(
                    "h-9 max-w-full gap-2 rounded-full border-line bg-card text-sm",
                    (params.startDate || params.endDate) &&
                      "bg-brand/10 text-brand",
                  )}
                >
                  <CalendarDays className="size-3.5" />
                  <span className="min-w-0 truncate">{params.startDate || params.endDate
                    ? `${params.startDate || "Any start"} → ${params.endDate || "Any end"}`
                    : "Date range"}</span>
                  <ChevronDown className="size-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                aria-label="Filter headcount dates"
                className="space-y-4"
                onEscapeKeyDown={() => {
                  restoreDateFocus.current = true;
                }}
                onCloseAutoFocus={(event) => {
                  if (restoreDateFocus.current) {
                    event.preventDefault();
                    dateTriggerRef.current?.focus();
                    restoreDateFocus.current = false;
                  }
                }}
              >
                <p className="text-sm font-medium">Headcount date range</p>
                <div className="space-y-2">
                  <Label htmlFor={`headcount-filter-${fieldId}-from`}>
                    From date
                  </Label>
                  <Input
                    id={`headcount-filter-${fieldId}-from`}
                    picker="native"
                    type="date"
                    value={dateDraft.from}
                    max={dateDraft.to || undefined}
                    disabled={!!filters.startDate}
                    onChange={(event) =>
                      setDateDraft((previous) => ({
                        ...previous,
                        from: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`headcount-filter-${fieldId}-to`}>
                    To date
                  </Label>
                  <Input
                    id={`headcount-filter-${fieldId}-to`}
                    picker="native"
                    type="date"
                    value={dateDraft.to}
                    min={dateDraft.from || undefined}
                    disabled={!!filters.endDate}
                    aria-invalid={invalidDateRange || undefined}
                    aria-describedby={
                      invalidDateRange
                        ? `headcount-filter-${fieldId}-error`
                        : undefined
                    }
                    onChange={(event) =>
                      setDateDraft((previous) => ({
                        ...previous,
                        to: event.target.value,
                      }))
                    }
                  />
                </div>
                {invalidDateRange && (
                  <p
                    id={`headcount-filter-${fieldId}-error`}
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    To date must be on or after From date.
                  </p>
                )}
                <div className="flex justify-between gap-2 border-t border-line pt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={datesLocked}
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                      setDateDraft({
                        from: filters.startDate ?? "",
                        to: filters.endDate ?? "",
                      });
                      setPage(1);
                      setDateFilterOpen(false);
                    }}
                  >
                    Clear dates
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={invalidDateRange || datesLocked}
                    onClick={() => {
                      setStartDate(filters.startDate ? "" : dateDraft.from);
                      setEndDate(filters.endDate ? "" : dateDraft.to);
                      setPage(1);
                      setDateFilterOpen(false);
                    }}
                  >
                    Apply dates
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
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
            <EmptyState
              icon={<TriangleAlert />}
              className="bg-card"
              title="Reported attendance could not be loaded"
              description="Try loading the meeting totals again."
              action={
                <Button
                  variant="outline"
                  className="h-8 rounded-full text-sm"
                  onClick={() => query.refetch()}
                >
                  Retry
                </Button>
              }
            />
          ) : query.isLoading ? (
            <LoadingState label="Loading general attendance" variant="table" />
          ) : !rows.length ? (
            <EmptyState
              icon={<CalendarDays />}
              className="bg-card"
              title={
                params.startDate || params.endDate || params.branchId
                  ? "No reported totals match"
                  : "No reported attendance yet"
              }
              description={
                params.startDate || params.endDate || params.branchId
                  ? "Widen the date range or clear the filters to find meeting totals."
                  : "Reported meeting headcounts will appear here after they are recorded."
              }
              action={
                startDate || endDate || branchId ? (
                  <Button
                    variant="outline"
                    className="h-8 rounded-full text-sm"
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                      setBranchId("");
                      setPage(1);
                    }}
                  >
                    Clear attendance filters
                  </Button>
                ) : canCreate && entryMode !== "hidden" ? (
                  <Button
                    variant="outline"
                    className="h-8 rounded-full text-sm"
                    onClick={() => begin()}
                  >
                    Record first headcount
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="paper-card overflow-x-auto rounded-2xl bg-card">
                <ListTable
                  className="min-w-[760px]"
                  tableId="attendance-general-attendance-panel-1"
                  recordType="generalAttendance"
                  records={rows ?? []}
                  recordKey="id"
                >
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
                          "group grid items-center gap-3 px-2 py-2.5 text-sm transition-colors hover:bg-muted/40",
                          canUpdate
                            ? "grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,1fr)_repeat(5,minmax(0,0.7fr))_auto]"
                            : "grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,1fr)_repeat(5,minmax(0,0.7fr))]",
                        )}
                      >
                        <span className="num text-sm">
                          {row.attendanceDate}
                        </span>
                        <span className="min-w-0 truncate font-medium">
                          {row.contextName ?? "Not available"}
                        </span>
                        <span className="min-w-0 truncate text-sm text-ink-soft">
                          {row.branchName ?? "Not available"}
                        </span>
                        {countFields.map(([key]) => (
                          <span
                            key={key}
                            className="num text-right tabular-nums text-sm"
                          >
                            {String(
                              row[key as keyof GeneralAttendanceRecord] ??
                                "Not available",
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
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!save.isPending) setOpen(value);
        }}
      >
        <DialogContent
          className={cn(
            "max-h-[90dvh] overflow-y-auto sm:max-w-3xl",
            presentationClassName,
          )}
        >
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit headcount" : "Record headcount"}
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
