"use client";
import * as React from "react";
import { DetailManagementMenu } from "@/components/shared/detail-management-menu";
import { Badge } from "@/components/ui/badge";
import {
  PeopleHeader,
  PeopleMoreFilters,
  PeopleAvatar,
  PeopleFormSection,
  PeopleSectionHeading,
  peopleWorkspaceClass,
} from "@/components/members/people-presentation";
import { UserRound } from "lucide-react";
import { FOLLOW_UP_STATUSES, type FollowUpStatus } from "@/hooks/use-visitors";
import { cn } from "@/lib/utils";
import styles from "./visitor-presentation.module.css";
export const VisitorHeader = PeopleHeader;
export const VisitorMoreFilters = PeopleMoreFilters;
export const VisitorAvatar = PeopleAvatar;
export const visitorWorkspaceClass = cn(peopleWorkspaceClass, styles.workspace);
export function VisitorSectionHeading({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PeopleSectionHeading icon={UserRound}>{children}</PeopleSectionHeading>
  );
}
export const VisitorFormSection = PeopleFormSection;
export const visitorStatusTones: Record<FollowUpStatus, string> = {
  new: "border-blue-500/20 bg-blue-500/8 text-blue-700 dark:text-blue-200",
  contacted:
    "border-teal-500/20 bg-teal-500/8 text-teal-700 dark:text-teal-200",
  follow_up_scheduled:
    "border-amber-500/20 bg-amber-500/8 text-amber-800 dark:text-amber-200",
  interested:
    "border-violet-500/20 bg-violet-500/8 text-violet-700 dark:text-violet-200",
  converted:
    "border-emerald-500/20 bg-emerald-500/8 text-emerald-700 dark:text-emerald-200",
  dropped_off:
    "border-slate-500/20 bg-slate-500/8 text-slate-600 dark:text-slate-300",
};
export function VisitorStatusBadge({ status }: { status: FollowUpStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 rounded-full text-sm font-medium",
        visitorStatusTones[status],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {FOLLOW_UP_STATUSES.find((item) => item.value === status)?.label ??
        status}
    </Badge>
  );
}

export function VisitorRowMenu({
  label,
  actions,
  returnFocusRef,
}: Omit<React.ComponentProps<typeof DetailManagementMenu>, "triggerRef"> & {
  returnFocusRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  return (
    <DetailManagementMenu
      label={label}
      triggerRef={triggerRef}
      actions={actions.map((action) => ({
        ...action,
        onSelect: () => {
          returnFocusRef.current = triggerRef.current;
          action.onSelect();
        },
      }))}
    />
  );
}
