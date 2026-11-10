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
  useCreateAssetCategory,
  useUpdateAssetCategory,
  type AssetCategory,
} from "@/hooks/use-assets";

const categorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(100),
  description: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  /** When provided the dialog edits this category; otherwise it creates one. */
  category?: AssetCategory | null;
  onSaved?: () => void;
}

function toFormValues(category?: AssetCategory | null): CategoryFormValues {
  return {
    name: category?.name ?? "",
    description: category?.description ?? "",
  };
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  returnFocusRef,
  category,
  onSaved,
}: CategoryFormDialogProps) {
  const isEdit = !!category;
  const createMutation = useCreateAssetCategory();
  const updateMutation = useUpdateAssetCategory(category?.id ?? "");

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: toFormValues(category),
  });

  React.useEffect(() => {
    if (open) {
      form.reset(toFormValues(category));
    }
  }, [open, category, form]);

  const onSubmit = (values: CategoryFormValues) => {
    const payload = {
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
    };
    const mutation = isEdit ? updateMutation : createMutation;
    mutation.mutate(payload as never, {
      onSuccess: () => {
        toast.success(
          isEdit
            ? "Category updated successfully"
            : "Category created successfully",
        );
        onOpenChange(false);
        onSaved?.();
      },
      onError: (error) => {
        toast.error(
          isEdit ? "Failed to update category" : "Failed to create category",
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
        className="sm:max-w-[480px]"
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Category" : "New Category"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this asset category."
              : "Create an asset category to organise your register."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <ValidatedForm schemaValidation onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField required
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Sound Equipment" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. Microphones, mixers, speakers"
                      rows={2}
                      {...field}
                    />
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
                {pending
                  ? "Saving..."
                  : isEdit
                    ? "Save Changes"
                    : "Create Category"}
              </Button>
            </DialogFooter>
          </ValidatedForm>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
