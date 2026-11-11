"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Inbox } from "lucide-react";
import { PageHeader } from "@/components/paper/section";
import { EmptyState } from "@/components/paper/primitives";
import { SubmissionsRegister } from "@/components/forms/submissions-register";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";
import type { Form, PaginatedResponse } from "@/hooks/use-forms";
import { api } from "@/lib/api";
import { fetchAllPages, listUrl } from "@/lib/export-all";

export default function FormsSubmissionsPage() {
  const { can, ready } = usePermissions();
  const canList = ready && can("forms:list", "read");
  const [formId, setFormId] = React.useState("");
  const forms = useQuery({
    queryKey: ["forms-list", "submission-picker"],
    enabled: canList,
    queryFn: () =>
      fetchAllPages<Form>((page) =>
        api.get<PaginatedResponse<Form>>(
          listUrl("/forms", { page, limit: 100 }),
        ),
      ),
  });
  const selected = forms.data?.find((form) => form.id === formId);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Library · Forms"
        title="Every answer, one inbox."
        description="Choose a form to search, review and export its submissions."
      />
      {!canList && ready ? (
        <EmptyState
          icon={<Inbox />}
          title="Form directory access is required"
          description="Your role needs access to the forms directory to choose a form here."
        />
      ) : forms.isError ? (
        <EmptyState
          title="Forms could not be loaded"
          description="Try opening the form directory again."
          action={
            <Button variant="outline" onClick={() => void forms.refetch()}>
              Retry
            </Button>
          }
        />
      ) : forms.isLoading ? (
        <Skeleton className="h-10 w-72 rounded-full" />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Select value={formId} onValueChange={setFormId}>
            <SelectTrigger
              aria-label="Form picker"
              className="h-9 w-72 max-w-full rounded-full border-line bg-card text-sm"
            >
              <SelectValue placeholder="Choose a form…" />
            </SelectTrigger>
            <SelectContent>
              {forms.data
                ?.filter((form) => !form.archivedAt)
                .map((form) => (
                  <SelectItem key={form.id} value={form.id}>
                    {form.title}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {selected && (
            <Link
              href={`/library/forms/${selected.id}`}
              className="text-sm text-brand hover:underline"
            >
              Form details →
            </Link>
          )}
        </div>
      )}
      {selected ? (
        <SubmissionsRegister key={selected.id} form={selected} />
      ) : (
        canList &&
        !forms.isError &&
        !forms.isLoading && (
          <EmptyState
            icon={<Inbox />}
            title="Pick a form to open its inbox"
            description="Choose a form above to review its answers."
          />
        )
      )}
    </div>
  );
}
