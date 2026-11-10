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
import { useCreateLoan, type AssetCondition } from "@/hooks/use-assets";

const CONDITION_OPTIONS: Array<{ value: AssetCondition; label: string }> = [
  { value: "new", label: "New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
  { value: "damaged", label: "Damaged" },
];

const loanSchema = z.object({
  expectedReturnDate: z.string().trim().min(1, "Expected return date is required"),
  borrowerMemberId: z.string().optional(),
  borrowedByName: z.string().optional(),
  conditionBefore: z.string().optional(),
  notes: z.string().optional(),
});

type LoanFormValues = z.infer<typeof loanSchema>;

interface LoanFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
  onSaved?: () => void;
}

export function LoanFormDialog({
  open,
  onOpenChange,
  assetId,
  onSaved,
}: LoanFormDialogProps) {
  const createMutation = useCreateLoan(assetId);
  const [borrowerName, setBorrowerName] = React.useState("");

  const form = useForm<LoanFormValues>({
    resolver: zodResolver(loanSchema),
    defaultValues: {
      expectedReturnDate: "",
      borrowerMemberId: "",
      borrowedByName: "",
      conditionBefore: "",
      notes: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      setBorrowerName("");
      form.reset({
        expectedReturnDate: "",
        borrowerMemberId: "",
        borrowedByName: "",
        conditionBefore: "",
        notes: "",
      });
    }
  }, [open, form]);

  const onSubmit = (values: LoanFormValues) => {
    const payload = {
      expectedReturnDate: values.expectedReturnDate,
      borrowerMemberId: values.borrowerMemberId || undefined,
      borrowedByName: values.borrowedByName?.trim() || undefined,
      conditionBefore: values.conditionBefore as AssetCondition | undefined,
      notes: values.notes?.trim() || undefined,
    };
    createMutation.mutate(payload as never, {
      onSuccess: () => {
        toast.success("Asset loaned successfully");
        onOpenChange(false);
        onSaved?.();
      },
      onError: (error) => {
        toast.error("Failed to loan asset", {
          description: error?.message || "Please try again.",
        });
      },
    });
  };

  const pending = createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Loan Out Asset</DialogTitle>
          <DialogDescription>
            Record who this asset is being loaned to and when it should return.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <ValidatedForm schemaValidation onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <WorkspaceFormSection title="Borrower">
              <FormField
                control={form.control}
                name="borrowerMemberId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Borrower (Member)</FormLabel>
                    <FormControl>
                      <MemberCombobox
                        value={field.value ?? ""}
                        onChange={(memberId, member) => {
                          field.onChange(memberId || undefined);
                          setBorrowerName(
                            member
                              ? `${member.firstName} ${member.lastName}`
                              : "",
                          );
                        }}
                        selectedName={borrowerName || undefined}
                        placeholder="Select member..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="borrowedByName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Or Borrower (External)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. External Vendor Ltd (member optional)"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </WorkspaceFormSection>
            <WorkspaceFormSection title="Loan details">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField required
                  control={form.control}
                  name="expectedReturnDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expected Return Date *</FormLabel>
                      <FormControl>
                        <Input picker="wheel" type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="conditionBefore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condition Before</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CONDITION_OPTIONS.map((opt) => (
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
              </div>
            </WorkspaceFormSection>
            <WorkspaceFormSection title="Additional information">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any loan notes"
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
                {pending ? "Saving..." : "Loan Out"}
              </Button>
            </DialogFooter>
          </ValidatedForm>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
