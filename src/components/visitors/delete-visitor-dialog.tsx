"use client";

import { collectionLabel } from "@/lib/collection-label";

import * as React from "react";
import { toast } from "@/lib/toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeleteVisitor, type Visitor } from "@/hooks/use-visitors";
import { AlertTriangle } from "lucide-react";

interface DeleteVisitorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitors: Visitor[];
  /** Called after all deletions finish (even with partial failures). */
  onDeleted?: () => void;
  presentationClassName?: string;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}

export function DeleteVisitorDialog({
  open,
  onOpenChange,
  visitors,
  onDeleted,
  presentationClassName,
  returnFocusRef,
}: DeleteVisitorDialogProps) {
  const deleteMutation = useDeleteVisitor();
  const [pendingCount, setPendingCount] = React.useState(0);

  const single = visitors.length === 1 ? visitors[0] : null;
  const displayName = (v: Visitor) =>
    `${v.firstName}${v.lastName ? ` ${v.lastName}` : ""}`;

  const handleDelete = () => {
    if (visitors.length === 0) return;
    setPendingCount(visitors.length);

    let failed = 0;
    let done = 0;
    let succeeded = 0;

    visitors.forEach((visitor) => {
      deleteMutation.mutate(visitor.id, {
        onSuccess: () => {
          succeeded++;
        },
        onError: (error) => {
          failed++;
          if (single || visitors.length <= 3) {
            toast.error(`Failed to delete ${displayName(visitor)}`, {
              description: error?.message || "Please try again.",
            });
          }
        },
        onSettled: () => {
          done++;
          setPendingCount(visitors.length - done);
          if (done === visitors.length) {
            if (!single && visitors.length > 3 && failed > 0) {
              toast.warning(
                `Deleted ${succeeded} of ${visitors.length} ${collectionLabel(visitors.length, "visitors")}`,
                {
                  description:
                    "Some visitors could not be deleted. Please try again.",
                },
              );
            } else if (!single && succeeded > 0) {
              toast.success(`${succeeded} ${collectionLabel(succeeded, "visitors")} deleted`);
            }
            setPendingCount(0);
            // Single deletes stay open on failure so the error stays visible.
            if (!single || succeeded === visitors.length) {
              onOpenChange(false);
              if (succeeded > 0) onDeleted?.();
            }
          }
        },
      });
    });
  };

  React.useEffect(() => {
    if (!open) {
      deleteMutation.reset();
      setPendingCount(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${presentationClassName ?? ""} sm:max-w-[420px]`}
        onCloseAutoFocus={
          returnFocusRef
            ? (event) => {
                if (returnFocusRef.current?.isConnected) {
                  event.preventDefault();
                  requestAnimationFrame(() => returnFocusRef.current?.focus());
                }
              }
            : undefined
        }
      >
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-center">
            {single ? "Delete Visitor" : `Delete ${visitors.length} ${collectionLabel(visitors.length, "Visitors")}`}
          </DialogTitle>
          <DialogDescription className="text-center">
            {single ? (
              <>
                Are you sure you want to permanently delete{" "}
                <span className="font-medium text-foreground">
                  {displayName(single)}
                </span>
                ? This removes their record and follow-up history. This action
                cannot be undone.
              </>
            ) : (
              <>
                Are you sure you want to permanently delete{" "}
                <span className="font-medium text-foreground">
                  {visitors.length} {collectionLabel(visitors.length, "visitors")}
                </span>
                ? Their records and follow-up history will be removed. This
                action cannot be undone.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pendingCount > 0}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={pendingCount > 0}
          >
            {pendingCount > 0
              ? `Deleting... (${visitors.length - pendingCount}/${visitors.length})`
              : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
