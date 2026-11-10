"use client";

import { ValidatedForm } from "@/components/ui/validated-form";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  CountrySelectField,
  StateSelectField,
} from "@/components/shared/country-state-select";
import {
  useCreateBranch,
  useUpdateBranch,
  type Branch,
} from "@/hooks/use-branches";

const branchSchema = z.object({
  name: z.string().trim().min(1, "Branch name is required"),
  isHeadquarters: z.boolean(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
});

type BranchFormValues = z.infer<typeof branchSchema>;

interface BranchFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  /** When provided the dialog edits this branch; otherwise it creates one. */
  branch?: Branch | null;
  onSaved?: (branch: Branch) => void;
}

function toFormValues(branch?: Branch | null): BranchFormValues {
  return {
    name: branch?.name ?? "",
    isHeadquarters: branch?.isHeadquarters ?? false,
    address: branch?.address ?? "",
    city: branch?.city ?? "",
    state: branch?.state ?? "",
    country: branch?.country ?? "Nigeria",
    phone: branch?.phone ?? "",
    email: branch?.email ?? "",
  };
}

export function BranchFormDialog({
  open,
  onOpenChange,
  returnFocusRef,
  branch,
  onSaved,
}: BranchFormDialogProps) {
  const isEdit = !!branch;
  const createMutation = useCreateBranch();
  const updateMutation = useUpdateBranch(branch?.branchId ?? "");

  const form = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: toFormValues(branch),
  });

  React.useEffect(() => {
    if (open) {
      form.reset(toFormValues(branch));
    }
  }, [open, branch, form]);

  const onSubmit = (values: BranchFormValues) => {
    const payload = {
      name: values.name.trim(),
      isHeadquarters: values.isHeadquarters,
      address: values.address?.trim() || undefined,
      city: values.city?.trim() || undefined,
      state: values.state?.trim() || undefined,
      country: values.country?.trim() || undefined,
      phone: values.phone?.trim() || undefined,
      email: values.email?.trim() || undefined,
    };

    const mutation = isEdit ? updateMutation : createMutation;
    mutation.mutate(payload, {
      onSuccess: (saved) => {
        toast.success(
          isEdit
            ? "Branch updated successfully"
            : "Branch created successfully",
        );
        onOpenChange(false);
        onSaved?.(saved);
      },
      onError: (error) => {
        toast.error(
          isEdit ? "Failed to update branch" : "Failed to create branch",
          {
            description: error?.message || "Please try again.",
          },
        );
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
        className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Branch" : "Add Branch"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this branch's details."
              : "Create a new branch for your church."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <ValidatedForm schemaValidation onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <WorkspaceFormSection title="Branch identity">
              <FormField required
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Main Auditorium" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isHeadquarters"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Headquarters</FormLabel>
                      <FormDescription>
                        Only one headquarters branch is allowed.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-label="Mark as headquarters"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </WorkspaceFormSection>
            <WorkspaceFormSection title="Location and contact">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Street address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="City" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <StateSelectField
                  control={form.control}
                  name="state"
                  countryName="country"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CountrySelectField control={form.control} name="country" />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+234 803 456 7890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="branch@church.org" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </WorkspaceFormSection>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? isEdit
                    ? "Saving..."
                    : "Creating..."
                  : isEdit
                    ? "Save Changes"
                    : "Create Branch"}
              </Button>
            </DialogFooter>
          </ValidatedForm>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
