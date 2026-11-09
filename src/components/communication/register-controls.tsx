"use client";

import * as React from "react";
import { ArrowUpDown, LayoutGrid, Rows3 } from "lucide-react";
import { SearchField, SortDirectionToggle, ViewToggle } from "@/components/paper/primitives";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Choice = { value: string; label: string };

export function useCommunicationRegister(initialSort: string, initialAscending: boolean) {
  const [query, setQuery] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [channel, setChannel] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [branch, setBranch] = React.useState("all");
  const [sort, setSort] = React.useState(initialSort);
  const [ascending, setAscending] = React.useState(initialAscending);
  const [view, setView] = React.useState<"table" | "cards">("table");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(24);
  React.useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);
  const reset = () => { setQuery(""); setChannel("all"); setStatus("all"); setBranch("all"); setSort(initialSort); setAscending(initialAscending); setPage(1); };
  return { query, setQuery, search, channel, setChannel, status, setStatus, branch, setBranch, sort, setSort, ascending, setAscending, view, setView, page, setPage, perPage, setPerPage, reset };
}

export function CommunicationRegisterControls({ controls: c, kind, channels, statuses, sorts, branches }: {
  controls: ReturnType<typeof useCommunicationRegister>;
  kind: "Templates" | "Broadcasts";
  channels: Choice[];
  statuses: Choice[];
  sorts: Choice[];
  branches?: Choice[];
}) {
  const select = (label: string, value: string, onChange: (value: string) => void, choices: Choice[], sort = false) => (
    <Select value={value} onValueChange={value => { onChange(value); c.setPage(1); }}>
      <SelectTrigger aria-label={label} data-prefix-icon={sort ? "none" : undefined} className="h-8 w-40 rounded-full border-line bg-card text-[11px] shadow-none">
        {sort && <ArrowUpDown className="size-3" />}<SelectValue />
      </SelectTrigger>
      <SelectContent>{choices.map(choice => <SelectItem key={choice.value} value={choice.value}>{choice.label}</SelectItem>)}</SelectContent>
    </Select>
  );
  return (
    <div role="group" aria-label={`${kind} list controls`} className="flex flex-wrap items-center gap-2">
      <SearchField value={c.query} onChange={value => { c.setQuery(value); c.setPage(1); }} placeholder={kind === "Templates" ? "Search name or text…" : "Search broadcasts or templates…"} className="w-full max-w-xs" />
      <div className="ml-auto flex max-w-full flex-wrap items-center gap-2">
        {select("Channel", c.channel, c.setChannel, [{ value: "all", label: "All channels" }, ...channels])}
        {select("Status", c.status, c.setStatus, [{ value: "all", label: "Any status" }, ...statuses])}
        {branches && select("Branch", c.branch, c.setBranch, [{ value: "all", label: "All branches" }, ...branches])}
        {select(`Sort ${kind.toLowerCase()}`, c.sort, c.setSort, sorts, true)}
        <SortDirectionToggle ascending={c.ascending} onToggle={() => { c.setAscending(value => !value); c.setPage(1); }} />
        <ViewToggle value={c.view} onChange={c.setView} options={[{ value: "table", label: "List view", icon: <Rows3 /> }, { value: "cards", label: "Card view", icon: <LayoutGrid /> }]} />
        {(c.query || c.channel !== "all" || c.status !== "all" || c.branch !== "all") && <button type="button" className="text-xs text-ink-soft underline underline-offset-4" onClick={c.reset}>Clear filters</button>}
      </div>
    </div>
  );
}
