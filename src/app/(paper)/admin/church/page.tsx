"use client";

import * as React from "react";
import { GeneralSettingsTab } from "@/components/settings/general-settings-tab";
import { PageHeader } from "@/components/paper/section";

export default function ChurchSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin · Church"
        title="The church&apos;s own details."
        description="Manage the church name, contact details, location and preferences used on exports and receipts."
      />
      <div className="paper-card rounded-2xl p-5 md:p-6">
        <GeneralSettingsTab />
      </div>
    </div>
  );
}
