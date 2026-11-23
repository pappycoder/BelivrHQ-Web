"use client";
import { searchListRecords } from "@/lib/list-search";
import { useMemo } from "react";
import { SearchField } from "@/components/paper/primitives";
import { useListFilterState } from "@/hooks/use-list-filter-state";

/** Search a loaded register without claiming that a paginated API searched other pages. */
export function useListSearch<T>(records: readonly T[], key = "query", placeholder = "Search this page…") {
  const [query, setQuery] = useListFilterState(key, "");
  const rows = useMemo(() => searchListRecords(records,query), [records,query]);
  const searching = Boolean(query.trim());
  const clearSearch = () => setQuery("");
  return { rows, query, searching, clearSearch, loadedCount:records.length, search: <div className="min-w-0 space-y-1"><SearchField value={query} onChange={setQuery} placeholder={placeholder} />{searching && <p role="status" className="px-1 text-xs text-ink-soft">{rows.length} {rows.length === 1 ? "match" : "matches"} in {records.length} loaded {records.length === 1 ? "record" : "records"}</p>}</div> };
}
