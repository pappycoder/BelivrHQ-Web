"use client";

import { ValidatedForm } from "@/components/ui/validated-form";

import * as React from "react";
import {
  PeopleFormSection,
  peopleWorkspaceClass,
} from "@/components/members/people-presentation";
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
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateFamily,
  useUpdateFamily,
  type Family,
} from "@/hooks/use-families";
import { MemberCombobox } from "@/components/members/member-combobox";

const familySchema = z.object({
  name: z.string().trim().min(1, "Family name is required"),
  headId: z.string().optional(),
});

type FamilyFormValues = z.infer<typeof familySchema>;

interface FamilyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided the dialog edits this family; otherwise it creates one. */
  family?: Family | null;
  branchId?: string;
  returnFocusRef?: React.RefObject<HTMLButtonElement | null>;
}

function toFormValues(family?: Family | null): FamilyFormValues {
  const head = family?.members.find((m) => m.isHead);
  return {
    name: family?.name ?? "",
    headId: head?.memberId ?? "",
  };
}

export function FamilyFormDialog({
  open,
  onOpenChange,
  family,
  branchId,
  returnFocusRef,
}: FamilyFormDialogProps) {
  const isEdit = !!family;
  const createMutation = useCreateFamily();
  const updateMutation = useUpdateFamily(family?.familyId ?? "");

  const form = useForm<FamilyFormValues>({
    resolver: zodResolver(familySchema),
    defaultValues: toFormValues(family),
  });

  const [headName, setHeadName] = React.useState("");

  React.useEffect(() => {
    if (open) {
      form.reset(toFormValues(family));
      const head = family?.members.find((m) => m.isHead);
      setHeadName(head ? `${head.firstName} ${head.lastName}` : "");
    }
  }, [open, family, form]);

  const onSubmit = (values: FamilyFormValues) => {
    const payload = {
      name: values.name.trim(),
      ...(values.headId ? { headId: values.headId } : {}),
      ...(!isEdit && branchId ? { branchId } : {}),
    };

    const mutation = isEdit ? updateMutation : createMutation;
    mutation.mutate(payload as never, {
      onSuccess: () => {
        toast.success(
          isEdit
            ? "Family updated successfully"
            : "Family created successfully",
        );
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(
          isEdit ? "Failed to update family" : "Failed to create family",
          {
            description: error?.message || "Please try again.",
          },
        );
      },
    });
  };

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onCloseAutoFocus={returnFocusRef ? event => {
          if (returnFocusRef.current) {
            event.preventDefault();
            const target = returnFocusRef.current;
            requestAnimationFrame(() => { if (target.isConnected) target.focus(); });
          }
        } : undefined}
        className={`${peopleWorkspaceClass} sm:max-w-[520px] max-h-[90vh] overflow-y-auto rounded-2xl`}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Family" : "Add Family"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this family's details."
              : "Create a new family group. Members can be added after creation."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <ValidatedForm schemaValidation onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <PeopleFormSection title="Family details">
              <FormField required
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Family Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. The Ogundimu Family"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </PeopleFormSection>
            <PeopleFormSection title="Family links">
              <FormField
                control={form.control}
                name="headId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Head of Family</FormLabel>
                    <FormControl>
                      <div>
                        <MemberCombobox
                          value={field.value ?? ""}
                          onChange={(memberId, member) => {
                            field.onChange(memberId);
                            setHeadName(
                              member
                                ? `${member.firstName} ${member.lastName}`
                                : "",
                            );
                          }}
                          selectedName={headName}
                          placeholder="Select head of family..."
                        />
                        <p className="text-sm text-muted-foreground mt-1.5">
                          Optional. The head must be added as a family member
                          too.
                        </p>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </PeopleFormSection>
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
                {pending ? "Saving..." : isEdit ? "Save Changes" : "Add Family"}
              </Button>
            </DialogFooter>
          </ValidatedForm>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
