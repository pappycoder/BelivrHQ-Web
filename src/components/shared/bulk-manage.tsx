"use client";

import { useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  BulkManageAction,
  BulkRowRegistration,
} from "@/contexts/list-bulk-context";
import { getToastErrorMessage, toast } from "@/lib/toast";

/** Page-scoped batches keep failed records and report each failure; no fake bulk edit. */
export function BulkManage({
  selected,
  rows,
  onResolved,
}: {
  selected: string[];
  rows: Record<string, BulkRowRegistration>;
  onResolved: (successful: string[]) => void;
}) {
  const [batch, setBatch] = useState<{
    action: BulkManageAction;
    entries: { id: string; name: string; run: BulkManageAction["run"] }[];
  } | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [progress, setProgress] = useState(0);
  const [failures, setFailures] = useState<{ name: string; message: string }[]>(
    [],
  );
  const first =
    rows[selected[0]]
      ?.actions()
      .filter((action) => action.bulk && !action.disabled) ?? [];
  const choices = first.flatMap(({ bulk }) =>
    bulk &&
    selected.every((id) =>
      rows[id]
        ?.actions()
        .some((action) => action.bulk?.key === bulk.key && !action.disabled),
    )
      ? [bulk]
      : [],
  );
  async function run() {
    if (
      !batch ||
      busyRef.current ||
      (batch.action.requiresReason && !reason.trim())
    )
      return;
    busyRef.current = true;
    setBusy(true);
    setProgress(0);
    setFailures([]);
    const succeeded: string[] = [];
    const failed: { name: string; message: string }[] = [];
    for (const [index, entry] of batch.entries.entries()) {
      try {
        await entry.run({ reason: reason.trim() });
        succeeded.push(entry.id);
      } catch (error) {
        failed.push({
          name: entry.name,
          message: getToastErrorMessage(
            error,
            "This record could not be updated. It remains selected where visible.",
          ),
        });
      }
      setProgress(index + 1);
    }
    onResolved(succeeded);
    setFailures(failed);
    setBusy(false);
    busyRef.current = false;
    if (failed.length)
      toast.error(
        `${failed.length} of ${batch.entries.length} records could not be processed`,
        {
          description: failed
            .slice(0, 5)
            .map((entry) => `${entry.name}: ${entry.message}`)
            .join(" · "),
        },
      );
    else {
      toast.success(`${succeeded.length} records processed`);
      setBatch(null);
    }
  }
  return (
    <>
      {choices.map((action) => (
        <Button
          key={action.key}
          size="sm"
          variant={action.destructive ? "destructive" : "outline"}
          disabled={busy}
          onClick={() => {
            setReason("");
            setFailures([]);
            setBatch({
              action,
              entries: selected.map((id) => ({
                id,
                name: rows[id].name,
                run: rows[id]
                  .actions()
                  .find((item) => item.bulk?.key === action.key)!.bulk!.run,
              })),
            });
          }}
        >
          {action.label}
        </Button>
      ))}
      <Dialog
        open={!!batch}
        onOpenChange={(open) => {
          if (!open && !busy) setBatch(null);
        }}
      >
        <DialogContent
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (busy) event.preventDefault();
          }}
          showCloseButton={!busy}
        >
          <DialogHeader>
            <DialogTitle>{batch?.action.label}?</DialogTitle>
            <DialogDescription>
              Apply this action to {batch?.entries.length} selected records on
              this page. Records that cannot be processed will be reported for
              review.
              {batch?.action.description ? ` ${batch.action.description}` : ""}
              {batch?.action.destructive
                ? " Review the selected names carefully before confirming."
                : ""}
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-40 overflow-y-auto text-sm">
            {batch?.entries.map((entry) => (
              <li key={entry.id}>{entry.name}</li>
            ))}
          </ul>
          {batch?.action.requiresReason && !failures.length && (
            <label className="grid gap-2 text-sm">
              Reason
              <Textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                disabled={busy}
                placeholder="Explain the reason for this action"
                required
              />
            </label>
          )}
          {busy && (
            <p role="status" className="text-sm">
              Processed {progress} of {batch?.entries.length}
            </p>
          )}
          {!!failures.length && (
            <div
              role="alert"
              className="max-h-60 space-y-2 overflow-y-auto text-sm"
            >
              {failures.map((failure, index) => (
                <p key={index}>
                  <strong>{failure.name}:</strong> {failure.message}
                </p>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setBatch(null)}
            >
              {failures.length ? "Close" : "Cancel"}
            </Button>
            {!failures.length && (
              <Button
                variant={batch?.action.destructive ? "destructive" : "default"}
                disabled={
                  busy || (!!batch?.action.requiresReason && !reason.trim())
                }
                onClick={() => void run()}
              >
                {busy ? "Processing…" : "Confirm action"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
