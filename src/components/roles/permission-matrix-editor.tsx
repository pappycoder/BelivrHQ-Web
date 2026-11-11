"use client";

import * as React from "react";
import { Check, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  PERMISSION_ACTIONS,
  getResourceLabel,
  type Permission,
} from "@/hooks/use-roles";

interface PermissionMatrixEditorProps {
  /** Every available permission — defines the full grid. */
  allPermissions: Permission[];
  /** Currently effective permission IDs on the server. */
  grantedIds: Set<string>;
  /** Dirty selection being edited. */
  selectedIds: Set<string>;
  locked?: boolean;
  /** Permission IDs that cannot be unchecked (e.g. protected church_admin grants). */
  blockedFromRemovalIds?: Set<string>;
  onToggle?: (permission: Permission, next: boolean) => void;
}

export function PermissionMatrixEditor({
  allPermissions,
  grantedIds,
  selectedIds,
  locked = false,
  blockedFromRemovalIds,
  onToggle,
}: PermissionMatrixEditorProps) {
  const [search, setSearch] = React.useState("");
  const { resources, actionsByResource } = React.useMemo(() => {
    const byResource = new Map<string, Map<string, Permission>>();
    for (const perm of allPermissions) {
      if (!byResource.has(perm.resource)) {
        byResource.set(perm.resource, new Map());
      }
      byResource.get(perm.resource)!.set(perm.action, perm);
    }
    return {
      resources: [...byResource.keys()].sort(),
      actionsByResource: byResource,
    };
  }, [allPermissions]);

  const filtered = resources.filter((resource) =>
    `${resource} ${getResourceLabel(resource)}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );
  const half = Math.ceil(filtered.length / 2);
  const columns = [filtered.slice(0, half), filtered.slice(half)];

  const renderCell = (perm: Permission | undefined) => {
    if (!perm) {
      return (
        <span className="w-14 flex justify-center">
          <Minus className="h-3.5 w-3.5 text-muted-foreground/30" />
        </span>
      );
    }

    const isSelected = selectedIds.has(perm.id);
    const isBlocked =
      !locked && isSelected && blockedFromRemovalIds?.has(perm.id) === true;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="w-14 flex justify-center">
            <Checkbox
              checked={isSelected}
              disabled={locked || isBlocked}
              onCheckedChange={(checked) => onToggle?.(perm, checked === true)}
              aria-label={perm.name}
              className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
            />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{perm.name}</p>
          <p className="text-muted-foreground">
            {grantedIds.has(perm.id) ? "Granted" : "Not granted"}
            {isBlocked ? " (inherited default or protected grant)" : ""}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  };

  const renderColumn = (resourceList: string[], key: number) => (
    <div key={key} className="overflow-x-auto rounded-lg border">
      <div className="flex items-center border-b bg-muted/50 px-3 py-2 rounded-t-lg">
        <span className="flex-1 text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Resource
        </span>
        {PERMISSION_ACTIONS.map((action) => (
          <span
            key={action}
            className="w-14 text-center text-sm font-medium text-muted-foreground capitalize"
          >
            {action}
          </span>
        ))}
      </div>
      <div className="px-3 py-1">
        {resourceList.map((resource) => {
          const actions = actionsByResource.get(resource)!;
          return (
            <div
              key={resource}
              className="flex items-center py-1 px-1 -mx-1 rounded hover:bg-muted/40"
            >
              <span className="min-w-24 flex-1 break-words text-sm capitalize">
                {getResourceLabel(resource)}
              </span>
              {PERMISSION_ACTIONS.map((action) => (
                <React.Fragment key={action}>
                  {renderCell(actions.get(action))}
                </React.Fragment>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );

  if (resources.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border py-10 text-sm text-muted-foreground">
        <Check className="h-4 w-4" />
        No permissions defined yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Input
        aria-label="Search permission resources"
        placeholder="Find a permission resource…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {!filtered.length && (
        <p className="text-sm text-muted-foreground">
          No resources match this search.
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {columns.map(renderColumn)}
      </div>
    </div>
  );
}
