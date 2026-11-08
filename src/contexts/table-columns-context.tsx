"use client";

import * as React from "react";
import type { ExportColumn } from "@/lib/export-utils";

export interface TableColumn {
  id: string;
  label: string;
  hideable: boolean;
  exportKeys?: string[];
  defaultHidden?: boolean;
}
interface ColumnState {
  columns: TableColumn[];
  hidden: string[];
}
interface ColumnContextValue {
  tables: Record<string, ColumnState>;
  register: (id: string, columns: TableColumn[]) => void;
  setHidden: (id: string, hidden: string[]) => void;
}
const ColumnContext = React.createContext<ColumnContextValue | null>(null);

export function TableColumnsProvider({ children }: { children: React.ReactNode }) {
  const [tables, setTables] = React.useState<Record<string, ColumnState>>({});
  const register = React.useCallback((id: string, columns: TableColumn[]) => {
    setTables((previous) => {
      if (JSON.stringify(previous[id]?.columns) === JSON.stringify(columns)) return previous;
      const old = previous[id];
      columns = [...columns, ...(old?.columns ?? []).filter((column) => column.defaultHidden && !columns.some((next) => next.id === column.id))];
      const hidden = [
        ...(old?.hidden ?? []).filter((key) => columns.some((column) => column.id === key && column.hideable)),
        ...columns.filter((column) => column.defaultHidden && !old?.columns.some((known) => known.id === column.id)).map((column) => column.id),
      ];
      return { ...previous, [id]: { columns, hidden: [...new Set(hidden)] } };
    });
  }, []);
  const setHidden = React.useCallback((id: string, hidden: string[]) => {
    setTables((previous) => previous[id] ? { ...previous, [id]: { ...previous[id], hidden } } : previous);
  }, []);
  const value = React.useMemo(() => ({ tables, register, setHidden }), [tables, register, setHidden]);
  return <ColumnContext.Provider value={value}>{children}</ColumnContext.Provider>;
}

export function useTableColumns(id: string, columns?: TableColumn[]) {
  const context = React.useContext(ColumnContext);
  const [localHidden, setLocalHidden] = React.useState<string[]>(() => (columns ?? []).filter((column) => column.defaultHidden).map((column) => column.id));
  const knownColumns = React.useRef(new Set((columns ?? []).map((column) => column.id)));
  const signature = JSON.stringify(columns);
  const register = context?.register;
  React.useEffect(() => {
    if (register && signature) register(id, JSON.parse(signature));
    else if (signature) {
      const next: TableColumn[] = JSON.parse(signature);
      const newlyHidden = next.filter((column) => column.defaultHidden && !knownColumns.current.has(column.id)).map((column) => column.id);
      if (newlyHidden.length) setLocalHidden((previous) => [...new Set([...previous, ...newlyHidden])]);
      knownColumns.current = new Set(next.map((column) => column.id));
    }
  }, [id, signature, register]);
  const available = columns ? [...columns, ...(context?.tables[id]?.columns ?? []).filter((column) => column.defaultHidden && !columns.some((next) => next.id === column.id))] : context?.tables[id]?.columns ?? [];
  return {
    columns: available,
    hidden: [...new Set([
      ...(context?.tables[id]?.hidden ?? localHidden),
      ...(columns ?? []).filter((column) => column.defaultHidden && !(context?.tables[id]?.columns.some((known) => known.id === column.id) ?? knownColumns.current.has(column.id))).map((column) => column.id),
    ])],
    setHidden: (hidden: string[]) => context ? context.setHidden(id, hidden) : setLocalHidden(hidden),
  };
}

/** A screen column may represent several export fields, e.g. amount + currency. */
export function selectExportColumns(columns: ExportColumn[], tableColumns: TableColumn[], hidden: string[]): ExportColumn[] {
  const normalize = (label: string) => label.toLowerCase().replace(/[^a-z0-9]/g, "");
  const visible = tableColumns.filter((column) => !hidden.includes(column.id));
  const keys = new Set(visible.flatMap((column) => column.exportKeys ?? []));
  return columns.filter((column) => keys.has(column.key) || visible.some((tableColumn) =>
    tableColumn.exportKeys === undefined && normalize(tableColumn.label) === normalize(column.label),
  ));
}

export function useVisibleExportColumns(tableId: string | undefined, columns: ExportColumn[]) {
  const context = React.useContext(ColumnContext);
  const state = tableId ? context?.tables[tableId] : undefined;
  return state ? selectExportColumns(columns, state.columns, state.hidden) : columns;
}
