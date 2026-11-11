"use client";

import { ValidatedForm } from "@/components/ui/validated-form";

import * as React from "react";
import { peopleWorkspaceClass } from "@/components/members/people-presentation";
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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAddFamilyMember, type Family } from "@/hooks/use-families";
import { MemberCombobox } from "@/components/members/member-combobox";

const addMemberSchema = z.object({
  memberId: z.string().trim().min(1, "Select a member to add"),
  relationship: z.string().trim().min(1, "Relationship is required"),
  isHead: z.boolean().optional(),
});

type AddMemberFormValues = z.infer<typeof addMemberSchema>;

const RELATIONSHIP_OPTIONS = [
  "spouse",
  "child",
  "parent",
  "sibling",
  "ward",
  "other",
];

interface AddFamilyMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  family: Family;
}

export function AddFamilyMemberDialog({
  open,
  onOpenChange,
  family,
}: AddFamilyMemberDialogProps) {
  const addMutation = useAddFamilyMember(family.familyId);

  const form = useForm<AddMemberFormValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { memberId: "", relationship: "", isHead: false },
  });

  const [memberName, setMemberName] = React.useState("");

  React.useEffect(() => {
    if (open) {
      form.reset({ memberId: "", relationship: "", isHead: false });
      setMemberName("");
    }
  }, [open, form]);

  const excludeIds = family.members.map((m) => m.memberId);

  const onSubmit = (values: AddMemberFormValues) => {
    addMutation.mutate(
      {
        memberId: values.memberId,
        relationship: values.relationship,
        ...(values.isHead ? { isHead: true } : {}),
      },
      {
        onSuccess: () => {
          toast.success(`${memberName || "Member"} added to ${family.name}`);
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error("Failed to add member", {
            description: error?.message || "Please try again.",
          });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${peopleWorkspaceClass} sm:max-w-[460px] rounded-2xl`}
      >
        <DialogHeader>
          <DialogTitle>Add Member to {family.name}</DialogTitle>
          <DialogDescription>
            Link an existing member record to this family.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <ValidatedForm schemaValidation onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField required
              control={form.control}
              name="memberId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Member *</FormLabel>
                  <FormControl>
                    <div>
                      <MemberCombobox
                        value={field.value}
                        onChange={(memberId, member) => {
                          field.onChange(memberId);
                          setMemberName(
                            member
                              ? `${member.firstName} ${member.lastName}`
                              : "",
                          );
                        }}
                        selectedName={memberName}
                        placeholder="Search members..."
                        excludeIds={excludeIds}
                      />
                      {excludeIds.length > 0 && (
                        <p className="text-sm text-muted-foreground mt-1.5">
                          Members already in this family are hidden.
                        </p>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField required
              control={form.control}
              name="relationship"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relationship to Head *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {RELATIONSHIP_OPTIONS.map((rel) => (
                        <SelectItem key={rel} value={rel}>
                          {rel.charAt(0).toUpperCase() + rel.slice(1)}
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
              name="isHead"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <FormLabel>Head of Family</FormLabel>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Mark this member as the family head.
                      </p>
                    </div>
                    <Switch
                      checked={!!field.value}
                      onCheckedChange={field.onChange}
                    />
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={addMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addMutation.isPending}
                loading={addMutation.isPending}
              >
                {addMutation.isPending ? "Adding..." : "Add Member"}
              </Button>
            </DialogFooter>
          </ValidatedForm>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
