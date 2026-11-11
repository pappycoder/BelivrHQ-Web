"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/paper/section";
import { EmptyState } from "@/components/paper/primitives";
import { Button } from "@/components/ui/button";
import { AssetFormDialog } from "@/components/assets/asset-form-dialog";
import { confirmDiscardChanges } from "@/hooks/use-unsaved-changes";
import { usePermissions } from "@/hooks/use-permissions";

export default function NewAssetPage() {
  const router = useRouter();
  const { can, ready } = usePermissions();
  const canCreate = ready && can("assets:list", "create");

  if (!canCreate) {
    return (
      <EmptyState
        title="Registering assets needs the assets grant"
        description="Your role can look at the register but not write to it."
        action={<Button asChild variant="outline" size="sm" className="rounded-full border-line text-sm"><Link href="/operations/assets">Back to the register</Link></Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/operations/assets" className="flex items-center gap-1.5 hover:text-ink">
            <ArrowLeft className="size-3" /> Operations · Assets
          </Link>
        }
        title="Register a new asset."
        description="Record the asset tag, value, custodian and maintenance schedule for future stock checks."
        actions={
          <Button asChild variant="outline" size="sm" className="h-9 rounded-full border-line bg-card text-sm">
            <Link href="/operations/assets">Cancel</Link>
          </Button>
        }
      />
      <AssetFormDialog
        presentation="page"
        open
        onOpenChange={() => {
          if (confirmDiscardChanges()) router.push("/operations/assets");
        }}
        onSaved={(asset) => router.push(`/operations/assets/${asset.id}`)}
      />
    </div>
  );
}
