"use client";

import { ValidatedForm } from "@/components/ui/validated-form";

import * as React from "react";
import { VisitorFormSection } from "./visitor-presentation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getToastErrorMessage, toast } from "@/lib/toast";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useCurrentProfile } from "@/hooks/use-profile";
import { useBranchesList } from "@/hooks/use-branches";
import { useUsers } from "@/hooks/use-users";
import {
  useCreateVisitor,
  useUpdateVisitor,
  FOLLOW_UP_STATUSES,
  type Visitor,
} from "@/hooks/use-visitors";

const visitorSchema = z.object({
  assignedToId: z.string().optional(),
  branchId: z.string().trim().min(1, "Select a branch"),
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().optional(),
  gender: z.string().optional(),
  phone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
});

type VisitorFormValues = z.infer<typeof visitorSchema>;

function toFormValues(visitor?: Visitor | null): VisitorFormValues {
  return {
    assignedToId: visitor?.assignedToId ?? "",
    branchId: visitor?.branchId ?? "",
    firstName: visitor?.firstName ?? "",
    lastName: visitor?.lastName ?? "",
    gender: visitor?.gender ?? "",
    phone: visitor?.phone ?? "",
    whatsappNumber: visitor?.whatsappNumber ?? "",
    email: visitor?.email ?? "",
  };
}

