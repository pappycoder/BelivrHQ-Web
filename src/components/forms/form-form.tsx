"use client";

import { BranchAssignmentField, useBranchAssignment } from "@/components/shared/branch-assignment";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChurchFormBranding } from "./church-form-branding";
import { useCurrentProfile } from "@/hooks/use-profile";
import { FormFieldsRenderer } from "./form-fields-renderer";
import { FormFieldsEditor } from "./form-fields-editor";
import { FormSettingsCard } from "./form-settings-card";
import {
  type CreateFormInput,
  type Form as FormType,
  FIELD_TYPES,
  type FormField as FormFieldType,
} from "@/hooks/use-forms";

const fieldSchema = z.object({
  key: z.string().min(1, "Field key is required"),
  label: z.string().min(1, "Label is required"),
  type: z.enum(FIELD_TYPES),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
});

const formSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(200),
    description: z.string().max(2000).optional(),
    fields: z.array(fieldSchema).min(1, "Add at least one field"),
    status: z.enum(["draft", "published", "closed"]).optional(),
    isTemplate: z.boolean().optional(),
    isPublic: z.boolean().optional(),
    uniqueField: z.string().optional(),
    submissionLimit: z.number().min(0).optional(),
  })
  .superRefine((data, ctx) => {
    const keys = new Set<string>();
    for (const f of data.fields) {
      if (keys.has(f.key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fields"],
          message: `Duplicate field key "${f.key}"`,
        });
      }
      keys.add(f.key);
    }
    for (const f of data.fields) {
      if ((f.type === "dropdown" || f.type === "checkbox") && (!f.options || f.options.length === 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fields"],
          message: `"${f.label}" needs at least one option`,
        });
      }
    }
  });

type FormValues = z.infer<typeof formSchema>;

export interface FormFormProps {
  form?: FormType;
  onSubmit: (input: CreateFormInput) => Promise<void>;
  submitLabel: string;
}

const EMPTY_VALUES: FormValues = {
  title: "",
  description: "",
  fields: [],
  status: "draft",
  isTemplate: false,
  isPublic: false,
  uniqueField: undefined,
  submissionLimit: 0,
};

export function FormForm({ form, onSubmit, submitLabel }: FormFormProps) {
  const branchAssignment = useBranchAssignment(form);
  const { data: profile } = useCurrentProfile();
  const [saving, setSaving] = useState(false);
  const [builderFields, setBuilderFields] = useState<FormFieldType[]>([]);

  const formControl = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (form && !formControl.formState.isDirty) {
      formControl.reset({
        title: form.title,
        description: form.description ?? "",
        fields: form.fields,
        status: form.status,
        isTemplate: form.isTemplate,
        isPublic: form.isPublic,
        uniqueField: form.uniqueField,
        submissionLimit: form.submissionLimit ?? 0,
      });
      setBuilderFields(form.fields);
    }
  }, [form, formControl]);

  const handleFormFieldsChange = (fields: FormFieldType[]) => {
    setBuilderFields(fields);
    formControl.setValue("fields", fields, { shouldDirty: true });
  };

  const handleSettingsChange = (values: {
    status?: FormValues["status"];
    isTemplate?: boolean;
    isPublic?: boolean;
    uniqueField?: string;
    submissionLimit?: number;
  }) => {
    formControl.setValue("status", values.status ?? "draft", { shouldDirty: true });
    formControl.setValue("isTemplate", values.isTemplate ?? false, { shouldDirty: true });
    formControl.setValue("isPublic", values.isPublic ?? false, { shouldDirty: true });
    formControl.setValue("uniqueField", values.uniqueField, { shouldDirty: true });
    formControl.setValue("submissionLimit", values.submissionLimit ?? 0, { shouldDirty: true });
  };

  const handleSubmit = async (values: FormValues) => {
    const branchPayload = branchAssignment.payload();
    if (!branchPayload) return;
    setSaving(true);
    try {
      await onSubmit({
        ...branchPayload,
        title: values.title,
        description: values.description?.trim() || undefined,
        fields: values.fields,
        status: values.status ?? "draft",
        isTemplate: values.isTemplate ?? false,
        isPublic: values.isPublic ?? false,
        uniqueField: values.uniqueField || undefined,
        submissionLimit: values.submissionLimit ?? 0,
      });
    } finally {
      setSaving(false);
    }
  };

  const settingsValues = {
    status: formControl.watch("status") as FormValues["status"],
    isTemplate: formControl.watch("isTemplate"),
    isPublic: formControl.watch("isPublic"),
    uniqueField: formControl.watch("uniqueField"),
    submissionLimit: formControl.watch("submissionLimit"),
  };

  return (
    <Form {...formControl}>
      <form onSubmit={formControl.handleSubmit(handleSubmit)} className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Form Details</CardTitle>
            <CardDescription>Name and describe this form.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <BranchAssignmentField assignment={branchAssignment} />
            <FormField
              control={formControl.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Membership Application" {...field} disabled={saving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={formControl.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What is this form for?"
                      {...field}
                      disabled={saving}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Fields</CardTitle>
            <CardDescription>Define what you want to collect.</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={formControl.control}
              name="fields"
              render={() => (
                <FormItem>
                  <FormControl>
                    <FormFieldsEditor
                      fields={builderFields}
                      showErrors={!!formControl.formState.errors.fields}
                      onChange={handleFormFieldsChange}
                      disabled={saving}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Settings</CardTitle>
            <CardDescription>
              Control publishing, public sharing, and duplicate-submission protection.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Controller
              control={formControl.control}
              name="status"
              render={() => (
                <FormSettingsCard
                  values={settingsValues}
                  onChange={handleSettingsChange}
                  fields={builderFields}
                  disabled={saving}
                />
              )}
            />
          </CardContent>
        </Card>

        <details className="rounded-lg border p-4"><summary className="cursor-pointer font-medium">Preview questions</summary><div className="mt-4 max-w-2xl"><ChurchFormBranding churchName={profile?.church?.name} churchLogoUrl={profile?.church?.logoUrl} /><FormFieldsRenderer fields={builderFields} onChange={() => {}} /></div></details>
        <div className="flex items-center justify-end gap-2">
          <Button type="submit" disabled={saving} loading={saving}>
            {saving ? "Saving..." : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
