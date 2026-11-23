"use client";
import { useEffect, useRef, useState, useSyncExternalStore, type Dispatch, type SetStateAction } from "react";
import { usePathname } from "next/navigation";
type Value = string | number | boolean;
type Field = { value: Value; initial: Value; set: (value: Value) => void };
const fields = new Map<string, Map<string, Field>>();
const listeners = new Set<() => void>();
let revision = 0;
function changed() { revision++; listeners.forEach(listener => listener()); }
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
/** Explicit filter state; pagination and page-specific query scopes stay with the page. */
export function useListFilterState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const path = usePathname();
  const [value, setValue] = useState(initial);
  const first = useRef(initial);
  useEffect(() => {
    const entry: Field = { value: value as Value, initial: first.current as Value, set: next => setValue(next as T) };
    const group = fields.get(path) ?? new Map<string, Field>();
    fields.set(path, group); group.set(key, entry); changed();
    return () => { if (group.get(key) === entry) { group.delete(key); if (!group.size) fields.delete(path); changed(); } };
  }, [path, key, value]);
  return [value, setValue];
}
export function useRegisteredListFilters() {
  const path = usePathname();
  useSyncExternalStore(subscribe, () => revision, () => 0);
  const group = fields.get(path);
  return {
    available: !!group?.size,
    active: Array.from(group ?? []).filter(([key, field]) => {
      const prefix = key.includes(":") ? key.slice(0,key.lastIndexOf(":")+1) : "";
      const debouncedSearch = key === `${prefix}search` && (group?.has(`${prefix}query`) || group?.has(`${prefix}searchInput`));
      return !key.endsWith("page") && !debouncedSearch && field.value !== field.initial;
    }).length,
    snapshot: () => Object.fromEntries(Array.from(fields.get(path) ?? []).filter(([key]) => !key.endsWith("page")).map(([key, field]) => [key, field.value])),
    apply(values: Record<string, unknown>) { for (const [key, field] of fields.get(path) ?? []) { const value = values[key]; if (typeof value === typeof field.initial && (typeof value !== "number" || Number.isFinite(value))) field.set(value as Value); } for (const [key, field] of fields.get(path) ?? []) if (key.endsWith("page")) field.set(1); },
    reset() { for (const field of fields.get(path)?.values() ?? []) field.set(field.initial); },
  };
}
