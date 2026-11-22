"use client";

import { FormSection } from "@/components/shared/form-section";

import { FormDialogContent } from "@/components/shared/form-dialog";

import { RequiredFieldsNotice } from "@/components/ui/required-fields";
import {
  BranchAssignmentField,
  useBranchAssignment,
} from "@/components/shared/branch-assignment";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUpdateBroadcast, type Broadcast } from "@/hooks/use-broadcasts";
import { toast, getToastErrorMessage } from "@/lib/toast";

export function BroadcastBranchDialog({
  broadcast,
  onClose,
}: {
  broadcast: Broadcast | null;
  onClose: () => void;
}) {
  const assignment = useBranchAssignment(broadcast, !!broadcast);
  const update = useUpdateBroadcast();
  return (
    <Dialog
      open={!!broadcast}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <FormDialogContent>
        <DialogHeader>
          <DialogTitle>Edit Broadcast Branch</DialogTitle>
          <DialogDescription>
            Changing branch recalculates recipients before the scheduled send.
          </DialogDescription>
        </DialogHeader>
        <FormSection title="Details">
          <RequiredFieldsNotice />
          <BranchAssignmentField
            assignment={assignment}
            disabled={update.isPending}
          />
        </FormSection>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={update.isPending}
            onClick={async () => {
              const payload = assignment.payload();
              if (!payload || !broadcast) return;
              if (!payload.branchId) {
                onClose();
                return;
              }
              try {
                await update.mutateAsync({
                  broadcastId: broadcast.broadcastId,
                  branchId: payload.branchId,
                });
                toast.success("Broadcast branch updated");
                onClose();
              } catch (error) {
                toast.error("Could not update broadcast", {
                  description: getToastErrorMessage(error, "Please try again."),
                });
              }
            }}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </FormDialogContent>
    </Dialog>
  );
}
