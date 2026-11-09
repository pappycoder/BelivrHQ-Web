"use client";

import { LoadingState } from "@/components/shared/loading-state";

import { Skeleton } from "@/components/ui/skeleton";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { confirmDiscardChanges } from "@/hooks/use-unsaved-changes";

import { VisibleDataExport } from "@/components/shared/visible-data-export";

import * as React from "react";
import {
  PeopleHeader,
  PeopleImportProgress,
  peopleWorkspaceClass,
} from "@/components/members/people-presentation";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { exportExcel } from "@/lib/export-utils";
import {
  memberImportTemplate,
  TARGET_FIELDS as MEMBER_FIELDS,
} from "@/lib/member-import-template";
import {
  VISITOR_IMPORT_FIELDS,
  visitorImportTemplate,
} from "@/lib/visitor-import-template";
import { useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/use-permissions";
import { parseMemberSpreadsheet } from "@/lib/import-spreadsheet";
import { api } from "@/lib/api";
import { useBranchesList } from "@/hooks/use-branches";
import { useCurrentProfile } from "@/hooks/use-profile";

type ImportStep = "upload" | "map" | "review" | "done";

interface ParsedRow {
  rowNumber: number;
  raw: Record<string, string>;
}

interface ImportError {
  row: number;
  message: string;
}

interface ImportResult {
  created: number;
  errors: ImportError[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function autoMap(
  headers: string[],
  fields: typeof MEMBER_FIELDS,
): Record<string, string> {
  const mapping: Record<string, string> = {};
  const used = new Set<string>();
  for (const field of fields) {
    const match = headers.find(
      (h) => !used.has(h) && field.aliases.includes(normalizeHeader(h)),
    );
    if (match) {
      mapping[field.key] = match;
      used.add(match);
    }
  }
  return mapping;
}

export function PeopleImportPage({
  kind,
  presentationClassName,
  compactProgress = false,
}: {
  kind: "members" | "visitors";
  presentationClassName?: string;
  compactProgress?: boolean;
}) {
  const visitor = kind === "visitors";
  const plural = visitor ? "Visitors" : "Members";
  const singular = visitor ? "visitor" : "member";
  const TARGET_FIELDS = visitor ? VISITOR_IMPORT_FIELDS : MEMBER_FIELDS;
  const qc = useQueryClient();
  const { can } = usePermissions();
  const allowed = visitor
    ? can("visitors:new", "create")
    : can("members:import", "create");
  const router = useRouter();
  const branchesQuery = useBranchesList({ limit: 100 });
  const { data: currentProfile } = useCurrentProfile();

  const [step, setStep] = React.useState<ImportStep>("upload");
  const [fileName, setFileName] = React.useState("");
  const [rows, setRows] = React.useState<ParsedRow[]>([]);
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [mapping, setMapping] = React.useState<Record<string, string>>({});
  const [parsing, setParsing] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dryRunning, setDryRunning] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [dryRunResult, setDryRunResult] = React.useState<ImportResult | null>(
    null,
  );
  const [finalResult, setFinalResult] = React.useState<ImportResult | null>(
    null,
  );

  // Branch name → id resolution for the mapped "branch" column.
  useUnsavedChanges(step !== "upload" && step !== "done");
  const branchIdByName = React.useMemo(() => {
    const map = new Map<string, string>();
    if (currentProfile?.branchId && currentProfile.branch?.name)
      map.set(
        currentProfile.branch.name.trim().toLowerCase(),
        currentProfile.branchId,
      );
    for (const b of branchesQuery.data?.data ?? []) {
      map.set(b.name.trim().toLowerCase(), b.branchId);
    }
    return map;
  }, [
    branchesQuery.data,
    currentProfile?.branchId,
    currentProfile?.branch?.name,
  ]);

  /** Reject anything that is not a .csv / .xlsx / .xls before parsing. */
  const validateFile = (file: File): string | null => {
    if (file.size > 5 * 1024 * 1024) return "Files must be 5 MB or smaller.";
    const name = file.name.toLowerCase();
    const ext = name.slice(name.lastIndexOf("."));
    const allowedExtensions = [".csv", ".xlsx"];
    if (!allowedExtensions.includes(ext)) {
      return "Use CSV or XLSX. Save older XLS files as XLSX first.";
    }
    return null;
  };

  const handleFileSelected = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      toast.error("File rejected", { description: validationError });
      return;
    }
    void handleFile(file);
  };

  const handleFile = async (file: File) => {
    setParsing(true);
    try {
      const jsonRows = await parseMemberSpreadsheet(file);
      if (jsonRows.length === 0)
        throw new Error("No data rows found in the file.");

      const headerSet = new Set<string>();
      for (const r of jsonRows.slice(0, 50)) {
        Object.keys(r).forEach((k) => k.trim() && headerSet.add(k.trim()));
      }
      const cols = Array.from(headerSet);

      const parsed: ParsedRow[] = jsonRows.map((r, i) => {
        const clean: Record<string, string> = {};
        for (const [k, v] of Object.entries(r)) {
          clean[k.trim()] = String(v ?? "").trim();
        }
        return { rowNumber: i + 2, raw: clean }; // +2 accounts for the header row
      });

      setFileName(file.name);
      setHeaders(cols);
      setMapping(autoMap(cols, TARGET_FIELDS));
      setRows(parsed);
      setDryRunResult(null);
      setFinalResult(null);
      setStep("map");
    } catch (error) {
      toast.error("Could not parse file", {
        description: getToastErrorMessage(error, "Use a .csv or .xlsx file."),
      });
    } finally {
      setParsing(false);
    }
  };

  const downloadTemplate = async () => {
    const branchNames = currentProfile?.isAdminHq
      ? (branchesQuery.data?.data ?? []).map((branch) => branch.name)
      : [currentProfile?.branch?.name].filter((name): name is string => !!name);
    try {
      await exportExcel(
        (visitor ? visitorImportTemplate : memberImportTemplate)(
          branchNames,
          currentProfile?.branch?.name,
        ),
        `${singular}-import-template`,
      );
    } catch (error) {
      toast.error("Template download failed", {
        description: getToastErrorMessage(error, "Please try again."),
      });
    }
  };

  /** Client-side mirror of the server's per-row validation. */
  const validateRows = (): ImportError[] => {
    const errors: ImportError[] = [];
    const missingRequired = TARGET_FIELDS.filter(
      (f) => f.required && !mapping[f.key],
    );
    for (const f of missingRequired) {
      errors.push({ row: 0, message: `Map a column for ${f.label}.` });
    }
    if (missingRequired.length > 0) return errors;

    const phones = new Set<string>();
    const emails = new Set<string>();
    for (const r of rows) {
      const get = (key: string) =>
        mapping[key] ? r.raw[mapping[key]] || "" : "";
      if (!get("firstName"))
        errors.push({ row: r.rowNumber, message: "First name is empty." });
      if (!visitor && !get("lastName"))
        errors.push({ row: r.rowNumber, message: "Last name is empty." });

      const email = get("email");
      if (email && !EMAIL_RE.test(email)) {
        errors.push({ row: r.rowNumber, message: `Invalid email "${email}".` });
      }

      if (visitor) {
        const phone = get("phone").replace(/\D/g, "");
        const emailKey = email.toLowerCase();
        if ((phone && phones.has(phone)) || (emailKey && emails.has(emailKey)))
          errors.push({
            row: r.rowNumber,
            message: "Duplicate phone or email in this file.",
          });
        if (phone) phones.add(phone);
        if (emailKey) emails.add(emailKey);
        const date = get("firstVisitDate");
        if (
          date &&
          (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
            Number.isNaN(new Date(date).getTime()) ||
            new Date(date).toISOString().slice(0, 10) !== date)
        )
          errors.push({
            row: r.rowNumber,
            message: "First visit date must be a valid YYYY-MM-DD date.",
          });
        if (
          get("branch") &&
          !currentProfile?.isAdminHq &&
          branchIdByName.get(get("branch").toLowerCase()) !==
            currentProfile?.branchId
        )
          errors.push({
            row: r.rowNumber,
            message: "You can only import into your own branch.",
          });
      }
      const branchName = get("branch");
      if (branchName && !branchIdByName.has(branchName.toLowerCase())) {
        errors.push({
          row: r.rowNumber,
          message: `Branch "${branchName}" does not match any of your branches.`,
        });
      }
    }
    return errors;
  };

  const buildPayload = () =>
    rows.map((r) => {
      const get = (key: string) =>
        mapping[key] ? r.raw[mapping[key]] || "" : "";
      const branchName = get("branch");
      if (visitor)
        return {
          firstName: get("firstName"),
          ...Object.fromEntries(
            ["lastName", "email", "phone", "whatsappNumber", "notes"]
              .filter((key) => get(key))
              .map((key) => [key, get(key)]),
          ),
          ...(get("gender") ? { gender: get("gender").toLowerCase() } : {}),
          ...(get("firstVisitDate")
            ? { firstVisitDate: get("firstVisitDate") }
            : {}),
          ...(branchName
            ? { branchId: branchIdByName.get(branchName.toLowerCase()) }
            : {}),
        };
      return {
        firstName: get("firstName"),
        lastName: get("lastName"),
        ...(get("email") ? { email: get("email") } : {}),
        ...(get("phone") ? { phone: get("phone") } : {}),
        ...(get("whatsappNumber")
          ? { whatsappNumber: get("whatsappNumber") }
          : {}),
        ...(get("gender") ? { gender: get("gender").toLowerCase() } : {}),
        ...(get("dateOfBirth")
          ? { dateOfBirth: get("dateOfBirth").slice(0, 10) }
          : {}),
        ...(get("address") ? { address: get("address") } : {}),
        ...(get("city") ? { city: get("city") } : {}),
        ...(get("state") ? { state: get("state") } : {}),
        ...(branchName
          ? { branchId: branchIdByName.get(branchName.toLowerCase()) }
          : {}),
        ...(get("notes") ? { notes: get("notes") } : {}),
      };
    });

  const callBulkImport = async (dryRun: boolean): Promise<ImportResult> => {
    const clientErrors = visitor ? validateRows() : [];
    const invalidRows = new Set(clientErrors.map((error) => error.row));
    const payloads = buildPayload()
      .map((record, index) => ({ record, rowNumber: rows[index].rowNumber }))
      .filter((entry) => !invalidRows.has(entry.rowNumber));
    const result: ImportResult = { created: 0, errors: [...clientErrors] };
    for (let offset = 0; offset < payloads.length; offset += 100) {
      const entries = payloads.slice(offset, offset + 100);
      let batch: ImportResult;
      try {
        batch = await api.post<ImportResult>(`/${kind}/bulk-import`, {
          [kind]: entries.map((entry) => entry.record),
          dryRun,
        });
      } catch (error) {
        if (dryRun) throw error;
        result.errors.push({
          row: entries[0].rowNumber,
          message: `Import stopped after ${offset} processed rows (${result.created} created). Remaining rows need review before retrying; the last batch may have partially completed.`,
        });
        return result;
      }
      result.created += batch.created;
      result.errors.push(
        ...batch.errors.map((error) => ({
          ...error,
          row: entries[error.row - 1]?.rowNumber ?? error.row + offset + 1,
        })),
      );
    }
    return result;
  };

  const handleDryRun = async () => {
    const clientErrors = validateRows();
    if (clientErrors.some((e) => e.row === 0)) {
      toast.error("Finish the column mapping first", {
        description: clientErrors.find((e) => e.row === 0)?.message,
      });
      return;
    }
    if (!visitor && clientErrors.length > 0) {
      setDryRunResult({ created: 0, errors: clientErrors });
      setStep("review");
      return;
    }

    setDryRunning(true);
    try {
      const result = await callBulkImport(true);
      setDryRunResult(result);
      setStep("review");
    } catch (error) {
      toast.error("Dry run failed", {
        description: getToastErrorMessage(error, "Please try again."),
      });
    } finally {
      setDryRunning(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const result = await callBulkImport(false);
      await qc.invalidateQueries({
        queryKey: [visitor ? "visitors-list" : "members-list"],
      });
      if (visitor) await qc.invalidateQueries({ queryKey: ["visitors-stats"] });
      setFinalResult(result);
      setStep("done");
    } catch (error) {
      toast.error("Import failed", {
        description: getToastErrorMessage(error, "Please try again."),
      });
    } finally {
      setImporting(false);
    }
  };

  const resetAll = () => {
    setStep("upload");
    setFileName("");
    setRows([]);
    setHeaders([]);
    setMapping({});
    setDryRunResult(null);
    setFinalResult(null);
  };

  const clientErrors =
    step === "map" || step === "review" ? validateRows() : [];
  const blockingClientErrors = clientErrors.filter((e) => e.row === 0);
  const rowIssues = clientErrors.filter((e) => e.row > 0);

  if (!allowed)
    return (
      <p className="text-muted-foreground">
        You do not have permission to import {kind}.
      </p>
    );

  const ImportHeader =
    kind === "members" || compactProgress ? PeopleHeader : PageHeader;

  return (
    <div
      className={cn(
        "space-y-4",
        kind === "members" && peopleWorkspaceClass,
        presentationClassName,
      )}
    >
      <ImportHeader
        title={`Import ${plural}`}
        breadcrumbs={[
          { label: "Home", href: "/home" },
          { label: plural, href: `/${kind}` },
          { label: "Import" },
        ]}
        action={
          <Button
            variant="outline"
            onClick={() => {
              if (confirmDiscardChanges()) router.push(`/${kind}`);
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {plural}
          </Button>
        }
      />

      {/* Step indicator */}
      {kind === "members" || compactProgress ? (
        <PeopleImportProgress step={step} />
      ) : (
        <div className="flex items-center gap-2 text-sm">
          {(["upload", "map", "review", "done"] as ImportStep[]).map((s, i) => (
            <React.Fragment key={s}>
              {i > 0 && <span className="text-muted-foreground">→</span>}
              <span
                className={
                  step === s
                    ? "font-medium text-foreground"
                    : "text-muted-foreground capitalize"
                }
              >
                {i + 1}.{" "}
                {s === "upload"
                  ? "Upload"
                  : s.charAt(0).toUpperCase() + s.slice(1)}
              </span>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Dropzone */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Upload your file</CardTitle>
              <CardDescription>
                The first row must contain column headers. You&apos;ll map them
                to
                {singular} fields in the next step.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <label
                className={cn(
                  "flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed py-16 cursor-pointer transition-colors",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:bg-muted/40",
                )}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setIsDragging(false);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileSelected(file);
                }}
              >
                <div
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-full transition-colors",
                    isDragging ? "bg-primary/10" : "bg-muted",
                  )}
                >
                  {parsing ? (
                    <Skeleton className="size-7 rounded-full" />
                  ) : (
                    <Upload
                      className={cn(
                        "h-7 w-7",
                        isDragging ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                  )}
                </div>
                <div className="text-center px-4">
                  <div className="font-medium text-base">
                    {parsing ? <LoadingState label="Parsing spreadsheet" variant="inline" /> : isDragging ? "Drop your file to start" : "Drag & drop your file here"}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    or{" "}
                    <span className="font-medium underline underline-offset-2">
                      click to browse your computer
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {["CSV", "XLSX", "XLS"].map((fmt) => (
                    <Badge
                      key={fmt}
                      variant="secondary"
                      className="font-mono text-[11px]"
                    >
                      .{fmt.toLowerCase()}
                    </Badge>
                  ))}
                </div>
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  className="hidden"
                  disabled={parsing}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelected(file);
                    e.target.value = "";
                  }}
                />
              </label>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                Only spreadsheet files (.csv, .xlsx; up to 5 MB and 10,000 rows)
                are accepted — other formats are rejected automatically.
              </p>
            </CardContent>
          </Card>

          {/* Template card */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Need a template?
              </CardTitle>
              <CardDescription>
                Start from our ready-made spreadsheet with all supported columns
                and a sample row.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Supported columns
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {TARGET_FIELDS.map((f) => (
                    <Badge
                      key={f.key}
                      variant={f.required ? "default" : "outline"}
                    >
                      {f.label.replace(/ \*$/, "").replace(/ \(.*\)$/, "")}
                      {f.required ? " *" : ""}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => void downloadTemplate()}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Phone numbers accept + country codes and leading zeros. Dates
                use YYYY-MM-DD; calendar availability depends on your
                spreadsheet app.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Map columns */}
      {step === "map" && (
        <Card>
          <CardHeader>
            <CardTitle>Map columns</CardTitle>
            <CardDescription>
              Match the columns in {fileName || "your file"} to {singular}{" "}
              fields. Required fields must be mapped.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {TARGET_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="text-sm font-medium mb-1.5 block">
                    {field.label}
                  </label>
                  <Select
                    value={mapping[field.key] ?? "__none__"}
                    onValueChange={(v) =>
                      setMapping((prev) => ({
                        ...prev,
                        [field.key]: v === "__none__" ? "" : v,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Skip this field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">-- Skip --</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {blockingClientErrors.length > 0 && (
              <p className="text-sm text-destructive">
                {blockingClientErrors.map((e) => e.message).join(" ")}
              </p>
            )}
            {rowIssues.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950 p-3 text-sm">
                <p className="font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  {rowIssues.length} row(s) have data issues
                </p>
                <p className="text-muted-foreground mt-1">
                  Problem rows are reported during the preview step and will be
                  skipped.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" onClick={resetAll}>
                Choose Another File
              </Button>
              <Button onClick={() => void handleDryRun()} disabled={dryRunning}>
                {dryRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    Preview Import
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review */}
      {step === "review" && dryRunResult && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              {fileName} — {rows.length} data row(s) parsed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-md border p-4">
                <p className="flex items-center gap-2 font-medium text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  {Math.max(
                    rows.length -
                      new Set(dryRunResult.errors.map((error) => error.row))
                        .size,
                    0,
                  )}{" "}
                  ready to import
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Rows without issues will be created as new {kind}.
                </p>
              </div>
              <div className="rounded-md border p-4">
                <p className="flex items-center gap-2 font-medium text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  {
                    new Set(dryRunResult.errors.map((error) => error.row)).size
                  }{" "}
                  row(s) with problems
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  These rows will be skipped; everything else imports normally.
                </p>
              </div>
            </div>

            {dryRunResult.errors.length > 0 && (
              <div className="rounded-md border overflow-hidden">
                <Table records={dryRunResult.errors.slice(0,25).map((error,index)=>({...error,__rowKey:`${error.row}-${index}`}))} recordKey="__rowKey" recordType="importError">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Row</TableHead>
                      <TableHead>Problem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dryRunResult.errors.slice(0, 25).map((err, i) => (
                      <TableRow key={`${err.row}-${i}`}>
                        <TableCell>
                          {err.row > 0 ? (
                            <Badge variant="secondary">Row {err.row}</Badge>
                          ) : (
                            <Badge variant="destructive">Setup</Badge>
                          )}
                        </TableCell>
                        <TableCell>{err.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {dryRunResult.errors.length > 25 && (
                  <p className="px-4 py-2 text-xs text-muted-foreground border-t">
                    Showing the first 25 of {dryRunResult.errors.length}{" "}
                    problems.
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" onClick={() => setStep("map")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Mapping
              </Button>
              <Button
                onClick={() => void handleImport()}
                disabled={
                  importing ||
                  Math.max(
                    rows.length -
                      new Set(dryRunResult.errors.map((error) => error.row))
                        .size,
                    0,
                  ) === 0
                }
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    Import {plural}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Done */}
      {step === "done" && finalResult && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <CheckCircle2 className="h-14 w-14 text-green-500" />
            <div className="text-center">
              <p className="text-lg font-semibold">Import finished</p>
              <p className="text-muted-foreground mt-1">
                {finalResult.created} {kind} were created.
                {finalResult.errors.length > 0 &&
                  ` ${new Set(finalResult.errors.map((error) => error.row)).size} row(s) were skipped.`}
              </p>
            </div>
            {finalResult.errors.length > 0 && (
              <>
                <VisibleDataExport includeTables={false} />
                <ul className="max-w-lg space-y-1 text-sm text-muted-foreground max-h-48 overflow-y-auto">
                  {finalResult.errors.slice(0, 15).map((err, i) => (
                    <li key={i}>
                      Row {err.row}: {err.message}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetAll}>
                Import Another File
              </Button>
              <Button
                onClick={() => {
                  if (confirmDiscardChanges()) router.push(`/${kind}`);
                }}
              >
                Go to {plural}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
