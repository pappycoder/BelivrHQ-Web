"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useCurrentProfile } from "@/hooks/use-profile";
import { useBranchesList } from "@/hooks/use-branches";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AssignedRecord {
  branchId?: string;
  branchName?: string;
}

/** Unchanged assigned edits omit branchId, preserving archived assignments. */
export function useBranchAssignment(
  record?: AssignedRecord | null,
  enabled = true,
) {
  const { data: profile } = useCurrentProfile();
  const isHq = !!profile?.isAdminHq;
  const branches = useBranchesList(
    { limit: 200 },
    { enabled: enabled && isHq },
  );
  const options = useMemo(
    () => (branches.data?.data ?? []).filter((branch) => !branch.archivedAt),
    [branches.data],
  );
  const [value, setValue] = useState(record?.branchId ?? "");
  const [error, setError] = useState("");
  useEffect(() => {
    if (enabled) {
      setValue(record?.branchId ?? "");
      setError("");
    }
  }, [record, enabled]);
  useEffect(() => {
    if (!record && enabled && !value) {
      const defaultBranch =
        profile?.branchId ?? (options.length === 1 ? options[0].branchId : "");
      if (defaultBranch) setValue(defaultBranch);
    }
  }, [record, enabled, value, profile?.branchId, options]);
  const payload = (): { branchId?: string } | null => {
    if (!profile) {
      setError("Your profile is still loading.");
      return null;
    }
    if (record?.branchId && (!isHq || value === record.branchId)) return {};
    const selected = isHq ? value : profile.branchId;
    if (
      !selected ||
      (isHq && !options.some((branch) => branch.branchId === selected))
    ) {
      setError(
        isHq
          ? "Select an available branch."
          : "A branch assignment is required. Contact your church administrator.",
      );
      return null;
    }
    setError("");
    return { branchId: selected };
  };
  return {
    value,
    setValue,
    error,
    setError,
    payload,
    record,
    profile,
    isHq,
    branches,
    options,
  };
}

export function BranchAssignmentField({
  assignment,
  disabled = false,
}: {
  assignment: ReturnType<typeof useBranchAssignment>;
  disabled?: boolean;
}) {
  const id = useId();
  const {
    record,
    value,
    setValue,
    profile,
    isHq,
    branches,
    options,
    error,
    setError,
  } = assignment;
  return (
    <div className="space-y-2">
      <Label htmlFor={id} required>Branch</Label>
      {isHq ? (
        <Select
          value={value}
          onValueChange={(next) => {
            if (next) {
              setValue(next);
              setError("");
            }
          }}
          disabled={disabled || branches.isLoading}
        >
          <SelectTrigger id={id} className="w-full" aria-required="true" aria-invalid={!!error}>
            <SelectValue
              placeholder="Select a branch"
            />
          </SelectTrigger>
          <SelectContent>
            {record?.branchId &&
              !options.some(
                (branch) => branch.branchId === record.branchId,
              ) && (
                <SelectItem value={record.branchId} disabled>
                  {record.branchName ?? "Current branch"}
                </SelectItem>
              )}
            {options.map((branch) => (
              <SelectItem key={branch.branchId} value={branch.branchId}>
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          id={id}
          readOnly
          value={
            record
              ? (record.branchName ??
                (record.branchId
                  ? (profile?.branch?.name ?? "Your branch")
                  : "Church-wide"))
              : (profile?.branch?.name ?? "Your assigned branch")
          }
        />
      )}
      {isHq && branches.isError && (
        <p role="alert" className="text-sm text-destructive">
          Could not load branches.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => void branches.refetch()}
          >
            Retry
          </button>
        </p>
      )}
      {isHq && branches.isSuccess && !options.length && (
        <p className="text-sm text-muted-foreground">
          No active branches available.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function BranchDetail({ record }: { record: AssignedRecord }) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">Branch</p>
      <p className="text-sm font-medium">
        {record.branchName ??
          (record.branchId ? "Branch unavailable" : "Church-wide")}
      </p>
    </div>
  );
}
