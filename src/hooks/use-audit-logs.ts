"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "EXPORT"
  | "ARCHIVE"
  | "RESTORE";

export interface AuditLogItem {
  id: string;
  action: AuditAction;
  /** Affected entity in snake_case, e.g. "member", "giving_category". */
  entity: string;
  entityId?: string;
  ipAddress?: string;
  createdAt: string;
  /** Friendly name resolved from the record's new-values snapshot, if any. */
  entityLabel?: string;
}

export interface AuditLogListResponse {
  data: AuditLogItem[];
  total: number;
}

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: "Created",
  UPDATE: "Updated",
  DELETE: "Deleted",
  LOGIN: "Signed in",
  LOGOUT: "Signed out",
  EXPORT: "Exported",
  ARCHIVE: "Archived",
  RESTORE: "Restored",
};

/**
 * Converts a snake_case entity name into a readable label, e.g.
 * "giving_category" → "Giving Category".
 */
export function humanizeAuditEntity(entity: string): string {
  return entity
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Builds a friendly summary line for an audit entry, e.g.
 * "Created Member — John Doe" (label appended when present).
 */
export function auditEntryLabel(item: AuditLogItem): string {
  const action = AUDIT_ACTION_LABELS[item.action] ?? item.action;
  const noun = humanizeAuditEntity(item.entity);
  return item.entityLabel ? `${action} ${noun}: ${item.entityLabel}` : `${action} ${noun}`;
}

// ─── Query ───────────────────────────────────────────────

/** The current user's own most-recent audit entries (newest first). */
export function useMyAuditLogs(params: { limit?: number } = {}) {
  const limit = params.limit ?? 8;
  return useQuery({
    queryKey: ["audit-my", limit],
    queryFn: ({ signal }) => api.get<AuditLogListResponse>(`/audit?limit=${limit}`, { signal }),
    staleTime: 60 * 1000,
  });
}