function PlainSection({
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return <div className="space-y-4">{children}</div>;
}

export function VisitorFormDialog({
  open,
  onOpenChange,
  presentationClassName,
  returnFocusRef,
  visitor,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presentationClassName?: string;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  /** When set, the dialog edits this visitor; otherwise it creates a new one. */
  visitor?: Visitor | null;
  onSaved?: (saved: Visitor) => void;
}) {
  const Section = presentationClassName ? VisitorFormSection : PlainSection;
  const isEdit = !!visitor;
  const { data: profile } = useCurrentProfile();
  const isAdminHq = !!profile?.isAdminHq;
  const branchesQuery = useBranchesList(
    { limit: 200 },
    { enabled: open && isAdminHq },
  );
  const branchOptions = React.useMemo(
    () =>
      (branchesQuery.data?.data ?? []).filter((branch) => !branch.archivedAt),
    [branchesQuery.data],
  );
  const usersQuery = useUsers({ limit: 100, status: "active" });
  const assignees = usersQuery.data?.data ?? [];
  const currentAssigneeMissing =
    visitor?.assignedToId &&
    !assignees.some((user) => user.profileId === visitor.assignedToId);
  const createMutation = useCreateVisitor();
  const updateMutation = useUpdateVisitor(visitor?.id ?? "");
  const [pending, setPending] = React.useState(false);

  const form = useForm<VisitorFormValues>({
    resolver: zodResolver(visitorSchema),
    defaultValues: toFormValues(visitor),
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        ...toFormValues(visitor),
        branchId: visitor
          ? (visitor.branchId ?? profile?.branchId ?? "")
          : (profile?.branchId ?? ""),
      });
    }
  }, [open, visitor, form, profile?.branchId]);

  React.useEffect(() => {
    if (
      open &&
      !visitor &&
      isAdminHq &&
      branchOptions.length === 1 &&
      !form.getValues("branchId")
    ) {
      form.setValue("branchId", branchOptions[0].branchId);
    }
  }, [open, visitor, isAdminHq, branchOptions, form]);

  const onSubmit = async (values: VisitorFormValues) => {
    setPending(true);
    try {
      const branchChanged =
        isEdit && values.branchId !== (visitor?.branchId ?? "");
      const selectedBranch = isAdminHq ? values.branchId : profile?.branchId;
      if (
        (!isEdit || branchChanged) &&
        (!selectedBranch ||
          (isAdminHq &&
            !branchOptions.some(
              (branch) => branch.branchId === selectedBranch,
            )))
      ) {
        form.setError("branchId", {
          message: isAdminHq
            ? "Select an available branch."
            : "A branch assignment is required. Contact your church administrator.",
        });
        return;
      }
      const assignmentChanged =
        (values.assignedToId ?? "") !== (visitor?.assignedToId ?? "");
      const payload = {
        ...(!isEdit || (isAdminHq && branchChanged)
          ? { branchId: selectedBranch }
          : {}),
        assignedToId: assignmentChanged ? values.assignedToId || "" : undefined,
        firstName: values.firstName.trim(),
        lastName: values.lastName?.trim() || undefined,
        gender: values.gender || undefined,
        phone: values.phone?.trim() || undefined,
        whatsappNumber: values.whatsappNumber?.trim() || undefined,
        email: values.email?.trim() || undefined,
      };

      const saved = isEdit
        ? await updateMutation.mutateAsync(payload)
        : await createMutation.mutateAsync(payload);
      toast.success(isEdit ? "Visitor updated" : "Visitor registered");
      onOpenChange(false);
      onSaved?.(saved);
    } catch (error) {
      toast.error(
        isEdit ? "Failed to update visitor" : "Failed to register visitor",
        {
          description: getToastErrorMessage(error, "Please try again."),
        },
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${presentationClassName ?? ""} ${presentationClassName ? "max-h-[90dvh] overflow-y-auto" : ""} sm:max-w-[520px]`}
        onCloseAutoFocus={
          returnFocusRef
            ? (event) => {
                if (returnFocusRef.current?.isConnected) {
                  event.preventDefault();
                  requestAnimationFrame(() => returnFocusRef.current?.focus());
                }
              }
            : undefined
        }
      >
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Visitor" : "Register Visitor"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the visitor's details, branch and follow-up assignee."
              : "Add a new visitor so your team can follow up."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <ValidatedForm schemaValidation onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Section title="Visitor details">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField required
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Amina" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Okafor" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField required
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch *</FormLabel>
                    {isAdminHq ? (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={pending || branchesQuery.isLoading}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a branch" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {visitor?.branchId &&
                            !branchOptions.some(
                              (branch) => branch.branchId === visitor.branchId,
                            ) && (
                              <SelectItem value={visitor.branchId} disabled>
                                {visitor.branchName ?? "Current branch"}
                              </SelectItem>
                            )}
                          {branchOptions.map((branch) => (
                            <SelectItem
                              key={branch.branchId}
                              value={branch.branchId}
                            >
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <FormControl>
                        <Input
                          value={
                            profile?.branch?.name ??
                            (profile?.branchId
                              ? "Your assigned branch"
                              : "No branch assigned")
                          }
                          readOnly
                        />
                      </FormControl>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {isAdminHq
                        ? "Choose the visitor's branch."
                        : "Visitors are limited to your assigned branch."}
                    </p>
                    {isAdminHq && branchesQuery.isError && (
                      <p role="alert" className="text-sm text-destructive">
                        Could not load branches.{" "}
                        <button
                          type="button"
                          className="underline"
                          onClick={() => void branchesQuery.refetch()}
                        >
                          Retry
                        </button>
                      </p>
                    )}
                    {isAdminHq &&
                      branchesQuery.isSuccess &&
                      !branchOptions.length && (
                        <p className="text-sm text-destructive">
                          No active branches available.
                        </p>
                      )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+234 801 234 5678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="whatsappNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+234 801 234 5678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {!isEdit && (
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="amina@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </Section>
            <Section title="Follow-up assignment">
              <FormField
                control={form.control}
                name="assignedToId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === "none" ? "" : value)
                      }
                      value={field.value || "none"}
                      disabled={pending || usersQuery.isLoading}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select team member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {currentAssigneeMissing && (
                          <SelectItem value={visitor.assignedToId!}>
                            {visitor.assignedToName || "Current assignee"}
                          </SelectItem>
                        )}
                        {assignees.map((user) => (
                          <SelectItem
                            key={user.profileId}
                            value={user.profileId}
                          >
                            {user.firstName} {user.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {usersQuery.isError && (
                      <p className="text-sm text-destructive">
                        Unable to load team members. Please try again.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Section>
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
                {pending
                  ? "Saving..."
                  : isEdit
                    ? "Save Changes"
                    : "Register Visitor"}
              </Button>
            </DialogFooter>
          </ValidatedForm>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/** Re-exported for pages that need the status list in selects. */
export { FOLLOW_UP_STATUSES };
