"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, KeyRound, LayoutGrid, Lock, Plus, Rows3, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import {
  EmptyState,
  FilterChip,
  ManageHeading,
  RowActions,
  ViewToggle,
} from "@/components/paper/primitives";
import { StaggerGroup, StaggerItem } from "@/components/paper/motion/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateRoleDialog } from "@/components/roles/create-role-dialog";
import { useCurrentProfile } from "@/hooks/use-profile";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useRolesSummary,
  useAllPermissions,
  ROLE_ORDER,
  sortRolesByOrder,
  getRoleLabel,
  type RoleWithPermissions,
} from "@/hooks/use-roles";
import { number } from "@/lib/paper/format";

export default function AdminRolesPage() {
  const router = useRouter();
  const { data: profile } = useCurrentProfile();
  const { ready, can } = usePermissions();
  // Custom roles are a Network-plan feature: `roles:create` is plan-filtered,
  // so an Essentials/Community church never sees the button even when it
  // holds the admin role. The role check keeps the gate honest to the API.
  const canCreateRole =
    ready &&
    can("roles", "create") &&
    !!profile?.role?.some((r) => r === "church_admin" || r === "super_admin");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [onlyCustom, setOnlyCustom] = React.useState(false);
  const [view, setView] = React.useState<"table" | "cards">("table");

  const roles = useRolesSummary();
  const permissions = useAllPermissions();
  const all = React.useMemo(() => roles.data?.roles ?? [], [roles.data]);
  const rows = React.useMemo(() => {
    const ordered = sortRolesByOrder(all);
    return onlyCustom ? ordered.filter((r) => r.isChurchOwned || r.isCustomized) : ordered;
  }, [all, onlyCustom]);
  const totalPermissions = permissions.data?.length ?? 0;

  const statusBadge = (role: RoleWithPermissions) => {
    if (role.roleName === "super_admin") return <Tag tone="neutral" dot>Locked</Tag>;
    if (role.isChurchOwned) return <Tag tone="sky" dot>Custom</Tag>;
    if (role.isCustomized) return <Tag tone="gold" dot>Customized</Tag>;
    return <Tag tone="moss" dot>Default</Tag>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin · Roles"
        title="What each role can reach."
        description="Permissions are the walls; roles are the rooms. Open a role to edit its matrix."
        actions={
          <>
            <Button asChild variant="outline" className="h-9 gap-1.5 rounded-full border-line bg-card text-xs">
              <Link href="/admin/team">
                <ShieldCheck className="size-3.5" /> Team
              </Link>
            </Button>
            {canCreateRole ? (
              <Button className="h-9 gap-1.5 rounded-full text-xs" onClick={() => setCreateOpen(true)}>
                <Plus className="size-3.5" /> Add role
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Roles" value={all.length} tone="brand" icon={<KeyRound className="size-4" />} />
        <StatCard label="Custom to this church" value={all.filter((r) => r.isChurchOwned).length} tone="sky" />
        <StatCard label="Tweaked templates" value={all.filter((r) => r.isCustomized).length} tone="gold" />
        <StatCard label="Permissions available" value={totalPermissions} tone="moss" deltaLabel="across all surfaces" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip active={!onlyCustom} onClick={() => setOnlyCustom(false)}>All roles</FilterChip>
        <FilterChip active={onlyCustom} onClick={() => setOnlyCustom(true)}>Custom & tweaked</FilterChip>
        <span className="ml-auto">
          <ViewToggle
            value={view}
            onChange={setView}
            options={[
              { value: "table", label: "Table", icon: <Rows3 /> },
              { value: "cards", label: "Cards", icon: <LayoutGrid /> },
            ]}
          />
        </span>
      </div>

      {roles.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={<KeyRound />} title="No roles to show" description="Every workspace starts with the built-in set — custom ones appear here once created." />
      ) : view === "table" ? (
        <div className="paper-card overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <div className="min-w-[620px]">
              <div className="rule-label grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_1fr_auto] items-center gap-3 border-b border-line px-5 py-2.5">
                <span>Role</span>
                <span>Permissions</span>
                <span>Status</span>
                <ManageHeading />
              </div>
              <div className="divide-y divide-line/70">
                {rows.map((role) => {
                  const label = role.label || getRoleLabel(role.roleName);
                  const inOrder = ROLE_ORDER.includes(role.roleName as (typeof ROLE_ORDER)[number]);
                  return (
                    <div key={role.roleName} className="group grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_1fr_auto] items-center gap-3 px-5 py-3.5 text-xs transition-colors hover:bg-muted/40">
                      <button
                        type="button"
                        onClick={() => router.push(`/admin/permissions/${role.roleName}`)}
                        className="flex min-w-0 items-center gap-3 text-left"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                          {role.roleName === "super_admin" || role.roleName === "church_admin" ? <Lock className="size-3.5" /> : <SlidersHorizontal className="size-3.5" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{label}</span>
                          <span className="block truncate text-[11px] text-ink-faint">{role.description || "No description yet."}</span>
                        </span>
                      </button>
                      <span className="num text-[11px] text-ink-soft">
                        {number(role.permissions.length)}
                        <span className="text-ink-faint"> / {number(totalPermissions || role.permissions.length)}</span>
                      </span>
                      <span className="flex flex-wrap items-center gap-1.5">
                        {statusBadge(role)}
                        {!inOrder ? <Tag tone="neutral">new-style</Tag> : null}
                      </span>
                      <div className="flex justify-end">
                        <RowActions
                          actions={[
                            {
                              label: role.roleName === "super_admin" ? "View matrix" : "Edit matrix",
                              icon: <ArrowUpRight />,
                              href: `/admin/permissions/${role.roleName}`,
                            },
                          ]}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <StaggerGroup className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((role) => {
            const label = role.label || getRoleLabel(role.roleName);
            const inOrder = ROLE_ORDER.includes(role.roleName as (typeof ROLE_ORDER)[number]);
            return (
              <StaggerItem key={role.roleName}>
                <div className="paper-card flex h-full flex-col rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => router.push(`/admin/permissions/${role.roleName}`)}
                      className="flex min-w-0 items-center gap-3 text-left"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                        {role.roleName === "super_admin" || role.roleName === "church_admin" ? <Lock className="size-3.5" /> : <SlidersHorizontal className="size-3.5" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold">{label}</span>
                        <span className="block truncate text-[11px] text-ink-faint">{role.description || "No description yet."}</span>
                      </span>
                    </button>
                    <RowActions
                      reveal={false}
                      actions={[
                        {
                          label: role.roleName === "super_admin" ? "View matrix" : "Edit matrix",
                          icon: <ArrowUpRight />,
                          href: `/admin/permissions/${role.roleName}`,
                        },
                      ]}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-3 text-[10px] text-ink-faint">
                    <span className="flex items-center gap-1.5">
                      {statusBadge(role)}
                      {!inOrder ? <Tag tone="neutral">new-style</Tag> : null}
                    </span>
                    <span className="num">
                      {number(role.permissions.length)}
                      <span className="text-ink-faint"> / {number(totalPermissions || role.permissions.length)}</span>
                    </span>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      )}

      <div className="rounded-2xl border border-dashed border-line p-5 text-[11px] leading-relaxed text-ink-soft">
        <p className="mb-1 font-display text-xs font-semibold text-ink">How editing works</p>
        Template roles are additive — ticks grant extras for this church; global defaults can&apos;t be revoked from here.
        Church-owned roles edit their own full set, revocations included. The matrix editor opens in the classic
        surface while the Paper version matures.
      </div>

      <CreateRoleDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(name) => router.push(`/admin/permissions/${name}`)} />
    </div>
  );
}
