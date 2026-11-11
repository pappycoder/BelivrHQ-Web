"use client";

import * as React from "react";
import { WorkspaceAvatar } from "@/components/workspace/workspace-presentation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pencil,
  Trash2,
  ShieldCheck,
  ShieldOff,
  MoreVertical,
  KeyRound,
  LogOut,
} from "lucide-react";
import type { UserProfile } from "@/hooks/use-users";
import { useRoleLabelMap, resolveRoleLabel } from "@/hooks/use-roles";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { format } from "date-fns";

function getRoleBadgeVariant(
  role: string,
): "default" | "secondary" | "outline" {
  switch (role) {
    case "super_admin":
    case "senior_pastor":
      return "default";
    case "church_admin":
      return "secondary";
    default:
      return "outline";
  }
}

export function UserCheckboxCell({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={(v) => onCheckedChange(!!v)}
      aria-label="Select row"
    />
  );
}

interface UserActionsCellProps {
  user: UserProfile;
  onEditRole: (user: UserProfile) => void;
  onDelete: (user: UserProfile) => void;
  onDeactivate: (user: UserProfile) => void;
  onReactivate: (user: UserProfile) => void;
  onResetPassword: (user: UserProfile) => void;
  onForceSignout: (user: UserProfile) => void;
}

export function UserActionsCell({
  user,
  onEditRole,
  onDeactivate,
  onDelete,
  onReactivate,
  onResetPassword,
  onForceSignout,
}: UserActionsCellProps) {
  const { can } = usePermissions();
  const { user: currentUser } = useAuth();
  const canDelete =
    can("profiles", "delete") &&
    user.userId !== currentUser?.userId &&
    !user.role.includes("super_admin");
  const canUpdate = can("profiles", "update");
  const canEditRole = can("roles", "update");
  const canToggleStatus = canUpdate;
  const canResetPassword = canUpdate;
  const canForceSignout = canUpdate;

  // Nothing actionable for this viewer — render an empty cell.
  if (
    !canDelete &&
    !canEditRole &&
    !canToggleStatus &&
    !canResetPassword &&
    !canForceSignout
  ) {
    return <div className="flex items-center justify-end" />;
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {canEditRole && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onEditRole(user)}
          title="Edit Role"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      {canToggleStatus &&
        (user.status === "active" ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDeactivate(user)}
            title="Deactivate"
          >
            <ShieldOff className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-green-600 hover:text-green-700"
            onClick={() => onReactivate(user)}
            title="Activate"
          >
            <ShieldCheck className="h-4 w-4" />
          </Button>
        ))}
      {(canDelete || canResetPassword || canForceSignout) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">More actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canResetPassword && (
              <DropdownMenuItem onClick={() => onResetPassword(user)}>
                <KeyRound className="mr-2 h-4 w-4" />
                Reset Password
              </DropdownMenuItem>
            )}
            {canResetPassword && canForceSignout && <DropdownMenuSeparator />}
            {canForceSignout && (
              <DropdownMenuItem onClick={() => onForceSignout(user)}>
                <LogOut className="mr-2 h-4 w-4" />
                Force Sign Out
              </DropdownMenuItem>
            )}
            {canDelete && (
              <>
                {(canResetPassword || canForceSignout) && (
                  <DropdownMenuSeparator />
                )}
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(user)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete User
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

export function UserNameCell({ user }: { user: UserProfile }) {
  return (
    <div className="flex items-center gap-3">
      <WorkspaceAvatar
        id={user.profileId}
        name={`${user.firstName} ${user.lastName}`}
        photoUrl={user.avatarUrl}
        className="size-8"
      />
      <div>
        <p className="font-medium">{`${user.firstName} ${user.lastName}`}</p>
        {user.email && (
          <p className="text-sm text-muted-foreground">{user.email}</p>
        )}
      </div>
    </div>
  );
}

export function UserRoleCell({ roles }: { roles: string[] }) {
  const labels = useRoleLabelMap();
  const roleList = roles?.length ? roles : ["No role assigned"];
  return (
    <div className="flex flex-wrap gap-1">
      {roleList.map((role) => (
        <Badge key={role} variant={getRoleBadgeVariant(role)}>
          {resolveRoleLabel(role, labels)}
        </Badge>
      ))}
    </div>
  );
}

export function UserAdminHqCell({ isAdminHq }: { isAdminHq: boolean }) {
  return (
    <Badge
      variant="secondary"
      className={
        isAdminHq ? "text-sm font-medium" : "text-sm opacity-70"
      }
    >
      {isAdminHq ? "Admin HQ" : "Branch-scoped"}
    </Badge>
  );
}

export function UserStatusCell({ status }: { status: string }) {
  const isActive = status === "active";
  return (
    <Badge
      variant="outline"
      className={
        isActive
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
          : "bg-muted text-muted-foreground"
      }
    >
      <span
        className={`mr-1 h-1.5 w-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-red-500"}`}
      />
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );
}

export function UserCreatedCell({ createdAt }: { createdAt: string }) {
  return (
    <span className="text-muted-foreground">
      {format(new Date(createdAt), "MMM d, yyyy")}
    </span>
  );
}
