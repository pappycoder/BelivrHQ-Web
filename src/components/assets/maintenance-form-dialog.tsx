"use client";
import { WorkspaceFormSection } from "@/components/workspace/workspace-presentation";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/lib/toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateMaintenance,
  useUpdateMaintenance,
  type AssetMaintenance,
  type MaintenanceStatus,
} from "@/hooks/use-assets";

const MAINTENANCE_TYPES = [
  "Preventive check",
  "Repair",
  "Servicing",
  "Cleaning",
  "Calibration",
  "Inspection",
  "Other",
];

const STATUS_OPTIONS: Array<{ value: MaintenanceStatus; label: string }> = [
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const maintenanceSchema = z.object({
  type: z.string().min(1, "Maintenance type is required"),
  scheduledDate: z.string().min(1, "Scheduled date is required"),
  description: z.string().optional(),
  status: z.string().optional(),
  completedDate: z.string().optional(),
  cost: z.coerce.number<number>().min(0).optional(),
  performedBy: z.string().optional(),
  notes: z.string().optional(),
});

type MaintenanceFormValues = z.infer<typeof maintenanceSchema>;

interface MaintenanceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
  /** When provided the dialog updates this record; otherwise it creates one. */
  maintenance?: AssetMaintenance | null;
  onSaved?: () => void;
}

function toFormValues(
  maintenance?: AssetMaintenance | null,
): MaintenanceFormValues {
  return {
    type: maintenance?.type ?? "",
    scheduledDate: maintenance?.scheduledDate
      ? maintenance.scheduledDate.slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    description: maintenance?.description ?? "",
    status: maintenance?.status ?? "scheduled",
    completedDate: maintenance?.completedDate
      ? maintenance.completedDate.slice(0, 10)
      : "",
    cost: maintenance?.cost ?? undefined,
    performedBy: maintenance?.performedBy ?? "",
    notes: maintenance?.notes ?? "",
  };
}

export function MaintenanceFormDialog({
  open,
  onOpenChange,
  assetId,
  maintenance,
  onSaved,
}: MaintenanceFormDialogProps) {
  const isEdit = !!maintenance;
  const createMutation = useCreateMaintenance(assetId);
  const updateMutation = useUpdateMaintenance(assetId, maintenance?.id ?? "");

  const form = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: toFormValues(maintenance),
  });

  React.useEffect(() => {
    if (open) {
      form.reset(toFormValues(maintenance));
    }
  }, [open, maintenance, form]);

  const onSubmit = (values: MaintenanceFormValues) => {
    const payload = {
      type: values.type.trim(),
      scheduledDate: values.scheduledDate,
      description: values.description?.trim() || undefined,
      status: values.status as MaintenanceStatus | undefined,
      completedDate: values.completedDate || undefined,
      cost: values.cost === 0 ? undefined : values.cost,
      performedBy: values.performedBy?.trim() || undefined,
      notes: values.notes?.trim() || undefined,
    };
    const mutation = isEdit ? updateMutation : createMutation;
    mutation.mutate(payload as never, {
      onSuccess: () => {
        toast.success(
          isEdit
            ? "Maintenance updated successfully"
            : "Maintenance scheduled successfully",
        );
        onOpenChange(false);
        onSaved?.();
      },
      onError: (error) => {
        toast.error(
          isEdit
            ? "Failed to update maintenance"
            : "Failed to schedule maintenance",
          { description: error?.message || "Please try again." },
        );
      },
    });
  };

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Update Maintenance" : "Schedule Maintenance"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the maintenance record, including marking it complete."
              : "Schedule or log maintenance for this asset."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <WorkspaceFormSection title="Schedule and status">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maintenance Type *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MAINTENANCE_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="scheduledDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scheduled Date *</FormLabel>
                      <FormControl>
                        <Input picker="wheel" type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </WorkspaceFormSection>
            <WorkspaceFormSection title="Completion and cost">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="completedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Completed Date</FormLabel>
                      <FormControl>
                        <Input picker="wheel" type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost (₦)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="performedBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Performed By</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Technician or vendor"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </WorkspaceFormSection>
            <WorkspaceFormSection title="Work details">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What needs to be done?"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </WorkspaceFormSection>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : isEdit ? "Save Changes" : "Schedule"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
