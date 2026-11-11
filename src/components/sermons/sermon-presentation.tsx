"use client";
import * as React from "react";
import { PermissionLink } from "@/components/shared/permission-link";
import { BookOpen, FileAudio, FileVideo, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  PeopleHeader,
  PeopleMoreFilters,
  PeopleSectionHeading,
  peopleWorkspaceClass,
} from "@/components/members/people-presentation";
import { DetailManagementMenu } from "@/components/shared/detail-management-menu";
import { cn } from "@/lib/utils";
import styles from "./sermon-presentation.module.css";
export const sermonWorkspaceClass = cn(peopleWorkspaceClass, styles.workspace);
export const SermonHeader = PeopleHeader;
export const SermonMoreFilters = PeopleMoreFilters;
export function SermonSectionHeading({
  children,
  icon = BookOpen,
}: {
  children: React.ReactNode;
  icon?: LucideIcon;
}) {
  return <PeopleSectionHeading icon={icon}>{children}</PeopleSectionHeading>;
}
export function SermonMediaBadges({
  audioUrl,
  videoUrl,
}: {
  audioUrl?: string | null;
  videoUrl?: string | null;
}) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {audioUrl && (
        <Badge
          variant="outline"
          className="gap-1 rounded-full border-blue-500/20 bg-blue-500/8 text-xs font-medium text-blue-700 dark:text-blue-200"
        >
          <FileAudio className="size-3" aria-hidden="true" />
          Audio attached
        </Badge>
      )}
      {videoUrl && (
        <Badge
          variant="outline"
          className="gap-1 rounded-full border-violet-500/20 bg-violet-500/8 text-xs font-medium text-violet-700 dark:text-violet-200"
        >
          <FileVideo className="size-3" aria-hidden="true" />
          Video attached
        </Badge>
      )}
    </span>
  );
}
export function SermonRowMenu({
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

/** Keep aggregate labels visible when their sermon-list destination is unavailable. */
export function SermonBrowseLink({
  enabled,
  ...props
}: React.ComponentProps<typeof PermissionLink> & { enabled: boolean }) {
  return enabled ? (
    <PermissionLink {...props} />
  ) : (
    <span className={props.className}>{props.children}</span>
  );
}
