"use client";

import { collectionLabel } from "@/lib/collection-label";

import * as React from "react";
import { toast } from "@/lib/toast";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeleteFamily, type Family } from "@/hooks/use-families";

interface DeleteFamilyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  families: Family[];
  /** Called after all deletions finish (even with partial failures). */
  onDeleted?: () => void;
  returnFocusRef?: React.RefObject<HTMLButtonElement | null>;
}

export function DeleteFamilyDialog({
  open,
  onOpenChange,
  families,
  onDeleted,
  returnFocusRef,
}: DeleteFamilyDialogProps) {
  const deleteMutation = useDeleteFamily();
  const [pendingCount, setPendingCount] = React.useState(0);

  const single = families.length === 1 ? families[0] : null;

  const handleDelete = () => {
    if (families.length === 0) return;
    setPendingCount(families.length);

    let failed = 0;
    let done = 0;
    let succeeded = 0;

    families.forEach((family) => {
      deleteMutation.mutate(family.familyId, {
        onSuccess: () => {
          succeeded++;
        },
        onError: (error) => {
          failed++;
          if (single || families.length <= 3) {
            toast.error(`Failed to delete ${family.name}`, {
              description: error?.message || "Please try again.",
            });
          }
        },
        onSettled: () => {
          done++;
          setPendingCount(families.length - done);
          if (done === families.length) {
            if (!single && families.length > 3 && failed > 0) {
              toast.warning(
                `Deleted ${succeeded} of ${families.length} ${collectionLabel(families.length, "families")}`,
                {
                  description:
                    "Some families could not be deleted. Please try again.",
                },
              );
            } else if (!single && succeeded > 0) {
              toast.success(`${succeeded} family(ies) deleted`);
            }
            setPendingCount(0);
            // Single deletes stay open on failure so the error stays visible.
            if (!single || succeeded === families.length) {
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
        className="sm:max-w-[420px]"
        onCloseAutoFocus={
          returnFocusRef
            ? (event) => {
                event.preventDefault();
                returnFocusRef.current?.focus();
              }
            : undefined
        }
      >
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-center">
            {single ? "Delete Family" : `Delete ${families.length} ${collectionLabel(families.length, "Families")}`}
          </DialogTitle>
          <DialogDescription className="text-center">
            {single ? (
              <>
                Are you sure you want to delete{" "}
                <span className="font-medium text-foreground">
                  {single.name}
                </span>
                ? The family group and its member associations are removed.
                Member records themselves are not deleted.
              </>
            ) : (
              <>
                Are you sure you want to delete{" "}
                <span className="font-medium text-foreground">
                  {families.length} {collectionLabel(families.length, "families")}
                </span>
                ? The family groups and their member associations are removed.
                Member records themselves are not deleted.
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
              ? `Deleting... (${families.length - pendingCount}/${families.length})`
              : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
