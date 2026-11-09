"use client";

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
import { useDeleteDepartment, type Department } from "@/hooks/use-admin";

interface DeleteDepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  department: Department | null;
  onDeleted?: (departmentId: string) => void;
}

export function DeleteDepartmentDialog({
  open,
  onOpenChange,
  returnFocusRef,
  department,
  onDeleted,
}: DeleteDepartmentDialogProps) {
  const deleteMutation = useDeleteDepartment();

  const handleConfirm = () => {
    if (!department) return;
    deleteMutation.mutate(department.id, {
      onSuccess: () => {
        toast.success("Department deleted");
        onOpenChange(false);
        onDeleted?.(department.id);
      },
      onError: (error) => {
        toast.error("Failed to delete department", {
          description: error?.message || "Please try again.",
        });
      },
    });
  };

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
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </span>
            Delete Department
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">
              {department?.name}
            </span>
            ? Members assigned to it are not removed; only the department
            record itself is deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleteMutation.isPending}
            loading={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
