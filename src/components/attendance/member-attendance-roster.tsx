"use client";

import { LoadingState } from "@/components/shared/loading-state";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { getToastErrorMessage, toast } from "@/lib/toast";

export interface RosterMember {
  memberId: string;
  firstName: string;
  lastName: string;
  phone?: string;
}
export function MemberAttendanceRoster({
  members,
  onSubmit,
  controls,
  disabled,
  loading,
  error,
  onRetry,
  onSearch,
  hasMore,
  onLoadMore,
  loadingMore,
  onBusyChange,
}: {
  members: RosterMember[];
  onSubmit: (ids: string[]) => Promise<{ recorded: number; skipped?: number }>;
  controls?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  onSearch?: (value: string) => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);
  const rows = React.useMemo(
    () =>
      onSearch
        ? members
        : members.filter((member) =>
            `${member.firstName} ${member.lastName} ${member.phone ?? ""}`
              .toLowerCase()
              .includes(search.trim().toLowerCase()),
          ),
    [members, search, onSearch],
  );
  const locked = busy || disabled;
  async function save() {
    if (locked || !selected.size) return;
    setBusy(true);
    onBusyChange?.(true);
    let recorded = 0,
      skipped = 0;
    try {
      const ids = [...selected];
      for (let start = 0; start < ids.length; start += 200) {
        const batch = ids.slice(start, start + 200);
        const result = await onSubmit(batch);
        recorded += result.recorded;
        skipped += result.skipped ?? 0;
        // Keep failed/unsubmitted selections available for retry after a partial failure.
        setSelected(
          (previous) =>
            new Set([...previous].filter((id) => !batch.includes(id))),
        );
      }
      toast.success(`${recorded} attendance records saved`, {
        description: skipped
          ? `${skipped} already recorded and skipped.`
          : undefined,
      });
    } catch (error) {
      toast.error("Attendance could not be completed", {
        description: `${recorded} saved. Remaining members stay selected. ${getToastErrorMessage(error, "Please retry.")}`,
      });
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }
  return (
    <Card aria-label="Attendance roster">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Roster</CardTitle>
            <CardDescription>
              Select members and record their attendance together.
            </CardDescription>
          </div>

        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {controls}
        <Input
          aria-label="Search roster"
          placeholder="Search members..."
          value={search}
          disabled={busy}
          onChange={(event) => {
            setSearch(event.target.value);
            onSearch?.(event.target.value);
          }}
        />
        <div
          className="flex flex-wrap items-center justify-between gap-2"
          data-export-ignore
        >
          <span className="text-sm">{selected.size} selected</span>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy || loading || error || !rows.length}
              onClick={() =>
                setSelected(
                  (previous) =>
                    new Set([
                      ...previous,
                      ...rows.map((member) => member.memberId),
                    ]),
                )
              }
            >
              Select visible
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy || !selected.size}
              onClick={() => setSelected(new Set())}
            >
              Clear selection
            </Button>
            <Button
              type="button"
              disabled={locked || !selected.size}
              onClick={save}
            >
              {busy ? "Recording..." : `Mark attendance (${selected.size})`}
            </Button>
          </div>
        </div>
        {error ? (
          <div role="alert">
            Unable to load the roster.{" "}
            <Button type="button" variant="outline" onClick={onRetry}>
              Retry
            </Button>
          </div>
        ) : loading ? (
          <LoadingState label="Loading roster" variant="table" />
        ) : (
          <div
            data-export-list
            className="max-h-[52vh] overflow-y-auto rounded-md border divide-y"
          >
            {rows.length ? (
              rows.map((member) => (
                <label
                  key={member.memberId}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40"
                >
                  <Checkbox
                    aria-label={`Select ${member.firstName} ${member.lastName}`}
                    checked={selected.has(member.memberId)}
                    disabled={busy}
                    onCheckedChange={(checked) =>
                      setSelected((previous) => {
                        const next = new Set(previous);
                        if (checked === true) next.add(member.memberId);
                        else next.delete(member.memberId);
                        return next;
                      })
                    }
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {member.firstName} {member.lastName}
                    </span>
                    {member.phone && (
                      <span className="block text-xs text-muted-foreground">
                        {member.phone}
                      </span>
                    )}
                  </span>
                </label>
              ))
            ) : (
              <p className="p-6 text-sm text-muted-foreground">
                No members match your search.
              </p>
            )}
          </div>
        )}
        {loadingMore && <LoadingState label="Loading more members" variant="table" rows={2} />}
        {hasMore && (
          <Button
            type="button"
            variant="outline"
            disabled={busy || loadingMore}
            onClick={onLoadMore}
          >
            Load more members
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
