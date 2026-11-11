"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const PAGE_SIZE_OPTIONS = [10, 15, 25, 50];

interface TablePaginationProps {
  page: number;
  perPage: number;
  total: number;
  /** Plural noun for the count line, e.g. "members". */
  itemName?: string;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  /** Optional sizes for collections with a different initial page size. */
  pageSizeOptions?: readonly number[];
}

export function TablePagination({
  page,
  perPage,
  total,
  itemName = "rows",
  onPageChange,
  onPerPageChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
}: TablePaginationProps) {
  if (total <= 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/70 pt-4 mt-4">
      <p aria-live="polite" className="text-sm text-muted-foreground">
        Showing {from}–{to} of {total} {itemName}
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {onPerPageChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Rows per page
            </span>
            <Select
              value={String(perPage)}
              onValueChange={(v) => onPerPageChange(Number(v))}
            >
              <SelectTrigger
                className="h-8 w-[70px]"
                aria-label="Rows per page"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
