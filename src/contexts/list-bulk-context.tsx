"use client";

import { createContext, useContext, useEffect, useRef } from "react";

export interface BulkManageAction {
  key: string;
  label: string;
  run: (input?: { reason?: string }) => Promise<unknown> | unknown;
  requiresReason?: boolean;
  destructive?: boolean;
  description?: string;
}
export interface BulkRowAction {
  label: string;
  disabled?: boolean;
  bulk?: BulkManageAction;
}
export interface BulkRowRegistration {
  name: string;
  actions: () => BulkRowAction[];
}
export const BulkRegistryContext = createContext<{
  register: (id: string, row: BulkRowRegistration) => () => void;
} | null>(null);
export const BulkRowContext = createContext<{
  id: string;
  name: string;
} | null>(null);

/** Keep live mutation closures without re-registering rows on every render. */
export function useBulkRowActions(actions: BulkRowAction[]) {
  const registry = useContext(BulkRegistryContext);
  const row = useContext(BulkRowContext);
  const latest = useRef(actions);
  latest.current = actions;
  const signature = JSON.stringify(
    actions.map(({ label, disabled, bulk }) => ({
      label,
      disabled,
      bulk: bulk && {
        key: bulk.key,
        label: bulk.label,
        destructive: bulk.destructive,
        description: bulk.description,
        requiresReason: bulk.requiresReason,
      },
    })),
  );
  const register = registry?.register;
  const id = row?.id;
  const name = row?.name;
  useEffect(() => {
    if (!register || id === undefined || name === undefined) return;
    return register(id, { name, actions: () => latest.current });
  }, [register, id, name, signature]); // Row identity and action availability are the registration contract.
}
