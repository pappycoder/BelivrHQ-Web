"use client";

import { ValidatedForm } from "@/components/ui/validated-form";

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
import { useReturnLoan, type AssetCondition } from "@/hooks/use-assets";

const CONDITION_OPTIONS: Array<{ value: AssetCondition; label: string }> = [
  { value: "new", label: "New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
  { value: "damaged", label: "Damaged" },
];

const returnSchema = z.object({
  actualReturnDate: z.string().trim().min(1, "Return date is required"),
  conditionAfter: z.string().optional(),
  notes: z.string().optional(),
});

type ReturnFormValues = z.infer<typeof returnSchema>;

interface ReturnLoanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
  loanId: string;
  assetName: string;
  onSaved?: () => void;
}

export function ReturnLoanDialog({
  open,
  onOpenChange,
  assetId,
  loanId,
  assetName,
  onSaved,
}: ReturnLoanDialogProps) {
  const returnMutation = useReturnLoan(assetId, loanId);

  const form = useForm<ReturnFormValues>({
    resolver: zodResolver(returnSchema),
    defaultValues: {
      actualReturnDate: "",
      conditionAfter: "",
      notes: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        actualReturnDate: new Date().toISOString().slice(0, 10),
        conditionAfter: "",
        notes: "",
      });
    }
  }, [open, form]);

  const onSubmit = (values: ReturnFormValues) => {
    const payload = {
      actualReturnDate: values.actualReturnDate,
      conditionAfter: values.conditionAfter as AssetCondition | undefined,
      notes: values.notes?.trim() || undefined,
    };
    returnMutation.mutate(payload as never, {
      onSuccess: () => {
        toast.success(`${assetName} returned successfully`);
        onOpenChange(false);
        onSaved?.();
      },
      onError: (error) => {
        toast.error("Failed to record return", {
          description: error?.message || "Please try again.",
        });
      },
    });
  };

  const pending = returnMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Return {assetName}</DialogTitle>
          <DialogDescription>
            Record the return of this loaned asset.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <ValidatedForm schemaValidation onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField required
                control={form.control}
                name="actualReturnDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Return Date *</FormLabel>
                    <FormControl>
                      <Input picker="wheel" type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="conditionAfter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condition After</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Return notes" rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                {pending ? "Saving..." : "Confirm Return"}
              </Button>
            </DialogFooter>
          </ValidatedForm>
        </Form>
      </DialogContent>
    </Dialog>
  );
}