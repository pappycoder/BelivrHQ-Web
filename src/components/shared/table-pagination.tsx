"use client";

import { ListPaginationFooter } from "./list-pagination";

/** Compatibility adapter: every register shares the same pagination contract. */
export function TablePagination({ pageSizeOptions, ...props }: {
  page: number;
  perPage: number;
  total: number;
  itemName?: string;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  pageSizeOptions?: readonly number[];
}) {
  return <ListPaginationFooter {...props} perPageOptions={pageSizeOptions ? [...pageSizeOptions] : undefined} />;
}
