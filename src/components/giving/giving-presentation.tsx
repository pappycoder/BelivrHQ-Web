"use client";
import * as React from "react";
import { HandCoins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  PeopleWorkspace,
  PeopleHeader,
  PeopleMoreFilters,
  PeopleFormSection,
  peopleWorkspaceClass,
} from "@/components/members/people-presentation";
export const GivingWorkspace = PeopleWorkspace;
export const GivingHeader = PeopleHeader;
export const GivingMoreFilters = PeopleMoreFilters;
export const givingWorkspaceClass = peopleWorkspaceClass;
export const givingCurrencies = [
  "NGN",
  "USD",
  "GBP",
  "EUR",
  "GHS",
  "KES",
  "ZAR",
  "CAD",
  "AUD",
];
export const givingMoney = (currency: string, value: number) =>
  `${currency} ${value.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export function GivingFormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <PeopleFormSection title={title} icon={HandCoins}>
      {children}
    </PeopleFormSection>
  );
}
const statusColors: Record<string, string> = {
  success:
    "border-emerald-600/15 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300",
  active:
    "border-emerald-600/15 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300",
  pending:
    "border-amber-600/15 bg-amber-500/8 text-amber-700 dark:text-amber-300",
  failed: "border-red-600/15 bg-red-500/8 text-red-700 dark:text-red-300",
  reversed:
    "border-violet-600/15 bg-violet-500/8 text-violet-700 dark:text-violet-300",
  inactive:
    "border-slate-500/15 bg-slate-500/8 text-slate-600 dark:text-slate-300",
};
export function GivingStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={`rounded-full text-sm font-medium capitalize ${statusColors[status] ?? statusColors.inactive}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
