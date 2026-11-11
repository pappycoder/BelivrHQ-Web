"use client"

import * as React from "react"
import type { Label as LabelPrimitive } from "radix-ui"
import { Slot } from "radix-ui"
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
  useWatch,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  type FormProviderProps,
} from "react-hook-form"

import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { toast } from "@/lib/toast"

function DraftGuard() {
  const { formState, control, getValues } = useFormContext();
  const values = useWatch({ control });
  const saved = React.useRef<string | null>(null);
  const notified = React.useRef(0);
  React.useEffect(() => {
    if (formState.submitCount === 0) notified.current = 0;
    if (formState.submitCount > notified.current && !formState.isSubmitting) {
      notified.current = formState.submitCount;
      if (Object.keys(formState.errors).length) toast.error("Please check the required fields", {
        description: "Fields marked with an asterisk (*) are required. Correct the highlighted fields before saving.",
      });
    }
  }, [formState.submitCount, formState.isSubmitting, formState.errors]);
  React.useEffect(() => {
    if (formState.isSubmitSuccessful && !formState.isSubmitting) saved.current = JSON.stringify(getValues());
  }, [formState.isSubmitSuccessful, formState.isSubmitting, formState.submitCount, getValues]);
  const changedSinceSave = saved.current === null || JSON.stringify(values) !== saved.current;
  useUnsavedChanges(formState.isDirty && !formState.isSubmitting && changedSinceSave);
  return null;
}

function Form<T extends FieldValues>(props: FormProviderProps<T>) {
  return <FormProvider {...props}><DraftGuard />{props.children}</FormProvider>;
}

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName
  required?: boolean
}

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  required,
  ...props
}: ControllerProps<TFieldValues, TName> & { required?: boolean }) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name, required }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState } = useFormContext()
  const formState = useFormState({ name: fieldContext.name })
  const fieldState = getFieldState(fieldContext.name, formState)

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>")
  }

  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    required: fieldContext.required,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

type FormItemContextValue = {
  id: string
}

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue
)

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  const id = React.useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div
        data-slot="form-item"
        className={cn("grid gap-2", className)}
        {...props}
      />
    </FormItemContext.Provider>
  )
}

function FormLabel({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  const { error, formItemId, required } = useFormField()

  return (
    <Label
      data-slot="form-label"
      data-error={!!error}
      className={cn("data-[error=true]:text-destructive", className)}
      htmlFor={formItemId}
      required={required}
      {...props}
    />
  )
}

function FormControl({ ...props }: React.ComponentProps<typeof Slot.Root>) {
  const { error, formItemId, formDescriptionId, formMessageId, required } = useFormField()

  return (
    <Slot.Root
      data-slot="form-control"
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      aria-required={required}
      {...props}
    />
  )
}

function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { formDescriptionId } = useFormField()

  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn("text-sm leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  )
}

function FormMessage({ className, ...props }: React.ComponentProps<"p">) {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error?.message ?? "") : props.children

  if (!body) {
    return null
  }

  return (
    <p
      data-slot="form-message"
      role="alert"
      id={formMessageId}
      className={cn("text-sm font-medium text-destructive", className)}
      {...props}
    >
      {body}
    </p>
  )
}

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
}
