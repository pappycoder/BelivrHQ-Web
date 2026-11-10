"use client";

import { ValidatedForm } from "@/components/ui/validated-form";
import { WorkspaceFormSection } from "@/components/workspace/workspace-presentation";

import {
  BranchAssignmentField,
  useBranchAssignment,
} from "@/components/shared/branch-assignment";

import * as React from "react";
import { useCurrentProfile } from "@/hooks/use-profile";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateTemplate,
  useUpdateTemplate,
  TEMPLATE_CHANNELS,
  TEMPLATE_CHANNEL_LABELS,
  TEMPLATE_CATEGORY_LABELS,
  type Template,
  type TemplateChannel,
  type TemplateCategory,
} from "@/hooks/use-templates";

const templateSchema = z.object({
  name: z.string().trim().min(1, "Template name is required"),
  content: z.string().trim().min(1, "Content is required"),
  channel: z.enum(
    TEMPLATE_CHANNELS as [TemplateChannel, ...TemplateChannel[]],
    {
      error: (issue) =>
        issue.input === undefined ? "Channel is required" : undefined,
    },
  ),
  language: z.string().optional(),
  category: z.string().optional(),
  variables: z.string().optional(),
  status: z.enum(["draft", "published"]).optional(),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided the dialog edits this template; otherwise it creates one. */
  template?: Template | null;
}

function toFormValues(template?: Template | null): TemplateFormValues {
  return {
    name: template?.name ?? "",
    content: template?.content ?? "",
    channel: template?.channel ?? "email",
    language: template?.language ?? "",
    category: template?.category ?? "",
    variables: template?.variables?.join(", ") ?? "",
    status: template?.status === "published" ? "published" : "draft",
  };
}

export function TemplateFormDialog({
  open,
  onOpenChange,
  template,
}: TemplateFormDialogProps) {
  const { data: profile } = useCurrentProfile();
  const branchAssignment = useBranchAssignment(template, open);
  const isEdit = !!template;
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate(template?.templateId ?? "");

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: toFormValues(template),
  });

  React.useEffect(() => {
    if (open) {
      form.reset(toFormValues(template));
    }
  }, [open, template, form]);

  const onSubmit = (values: TemplateFormValues) => {
    const branchPayload = branchAssignment.payload();
    if (!branchPayload) return;
    const variables = values.variables
      ? values.variables
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      : undefined;

    const payload = {
      ...branchPayload,
      name: values.name.trim(),
      content: values.content,
      channel: values.channel,
      language: values.language?.trim() || undefined,
      category: (values.category || undefined) as TemplateCategory | undefined,
      variables,
      status: values.status === "published" ? "published" : "draft",
    };

    const mutation = isEdit ? updateMutation : createMutation;
    mutation.mutate(payload as never, {
      onSuccess: () => {
        toast.success(
          isEdit
            ? "Template updated successfully"
            : "Template created successfully",
        );
        onOpenChange(false);
      },
      onError: (error: Error) => {
        toast.error(
          isEdit ? "Failed to update template" : "Failed to create template",
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
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Template" : "Add Template"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this message template."
              : "Create a reusable message template for broadcasts."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <ValidatedForm schemaValidation onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <WorkspaceFormSection title="Template details">
              <BranchAssignmentField assignment={branchAssignment} />
              <FormField required
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Sunday Service Reminder"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField required
                control={form.control}
                name="channel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Channel *</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        if (value) field.onChange(value);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select channel" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TEMPLATE_CHANNELS.filter((ch) =>
                          profile?.planFeatures?.includes(ch),
                        ).map((ch) => (
                          <SelectItem key={ch} value={ch}>
                            {TEMPLATE_CHANNEL_LABELS[ch]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        value={field.value || undefined}
                        onValueChange={(value) => {
                          if (value) field.onChange(value);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="No category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(
                            Object.keys(
                              TEMPLATE_CATEGORY_LABELS,
                            ) as TemplateCategory[]
                          ).map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {TEMPLATE_CATEGORY_LABELS[cat]}
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
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Language</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. en_US" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </WorkspaceFormSection>
            <WorkspaceFormSection title="Message content">
              <FormField required
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Message body. Use {{variable}} for placeholders, e.g. 'Hello {{first_name}}...'"
                        rows={5}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="variables"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Variables</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Comma-separated, e.g. first_name, last_name, date"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </WorkspaceFormSection>
            <WorkspaceFormSection title="Publication">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      value={field.value ?? "draft"}
                      onValueChange={(value) => {
                        if (value) field.onChange(value);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                      </SelectContent>
                    </Select>
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
                {pending
                  ? "Saving..."
                  : isEdit
                    ? "Save Changes"
                    : "Add Template"}
              </Button>
            </DialogFooter>
          </ValidatedForm>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
