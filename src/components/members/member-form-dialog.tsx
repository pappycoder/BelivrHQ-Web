"use client";

import { ValidatedForm } from "@/components/ui/validated-form";

import * as React from "react";
import { confirmDiscardChanges } from "@/hooks/use-unsaved-changes";
import {
  PeopleFormSection,
  peopleWorkspaceClass,
} from "@/components/members/people-presentation";
import { useForm, useFieldArray } from "react-hook-form";
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
  useCreateMember,
  useUpdateMember,
  type Member,
  type MemberStatus,
} from "@/hooks/use-members";
import { useCurrentProfile } from "@/hooks/use-profile";
import { useBranchesList } from "@/hooks/use-branches";
import {
  CustomFieldsEditor,
  customFieldsToRows,
  rowsToCustomFields,
} from "@/components/members/custom-fields-editor";

const memberSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  branchId: z.string().trim().min(1, "Select a branch"),
  status: z.string().optional(),
  notes: z.string().optional(),
  customFields: z.array(z.object({ key: z.string(), value: z.string() })),
});

type MemberFormValues = z.infer<typeof memberSchema>;

const STATUS_OPTIONS: Array<{ value: MemberStatus; label: string }> = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "suspended", label: "Suspended" },
  { value: "transferred", label: "Transferred" },
];

interface MemberFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided the dialog edits this member; otherwise it creates one. */
  member?: Member | null;
  onSaved?: (member: Member) => void;
  returnFocusRef?: React.RefObject<HTMLButtonElement | null>;
}

function toFormValues(member?: Member | null): MemberFormValues {
  return {
    firstName: member?.firstName ?? "",
    lastName: member?.lastName ?? "",
    email: member?.email ?? "",
    phone: member?.phone ?? "",
    whatsappNumber: member?.whatsappNumber ?? "",
    dateOfBirth: member?.dateOfBirth ? member.dateOfBirth.slice(0, 10) : "",
    gender: member?.gender ?? "",
    address: member?.address ?? "",
    city: member?.city ?? "",
    state: member?.state ?? "",
    branchId: member?.branchId ?? "",
    status: member?.status ?? "active",
    notes: member?.notes ?? "",
    customFields: customFieldsToRows(member?.customFields),
  };
}

export function MemberFormDialog({
  open,
  onOpenChange,
  member,
  onSaved,
  returnFocusRef,
}: MemberFormDialogProps) {
  const isEdit = !!member;
  const { data: profile } = useCurrentProfile();
  const createMutation = useCreateMember();
  const updateMutation = useUpdateMember(member?.memberId ?? "");
  const branchesQuery = useBranchesList({ limit: 100 });

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: toFormValues(member),
  });

  const customFieldsArray = useFieldArray({
    control: form.control,
    name: "customFields",
  });

  React.useEffect(() => {
    if (open) {
      form.reset({ ...toFormValues(member), branchId: member?.branchId ?? profile?.branchId ?? "" });
    }
  }, [open, member, form, profile?.branchId]);

  const onSubmit = (values: MemberFormValues) => {
    const base = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email?.trim() || undefined,
      phone: values.phone?.trim() || undefined,
      whatsappNumber: values.whatsappNumber?.trim() || undefined,
      dateOfBirth: values.dateOfBirth || undefined,
      gender: values.gender || undefined,
      address: values.address?.trim() || undefined,
      city: values.city?.trim() || undefined,
      state: values.state?.trim() || undefined,
      branchId: values.branchId || undefined,
      notes: values.notes?.trim() || undefined,
    };

    const mutation = isEdit ? updateMutation : createMutation;

    // Edit always sends the record (even {}) so removing every row clears
    // stored fields; create only includes it when something was entered.
    const customFieldsRecord = rowsToCustomFields(values.customFields);
    const payload = {
      ...base,
      ...(isEdit ? { status: values.status as MemberStatus | undefined } : {}),
      ...(isEdit
        ? { customFields: customFieldsRecord ?? {} }
        : customFieldsRecord
          ? { customFields: customFieldsRecord }
          : {}),
    };

    mutation.mutate(payload as never, {
      onSuccess: (saved) => {
        toast.success(
          isEdit ? "Member updated successfully" : "Member added successfully",
        );
        onOpenChange(false);
        onSaved?.(saved);
      },
      onError: (error) => {
        toast.error(
          isEdit ? "Failed to update member" : "Failed to add member",
          {
            description: error?.message || "Please try again.",
          },
        );
      },
    });
  };

  const pending = createMutation.isPending || updateMutation.isPending;

  const requestClose = (next: boolean) => {
    if (next || !form.formState.isDirty || confirmDiscardChanges()) onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={requestClose}>
      <DialogContent
        data-workspace-editor={isEdit ? "member" : undefined}
        onCloseAutoFocus={returnFocusRef ? event => {
          if (returnFocusRef.current) {
            event.preventDefault();
            // Restore after the submitted dialog's focus scope is removed.
            const target = returnFocusRef.current;
            requestAnimationFrame(() => { if (target.isConnected) target.focus(); });
          }
        } : undefined}
        className={`${peopleWorkspaceClass} sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-2xl`}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Member" : "Add Member"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this member's details."
              : "Add a new member to your church."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <ValidatedForm schemaValidation onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <PeopleFormSection title="Identity & contact">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField required
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Chioma" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField required
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Eze" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="chioma@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="whatsappNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+234 803 456 7890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input picker="wheel" type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </PeopleFormSection>
            <PeopleFormSection title="Membership & location">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField required
                  control={form.control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select branch" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(branchesQuery.data?.data ?? []).map((branch) => (
                            <SelectItem
                              key={branch.branchId}
                              value={branch.branchId}
                            >
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input placeholder="State" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {isEdit && (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
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
              )}
            </PeopleFormSection>
            <PeopleFormSection title="Notes & additional information">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any additional notes about this member"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <p className="text-sm font-medium">Custom Fields</p>
                <p className="text-xs text-muted-foreground">
                  Track anything specific to your church (occupation, baptism
                  date...). Removing all rows clears saved fields.
                </p>
                <CustomFieldsEditor
                  rows={customFieldsArray.fields}
                  onChange={(rows) =>
                    form.setValue("customFields", rows, { shouldDirty: true })
                  }
                  disabled={pending}
                />
              </div>
            </PeopleFormSection>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => requestClose(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending
                  ? isEdit
                    ? "Saving..."
                    : "Adding..."
                  : isEdit
                    ? "Save Changes"
                    : "Add Member"}
              </Button>
            </DialogFooter>
          </ValidatedForm>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
