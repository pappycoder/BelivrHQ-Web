"use client";

import { RequiredFieldsNotice, RequiredIndicator } from "@/components/ui/required-fields";
import { UrlTabs } from "@/components/shared/url-tabs";


import { usePermissions } from "@/hooks/use-permissions";
import { useCurrentProfile } from "@/hooks/use-profile";

import * as React from "react";
import { toast } from "@/lib/toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useBranches,
  useUpdateUser,
  useUpdateUserRoles,
  type EffectivePermission,
  type UserProfile,
} from "@/hooks/use-users";
import { useAssignableRoles, useRoleLabelMap, resolveRoleLabel } from "@/hooks/use-roles";
import {
  User,
  Shield,
  KeyRound,
  Pencil,
  X,
  Save,
  Loader2,
  IdCard,
  Check,
  Minus,
} from "lucide-react";

/** Canonical action column order for the permission matrix; extras are appended. */
const PERMISSION_ACTIONS = ["create", "read", "update", "delete", "view"];

type PermissionRow = [resource: string, actions: Map<string, EffectivePermission>];

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function formatDate(value?: string): string {
  if (!value) return "N/A";
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface AccountInfoTabProps {
  user: UserProfile;
}

function AccountInfoTab({ user }: AccountInfoTabProps) {
  const canUpdate = usePermissions().can("profiles", "update");
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email ?? "",
    phone: user.phone ?? "",
    branchId: user.branchId ?? "",
    status: user.status,
  });
  const { data: branches } = useBranches();
  const updateUser = useUpdateUser(user.profileId);

  React.useEffect(() => {
    if (!editing) {
      setForm({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email ?? "",
        phone: user.phone ?? "",
        branchId: user.branchId ?? "",
        status: user.status,
      });
    }
  }, [editing, user]);

  const handleSave = () => {
    if (!canUpdate) return;
    if (!form.firstName.trim() || !form.lastName.trim() || !form.branchId) { toast.error("First name, last name and branch are required."); return; }
    const payload: Record<string, string> = {};
    if (form.firstName !== user.firstName) payload.firstName = form.firstName.trim();
    if (form.lastName !== user.lastName) payload.lastName = form.lastName.trim();
    if (form.email !== (user.email ?? "") && form.email.trim())
      payload.email = form.email.trim();
    if (form.phone !== (user.phone ?? "") && form.phone.trim())
      payload.phone = form.phone.trim();
    if (form.branchId !== (user.branchId ?? ""))
      payload.branchId = form.branchId;
    if (form.status !== user.status) payload.status = form.status;

    if (Object.keys(payload).length === 0) {
      setEditing(false);
      return;
    }

    updateUser.mutate(payload, {
      onSuccess: () => {
        toast.success("User updated successfully");
        setEditing(false);
      },
      onError: (error) => {
        toast.error("Failed to update user", {
          description: error?.message || "Please try again.",
        });
      },
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Account Information</CardTitle>
          {editing && canUpdate ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(false)}
                disabled={updateUser.isPending}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={updateUser.isPending}>
                {updateUser.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Save
              </Button>
            </div>
          ) : canUpdate ? (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {editing && canUpdate ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <RequiredFieldsNotice className="col-span-full" />
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">First Name <RequiredIndicator /></label>
                <Input
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Last Name <RequiredIndicator /></label>
                <Input
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Email</label>
                <Input
                  type="email"
                  value={form.email}
                  placeholder="Not set"
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Phone</label>
                <Input
                  value={form.phone}
                  placeholder="Not set"
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Branch <RequiredIndicator /></label>
                <Select
                  value={form.branchId || ""}
                  onValueChange={(value) =>
                    setForm({ ...form, branchId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {(branches ?? []).map((branch) => (
                      <SelectItem key={branch.branchId} value={branch.branchId}>
                        {branch.name}
                        {branch.isHeadquarters ? " (HQ)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Status</label>
                <Select
                  value={form.status}
                  onValueChange={(value) => setForm({ ...form, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div>
              <DataRow label="Profile ID" value={user.profileId} />
              <DataRow label="User ID" value={user.userId} />
              <DataRow label="First Name" value={user.firstName} />
              <DataRow label="Last Name" value={user.lastName} />
              <DataRow label="Email" value={user.email || "Not set"} />
              <DataRow label="Phone" value={user.phone || "Not set"} />
              <DataRow label="Branch" value={user.branch?.name || "None"} />
              <DataRow
                label="Status"
                value={user.status.charAt(0).toUpperCase() + user.status.slice(1)}
              />
              <DataRow label="Created" value={formatDate(user.createdAt)} />
              <DataRow label="Last Updated" value={formatDate(user.updatedAt)} />
            </div>
          )}
        </CardContent>
      </Card>

      {user.member && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <IdCard className="h-5 w-5 text-muted-foreground" />
              Linked Member Record
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataRow
              label="Name"
              value={`${user.member.firstName} ${user.member.lastName}`}
            />
            <DataRow label="Member ID" value={user.member.memberId} />
            {user.member.email && <DataRow label="Email" value={user.member.email} />}
            {user.member.phone && <DataRow label="Phone" value={user.member.phone} />}
            {user.member.gender && <DataRow label="Gender" value={user.member.gender} />}
            {user.member.dateOfBirth && (
              <DataRow
                label="Date of Birth"
                value={new Date(user.member.dateOfBirth).toLocaleDateString()}
              />
            )}
            {user.member.address && <DataRow label="Address" value={user.member.address} />}
            <DataRow label="Member Status" value={user.member.status} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PermissionMatrix({
  rows,
  actions,
}: {
  rows: PermissionRow[];
  actions: string[];
}) {
  const roleLabels = useRoleLabelMap();
  return (
    <div className="relative min-w-0 overflow-x-auto rounded-md border" role="region" aria-label="Effective permissions" tabIndex={0}>
      <table className="w-full text-sm" style={{ minWidth: `${12 + actions.length * 3.5}rem` }}>
        <caption className="sr-only">Resources and the actions this user is allowed to perform</caption>
        <thead>
          <tr className="border-b">
            <th scope="col" className="sticky left-0 z-10 min-w-48 bg-card px-3 py-3 text-left text-sm font-medium text-muted-foreground">Resource</th>
            {actions.map(action => (
              <th key={action} scope="col" className="min-w-14 px-2 py-3 text-center text-sm font-medium capitalize text-muted-foreground">{action}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([resource, perms]) => (
            <tr key={resource} className="border-b last:border-0">
              <th scope="row" className="sticky left-0 z-10 min-w-48 bg-card px-3 py-2 text-left font-medium capitalize whitespace-nowrap">
                {resource.replace(/_/g, " ")}
              </th>
              {actions.map(action => {
                const perm = perms.get(action);
                return <td key={action} className="min-w-14 px-2 py-2 text-center">
                  {!perm ? <span className="flex justify-center">
                    <Minus aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground/30" />
                    <span className="sr-only">Not granted</span>
                  </span> : <Tooltip>
                    <TooltipTrigger asChild>
                      <span tabIndex={0} className="flex justify-center cursor-default">
                        <Check aria-hidden="true" className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="sr-only">Granted</span>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{resource.replace(/_/g, " ")}: {action}</p>
                      {perm.grantedBy?.length > 0 && <p>Granted by {perm.grantedBy.map(r => resolveRoleLabel(r, roleLabels)).join(", ")}</p>}
                    </TooltipContent>
                  </Tooltip>}
                </td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface RolePermissionsTabProps {
  user: UserProfile;
}

function RolePermissionsTab({ user }: RolePermissionsTabProps) {
  const { can } = usePermissions();
  const canManageRoles = can("roles", "update");
  const { data: currentProfile } = useCurrentProfile();
  const canManageHq = can("profiles", "update") && can("church_settings", "update") &&
    currentProfile?.profileId !== user.profileId;
  const currentRoles = new Set(user.role ?? []);
  const [selected, setSelected] = React.useState<Set<string>>(currentRoles);
  const assignableRoles = useAssignableRoles(user.role);
  const roleLabels = useRoleLabelMap();
  const updateUserRoles = useUpdateUserRoles(user.profileId);
  const updateUser = useUpdateUser(user.profileId);

  const [isAdminHq, setIsAdminHq] = React.useState(!!user.isAdminHq);

  React.useEffect(() => {
    setIsAdminHq(!!user.isAdminHq);
  }, [user.isAdminHq]);

  const toggleAdminHq = () => {
    if (!canManageHq) return;
    const next = !isAdminHq;
    setIsAdminHq(next);
    updateUser.mutate(
      { isAdminHq: next },
      {
        onSuccess: () => {
          toast.success(
            next
              ? "Admin HQ access enabled. User can now view all branches"
              : "Admin HQ access disabled. User scoped to their own branch",
          );
        },
        onError: (error) => {
          setIsAdminHq(!next);
          toast.error("Failed to update Admin HQ access", {
            description: error?.message || "Please try again.",
          });
        },
      },
    );
  };

  React.useEffect(() => {
    setSelected(new Set(user.role ?? []));
  }, [user.role]);

  const dirty =
    selected.size !== currentRoles.size ||
    [...selected].some((role) => !currentRoles.has(role));

  const toggleRole = (role: string) => {
    if (!canManageRoles) return;
    setSelected((prev) => {
      if (!currentProfile?.planFeatures?.includes("staff_roles")) return new Set([role]);
      const next = new Set(prev);
      if (next.has(role)) {
        next.delete(role);
      } else {
        next.add(role);
      }
      return next;
    });
  };

  const handleSave = () => {
    updateUserRoles.mutate([...selected], {
      onSuccess: () => toast.success("Roles updated successfully"),
      onError: (error) =>
        toast.error("Failed to update roles", {
          description: error?.message || "Please try again.",
        }),
    });
  };

  const permissionMatrix = React.useMemo(() => {
    const groups = new Map<string, Map<string, EffectivePermission>>();
    for (const perm of user.effectivePermissions ?? []) {
      const actions = groups.get(perm.resource) ?? new Map();
      actions.set(perm.action, perm);
      groups.set(perm.resource, actions);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [user.effectivePermissions]);

  const permissionActions = React.useMemo(() => {
    const extras = new Set<string>();
    for (const perm of user.effectivePermissions ?? []) {
      if (!PERMISSION_ACTIONS.includes(perm.action)) extras.add(perm.action);
    }
    return [...PERMISSION_ACTIONS, ...extras];
  }, [user.effectivePermissions]);

  const isSuperAdmin = (user.role ?? []).includes("super_admin");
  const grantedCount = user.effectivePermissions?.length ?? 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Assigned Roles</CardTitle>
          {dirty && canManageRoles && (
            <Button size="sm" onClick={handleSave} disabled={updateUserRoles.isPending}>
              {updateUserRoles.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save Roles
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Users hold multiple roles and accumulate permissions across all of them. The
            highest-ranked role takes precedence.
          </p>
          <div className="flex flex-wrap gap-2">
            {assignableRoles.map((role) => {
              const active = selected.has(role.value);
              return (
                <Badge
                  key={role.value}
                  variant={active ? "default" : "outline"}
                  className={canManageRoles ? "text-sm cursor-pointer select-none" : "text-sm"}
                  onClick={() => toggleRole(role.value)}
                >
                  {role.label}
                  {active && canManageRoles && <X className="h-3 w-3 ml-1" />}
                </Badge>
              );
            })}
          </div>
          {!dirty && selected.size > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1.5">Current roles</p>
                <div className="flex flex-wrap gap-1.5">
                  {[...selected].map((role) => (
                    <Badge key={role} variant="secondary" className="text-sm">
                      {resolveRoleLabel(role, roleLabels)}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            Admin HQ Access
          </CardTitle>
          <CardDescription>
            Grants cross-branch access within this user&apos;s permission scope. Without it,
            users see only data from their own branch (cell leaders see only the cell groups
            they lead).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Admin HQ (cross-branch access)</p>
              <p className="text-sm text-muted-foreground">
                Enabled by default for church admins; keep off for branch-scoped staff.
              </p>
            </div>
            <Switch
              checked={isAdminHq}
              onCheckedChange={toggleAdminHq}
              disabled={!canManageHq || updateUser.isPending}
              aria-label="Toggle Admin HQ access"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Effective Permissions</CardTitle>
          {!isSuperAdmin && permissionMatrix.length > 0 && (
            <CardDescription>
              {grantedCount} permission{grantedCount === 1 ? "" : "s"} across{" "}
              {permissionMatrix.length} resource
              {permissionMatrix.length === 1 ? "" : "s"}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {isSuperAdmin ? (
            <p className="text-sm text-muted-foreground">
              Super admins have every permission in the system.
            </p>
          ) : permissionMatrix.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No explicit permissions resolved for the assigned roles.
            </p>
          ) : (
            <PermissionMatrix rows={permissionMatrix} actions={permissionActions} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface UserDetailContentProps {
  user: UserProfile;
}

export function UserDetailContent({ user }: UserDetailContentProps) {
  return (
    <UrlTabs defaultValue="account" values={["account", "role", "security"]} className="w-full">
      <TabsList>
        <TabsTrigger value="account">
          <User className="h-4 w-4 mr-1.5" />
          Account Info
        </TabsTrigger>
        <TabsTrigger value="role">
          <Shield className="h-4 w-4 mr-1.5" />
          Role &amp; Permissions
        </TabsTrigger>
        <TabsTrigger value="security">
          <KeyRound className="h-4 w-4 mr-1.5" />
          Security
        </TabsTrigger>
      </TabsList>

      <TabsContent value="account" forceMount className="mt-4 data-[state=inactive]:hidden">
        <AccountInfoTab user={user} />
      </TabsContent>

      <TabsContent value="role" forceMount className="mt-4 data-[state=inactive]:hidden">
        <RolePermissionsTab user={user} />
      </TabsContent>

      <TabsContent value="security" forceMount className="mt-4 data-[state=inactive]:hidden">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Security</CardTitle>
          </CardHeader>
          <CardContent>
            <DataRow
              label="MFA Status"
              value={user.mfaEnabled ? "Enabled" : "Disabled"}
            />
            <DataRow
              label="Account Status"
              value={user.status === "active" ? "Active" : "Inactive"}
            />
            <DataRow label="Last Sign In" value={formatDate(user.lastSignInAt)} />
          </CardContent>
        </Card>
      </TabsContent>
    </UrlTabs>
  );
}
