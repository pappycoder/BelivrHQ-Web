"use client";
import * as React from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { MemberListResponse } from "@/hooks/use-members";
import { MemberAttendanceRoster } from "./member-attendance-roster";

/** The API remains responsible for branch/HQ visibility; parent branch narrows HQ rosters. */
export function ChurchAttendanceRoster({
  branchId,
  ...props
}: Pick<
  React.ComponentProps<typeof MemberAttendanceRoster>,
  "onSubmit" | "disabled" | "onBusyChange" | "controls"
> & { branchId?: string }) {
  const [search, setSearch] = React.useState("");
  const query = search.trim();
  const roster = useInfiniteQuery({
    queryKey: ["attendance-roster", branchId, query],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams({
        page: String(pageParam),
        limit: "100",
        status: "active",
      });
      if (branchId) params.set("branchId", branchId);
      if (query) params.set("search", query);
      return api.get<MemberListResponse>(`/members?${params}`, { signal });
    },
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
  });
  const members = React.useMemo(
    () => [
      ...new Map(
        roster.data?.pages
          .flatMap((page) => page.data)
          .map((member) => [member.memberId, member]) ?? [],
      ).values(),
    ],
    [roster.data],
  );
  return (
    <MemberAttendanceRoster
      {...props}
      members={members}
      onSearch={setSearch}
      loading={roster.isLoading}
      error={roster.isError}
      onRetry={() => void roster.refetch()}
      hasMore={roster.hasNextPage}
      loadingMore={roster.isFetchingNextPage}
      onLoadMore={() => void roster.fetchNextPage()}
    />
  );
}
