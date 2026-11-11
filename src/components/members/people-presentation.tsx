"use client";

import * as React from "react";
import {
  Archive,
  Check,
  ContactRound,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RecordActions } from "@/components/shared/record-actions";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";
import styles from "./people-presentation.module.css";

export const peopleWorkspaceClass = styles.workspace;
export function PeopleWorkspace({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(styles.workspace, "space-y-5", className)}>
      {children}
    </div>
  );
}

export function PeopleHeader({
  count,
  ...props
}: React.ComponentProps<typeof PageHeader> & { count?: number }) {
  return (
    <PageHeader
      {...props}
      titleMeta={
        count === undefined ? undefined : (
          <span
            className="rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1 text-sm font-medium tabular-nums text-[var(--workspace-accent-readable,var(--primary))]"
            aria-label={`${count.toLocaleString()} results`}
          >
            {count.toLocaleString()}
          </span>
        )
      }
    />
  );
}

const avatarTones = [
  "bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200",
  "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
  "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200",
];
export function PeopleAvatar({
  id,
  name,
  photoUrl,
  className,
}: {
  id: string;
  name: string;
  photoUrl?: string;
  className?: string;
}) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials =
    `${parts[0]?.[0] ?? ""}${parts.length > 1 ? parts[parts.length - 1][0] : ""}`.toUpperCase() ||
    "?";
  return (
    <Avatar className={cn("size-9 shrink-0 ring-2 ring-background", className)}>
      {photoUrl && <AvatarImage src={photoUrl} alt={name} />}
      <AvatarFallback className={avatarTones[hash % avatarTones.length]}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

const statusTones: Record<string, string> = {
  active:
    "border-emerald-600/15 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300",
  inactive:
    "border-slate-500/15 bg-slate-500/8 text-slate-600 dark:text-slate-300",
  transferred:
    "border-blue-600/15 bg-blue-500/8 text-blue-700 dark:text-blue-300",
  suspended: "border-red-600/15 bg-red-500/8 text-red-700 dark:text-red-300",
};
export function PeopleStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 rounded-full px-2 py-0.5 text-sm font-medium capitalize",
        statusTones[status] ?? statusTones.inactive,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
export function PeopleArchivedBadge() {
  return (
    <Badge
      variant="outline"
      className="gap-1 rounded-full border-amber-600/20 bg-amber-500/8 text-amber-800 dark:text-amber-300"
    >
      <Archive className="size-3" />
      Archived
    </Badge>
  );
}

export function PeopleSectionHeading({
  children,
  icon: Icon = ContactRound,
}: {
  children: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <span className="flex items-center gap-2 text-sm font-semibold">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/8 text-violet-600 dark:text-violet-300">
        <Icon className="size-3.5" aria-hidden="true" />
      </span>
      {children}
    </span>
  );
}
export function PeopleFormSection({
  title,
  children,
  icon,
  description,
}: {
  title: string;
  children: React.ReactNode;
  icon?: LucideIcon;
  description?: string;
}) {
  return (
    <fieldset className="min-w-0 space-y-4 rounded-xl border border-border/70 p-4">
      <legend className="px-1">
        <PeopleSectionHeading icon={icon}>{title}</PeopleSectionHeading>
      </legend>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {children}
    </fieldset>
  );
}

export function PeopleMoreFilters({
  count,
  children,
}: {
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2 rounded-lg">
          <SlidersHorizontal className="size-3.5" />
          More filters
          {count > 0 && (
            <span
              className="rounded-full bg-primary/10 px-1.5 text-sm text-[var(--workspace-accent-readable,var(--primary))]"
              aria-label={`${count} active filters`}
            >
              {count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className={cn(styles.workspace, "w-[min(22rem,90vw)] space-y-4")}
      >
        <p className="text-sm font-semibold">Directory options</p>
        <div className="flex flex-wrap items-center gap-3">{children}</div>
      </PopoverContent>
    </Popover>
  );
}

export function PeopleImportProgress({
  step,
}: {
  step: "upload" | "map" | "review" | "done";
}) {
  const steps = ["upload", "map", "review", "done"] as const;
  const current = steps.indexOf(step);
  return (
    <ol
      aria-label="Import progress"
      className="grid grid-cols-2 gap-2 rounded-xl border bg-card p-3 sm:grid-cols-4"
    >
      {steps.map((value, index) => (
        <li
          key={value}
          aria-current={step === value ? "step" : undefined}
          className={cn(
            "flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium",
            index === current
              ? "bg-blue-500/8 text-blue-700 dark:text-blue-300"
              : "text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full border",
              index < current
                ? "border-primary/15 bg-primary/8 text-[var(--workspace-accent-readable,var(--primary))]"
                : "border-current/15",
            )}
          >
            {index < current ? (
              <Check className="size-3" aria-label="Completed" />
            ) : (
              index + 1
            )}
          </span>
          <span className="capitalize">
            {value === "done" ? "Complete" : value}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function PeopleRecordActions({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RecordActions label="More options">{children}</RecordActions>;
}
