"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { PageHeader } from "@/components/paper/section";
import { EmptyState } from "@/components/paper/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FormForm } from "@/components/forms/form-form";
import { usePermissions } from "@/hooks/use-permissions";
import { useForm, useUpdateForm, type CreateFormInput } from "@/hooks/use-forms";

export default function EditFormPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = React.use(params);
  const router = useRouter();
  const { can, ready } = usePermissions();
  const canUpdate = ready && can("forms:list", "update");

  const form = useForm(formId);
  const update = useUpdateForm(formId);

  if (!canUpdate) {
    return (
      <EmptyState
        title="Editing forms needs the forms grant"
        description="Your role can read answers but not amend the builder."
        action={<Button asChild variant="outline" size="sm" className="rounded-full border-line text-xs"><Link href="/library/forms">Back to forms</Link></Button>}
      />
    );
  }

  if (form.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (form.isError || !form.data) {
    return (
      <EmptyState
        title="We couldn&apos;t open that form"
        description="It may have been deleted, or the link is old."
        action={<Button asChild variant="outline" size="sm" className="rounded-full border-line text-xs"><Link href="/library/forms">Back to forms</Link></Button>}
      />
    );
  }

  const onSubmit = async (input: CreateFormInput) => {
    try {
      await update.mutateAsync(input);
      toast.success(`${form.data!.title} saved.`);
      router.push(`/library/forms/${formId}`);
    } catch (e) {
      toast.error(getToastErrorMessage(e, "Couldn't save the form."));
      throw e;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href={`/library/forms/${formId}`} className="flex items-center gap-1.5 hover:text-ink">
            <ArrowLeft className="size-3" /> Library · Forms
          </Link>
        }
        title="Amend the form."
        description="Edit questions, settings and access while keeping existing responses intact."
        actions={
          <Button asChild variant="outline" size="sm" className="h-9 rounded-full border-line bg-card text-xs">
            <Link href={`/library/forms/${formId}`}>Back to the form</Link>
          </Button>
        }
      />
      <FormForm form={form.data} onSubmit={onSubmit} submitLabel="Save changes" />
    </div>
  );
}
