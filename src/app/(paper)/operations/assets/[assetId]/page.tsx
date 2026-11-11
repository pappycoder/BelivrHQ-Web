"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, PencilLine } from "lucide-react";
import { AssetDetailDrawer } from "@/components/assets/asset-detail-drawer";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";
import { useAsset } from "@/hooks/use-assets";

export default function AssetDetailPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const { assetId } = React.use(params);
  const { can, ready } = usePermissions();
  const canUpdate = ready && can("assets:list", "update");
  const asset = useAsset(assetId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/operations/assets" className="inline-flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink">
          <ArrowLeft className="size-3" /> Operations · Assets
        </Link>
        {canUpdate && asset.data ? (
          <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 rounded-full border-line bg-card text-sm">
            <Link href={`/operations/assets/${assetId}/edit`}>
              <PencilLine className="size-3.5" /> Edit asset
            </Link>
          </Button>
        ) : null}
      </div>
      <AssetDetailDrawer
        presentation="page"
        open
        assetId={assetId}
        onOpenChange={() => undefined}
      />
    </div>
  );
}
