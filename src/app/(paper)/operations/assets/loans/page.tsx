"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Repeat } from "lucide-react";
import { AssetWorklist } from "@/components/assets/asset-worklist";

export default function AssetLoansPage() {
  return (
    <div className="space-y-6">
      <AssetWorklist kind="loans" heading={{
        title: "Borrowed out, expected back.",
        description: "Track who borrowed each asset, when it left and when it is due back.",
        eyebrow: (<Link href="/operations/assets" className="flex items-center gap-1.5 hover:text-ink">
            <ArrowLeft className="size-3" /> Operations · Assets
          </Link>),
        actions: (<Link href="/operations/assets/maintenance" className="flex h-9 items-center gap-1.5 rounded-full border border-line bg-card px-3 text-sm text-ink-soft transition-colors hover:text-ink">
            <Repeat className="size-3.5" /> Maintenance schedule
          </Link>),
      }} />
    </div>
  );
}
