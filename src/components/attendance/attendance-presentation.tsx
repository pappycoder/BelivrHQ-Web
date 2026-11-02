"use client";

import * as React from "react";
import { CalendarCheck, type LucideIcon } from "lucide-react";
import {
  PeopleWorkspace,
  PeopleHeader,
  PeopleMoreFilters,
  PeopleRecordActions,
  PeopleSectionHeading,
  PeopleFormSection,
  PeopleStatusBadge,
  PeopleArchivedBadge,
  peopleWorkspaceClass,
} from "@/components/members/people-presentation";
import { Badge } from "@/components/ui/badge";

// Opt-in presentation only: no attendance state, grants or requests live here.
export const AttendanceWorkspace = PeopleWorkspace;
export const AttendanceHeader = PeopleHeader;
export const AttendanceMoreFilters = PeopleMoreFilters;
export const AttendanceRecordActions = PeopleRecordActions;
export const AttendanceStatusBadge = PeopleStatusBadge;
export const AttendanceArchivedBadge = PeopleArchivedBadge;
export const attendanceWorkspaceClass = peopleWorkspaceClass;
export function AttendanceSectionHeading({
  children,
  icon = CalendarCheck,
}: {
  children: React.ReactNode;
  icon?: LucideIcon;
}) {
  return <PeopleSectionHeading icon={icon}>{children}</PeopleSectionHeading>;
}
export function AttendanceFormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <PeopleFormSection title={title} icon={CalendarCheck}>
      {children}
    </PeopleFormSection>
  );
}
export function AttendanceCategoryBadge({ category }: { category?: string }) {
  const label =
    category === "adult"
      ? "Adult"
      : category === "children"
        ? "Children"
        : category === "mixed" || category === "unspecified"
          ? "Mixed"
          : category
            ? category.replace(/_/g, " ")
            : "Mixed";
  return (
    <Badge
      variant="outline"
      className={`rounded-full text-[11px] font-medium ${category === "children" ? "border-blue-600/15 bg-blue-500/8 text-blue-700 dark:text-blue-300" : category === "adult" ? "border-violet-600/15 bg-violet-500/8 text-violet-700 dark:text-violet-300" : "border-slate-500/15 bg-slate-500/8 text-slate-600 dark:text-slate-300"}`}
    >
      {label}
    </Badge>
  );
}

/** Human labels retain every aggregate bucket, including missing demographics. */
export function attendanceBreakdown(values?: Record<string, number>) {
  const labels: Record<string, string> = {
    adult: "Adults",
    children: "Children",
    male: "Male",
    female: "Female",
    unknown: "Not supplied",
    unspecified: "Not supplied",
    null: "Not supplied",
    manual: "Manual",
    qr: "QR",
    kiosk: "Kiosk",
    roster: "Roster",
  };
  return Object.entries(values ?? {}).map(([key, value]) => ({
    label:
      labels[key] ??
      key.replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase()),
    value,
  }));
}
