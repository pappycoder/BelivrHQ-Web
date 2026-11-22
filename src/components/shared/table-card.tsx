"use client";

import { TableExportScope } from "@/contexts/table-export-scope";
import * as React from "react";
import { cn } from "@/lib/utils";
import { TablePagination } from "@/components/shared/table-pagination";

interface TableCardProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  toolbar?: React.ReactNode;
  exportAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  itemName?: string;
  page?: number;
  perPage?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
}

/** Shared section surface and pagination for native record tables. */
export function TableCard({
  title,
  description,
  action,
  toolbar,
  exportAction,
  children,
  className,
  itemName = "rows",
  page,
  perPage,
  total,
  onPageChange,
  onPerPageChange,
}: TableCardProps) {
  const paginated = typeof page === "number" && typeof onPageChange === "function";

  return (
    <section className={cn("min-w-0 space-y-4", className)}>
      {(title || description || action || exportAction) && <div className="flex flex-wrap items-end justify-between gap-3"><div className="min-w-0 space-y-1">{title && <h2 className="font-display text-lg font-semibold leading-tight">{title}</h2>}{description && <p className="text-sm text-ink-soft">{description}</p>}</div><div className="flex flex-wrap items-center gap-2">{exportAction}{action}</div></div>}
      {toolbar}
      <div data-table-card className="paper-card overflow-hidden rounded-2xl">
        <div data-table-body className="min-w-0 overflow-x-auto">
          <TableExportScope.Provider value={Boolean(exportAction)}>
            {children}
          </TableExportScope.Provider>
        </div>
        {paginated && (
          <TablePagination
            page={page}
            perPage={perPage ?? 15}
            total={total ?? 0}
            itemName={itemName}
            onPageChange={onPageChange}
            onPerPageChange={onPerPageChange}
          />
        )}
      </div>
    </section>
  );
}
