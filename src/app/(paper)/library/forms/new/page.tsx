"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { PageHeader } from "@/components/paper/section";
import { EmptyState } from "@/components/paper/primitives";
import { Button } from "@/components/ui/button";
import { FormForm } from "@/components/forms/form-form";
import { usePermissions } from "@/hooks/use-permissions";
import { useCreateForm, type CreateFormInput } from "@/hooks/use-forms";

export default function NewFormPage() {
  const router = useRouter();
  const { can, ready } = usePermissions();
  const canCreate = ready && can("forms:list", "create");
  const create = useCreateForm();

  if (!canCreate) {
    return (
      <EmptyState
        title="Building forms needs the forms grant"
        description="Your role can read answers but not author forms."
        action={<Button asChild variant="outline" size="sm" className="rounded-full border-line text-sm"><Link href="/library/forms">Back to forms</Link></Button>}
      />
    );
  }

  const onSubmit = async (input: CreateFormInput) => {
    try {
      const form = await create.mutateAsync(input);
      toast.success(`${form.title} is ready. Share the link or build on it.`);
      router.push(`/library/forms/${form.id}`);
    } catch (e) {
      toast.error(getToastErrorMessage(e, "Couldn't create the form."));
      throw e;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/library/forms" className="flex items-center gap-1.5 hover:text-ink">
            <ArrowLeft className="size-3" /> Library · Forms
          </Link>
        }
        title="Build a form."
        description="Build your form and review responses in one place. Keep questions brief and focused."
        actions={
          <Button asChild variant="outline" size="sm" className="h-9 rounded-full border-line bg-card text-sm">
            <Link href="/library/forms">Cancel</Link>
          </Button>
        }
      />
      <FormForm onSubmit={onSubmit} submitLabel="Create form" />
    </div>
  );
}
