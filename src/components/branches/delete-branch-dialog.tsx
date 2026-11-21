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
import { useDeleteBranch, type Branch } from "@/hooks/use-branches";
import { AlertTriangle } from "lucide-react";

interface DeleteBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  branches: Branch[];
  /** Called after all deletions finish (even with partial failures). */
  onDeleted?: () => void;
}

export function DeleteBranchDialog({
  open,
  onOpenChange,
  returnFocusRef,
  branches,
  onDeleted,
}: DeleteBranchDialogProps) {
  const deleteMutation = useDeleteBranch();
  const [pendingCount, setPendingCount] = React.useState(0);

  const single = branches.length === 1 ? branches[0] : null;

  const handleDelete = () => {
    if (branches.length === 0) return;
    setPendingCount(branches.length);

    let failed = 0;
    let done = 0;
    let succeeded = 0;

    branches.forEach((branch) => {
      deleteMutation.mutate(branch.branchId, {
        onSuccess: () => {
          succeeded++;
        },
        onError: (error) => {
          failed++;
          if (single || branches.length <= 3) {
            toast.error(`Failed to delete ${branch.name}`, {
              description: error?.message || "Please try again.",
            });
          }
        },
        onSettled: () => {
          done++;
          setPendingCount(branches.length - done);
          if (done === branches.length) {
            if (!single && branches.length > 3 && failed > 0) {
              toast.warning(
                `Deleted ${succeeded} of ${branches.length} ${collectionLabel(branches.length, "branches")}`,
                {
                  description: `${failed} could not be deleted (they may still have members assigned).`,
                },
              );
            } else if (!single && succeeded > 0) {
              toast.success(`${succeeded} branch(es) deleted`);
            }
            setPendingCount(0);
            // Single deletes stay open on failure so the error stays visible.
            if (!single || succeeded === branches.length) {
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
        onCloseAutoFocus={
          returnFocusRef
            ? (event) => {
                const target = returnFocusRef.current;
                if (target?.isConnected) {
                  event.preventDefault();
                  requestAnimationFrame(() => target.focus());
                }
              }
            : undefined
        }
        className="sm:max-w-[420px]"
      >
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-center">
            {single ? "Delete Branch" : `Delete ${branches.length} ${collectionLabel(branches.length, "Branches")}`}
          </DialogTitle>
          <DialogDescription className="text-center">
            {single ? (
              <>
                Are you sure you want to permanently delete{" "}
                <span className="font-medium text-foreground">
                  {single.name}
                </span>
                ? This cannot be undone. Branches with members assigned cannot
                be deleted.
              </>
            ) : (
              <>
                Are you sure you want to permanently delete{" "}
                <span className="font-medium text-foreground">
                  {branches.length} {collectionLabel(branches.length, "branches")}
                </span>
                ? This cannot be undone. Branches with members assigned cannot
                be deleted.
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
              ? `Deleting... (${branches.length - pendingCount}/${branches.length})`
              : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
