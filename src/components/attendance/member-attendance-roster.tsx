"use client";

import { AttendanceSelectionBar } from "./attendance-selection-bar";
import { LoadingState } from "@/components/shared/loading-state";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AttendanceRosterTable } from "./attendance-roster-table";
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
  const [editable, setEditable] = React.useState(false);
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
  const locked = busy || disabled || !editable;
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
      setEditable(false);
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
          <AttendanceRosterTable
            rows={rows.map((member) => ({
              id: member.memberId,
              name: `${member.firstName} ${member.lastName}`,
              detail: member.phone,
            }))}
            selected={selected}
            editable={editable}
            busy={busy || disabled}
            onEdit={() => setEditable(true)}
            onCancel={() => {
              setSelected(new Set());
              setEditable(false);
            }}
            onToggle={(id) =>
              setSelected((previous) => {
                const next = new Set(previous);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              })
            }
            onSelectAll={(ids, checked) =>
              setSelected((previous) => {
                const next = new Set(previous);
                ids.forEach((id) => (checked ? next.add(id) : next.delete(id)));
                return next;
              })
            }
          />
        )}
        <AttendanceSelectionBar
          editable={editable}
          count={selected.size}
          busy={busy}
          disabled={disabled}
          onSave={save}
          onClear={() => setSelected(new Set())}
          meeting
        />
        {loadingMore && (
          <LoadingState label="Loading more members" variant="table" rows={2} />
        )}
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
