"use client";

import { Button } from "@/components/ui/button";
import { collectionLabel } from "@/lib/collection-label";
import { cn } from "@/lib/utils";

export function ListPaginationFooter({
  page,
  perPage,
  total,
  onPageChange,
  onPerPageChange,
  perPageOptions = [10, 15, 25, 50],
  itemName = "items",
  itemNameSingular,
  pending = false,
  visibleMatches,
}: {
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  perPageOptions?: number[];
  itemName?: string;
  itemNameSingular?: string;
  pending?: boolean;
  /** Match count within the loaded server page; paging continues through the original result set. */
  visibleMatches?: number;
}) {
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, perPage)));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);
  return (
    <div
      className={cn(
        "col-span-full flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line px-5 py-2.5 text-sm text-ink-faint",
        pending && "opacity-60",
      )}
      aria-label="Pagination"
    >
      {visibleMatches !== undefined ? <span><strong className="text-ink">{visibleMatches}</strong> {visibleMatches === 1 ? "match" : "matches"} on this page · {total.toLocaleString()} {collectionLabel(total,itemName,itemNameSingular)} across all pages</span> : <span>
        Showing{" "}
        <span className="num font-medium text-ink">
          {from}–{to}
        </span>{" "}
        of{" "}
        <span className="num font-medium text-ink">
          {total.toLocaleString()}
        </span>{" "}
        {collectionLabel(total, itemName, itemNameSingular)}
      </span>}
      <div className="flex flex-wrap items-center gap-3">
        {onPerPageChange ? (
          <label className="flex items-center gap-1.5 whitespace-nowrap">
            <span>Rows per page</span>
            <select
              value={perPage}
              onChange={(event) => {
                onPerPageChange(Number(event.target.value));
                onPageChange(1);
              }}
              className="h-7 rounded-full border border-line bg-card px-2 text-sm outline-none"
              aria-label="Rows per page"
            >
              {perPageOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="xs"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="rounded-full border-line bg-card"
          >
            Prev
          </Button>
          <span className="num whitespace-nowrap">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="xs"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="rounded-full border-line bg-card"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
