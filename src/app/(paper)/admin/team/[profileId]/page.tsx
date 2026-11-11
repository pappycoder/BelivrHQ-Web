"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/paper/primitives";
import { Button } from "@/components/ui/button";
import { UserDetailSidebar } from "@/components/users/user-detail-sidebar";
import { UserDetailContent } from "@/components/users/user-detail-content";
import { useUser } from "@/hooks/use-users";

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = React.use(params);
  const user = useUser(profileId);

  return (
    <div className="space-y-4">
      <Link href="/admin/team" className="inline-flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink">
        <ArrowLeft className="size-3" /> Admin · Team
      </Link>
      {user.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      ) : user.isError || !user.data ? (
        <EmptyState
          title="We couldn&apos;t find this seat"
          description="The profile may have been removed, or the link is old."
          action={<Button asChild variant="outline" size="sm" className="rounded-full border-line text-sm"><Link href="/admin/team">Back to the team</Link></Button>}
        />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside aria-label="Team member profile"><UserDetailSidebar user={user.data} /></aside>
          <div className="min-w-0"><UserDetailContent user={user.data} /></div>
        </div>
      )}
    </div>
  );
}
