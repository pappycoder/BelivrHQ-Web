"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Wrench } from "lucide-react";
import { AssetWorklist } from "@/components/assets/asset-worklist";

export default function AssetMaintenancePage() {
  return (
    <div className="space-y-6">
      <AssetWorklist kind="maintenance" heading={{
        title: "Service, scheduled before it's urgent.",
        description: "Log repairs, servicing and software updates so the team knows what needs attention.",
        eyebrow: (<Link href="/operations/assets" className="flex items-center gap-1.5 hover:text-ink">
            <ArrowLeft className="size-3" /> Operations · Assets
          </Link>),
        actions: (<Link href="/operations/assets/loans" className="flex h-9 items-center gap-1.5 rounded-full border border-line bg-card px-3 text-sm text-ink-soft transition-colors hover:text-ink">
            <Wrench className="size-3.5" /> Loans board
          </Link>),
      }} />
    </div>
  );
}
