"use client";

import { collectionLabel } from "@/lib/collection-label";

import { FormActions } from "@/components/shared/form-actions";

import { CreatePreviewCard, CreatePreviewSidebar } from "@/components/shared/create-preview";

import { ValidatedForm } from "@/components/ui/validated-form";

import {
  BranchAssignmentField,
  useBranchAssignment,
} from "@/components/shared/branch-assignment";

import { useState, useEffect, useId, useRef } from "react";
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
import { ArrowLeft, ArrowRight, Check, Eye, ListChecks, Settings2 } from "lucide-react";
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

const BUILDER_SECTIONS = [
  { step: 0, label: "Form details" },
  { step: 1, label: "Questions" },
  { step: 2, label: "Sharing & responses" },
  { step: 3, label: "Preview & save" },
] as const;

const BUILDER_PROGRESS_LABELS = [
  "Start with the introduction",
  "Add the questions people will answer",
  "Choose who can respond",
  "Review before saving",
] as const;

function FormBuilderProgress({
  step,
  variant = "rail",
  className,
}: {
  step: number;
  variant?: "rail" | "mobile";
  className?: string;
}) {
  const label = BUILDER_PROGRESS_LABELS[step];
  return (
    <div className={cn(variant === "mobile" ? "guided-progress-mobile" : "guided-progress", className)}>
      <span>{label}</span>
      <progress
        role="progressbar"
        aria-label={variant === "mobile" ? "Mobile form setup progress" : "Form setup progress"}
        aria-valuemin={0}
        aria-valuemax={BUILDER_SECTIONS.length - 1}
        aria-valuenow={step}
        aria-valuetext={label}
        max={BUILDER_SECTIONS.length - 1}
        value={step}
      />
      {variant === "rail" && <small>Your form is saved only when you confirm.</small>}
    </div>
  );
}

export function FormForm({ form, onSubmit, submitLabel, withPreview = false }: FormFormProps) {
  const branchAssignment = useBranchAssignment(form);
  const { data: profile } = useCurrentProfile();
  const builderId = useId();
  const [builderStep, setBuilderStep] = useState(0);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [builderFields, setBuilderFields] = useState<FormFieldType[]>([]);
  const builderBodyRef = useRef<HTMLDivElement>(null);

  const goToBuilderStep = (step: number) => {
    setBuilderStep(step);
    setMode(step === 3 ? "preview" : "edit");
    requestAnimationFrame(() => {
      const target = builderBodyRef.current?.querySelector<HTMLElement>(`[data-builder-step="${step}"]`)
        ?? builderBodyRef.current;
      const heading = target?.querySelector<HTMLElement>("h2");
      if (heading) {
        heading.tabIndex = -1;
        heading.focus();
      }
    });
  };

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
    if (!branchPayload) { goToBuilderStep(0); return; }
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
        {saveError && (
          <p
            role="alert"
            className="rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive"
          >
            {saveError}
          </p>
        )}
        <div className={cn(
          "grid min-w-0 items-start gap-4",
          withPreview
            ? "lg:grid-cols-[180px_minmax(0,1fr)_320px]"
            : "lg:grid-cols-[180px_minmax(0,1fr)]",
        )}>
          <aside aria-label="Form builder sections" className="min-w-0 lg:sticky lg:top-20 lg:self-start">
            <FormBuilderProgress step={builderStep} variant="mobile" />
            <nav className="guided-record-nav" aria-label="Form sections">
              <p className="rule-label">A LITTLE AT A TIME</p>
              {BUILDER_SECTIONS.map(section => (
                <button
                  key={section.step}
                  type="button"
                  aria-current={builderStep === section.step ? "step" : undefined}
                  onClick={() => goToBuilderStep(section.step)}
                  className="min-w-0"
                >
                  <span aria-hidden="true">
                    {builderStep > section.step ? <Check className="size-4" /> : null}
                  </span>
                  <strong className="min-w-0 break-words">{section.label}</strong>
                </button>
              ))}
              <FormBuilderProgress step={builderStep} />
            </nav>
          </aside>
          <div ref={builderBodyRef} className="min-w-0 space-y-5">
            <ValidatedForm schemaValidation
              aria-hidden={builderStep === 3}
              id={builderId}
              onSubmit={formControl.handleSubmit(handleSubmit, errors => { goToBuilderStep(errors.title ? 0 : errors.fields ? 1 : 2); })}
              className={cn(
                "min-w-0 space-y-5",
                builderStep === 3 && "hidden",
              )}
            >
              <div data-builder-step={0} hidden={builderStep !== 0} aria-hidden={builderStep !== 0}>
                <SectionCard
                  eyebrow="The introduction"
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
              <div data-builder-step={1} hidden={builderStep !== 1} aria-hidden={builderStep !== 1}>
                <SectionCard
                  eyebrow="What you need to know"
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
              <div data-builder-step={2} hidden={builderStep !== 2} aria-hidden={builderStep !== 2}>
                <SectionCard
                  eyebrow="Sharing & responses"
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
            {builderStep === 3 && <div data-builder-step={3} className="min-w-0"><FormBuilderPreview title={formControl.watch("title")} description={formControl.watch("description")} fields={builderFields} churchName={profile?.church?.name} churchLogoUrl={profile?.church?.logoUrl} /></div>}
            <nav aria-label="Form builder navigation" className="flex min-w-0 flex-wrap items-center justify-between gap-2 pt-1">
              <Button type="button" variant="outline" className="min-w-0" disabled={builderStep === 0 || saving} onClick={() => goToBuilderStep(builderStep - 1)}><ArrowLeft className="size-4" />Previous</Button>
              {builderStep < 3 ? <Button type="button" className="min-w-0" disabled={saving} onClick={() => goToBuilderStep(builderStep + 1)}>Continue<ArrowRight className="size-4" /></Button> : <Button type="submit" form={builderId} className="min-w-0" disabled={saving} loading={saving}>{submitLabel}</Button>}
            </nav>
          </div>
          {withPreview ? (
            <CreatePreviewSidebar>
              <CreatePreviewCard editing={!!form} eyebrow="Form preview" title={formControl.watch("title") || "Untitled form"}>
                <dl className="space-y-3 text-sm">
                  <div><dt className="rule-label">Questions</dt><dd className="mt-1">{builderFields.length} {collectionLabel(builderFields.length, "questions")} · {builderFields.filter(field => field.required).length} required</dd></div>
                  <div><dt className="rule-label">Status</dt><dd className="mt-1 capitalize">{settingsValues.status || "draft"}</dd></div>
                  <div><dt className="rule-label">Sharing</dt><dd className="mt-1">{settingsValues.isPublic ? "Public link" : "Members only"}</dd></div>
                  {formControl.watch("description") && <div><dt className="rule-label">Description</dt><dd className="mt-1 break-words">{formControl.watch("description")}</dd></div>}
                </dl>
                {builderFields.length > 0 && <ol className="space-y-2 border-t border-line pt-4" aria-label="Question order">{builderFields.map((field,index) => <li key={field.key || index} className="flex items-start gap-2 text-sm text-ink-soft"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-xs">{index+1}</span><span className="min-w-0 break-words">{field.label || "Untitled question"}</span></li>)}</ol>}
              </CreatePreviewCard>
              <Button type="button" variant="outline" className="hidden w-full gap-2 lg:flex" onClick={() => goToBuilderStep(3)}><Eye className="size-4" />Preview form</Button>
              <FormActions>
                <Button type="submit" form={builderId} disabled={saving} loading={saving} className="w-full">{submitLabel}</Button>
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
            </CreatePreviewSidebar>
          ) : (
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
      </div>
    </Form>
  );
}
