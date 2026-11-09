"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Wrench } from "lucide-react";
import { PageHeader } from "@/components/paper/section";
import { AssetWorklist } from "@/components/assets/asset-worklist";

export default function AssetMaintenancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/operations/assets" className="flex items-center gap-1.5 hover:text-ink">
            <ArrowLeft className="size-3" /> Operations · Assets
          </Link>
        }
        title="Service, scheduled before it&apos;s urgent."
        description="Log repairs, servicing and software updates so the team knows what needs attention."
        actions={
          <Link href="/operations/assets/loans" className="flex h-9 items-center gap-1.5 rounded-full border border-line bg-card px-3 text-xs text-ink-soft transition-colors hover:text-ink">
            <Wrench className="size-3.5" /> Loans board
          </Link>
        }
      />
      <AssetWorklist kind="maintenance" />
    </div>
  );
}
