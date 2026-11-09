"use client";

import * as React from "react";
import { IntegrationSettingsTab } from "@/components/settings/integration-settings-tab";
import { PageHeader } from "@/components/paper/section";

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin · Integrations"
        title="Your tools, working together."
        description="Manage the accounts and services that keep your church connected, from messages to payments."
      />
      <IntegrationSettingsTab />
    </div>
  );
}
