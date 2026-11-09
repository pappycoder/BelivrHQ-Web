"use client";

import { useRef, useState } from "react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useUpdateSubmissionStatus,
  type FormSubmission,
  type SubmissionStatus,
} from "@/hooks/use-forms";

export interface SubmissionStatusDialogProps {
  intent?: "review" | "reject";
  respondentName?: string;
  formId: string;
  submission?: FormSubmission;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubmissionStatusDialog({
  intent = "review",
  respondentName,
  formId,
  submission,
  open,
  onOpenChange,
}: SubmissionStatusDialogProps) {
  const [rejectionReason, setRejectionReason] = useState("");
  const mutation = useUpdateSubmissionStatus(formId);
  const saving = useRef(false);
  const [error, setError] = useState("");

  const handleAction = async (status: SubmissionStatus) => {
    if (!submission || saving.current) return;
    if (status === "rejected" && !rejectionReason.trim()) {
      toast.error("A rejection reason is required");
      return;
    }
    saving.current = true;
    setError("");
    try {
      await mutation.mutateAsync({
        submissionId: submission.id,
        input: {
          status,
          ...(status === "rejected"
            ? { rejectionReason: rejectionReason.trim() }
            : {}),
        },
      });
      toast.success(
        status === "approved" ? "Submission approved" : "Submission rejected",
      );
      setRejectionReason("");
      onOpenChange(false);
    } catch (err) {
      setError(getToastErrorMessage(err, "Please try again."));
    } finally {
      saving.current = false;
    }
  };

  if (!submission) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!mutation.isPending) onOpenChange(value);
      }}
    >
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>
            {intent === "reject" ? "Reject answer?" : "Review submission"}
          </DialogTitle>
          <DialogDescription>
            {intent === "reject"
              ? `Confirm rejection of ${respondentName ?? submission.id}. A reason is required.`
              : "Approve or reject this submission."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Label htmlFor="rejectionReason">
            Rejection reason (required when rejecting)
          </Label>
          <Textarea
            id="rejectionReason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Explain why this submission is being rejected"
            rows={3}
            maxLength={1000}
            disabled={mutation.isPending}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={mutation.isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              disabled={mutation.isPending || !rejectionReason.trim()}
              onClick={() => handleAction("rejected")}
            >
              {intent === "reject" ? "Confirm rejection" : "Reject"}
            </Button>
            {intent !== "reject" && (
              <Button
                type="button"
                disabled={mutation.isPending}
                onClick={() => handleAction("approved")}
              >
                Approve
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
