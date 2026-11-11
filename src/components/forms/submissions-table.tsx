"use client";

import { useManageConfirmation } from "@/components/shared/manage-confirmation";

import { submissionRespondent } from "@/lib/submission-respondent";
import { useRef, useState } from "react";
import { toast, getToastErrorMessage } from "@/lib/toast";
import { VisibleDataExport } from "@/components/shared/visible-data-export";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { Check, Eye, X } from "lucide-react";
import {
  useBulkReviewSubmissions,
  type Form,
  type FormSubmission,
  SUBMISSION_STATUS_LABELS,
  SUBMISSION_STATUS_TEXT,
} from "@/hooks/use-forms";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function submissionValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "Not available";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map(submissionValue).join(", ") || "Not available";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

export function SubmissionsTable({
  form,
  submissions,
  loading = false,
  canReview,
  busy = false,
  onOpen,
  onApprove,
  onReject,
}: {
  form: Form;
  submissions: FormSubmission[];
  loading?: boolean;
  canReview: boolean;
  busy?: boolean;
  onOpen: (submission: FormSubmission) => void;
  onApprove: (submission: FormSubmission) => unknown | Promise<unknown>;
  onReject: (submission: FormSubmission) => void;
}) {
  const { confirm, dialog } = useManageConfirmation();
  const root = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<"approved" | "rejected" | null>(null);
  const [reason, setReason] = useState("");
  const [batchError, setBatchError] = useState("");
  const bulk = useBulkReviewSubmissions(form.id);
  const selected = submissions.filter((row) => selection.includes(row.id));
  const pending = selected.filter((row) => row.status === "pending");
  const locked = busy || bulk.isPending;
  async function reviewSelected() {
    if (!canReview || !bulkStatus || !pending.length || locked) return;
    if (bulkStatus === "rejected" && !reason.trim()) {
      setBatchError("Enter a rejection reason for these responses.");
      return;
    }
    setBatchError("");
    try {
      const result = await bulk.mutateAsync({
        ids: pending.map((row) => row.id),
        status: bulkStatus,
        rejectionReason: reason,
      });
      setSelection(result.failed.map((row) => row.id));
      setBulkStatus(null);
      setReason("");
      if (result.succeeded.length)
        toast.success(`${result.succeeded.length} responses ${bulkStatus}`);
      if (result.failed.length) {
        const message = `${result.failed.length} responses could not be updated. They remain selected for retry. ${result.failed[0].message}`;
        setBatchError(message);
        toast.error(message);
      }
    } catch (error) {
      setBatchError(
        getToastErrorMessage(error, "Could not review these responses. Please try again."),
      );
    }
  }
  // A configured unique answer is the best identifier; names/email come next.
  const primary =
    form.fields.find((field) => field.key === form.uniqueField) ??
    form.fields.find((field) =>
      /(^|[\s_])(name|full.?name)($|[\s_])/i.test(`${field.label} ${field.key}`),
    ) ??
    form.fields.find((field) => field.type === "email") ??
    form.fields[0];
  const fields = primary
    ? [primary, ...form.fields.filter((field) => field.key !== primary.key)]
    : [];
  const columnCount = 7 + Math.max(1, fields.length);
  return (
    <div ref={root} className="min-w-0">
      {dialog}
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b bg-accent/30 p-3">
          <span role="status" className="mr-auto text-sm font-medium">
            {selected.length} responses selected · {pending.length} pending
          </span>
          <VisibleDataExport
            getRoot={() => root.current}
            selectedOnly
            label="Export selected rows"
          />
          {canReview && (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={!pending.length || locked}
                onClick={() => {
                  setBulkStatus("approved");
                  setBatchError("");
                }}
              >
                Approve selected
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!pending.length || locked}
                onClick={() => {
                  setBulkStatus("rejected");
                  setBatchError("");
                }}
              >
                Reject selected
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" disabled={locked} onClick={() => setSelection([])}>
            Clear rows
          </Button>
        </div>
      )}
      {batchError && !bulkStatus && (
        <p role="alert" className="p-3 text-sm text-destructive">
          {batchError}
        </p>
      )}
      <Table
        selectable={false}
        tableId={`submissions-${form.id}`}
        aria-label={`${form.title} submissions`}
        exportable
       records={submissions} recordKey="id" recordType="formSubmission" fields={form.fields}>
        <TableHeader>
          <TableRow>
            <TableHead hideable={false} className="w-10">
              <Checkbox
                aria-label="Select all submissions on this page"
                disabled={loading || locked || !submissions.length}
                checked={
                  selected.length === submissions.length && submissions.length > 0
                    ? true
                    : selected.length > 0
                      ? "indeterminate"
                      : false
                }
                onCheckedChange={() =>
                  setSelection(
                    selected.length === submissions.length ? [] : submissions.map((row) => row.id),
                  )
                }
              />
            </TableHead>
            <TableHead hideable={false}>Submission reference</TableHead>
            {fields.length ? (
              fields.map((field, index) => (
                <TableHead
                  key={field.key}
                  hideable={index !== 0}
                  columnLabel={field.label}
                  valueType={
                    field.type === "number"
                      ? "number"
                      : field.type === "phone" || field.type === "email"
                        ? "text"
                        : undefined
                  }
                >
                  {field.label}
                  {field.required && (
                    <span className="ml-1 text-muted-foreground" aria-label="required">
                      *
                    </span>
                  )}
                </TableHead>
              ))
            ) : (
              <TableHead hideable={false}>Response</TableHead>
            )}
            <TableHead>Status</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Attachments</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading
            ? Array.from({ length: 5 }, (_, row) => (
                <TableRow key={row}>
                  {Array.from({ length: columnCount }, (_, column) => (
                    <TableCell key={column}>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : submissions.map((submission) => (
                <TableRow
                  key={submission.id}
                  data-row-selected={selection.includes(submission.id)}
                  className="cursor-pointer"
                  onClick={() => onOpen(submission)}
                >
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <Checkbox
                      aria-label={`Select submission ${submission.id}`}
                      disabled={locked}
                      checked={selection.includes(submission.id)}
                      onCheckedChange={() =>
                        setSelection((previous) =>
                          previous.includes(submission.id)
                            ? previous.filter((id) => id !== submission.id)
                            : [...previous, submission.id],
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="link"
                      className="h-auto max-w-full justify-start p-0 font-mono text-sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpen(submission);
                      }}
                      title={submission.id}
                    >
                      <span className="truncate">{submission.id}</span>
                    </Button>
                  </TableCell>
                  {fields.length ? (
                    fields.map((field) => {
                      const value = submissionValue(submission.data[field.key]);
                      return (
                        <TableCell key={field.key} title={value}>
                          <span className="block max-w-56 truncate">{value}</span>
                        </TableCell>
                      );
                    })
                  ) : (
                    <TableCell>Open response</TableCell>
                  )}
                  <TableCell>
                    <Badge variant="outline" className={SUBMISSION_STATUS_TEXT[submission.status]}>
                      {SUBMISSION_STATUS_LABELS[submission.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{submission.submittedBy ? "Signed in" : "Public"}</TableCell>
                  <TableCell>
                    {format(new Date(submission.createdAt), "MMM d, yyyy h:mm a")}
                  </TableCell>
                  <TableCell>{submission.attachments?.length ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <div
                      className="flex justify-end gap-1"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`View submission ${submission.id}`}
                        onClick={() => onOpen(submission)}
                      >
                        <Eye />
                      </Button>
                      {canReview && submission.status === "pending" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-emerald-600"
                            aria-label={`Approve submission ${submission.id}`}
                            disabled={locked}
                            onClick={() => confirm({ title: "Approve answer?", subject: submissionRespondent(submission, form.fields).name, onConfirm: () => onApprove(submission) })}
                          >
                            <Check />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive"
                            aria-label={`Reject submission ${submission.id}`}
                            disabled={locked}
                            onClick={() => onReject(submission)}
                          >
                            <X />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
      <Dialog
        open={bulkStatus !== null}
        onOpenChange={(open) => {
          if (!open && !bulk.isPending) {
            setBulkStatus(null);
            setReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkStatus === "rejected" ? "Reject" : "Approve"} {pending.length} pending responses?
            </DialogTitle>
            <DialogDescription>
              This changes only the selected pending responses for {form.title}. Already reviewed
              responses are skipped.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg bg-muted/30 p-3 font-mono text-sm">
            {pending.map((row) => (
              <p key={row.id}>{row.id}</p>
            ))}
          </div>
          {bulkStatus === "rejected" && (
            <div className="space-y-2">
              <label htmlFor={`bulk-reason-${form.id}`} className="text-sm font-medium">
                Rejection reason
              </label>
              <Textarea
                id={`bulk-reason-${form.id}`}
                value={reason}
                maxLength={1000}
                disabled={bulk.isPending}
                onChange={(event) => setReason(event.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                This reason applies to every response in this batch.
              </p>
            </div>
          )}
          {batchError && (
            <p role="alert" className="text-sm text-destructive">
              {batchError}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={bulk.isPending}
              onClick={() => {
                setBulkStatus(null);
                setReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant={bulkStatus === "rejected" ? "destructive" : "default"}
              loading={bulk.isPending}
              disabled={!pending.length || (bulkStatus === "rejected" && !reason.trim())}
              onClick={() => void reviewSelected()}
            >
              Confirm {bulkStatus === "rejected" ? "rejection" : "approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
