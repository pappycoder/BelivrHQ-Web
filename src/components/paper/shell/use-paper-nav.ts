"use client";

import * as React from "react";
import { filterPermissionNavigation } from "@/lib/permission-navigation";
import { PAPER_AREAS, type PaperArea } from "@/lib/paper-nav";
import { usePermissions } from "@/hooks/use-permissions";

/**
 * Permission-filtered Paper navigation. `usePermissions` already prunes the
 * plan-blocked permission codes (fail-closed), so path-level plan checks are
 * redundant for permission-bearing leaves; shared pages (home, notifications)
 * follow the same rule as the old sidebar's "/home" entry.
 */
export function usePaperNav() {
  const { canAny, ready } = usePermissions();

  const areas = React.useMemo(() => {
    return filterPermissionNavigation(PAPER_AREAS, (name) => canAny(name), () => true);
  }, [canAny]);

  const liveAreas = React.useMemo(() => {
    const prune = (list: PaperArea[]): PaperArea[] =>
      list
        .map((area) => ({
          ...area,
          children: area.children
            .map((module) => ({
              ...module,
              children: module.children.filter((leaf) => leaf.live),
            }))
            .filter((module) => module.children.length),
        }))
        .filter((area) => area.children.length);
    return prune(areas);
  }, [areas]);

  return { areas: liveAreas, ready };
}
