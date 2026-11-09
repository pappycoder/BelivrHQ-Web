"use client";

import * as React from "react";
import { toast } from "@/lib/toast";
import { UserMinus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRemoveFamilyMember, type FamilyMemberInfo } from "@/hooks/use-families";

interface RemoveFamilyMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyId: string;
  familyName: string;
  member: FamilyMemberInfo | null;
}

export function RemoveFamilyMemberDialog({
  open,
  onOpenChange,
  familyId,
  familyName,
  member,
}: RemoveFamilyMemberDialogProps) {
  const removeMutation = useRemoveFamilyMember(familyId);

  React.useEffect(() => {
    if (!open) removeMutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleRemove = () => {
    if (!member) return;
    removeMutation.mutate(member.memberId, {
      onSuccess: () => {
        toast.success(
          `${member.firstName} ${member.lastName} removed from ${familyName}`
        );
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error("Failed to remove member", {
          description: error?.message || "Please try again.",
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <UserMinus className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-center">Remove Family Member</DialogTitle>
          <DialogDescription className="text-center">
            {member ? (
              <>
                Are you sure you want to remove{" "}
                <span className="font-medium text-foreground">
                  {member.firstName} {member.lastName}
                </span>{" "}
                from{" "}
                <span className="font-medium text-foreground">{familyName}</span>?
                Their member record is kept; they are only unlinked from this
                family.
              </>
            ) : (
              "Are you sure?"
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={removeMutation.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleRemove} disabled={removeMutation.isPending} loading={removeMutation.isPending}>
            {removeMutation.isPending ? "Removing..." : "Remove Member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
