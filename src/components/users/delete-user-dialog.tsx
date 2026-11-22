"use client";

import { collectionLabel } from "@/lib/collection-label";

import * as React from "react";
import { toast } from "@/lib/toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeactivateUser, useDeleteUser, type UserProfile } from "@/hooks/use-users";
import { AlertTriangle } from "lucide-react";

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: UserProfile[];
  mode?: "delete" | "deactivate";
  onCompleted?: () => void;
}

export function DeleteUserDialog({ open, onOpenChange, users, mode = "deactivate", onCompleted }: DeleteUserDialogProps) {
  const deactivate = useDeactivateUser();
  const remove = useDeleteUser();
  const completed = React.useRef(new Set<string>());
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState("");
  const deleting = mode === "delete";
  const verb = deleting ? "Delete" : "Deactivate";
  const single = users.length === 1 ? users[0] : null;
  React.useEffect(() => { if (open) { setError(""); completed.current.clear(); } }, [open]);

  const confirm = async () => {
    if (pending || !users.length) return;
    setPending(true);
    setError("");
    const targets = users.filter(user => !completed.current.has(user.profileId));
    const results = await Promise.allSettled(targets.map(user =>
      deleting ? remove.mutateAsync(user.profileId) : deactivate.mutateAsync(user.profileId)
    ));
    results.forEach((result, index) => { if (result.status === "fulfilled") completed.current.add(targets[index].profileId); });
    const succeeded = results.filter(result => result.status === "fulfilled").length;
    const failures = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
    setPending(false);
    if (succeeded) {
      toast.success(`${succeeded} user${succeeded === 1 ? "" : "s"} ${deleting ? "deleted" : "deactivated"}`);
      onCompleted?.();
    }
    if (!failures.length) onOpenChange(false);
    else setError(`${succeeded ? `${succeeded} of ${users.length} ${collectionLabel(users.length, "users")} completed. ` : ""}${failures[0].reason?.message || "Unable to complete this action. Please try again."}`);
  };

  return <Dialog open={open} onOpenChange={next => { if (!pending) onOpenChange(next); }}>
    <DialogContent className="sm:max-w-[420px]">
      <DialogHeader>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10"><AlertTriangle className="h-6 w-6 text-destructive" /></div>
        <DialogTitle className="text-center">{single ? `${verb} User` : `${verb} ${users.length} ${collectionLabel(users.length, "Users")}`}</DialogTitle>
        <DialogDescription className="text-center">
          {verb} {single ? `${single.firstName} ${single.lastName}` : `${users.length} ${collectionLabel(users.length, "users")}`}?
          {deleting ? " Their login accounts will be permanently removed. Member records, giving, attendance and church history will be preserved. This cannot be undone." : " They will no longer be able to sign in. You can reactivate them later."}
        </DialogDescription>
      </DialogHeader>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</Button>
        <Button variant="destructive" onClick={confirm} disabled={pending || !users.length}>{pending ? (deleting ? "Deleting..." : "Deactivating...") : verb}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
