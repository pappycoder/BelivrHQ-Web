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
import { useDeleteMember, type Member } from "@/hooks/use-members";
import { AlertTriangle } from "lucide-react";

interface DeleteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  /** Called after all deletions finish (even with partial failures). */
  onDeleted?: () => void;
  returnFocusRef?: React.RefObject<HTMLButtonElement | null>;
}

export function DeleteMemberDialog({
  open,
  onOpenChange,
  members,
  onDeleted,
  returnFocusRef,
}: DeleteMemberDialogProps) {
  const deleteMutation = useDeleteMember();
  const [pendingCount, setPendingCount] = React.useState(0);

  const single = members.length === 1 ? members[0] : null;
  const displayName = (m: Member) => `${m.firstName} ${m.lastName}`;

  const handleDelete = () => {
    if (members.length === 0) return;
    setPendingCount(members.length);

    let failed = 0;
    let done = 0;
    let succeeded = 0;

    members.forEach((member) => {
      deleteMutation.mutate(member.memberId, {
        onSuccess: () => {
          succeeded++;
        },
        onError: (error) => {
          failed++;
          if (single || members.length <= 3) {
            toast.error(`Failed to deactivate ${displayName(member)}`, {
              description: error?.message || "Please try again.",
            });
          }
        },
        onSettled: () => {
          done++;
          setPendingCount(members.length - done);
          if (done === members.length) {
            if (!single && members.length > 3 && failed > 0) {
              toast.warning(
                `Deactivated ${succeeded} of ${members.length} ${collectionLabel(members.length, "members")}`,
                {
                  description:
                    "Some members could not be deactivated. They may already be inactive.",
                },
              );
            } else if (!single && succeeded > 0) {
              toast.success(`${succeeded} ${collectionLabel(succeeded, "members")} deactivated`);
            }
            setPendingCount(0);
            // Single deletes stay open on failure so the error stays visible.
            if (!single || succeeded === members.length) {
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
            {single
              ? "Deactivate Member"
              : `Deactivate ${members.length} ${collectionLabel(members.length, "Members")}`}
          </DialogTitle>
          <DialogDescription className="text-center">
            {single ? (
              <>
                Are you sure you want to deactivate{" "}
                <span className="font-medium text-foreground">
                  {displayName(single)}
                </span>
                ? Their record is kept but they will be marked inactive and lose
                access to member features.
              </>
            ) : (
              <>
                Are you sure you want to deactivate{" "}
                <span className="font-medium text-foreground">
                  {members.length} {collectionLabel(members.length, "members")}
                </span>
                ? Their records are kept but they will be marked inactive.
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
              ? `Deactivating... (${members.length - pendingCount}/${members.length})`
              : "Deactivate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
