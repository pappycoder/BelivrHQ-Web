"use client";

import { ValidatedForm } from "@/components/ui/validated-form";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/lib/toast";
import { ShieldPlus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useCreateRole } from "@/hooks/use-roles";

const createRoleSchema = z.object({
  label: z.string().trim()
    .min(3, "Name must be at least 3 characters")
    .max(50, "Name must be at most 50 characters"),
  description: z.string().max(200, "Description must be at most 200 characters").optional(),
});

type CreateRoleFormValues = z.infer<typeof createRoleSchema>;

/** Mirrors the backend slugification so the preview matches the stored name. */
function slugify(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40)
    .replace(/_+$/g, "");
}

interface CreateRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the created role's name — used to navigate to its matrix. */
  onCreated?: (roleName: string) => void;
}

export function CreateRoleDialog({ open, onOpenChange, onCreated }: CreateRoleDialogProps) {
  const createMutation = useCreateRole();

  const form = useForm<CreateRoleFormValues>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: { label: "", description: "" },
  });

  const labelValue = form.watch("label");
  const slugPreview = slugify(labelValue ?? "");
  const showPreview = slugPreview.length > 0;

  React.useEffect(() => {
    if (open) form.reset({ label: "", description: "" });
  }, [open, form]);

  const onSubmit = (values: CreateRoleFormValues) => {
    createMutation.mutate(
      {
        label: values.label,
        ...(values.description ? { description: values.description } : {}),
      },
      {
        onSuccess: (role) => {
          toast.success(`Role "${role.roleName}" created. Configure its permissions next.`);
          onOpenChange(false);
          onCreated?.(role.roleName);
        },
        onError: (err: Error) => toast.error(err.message),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldPlus className="h-4 w-4" />
            Add Custom Role
          </DialogTitle>
          <DialogDescription>
            Create a role owned by your church. It starts without permissions. You&apos;ll configure them right after.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <ValidatedForm schemaValidation onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField required
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Media Team" {...field} />
                  </FormControl>
                  <FormDescription>
                    {showPreview
                      ? `Will be created as "${slugPreview}", shown as-is across the app.`
                      : "Letters and numbers only; stored in lowercase."}
                  </FormDescription>
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
                      placeholder="What does this role do?"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} loading={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Role"}
              </Button>
            </DialogFooter>
          </ValidatedForm>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
