"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { PageHeader } from "@/components/paper/section";
import { EmptyState } from "@/components/paper/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SermonForm } from "@/components/sermons/sermon-form";
import { usePermissions } from "@/hooks/use-permissions";
import { useSermon, useUpdateSermon, type UpdateSermonInput, type Sermon } from "@/hooks/use-sermons";

export default function EditSermonPage({
  params,
}: {
  params: Promise<{ sermonId: string }>;
}) {
  const { sermonId } = React.use(params);
  const { can, ready } = usePermissions();
  const canUpdate = ready && can("sermons", "update");

  const sermon = useSermon(sermonId);
  const update = useUpdateSermon(sermonId);

  if (!canUpdate) {
    return (
      <EmptyState
        title="Editing sermons needs the update grant"
        description="Your role can listen but not amend the archive."
        action={<Button asChild variant="outline" size="sm" className="rounded-full border-line text-xs"><Link href="/library/sermons">Back to the archive</Link></Button>}
      />
    );
  }

  if (sermon.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (sermon.isError || !sermon.data) {
    return (
      <EmptyState
        title="We couldn&apos;t open this sermon"
        description="It may have been deleted, or the link is old."
        action={<Button asChild variant="outline" size="sm" className="rounded-full border-line text-xs"><Link href="/library/sermons">Back to the archive</Link></Button>}
      />
    );
  }

  // Mirrors the legacy editor exactly: details and each recording save
  // independently through the same update mutation.
  const handleSubmit = async (input: UpdateSermonInput): Promise<Sermon> => {
    try {
      const saved = await update.mutateAsync(input);
      return saved;
    } catch (e) {
      toast.error(getToastErrorMessage(e, "Couldn't save the changes."));
      throw e;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href={`/library/sermons/${sermonId}`} className="flex items-center gap-1.5 hover:text-ink">
            <ArrowLeft className="size-3" /> Library · Sermons
          </Link>
        }
        title="Amend the record."
        description="Details, audio and video each save on their own. A failed upload never loses the sermon."
        actions={
          <Button asChild variant="outline" size="sm" className="h-9 rounded-full border-line bg-card text-xs">
            <Link href={`/library/sermons/${sermonId}`}>Back to the message</Link>
          </Button>
        }
      />
      <SermonForm sermon={sermon.data} onSubmit={handleSubmit} onSaveRecording={handleSubmit} />
    </div>
  );
}
