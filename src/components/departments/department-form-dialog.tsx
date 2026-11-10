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
import { MemberCombobox } from "@/components/members/member-combobox";
import { useBranchesList } from "@/hooks/use-branches";
import { useCurrentProfile } from "@/hooks/use-profile";
import {
  useCreateDepartment,
  useUpdateDepartment,
  type Department,
} from "@/hooks/use-admin";

const departmentSchema = z.object({
  name: z.string().trim().min(1, "Department name is required").max(100),
  description: z.string().max(500).optional(),
  parentId: z.string().optional(),
  branchId: z.string().trim().min(1, "Select a branch"),
  headMemberId: z.string().optional(),
});

type DepartmentFormValues = z.infer<typeof departmentSchema>;

interface DepartmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  department?: Department | null;
  departments?: Department[];
  onSaved?: (department: Department) => void;
  /** When set, the branch + head fields are locked (read-only) and dropped from the submit payload. */
  lockedLeaderBranch?: boolean;
}

function toFormValues(department?: Department | null): DepartmentFormValues {
  return {
    name: department?.name ?? "",
    description: department?.description ?? "",
    parentId: department?.parentId ?? "",
    branchId: department?.branchId ?? "",
    headMemberId: department?.headMemberId ?? "",
  };
}

export function DepartmentFormDialog({
  open,
  onOpenChange,
  returnFocusRef,
  department,
  departments = [],
  onSaved,
  lockedLeaderBranch = false,
}: DepartmentFormDialogProps) {
  const isEdit = !!department;
  const { data: profile } = useCurrentProfile();
  const branchLocked = lockedLeaderBranch || !profile?.isAdminHq;
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment(department?.id ?? "");
  const { data: branchesData } = useBranchesList({ limit: 100 });

  const [headName, setHeadName] = React.useState("");

  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: toFormValues(department),
  });

  React.useEffect(() => {
    if (open) {
      const values = toFormValues(department);
      if (!profile?.isAdminHq) values.branchId = profile?.branchId ?? "";
      form.reset(values);
      setHeadName(
        department
          ? [department.headFirstName, department.headLastName]
              .filter(Boolean)
              .join(" ")
          : "",
      );
    }
  }, [open, department, form, profile?.isAdminHq, profile?.branchId]);

  const selectedBranchId = form.watch("branchId");
  const parentOptions = departments.filter(
    (d) => d.id !== department?.id && d.branchId === selectedBranchId,
  );

  const onSubmit = (values: DepartmentFormValues) => {
    if (!isEdit && !values.branchId) {
      form.setError("branchId", { message: "Select a branch" });
      return;
    }
    const payload = {
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      parentId: values.parentId?.trim() || undefined,
      branchId:
        lockedLeaderBranch || !values.branchId?.trim()
          ? undefined
          : values.branchId.trim(),
      headMemberId:
        lockedLeaderBranch || !values.headMemberId?.trim()
          ? undefined
          : values.headMemberId.trim(),
    };

    const mutation = isEdit ? updateMutation : createMutation;
    mutation.mutate(payload, {
      onSuccess: (saved) => {
        toast.success(
          isEdit
            ? "Department updated successfully"
            : "Department created successfully",
        );
        onOpenChange(false);
        onSaved?.(saved);
      },
      onError: (error) => {
        toast.error(
          isEdit
            ? "Failed to update department"
            : "Failed to create department",
          {
            description: error?.message || "Please try again.",
          },
        );
      },
    });
  };

  const branches = branchesData?.data ?? [];

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
        className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Department" : "Add Department"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this department's details."
              : "Create a new department (e.g. Youth Ministry, Choir)."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <ValidatedForm schemaValidation onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <WorkspaceFormSection title="Identity">
              <FormField required
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Youth Ministry" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Department</FormLabel>
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      disabled={parentOptions.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              parentOptions.length === 0
                                ? "No other departments"
                                : "None (top-level)"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {parentOptions.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </WorkspaceFormSection>
            <WorkspaceFormSection title="Location and leadership">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField required
                  control={form.control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch{!isEdit && " *"}</FormLabel>
                      <Select
                        value={field.value || undefined}
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue("headMemberId", "");
                          form.setValue("parentId", "");
                          setHeadName("");
                        }}
                        disabled={branchLocked}
                      >
                        <FormControl>
                          <SelectTrigger disabled={branchLocked}>
                            <SelectValue placeholder="Select a branch" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {branches.map((b) => (
                            <SelectItem key={b.branchId} value={b.branchId}>
                              {b.name}
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
                  name="headMemberId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Head</FormLabel>
                      <FormControl>
                        <MemberCombobox
                          value={field.value ?? ""}
                          onChange={(id, member) => {
                            field.onChange(id);
                            setHeadName(
                              member
                                ? `${member.firstName} ${member.lastName}`
                                : "",
                            );
                          }}
                          selectedName={headName}
                          branchId={selectedBranchId || undefined}
                          placeholder="Select head..."
                          disabled={lockedLeaderBranch || !selectedBranchId}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </WorkspaceFormSection>
            <WorkspaceFormSection title="Additional information">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What does this department do?"
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
                    : "Create Department"}
              </Button>
            </DialogFooter>
          </ValidatedForm>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
