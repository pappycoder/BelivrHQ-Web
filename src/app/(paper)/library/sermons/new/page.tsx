"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { PageHeader } from "@/components/paper/section";
import { EmptyState } from "@/components/paper/primitives";
import { Button } from "@/components/ui/button";
import { SermonForm } from "@/components/sermons/sermon-form";
import { usePermissions } from "@/hooks/use-permissions";
import { useCreateSermon, type CreateSermonInput, type Sermon } from "@/hooks/use-sermons";

export default function NewSermonPage() {
  const router = useRouter();
  const { can, ready } = usePermissions();
  const canCreate = ready && can("sermons:new", "create");
  const create = useCreateSermon();

  if (!canCreate) {
    return (
      <EmptyState
        title="Publishing needs the sermon grant"
        description="Your role can listen but not add to the archive."
        action={<Button asChild variant="outline" size="sm" className="rounded-full border-line text-xs"><Link href="/library/sermons">Back to the archive</Link></Button>}
      />
    );
  }

  const onSubmit = async (input: CreateSermonInput): Promise<Sermon> => {
    try {
      const sermon = await create.mutateAsync(input);
      toast.success(`${sermon.title} saved. Attach the recordings next.`);
      router.replace(`/library/sermons/${sermon.sermonId}/edit`);
      return sermon;
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Couldn't save the sermon details."));
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/library/sermons" className="flex items-center gap-1.5 hover:text-ink">
            <ArrowLeft className="size-3" /> Library · Sermons
          </Link>
        }
        title="Publish this week&apos;s message."
        description="Creation saves the details first, then opens the editor where audio and video each save independently. A failed upload never loses the sermon."
        actions={
          <Button asChild variant="outline" size="sm" className="h-9 rounded-full border-line bg-card text-xs">
            <Link href="/library/sermons">Cancel</Link>
          </Button>
        }
      />
      <SermonForm onSubmit={onSubmit} />
    </div>
  );
}
