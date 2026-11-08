"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getToastErrorMessage } from "@/lib/toast";

export interface ManageConfirmationOptions {
  subject: string;
  title?: string;
  description?: string;
  destructive?: boolean;
}
interface ConfirmedAction extends ManageConfirmationOptions {
  title: string;
  onConfirm: () => unknown | Promise<unknown>;
}

/** Snapshot the intended record/action; never execute a write before confirmation. */
export function useManageConfirmation() {
  const [action, setAction] = useState<ConfirmedAction | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");
  const confirm = useCallback((next: ConfirmedAction) => {
    if (busyRef.current) return;
    setError("");
    setAction(next);
  }, []);
  async function proceed() {
    if (!action || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      await action.onConfirm();
      setAction(null);
    } catch (failure) {
      setError(
        getToastErrorMessage(
          failure,
          "Could not complete this action. Please try again.",
        ),
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  const dialog = (
    <Dialog
      open={!!action}
      onOpenChange={(open) => {
        if (!open && !busyRef.current) setAction(null);
      }}
    >
      <DialogContent
        data-testid="manage-confirmation"
        showCloseButton={!busy}
        onEscapeKeyDown={(event) => {
          if (busyRef.current) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (busyRef.current) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{action?.title}</DialogTitle>
          <DialogDescription>
            {action?.description ??
              `Confirm this change for ${action?.subject}.`}
          </DialogDescription>
        </DialogHeader>
        <p className="break-words text-sm font-medium">{action?.subject}</p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setAction(null)}
          >
            Cancel
          </Button>
          <Button
            variant={action?.destructive ? "destructive" : "default"}
            disabled={busy}
            onClick={() => void proceed()}
          >
            {busy ? "Confirming…" : "Confirm action"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  return { confirm, dialog };
}
