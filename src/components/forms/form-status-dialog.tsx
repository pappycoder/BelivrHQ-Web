"use client";

import { RequiredFieldsNotice } from "@/components/ui/required-fields";

import { useRef, useState } from "react";
import {
  useUpdateForm,
  FORM_STATUSES,
  FORM_STATUS_LABELS,
  type Form,
  type FormStatus,
} from "@/hooks/use-forms";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getToastErrorMessage, toast } from "@/lib/toast";

export function FormStatusDialog({
  form,
  onClose,
}: {
  form: Form;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<FormStatus>(form.status);
  const [error, setError] = useState("");
  const update = useUpdateForm(form.id);
  const saving = useRef(false);
  async function save() {
    if (
      saving.current ||
      update.isPending ||
      status === form.status ||
      form.archivedAt
    )
      return;
    saving.current = true;
    setError("");
    try {
      await update.mutateAsync({ status });
      toast.success(
        `${form.title} is now ${FORM_STATUS_LABELS[status].toLowerCase()}.`,
      );
      onClose();
    } catch (failure) {
      setError(
        getToastErrorMessage(
          failure,
          "Could not change the form status. Try again.",
        ),
      );
    } finally {
      saving.current = false;
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !update.isPending) onClose();
      }}
    >
      <DialogContent
        onEscapeKeyDown={(event) => {
          if (update.isPending) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (update.isPending) event.preventDefault();
        }}
        showCloseButton={!update.isPending}
      >
        <DialogHeader>
          <DialogTitle>Change form status?</DialogTitle>
          <DialogDescription>
            Confirm the new status for {form.title}. Its current status is{" "}
            {FORM_STATUS_LABELS[form.status]}.
          </DialogDescription>
        </DialogHeader>
        <RequiredFieldsNotice />
        <div className="space-y-2">
          <Label required htmlFor="form-status">New status</Label>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as FormStatus)}
            disabled={update.isPending}
          >
            <SelectTrigger aria-required="true" id="form-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORM_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {FORM_STATUS_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {status === "published"
              ? "Publishing allows new submissions. Public forms can be filled through their public link."
              : status === "draft"
                ? "Draft forms do not accept submissions. Existing answers are kept."
                : "Closing stops new submissions and keeps existing answers available."}
          </p>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            disabled={update.isPending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            disabled={
              update.isPending || status === form.status || !!form.archivedAt
            }
            loading={update.isPending}
            onClick={() => void save()}
          >
            Confirm status change
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
