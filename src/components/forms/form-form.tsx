"use client";

import { collectionLabel } from "@/lib/collection-label";

import { FormActions } from "@/components/shared/form-actions";

import { CREATE_FORM_LAYOUT, CreatePreviewCard, CreatePreviewSidebar } from "@/components/shared/create-preview";
import Link from "next/link";

import { ValidatedForm } from "@/components/ui/validated-form";

import {
  BranchAssignmentField,
  useBranchAssignment,
} from "@/components/shared/branch-assignment";

import { useState, useEffect, useId } from "react";
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
import { ArrowLeft, ArrowRight, Eye, ListChecks, Settings2, SlidersHorizontal } from "lucide-react";
import { SectionCard } from "@/components/paper/section";
import { getToastErrorMessage } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { FormBuilderPreview } from "./form-builder-preview";
import { useCurrentProfile } from "@/hooks/use-profile";
import { FormFieldsEditor } from "./form-fields-editor";
import { FormSettingsCard } from "./form-settings-card";
import {
  type CreateFormInput,
  type Form as FormType,
  FIELD_TYPES,
  type FormField as FormFieldType,
} from "@/hooks/use-forms";

const fieldSchema = z.object({
  key: z.string().trim().min(1, "Field key is required"),
  label: z.string().trim().min(1, "Label is required"),
  type: z.enum(FIELD_TYPES),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
});

const formSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),
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
      if (
        (f.type === "dropdown" || f.type === "checkbox") &&
        (!f.options || f.options.length === 0)
      ) {
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
  withPreview?: boolean;
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

export function FormForm({ form, onSubmit, submitLabel, withPreview = false }: FormFormProps) {
  const branchAssignment = useBranchAssignment(form);
  const { data: profile } = useCurrentProfile();
  const builderId = useId();
  const [builderStep, setBuilderStep] = useState(0);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [saveError, setSaveError] = useState("");
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
    formControl.setValue("status", values.status ?? "draft", {
      shouldDirty: true,
    });
    formControl.setValue("isTemplate", values.isTemplate ?? false, {
      shouldDirty: true,
    });
    formControl.setValue("isPublic", values.isPublic ?? false, {
      shouldDirty: true,
    });
    formControl.setValue("uniqueField", values.uniqueField, {
      shouldDirty: true,
    });
    formControl.setValue("submissionLimit", values.submissionLimit ?? 0, {
      shouldDirty: true,
    });
  };

  const handleSubmit = async (values: FormValues) => {
    const branchPayload = branchAssignment.payload();
    if (!branchPayload) { setBuilderStep(0); return; }
    setSaving(true);
    setSaveError("");
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
    } catch (error) {
      setSaveError(
        getToastErrorMessage(
          error,
          "Could not save the form. Please try again.",
        ),
      );
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
      <div data-form-builder className="space-y-5">
        <div className="paper-card flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-soft">
            <span className="flex items-center gap-2">
              <ListChecks className="size-4 text-brand" />
              <strong className="font-semibold text-ink">
                {builderFields.length}
              </strong>{" "}
              {collectionLabel(builderFields.length, "questions")}
            </span>
            <span>
              <strong className="font-semibold text-ink">
                {builderFields.filter((field) => field.required).length}
              </strong>{" "}
              required
            </span>
            <span className="rounded-full bg-brand-soft px-3 py-1 text-sm font-medium text-brand">
              {settingsValues.status === "published"
                ? "Published"
                : settingsValues.status === "closed"
                  ? "Closed"
                  : "Draft"}{" "}
              · {settingsValues.isPublic ? "Public link" : "Members only"}
            </span>
          </div>
          {!withPreview && <Button
            type="submit"
            form={builderId}
            className="rounded-full"
            disabled={saving}
            loading={saving}
          >
            {saving ? "Saving..." : submitLabel}
          </Button>}
        </div>
        {!withPreview && <div
          className="flex rounded-full border border-line bg-card p-1 xl:hidden"
          aria-label="Builder view"
        >
          <Button
            type="button"
            variant={mode === "edit" ? "secondary" : "ghost"}
            className="flex-1 rounded-full"
            aria-pressed={mode === "edit"}
            onClick={() => setMode("edit")}
          >
            <SlidersHorizontal className="size-4" /> Edit form
          </Button>
          <Button
            type="button"
            variant={mode === "preview" ? "secondary" : "ghost"}
            className="flex-1 rounded-full"
            aria-pressed={mode === "preview"}
            onClick={() => setMode("preview")}
          >
            <Eye className="size-4" /> Preview form
          </Button>
        </div>}
        <nav aria-label="Form builder steps" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {["Details", "Questions", "Rules", "Preview"].map((label,index) => <Button key={label} type="button" variant={builderStep === index ? "secondary" : "outline"} aria-current={builderStep === index ? "step" : undefined} onClick={() => {setBuilderStep(index); setMode(index===3 ? "preview" : "edit");}} className="min-w-0 rounded-xl">{index+1} · {label}</Button>)}
        </nav>
        {saveError && (
          <p
            role="alert"
            className="rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive"
          >
            {saveError}
          </p>
        )}
        <div className={withPreview ? CREATE_FORM_LAYOUT : "grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"}>
          <ValidatedForm schemaValidation
            aria-hidden={builderStep === 3}
            id={builderId}
            onSubmit={formControl.handleSubmit(handleSubmit, errors => { setMode("edit"); setBuilderStep(errors.title ? 0 : errors.fields ? 1 : 2); })}
            className={cn(
              "min-w-0 space-y-5",
              builderStep === 3 && "hidden",
            )}
          >
            <div hidden={builderStep !== 0} aria-hidden={builderStep !== 0}>
<SectionCard
              eyebrow="01 · The introduction"
              title="Form details"
              description="Let people know what this form is for."
              bodyClassName="space-y-4"
            >
              <BranchAssignmentField
                assignment={branchAssignment}
                disabled={saving}
              />
              <FormField required
                control={formControl.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Membership Application"
                        {...field}
                        disabled={saving}
                      />
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
                        className="min-h-24"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </SectionCard>
</div>
            <div hidden={builderStep !== 1} aria-hidden={builderStep !== 1}>
<SectionCard
              eyebrow="02 · What you need to know"
              title="Questions"
              description="Choose the answer types and order that work for your form."
            >
              <FormField required
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
            </SectionCard>
</div>
            <div hidden={builderStep !== 2} aria-hidden={builderStep !== 2}>
<SectionCard
              eyebrow="03 · Sharing & responses"
              title={
                <span className="flex items-center gap-2">
                  <Settings2 className="size-4 text-brand" /> Form settings
                </span>
              }
              description="Choose who can respond and when the form is open."
            >
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
            </SectionCard>
</div>
          </ValidatedForm>
          {builderStep === 3 && <FormBuilderPreview title={formControl.watch("title")} description={formControl.watch("description")} fields={builderFields} churchName={profile?.church?.name} churchLogoUrl={profile?.church?.logoUrl} />}
          {withPreview ? <CreatePreviewSidebar>
            <CreatePreviewCard editing={!!form} eyebrow="Form preview" title={formControl.watch("title") || "Untitled form"}>
              <dl className="space-y-3 text-sm">
                <div><dt className="rule-label">Questions</dt><dd className="mt-1">{builderFields.length} {collectionLabel(builderFields.length, "questions")} · {builderFields.filter(field => field.required).length} required</dd></div>
                <div><dt className="rule-label">Status</dt><dd className="mt-1 capitalize">{settingsValues.status || "draft"}</dd></div>
                <div><dt className="rule-label">Sharing</dt><dd className="mt-1">{settingsValues.isPublic ? "Public link" : "Members only"}</dd></div>
                {formControl.watch("description") && <div><dt className="rule-label">Description</dt><dd className="mt-1 break-words">{formControl.watch("description")}</dd></div>}
              </dl>
              {builderFields.length > 0 && <ol className="space-y-2 border-t border-line pt-4" aria-label="Question order">{builderFields.map((field,index) => <li key={field.key || index} className="flex items-start gap-2 text-sm text-ink-soft"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-xs">{index+1}</span><span className="min-w-0 break-words">{field.label || "Untitled question"}</span></li>)}</ol>}
            </CreatePreviewCard>
            <Button type="button" variant="outline" className="hidden w-full gap-2 lg:flex" onClick={() => {setBuilderStep(3);setMode("preview");}}><Eye className="size-4" />Preview form</Button>
            <FormActions>
              <Button type="submit" form={builderId} disabled={saving} loading={saving} className="w-full">{submitLabel}</Button>
              <Button asChild variant="ghost" className="w-full"><Link href={form ? `/library/forms/${form.id}` : "/library/forms"}>Cancel</Link></Button>
            </FormActions>
            <details className="min-w-0">
              <summary className="cursor-pointer rounded-xl border border-line bg-card p-3 text-sm font-medium">Preview as a respondent</summary>
            <FormBuilderPreview
              title={formControl.watch("title")}
              description={formControl.watch("description")}
              fields={builderFields}
              churchName={profile?.church?.name}
              churchLogoUrl={profile?.church?.logoUrl}
            />
            </details>
          </CreatePreviewSidebar> : (
          <aside
            className={cn(
              "min-w-0 xl:sticky xl:top-6 xl:block",
              (mode === "edit" || builderStep === 3) && "hidden",
            )}
          >
            <FormBuilderPreview
              title={formControl.watch("title")}
              description={formControl.watch("description")}
              fields={builderFields}
              churchName={profile?.church?.name}
              churchLogoUrl={profile?.church?.logoUrl}
            />
          </aside>
          )}
        </div>
        <nav aria-label="Form builder navigation" className="flex items-center justify-between gap-3 border-t border-line pt-4">
          <Button type="button" variant="outline" disabled={builderStep === 0 || saving} onClick={() => {const previous = builderStep-1;setBuilderStep(previous);setMode("edit");}}><ArrowLeft className="size-4" />Previous</Button>
          <span className="text-xs text-ink-faint">Step {builderStep+1} of 4</span>
          {builderStep < 3 ? <Button type="button" disabled={saving} onClick={() => {const next = builderStep+1;setBuilderStep(next);setMode(next === 3 ? "preview" : "edit");}}>Continue<ArrowRight className="size-4" /></Button> : <Button type="submit" form={builderId} disabled={saving} loading={saving}>{submitLabel}</Button>}
        </nav>
      </div>
    </Form>
  );
}
