"use client";

import * as React from "react";
import { ArrowUpDown, LayoutGrid, Rows3 } from "lucide-react";
import {
  FilterChip,
  SearchField,
  SortDirectionToggle,
  ViewToggle,
} from "@/components/paper/primitives";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  filterGroupRegister,
  type GroupRegisterRecord,
  type GroupSort,
} from "@/lib/group-register";

export function useGroupRegister<T extends GroupRegisterRecord>(records: T[]) {
  const [search, setSearch] = React.useState("");
  const [branch, setBranch] = React.useState("all");
  const [leadership, setLeadership] = React.useState("all");
  const [day, setDay] = React.useState("all");
  const [sort, setSort] = React.useState<GroupSort>("name");
  const [ascending, setAscending] = React.useState(true);
  const [view, setView] = React.useState<"cards" | "table">("table");
  const rows = React.useMemo(
    () =>
      filterGroupRegister(records, {
        search,
        branch,
        leadership,
        day,
        sort,
        ascending,
      }),
    [records, search, branch, leadership, day, sort, ascending],
  );
  const branches = Array.from(
    new Map(
      records.map((record) => [
        record.branchId || "unassigned",
        {
          value: record.branchId || "unassigned",
          label: record.branchName || "Unassigned",
        },
      ]),
    ).values(),
  ).sort((a, b) => a.label.localeCompare(b.label));
  return {
    search,
    setSearch,
    branch,
    setBranch,
    leadership,
    setLeadership,
    day,
    setDay,
    sort,
    setSort,
    ascending,
    setAscending,
    view,
    setView,
    rows,
    branches,
  };
}

export function GroupRegisterControls({
  controls: c,
  kind,
  hq,
  archived,
  onArchivedChange,
  onResetPage,
}: {
  controls: ReturnType<typeof useGroupRegister>;
  kind: "department" | "cell group";
  hq: boolean;
  archived: boolean;
  onArchivedChange: (value: boolean) => void;
  onResetPage: () => void;
}) {
  const select = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    options: { value: string; label: string }[],
    sort = false,
  ) => (
    <Select
      value={value}
      onValueChange={(value) => {
        onChange(value);
        onResetPage();
      }}
    >
      <SelectTrigger
        aria-label={label}
        data-prefix-icon={sort ? "none" : undefined}
        className="h-9 w-44 rounded-full border-line bg-card text-sm shadow-none"
      >
        {sort && <ArrowUpDown className="size-3" />}
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
  return (
    <div
      role="group"
      aria-label={`${kind === "department" ? "Department" : "Cell group"} list filters`}
      className="flex flex-wrap items-center gap-2"
    >
      <SearchField
        value={c.search}
        onChange={(value) => {
          c.setSearch(value);
          onResetPage();
        }}
        placeholder={
          kind === "department" ? "Search departments…" : "Search cell groups…"
        }
        className="w-full max-w-xs"
      />
      <div className="ml-auto flex max-w-full flex-wrap items-center gap-2">
        <FilterChip
          active={archived}
          onClick={() => {
            onArchivedChange(!archived);
            onResetPage();
          }}
        >
          Archived
        </FilterChip>
        {hq &&
          select("Branch", c.branch, c.setBranch, [
            { value: "all", label: "All branches" },
            ...c.branches,
          ])}
        {select("Leadership", c.leadership, c.setLeadership, [
          { value: "all", label: "All leadership" },
          {
            value: "assigned",
            label: kind === "department" ? "Head assigned" : "Leader assigned",
          },
          {
            value: "unassigned",
            label: kind === "department" ? "Needs a head" : "Needs a leader",
          },
        ])}
        {kind === "cell group" &&
          select("Meeting day", c.day, c.setDay, [
            { value: "all", label: "Any meeting day" },
            ...[
              "Sunday",
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ].map((day) => ({ value: day, label: day })),
          ])}
        {select(
          "Sort groups",
          c.sort,
          (value) => c.setSort(value as GroupSort),
          [
            { value: "name", label: "Name" },
            { value: "createdAt", label: "Date added" },
            { value: "leadership", label: "Leadership" },
          ],
          true,
        )}
        <SortDirectionToggle
          ascending={c.ascending}
          onToggle={() => {
            c.setAscending((value) => !value);
            onResetPage();
          }}
        />
        <ViewToggle
          value={c.view}
          onChange={c.setView}
          options={[
            { value: "table", label: "List view", icon: <Rows3 /> },
            { value: "cards", label: "Card view", icon: <LayoutGrid /> },
          ]}
        />
        {(c.search ||
          c.branch !== "all" ||
          c.leadership !== "all" ||
          c.day !== "all" ||
          archived) && (
          <button
            className="text-sm text-ink-soft underline underline-offset-4"
            onClick={() => {
              c.setSearch("");
              c.setBranch("all");
              c.setLeadership("all");
              c.setDay("all");
              onArchivedChange(false);
              onResetPage();
            }}
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
