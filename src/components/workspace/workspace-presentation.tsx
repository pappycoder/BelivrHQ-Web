"use client";

import { LoadingState } from "@/components/shared/loading-state";

import * as React from "react";
import { ChartPie, Layers, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardDonut } from "@/components/dashboard/dashboard-plots";
import { useRemainingWorkspace } from "./remaining-workspace";
import { cn } from "@/lib/utils";
export {
  PeopleAvatar as WorkspaceAvatar,
  PeopleMoreFilters as WorkspaceMoreFilters,
} from "@/components/members/people-presentation";

type HeaderProps = React.ComponentProps<typeof PageHeader> & {
  count?: number;
  countLabel?: string;
  loading?: boolean;
};
export function WorkspaceHeader({
  count,
  countLabel = "results",
  loading,
  ...props
}: HeaderProps) {
  return (
    <div data-workspace-header>
      <PageHeader
        {...props}
        titleMeta={
          props.titleMeta ??
          (count === undefined ? undefined : (
            <span
              aria-label={`${loading ? "Loading" : count.toLocaleString()} ${countLabel}`}
              className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-2 py-0.5 text-sm font-medium tabular-nums text-muted-foreground"
            >
              {loading ? <LoadingState label={`Loading ${countLabel}`} variant="inline" className="max-w-8" /> : count.toLocaleString()}
              <span className="sr-only"> {countLabel}</span>
            </span>
          ))
        }
      />
    </div>
  );
}

/** Same metric inputs as StatsCard; compact presentation for useful summaries. */
export function SummaryMetric({
  title,
  value,
  loading,
  subtitle,
  icon,
  className,
}: React.ComponentProps<
  typeof import("@/components/shared/stats-card").StatsCard
>) {
  return (
    <div
      data-summary-metric
      className={cn(
        "min-w-0 rounded-lg border bg-muted/20 px-3 py-2.5",
        className,
      )}
    >
      <div className="mb-1 flex items-center gap-1.5 text-sm text-muted-foreground">
        {icon && (
          <span className="[&_svg]:size-3.5" aria-hidden="true">
            {icon}
          </span>
        )}
        <span>{title}</span>
      </div>
      {loading || value === "..." ? (
        <Skeleton aria-label={`Loading ${title}`} className="h-5 w-20" />
      ) : (
        <p className="break-words text-base font-semibold tabular-nums">
          {value}
        </p>
      )}
      {subtitle && (
        <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>
      )}
    </div>
  );
}

export function WorkspaceSection({
  title,
  description,
  icon: Icon = Layers,
  children,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-start gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-300">
          <Icon className="size-3.5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

type ChartQuery = {
  isLoading: boolean;
  isFetching?: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
};
export function DistributionChart({
  title,
  description,
  data,
  query,
}: {
  title: string;
  description: string;
  data: { label: string; value: number }[];
  query: ChartQuery;
}) {
  return (
    <Card data-workspace-chart>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-300">
            <ChartPie className="size-4" aria-hidden="true" />
          </span>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription className="mt-0.5 text-sm">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {query.error ? (
          <div
            role="alert"
            className="flex min-h-40 flex-col items-center justify-center gap-2"
          >
            <p className="text-sm text-muted-foreground">
              Unable to load {title.toLowerCase()}.
            </p>
            <Button
              size="sm"
              variant="outline"
              disabled={query.isFetching}
              onClick={() => void query.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : query.isLoading ? (
          <Skeleton aria-label={`Loading ${title}`} className="h-44 w-full" />
        ) : (
          <DashboardDonut
            data={data.map((d) => ({ name: d.label, value: d.value }))}
            showCounts
            showPercentages
          />
        )}
      </CardContent>
    </Card>
  );
}

/** Shared forms retain their previous presentation outside the opted-in sections. */
export function WorkspaceFormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const enabled = useRemainingWorkspace();
  if (!enabled) return children;
  return (
    <fieldset className="min-w-0 space-y-4 rounded-xl border p-4">
      <legend className="px-1 text-sm font-semibold text-muted-foreground">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}
