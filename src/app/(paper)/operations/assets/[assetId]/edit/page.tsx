"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/paper/section";
import { EmptyState } from "@/components/paper/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AssetFormDialog } from "@/components/assets/asset-form-dialog";
import { confirmDiscardChanges } from "@/hooks/use-unsaved-changes";
import { usePermissions } from "@/hooks/use-permissions";
import { useAsset } from "@/hooks/use-assets";

export default function EditAssetPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const { assetId } = React.use(params);
  const router = useRouter();
  const { can, ready } = usePermissions();
  const canUpdate = ready && can("assets:list", "update");
  const asset = useAsset(assetId);

  if (!canUpdate) {
    return (
      <EmptyState
        title="Editing assets needs the register grant"
        description="Your role can view the register but not amend it."
        action={<Button asChild variant="outline" size="sm" className="rounded-full border-line text-sm"><Link href="/operations/assets">Back to the register</Link></Button>}
      />
    );
  }

  if (asset.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (asset.isError || !asset.data) {
    return (
      <EmptyState
        title="We couldn&apos;t open this asset"
        description="It may have been deleted, or the link is old."
        action={<Button asChild variant="outline" size="sm" className="rounded-full border-line text-sm"><Link href="/operations/assets">Back to the register</Link></Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href={`/operations/assets/${assetId}`} className="flex items-center gap-1.5 hover:text-ink">
            <ArrowLeft className="size-3" /> Operations · Assets
          </Link>
        }
        title={`Amend ${asset.data.name}.`}
        description="Value, custodian, condition and care schedule. The audit trail keeps every change."
      />
      <AssetFormDialog
        presentation="page"
        open
        asset={asset.data}
        onOpenChange={() => {
          if (confirmDiscardChanges()) router.push(`/operations/assets/${assetId}`);
        }}
        onSaved={() => router.push(`/operations/assets/${assetId}`)}
      />
    </div>
  );
}
