"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  RotateCcw,
  Save,
  ShieldCheck,
  X,
} from "lucide-react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { StatCard, Tag } from "@/components/paper/stat";
import { EmptyState } from "@/components/paper/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionMatrixEditor } from "@/components/roles/permission-matrix-editor";
import { ResetRoleDialog } from "@/components/roles/reset-role-dialog";
import { confirmDiscardChanges, useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useRolePermissions,
  useAllPermissions,
  useSetRolePermissions,
  useResetRoleToDefaults,
  PROTECTED_ADMIN_PERMISSIONS,
  getRoleLabel,
  type Permission,
} from "@/hooks/use-roles";

export default function RoleMatrixPage({
  params,
}: {
  params: Promise<{ roleName: string }>;
}) {
  const { roleName } = React.use(params);
  const { can, ready } = usePermissions();
  const canRead = ready && can("roles", "read");
  const canManage = ready && can("roles", "update");

  const role = useRolePermissions(roleName);
  const all = useAllPermissions();
  const setPermissions = useSetRolePermissions(roleName);
  const reset = useResetRoleToDefaults(roleName);

  const [selectedIds, setSelectedIds] = React.useState<Set<string> | null>(null);

  React.useEffect(() => {
    if (role.data && !selectedIds) {
      setSelectedIds(new Set(role.data.permissions.map((p) => p.id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role.data]);

  const grantedIds = React.useMemo(
    () => new Set((role.data?.permissions ?? []).map((p) => p.id)),
    [role.data],
  );
  const isOwned = !!role.data?.isChurchOwned;
  const locked = roleName === "super_admin";
  const blockedFromRemovalIds = React.useMemo(() => {
    if (roleName !== "church_admin") return undefined;
    const names = new Set(PROTECTED_ADMIN_PERMISSIONS);
    return new Set((all.data ?? []).filter((p) => names.has(p.name)).map((p) => p.id));
  }, [all.data, roleName]);

  const current = selectedIds ?? new Set<string>();
  const addedCount = [...current].filter((id) => !grantedIds.has(id)).length;
  const removedCount = [...grantedIds].filter((id) => !current.has(id)).length;
  const isDirty = addedCount > 0 || removedCount > 0;
  useUnsavedChanges(isDirty);

  const handleToggle = (permission: Permission, next: boolean) => {
    if (!canManage) {
      toast("Your role can view the matrix, but only roles:update can change it.");
      return;
    }
    if (locked) {
      toast("The platform admin role is locked.");
      return;
    }
    // Templates are additive-only: global defaults cannot be revoked here.
    if (!next && !isOwned && grantedIds.has(permission.id)) {
      toast(`${permission.name} comes from the global role defaults; custom roles can change it.`);
      return;
    }
    if (!next && blockedFromRemovalIds?.has(permission.id)) {
      toast("A church admin must keep this permission to retain access to the console.");
      return;
    }
    setSelectedIds((prev) => {
      const set = new Set(prev ?? grantedIds);
      if (next) set.add(permission.id);
      else set.delete(permission.id);
      return set;
    });
  };

  const save = () => {
    setPermissions.mutate([...current], {
      onSuccess: (updated) => {
        setSelectedIds(new Set(updated.permissions.map((p) => p.id)));
        toast.success(`Permissions saved for ${getRoleLabel(roleName)}.`);
      },
      onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't save the permissions.")),
    });
  };

  const cancel = () => {
    if (confirmDiscardChanges()) setSelectedIds(new Set(grantedIds));
  };

  if (!canRead) {
    return (
      <EmptyState
        title="Roles need the roles grant"
        description="Your role cannot read or change permission sets."
        action={<Button asChild variant="outline" size="sm" className="rounded-full border-line text-xs"><Link href="/admin/permissions">Back to roles</Link></Button>}
      />
    );
  }

  if (role.isLoading || !selectedIds) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (role.isError || !role.data) {
    return (
      <EmptyState
        icon={<ShieldCheck />}
        title="We couldn&apos;t open that role"
        description="It may have been removed, or the link is old."
        action={<Button asChild variant="outline" size="sm" className="rounded-full border-line text-xs"><Link href="/admin/permissions">Back to roles</Link></Button>}
      />
    );
  }

  const label = role.data.label || getRoleLabel(roleName);

  return (
    <div className="space-y-6 pb-24">
      <div>
        <Link href="/admin/permissions" className="inline-flex items-center gap-1.5 text-[11px] text-ink-faint hover:text-ink">
          <ArrowLeft className="size-3" /> Admin · Roles
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="font-display text-[clamp(1.5rem,2.6vw,2.1rem)] font-semibold tracking-tight">{label}</h1>
          {locked ? <Tag tone="neutral">Locked</Tag> : null}
          {isOwned ? <Tag tone="sky">Custom</Tag> : role.data.isCustomized ? <Tag tone="gold">Customized</Tag> : <Tag tone="moss">Default</Tag>}
        </div>
        <p className="mt-1 text-xs text-ink-soft">{role.data.description || "No description."}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Permissions granted" value={role.data.permissions.length} tone="brand" icon={<ShieldCheck className="size-4" />} />
        <StatCard label="Available surfaces" value={all.data?.length ?? 0} tone="moss" />
        <StatCard label="Added this session" value={addedCount} tone="gold" deltaLabel={isDirty ? "not yet saved" : "Not available"} />
        <StatCard label="Removed this session" value={removedCount} tone="rose" deltaLabel={isDirty ? "not yet saved" : "Not available"} />
      </div>

      <div className="paper-card rounded-2xl p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="rule-label">Permission matrix</p>
          <p className="text-[10px] text-ink-faint">
            {locked
              ? "The platform admin holds everything. This view is read-only."
              : !canManage
                ? "Your role can read the matrix. Changing it needs the roles update grant."
              : isOwned
                ? "This role owns its own set. Unticks revoke immediately on save."
                : "Additions save for this church; global defaults cannot be revoked."}
          </p>
        </div>
        <PermissionMatrixEditor
          allPermissions={all.data ?? []}
          grantedIds={grantedIds}
          selectedIds={current}
          locked={locked || !canManage}
          blockedFromRemovalIds={blockedFromRemovalIds}
          onToggle={handleToggle}
        />
      </div>

      {canManage && !locked && role.data.isCustomized && !isDirty ? (
        <div className="paper-card flex flex-wrap items-center justify-between gap-3 rounded-2xl p-5">
          <div>
            <p className="text-xs font-semibold">Reset to the global defaults?</p>
            <p className="text-[10px] text-ink-faint">Deletes this church&apos;s overrides and returns the role returns to the template.</p>
          </div>
          <ResetInline onConfirmed={() => undefined} reset={reset} roleName={roleName} />
        </div>
      ) : null}

      {isDirty && !locked ? (
        <div className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-card px-5 py-3 shadow-[0_24px_64px_-24px_rgb(38_32_26_/_0.38)]">
          <p className="text-xs">
            <span className="num font-semibold text-moss">+{addedCount}</span>
            <span className="text-ink-faint"> · </span>
            <span className="num font-semibold text-rose">−{removedCount}</span>
            <span className="ml-2 text-ink-faint">unsaved</span>
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="h-8 gap-1.5 rounded-full text-xs" onClick={cancel}>
              <X className="size-3" /> Discard
            </Button>
            <Button size="sm" className="h-8 gap-1.5 rounded-full text-xs" disabled={setPermissions.isPending} onClick={save}>
              {setPermissions.isPending ? <Save className="size-3 animate-pulse" /> : <Check className="size-3" />} Save permissions
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ResetInline({ reset, roleName }: { reset: ReturnType<typeof useResetRoleToDefaults>; roleName: string; onConfirmed: () => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-full border-line text-xs" onClick={() => setOpen(true)}>
        <RotateCcw className="size-3" /> Reset to defaults
      </Button>
      <ResetRoleDialog
        open={open}
        onOpenChange={setOpen}
        roleName={roleName}
        isPending={reset.isPending}
        onConfirm={() =>
          reset.mutate(undefined, {
            onSuccess: () => {
              toast.success("Role restored to the global template.");
              setOpen(false);
            },
            onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't reset the role.")),
          })
        }
      />
    </>
  );
}
