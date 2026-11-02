"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  LayoutGrid,
  Mail,
  PauseCircle,
  Rows3,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { fetchAllPages, listUrl } from "@/lib/export-all";
import type { ExportColumn } from "@/lib/export-utils";
import { PageHeader } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import {
  EmptyState,
  FilterChip,
  ManageHeading,
  PersonAvatar,
  RowActions,
  SearchField,
  ViewToggle,
  type RowAction,
} from "@/components/paper/primitives";
import { StaggerGroup, StaggerItem } from "@/components/paper/motion/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExportDropdown } from "@/components/shared/export-dropdown";
import { UserFormDialog } from "@/components/users/user-form-dialog";
import { DeleteUserDialog } from "@/components/users/delete-user-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import { useRoleLabelMap, resolveRoleLabel } from "@/hooks/use-roles";
import { useUsers, type UserProfile } from "@/hooks/use-users";

const PAGE_SIZE = 12;

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "roles", label: "Roles" },
  { key: "branch", label: "Branch" },
  { key: "status", label: "Status" },
  { key: "mfa", label: "Two-factor" },
  { key: "lastSignIn", label: "Last sign-in" },
];

function exportRows(rows: UserProfile[], labelMap: Map<string, string>) {
  return rows.map((u) => ({
    name: `${u.firstName} ${u.lastName}`,
    email: u.email ?? "",
    roles: u.role.map((r) => resolveRoleLabel(r, labelMap)).join(", "),
    branch: u.branch?.name ?? "",
    status: u.status,
    mfa: u.mfaEnabled ? "on" : "off",
    lastSignIn: u.lastSignInAt?.slice(0, 10) ?? "",
  }));
}

export default function AdminTeamPage() {
  const router = useRouter();
  const { can, ready } = usePermissions();
  const canInvite = ready && can("users", "create");
  const canUpdate = ready && can("users", "update");
  const canDelete = ready && can("users", "delete");
  const labelMap = useRoleLabelMap();

  const [query, setQuery] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [view, setView] = React.useState<"table" | "cards">("table");
  const [page, setPage] = React.useState(1);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [roleTarget, setRoleTarget] = React.useState<UserProfile | null>(null);
  const [deleteState, setDeleteState] = React.useState<{ users: UserProfile[]; mode: "delete" | "deactivate" } | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => { setSearch(query); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const users = useUsers({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    status: (status || undefined) as "active" | "inactive" | undefined,
    sortBy: "first_name",
    sortOrder: "asc",
  });

  const rows = users.data?.data ?? [];
  const total = users.data?.meta?.total ?? 0;
  const totalPages = Math.max(1, users.data?.meta?.totalPages ?? 1);

  const fetchAllExport = React.useCallback(async () => {
    const all = await fetchAllPages<UserProfile>((p) =>
      api.get(listUrl("/profiles", {
        page: p,
        limit: 100,
        search: search || undefined,
        status: status || undefined,
      })),
    );
    return exportRows(all, labelMap);
  }, [search, status, labelMap]);

  // One Manage grammar shared by the table rows and the cards.
  const manageActions = (member: UserProfile): (RowAction | false | "" | undefined)[] => [
    { label: "Open full record", icon: <ArrowUpRight />, href: `/admin/team/${member.profileId}` },
    canUpdate && { label: `Change ${member.firstName}'s roles`, icon: <ShieldCheck />, onSelect: () => setRoleTarget(member) },
    canDelete && member.status === "active" && {
      label: "Pause access",
      icon: <PauseCircle />,
      tone: "warning",
      onSelect: () => setDeleteState({ users: [member], mode: "deactivate" }),
    },
    canDelete && member.status !== "active" && {
      label: "Remove from workspace",
      icon: <Trash2 />,
      tone: "danger",
      onSelect: () => setDeleteState({ users: [member], mode: "delete" }),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin · Team"
        title="The people behind the desk."
        description="Everyone who can sign in to this workspace — staff, leads, and trusted volunteers."
        actions={
          <>
            <Button asChild variant="outline" className="h-9 gap-1.5 rounded-full border-line bg-card text-xs">
              <Link href="/admin/permissions">
                <ShieldCheck className="size-3.5" /> Roles
              </Link>
            </Button>
            <ExportDropdown
              tableId="team"
              columns={EXPORT_COLUMNS}
              data={exportRows(rows, labelMap)}
              title="Team"
              filename="team-export"
              disabled={!rows.length}
              fetchAllRows={fetchAllExport}
            />
            {canInvite ? (
              <Button className="h-9 gap-1.5 rounded-full text-xs" onClick={() => setInviteOpen(true)}>
                <UserPlus className="size-3.5" /> Invite someone
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Seats filled" value={total} tone="brand" icon={<Users className="size-4" />} />
        <StatCard label="Active this page" value={rows.filter((u) => u.status === "active").length} tone="moss" />
        <StatCard label="Two-factor on" value={rows.filter((u) => u.mfaEnabled).length} tone="gold" deltaLabel="this page" />
        <StatCard label="Admin HQ" value={rows.filter((u) => u.isAdminHq).length} tone="sky" deltaLabel="cross-branch readers" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchField value={query} onChange={setQuery} placeholder="Search name or email…" className="w-full max-w-xs" />
        <FilterChip active={status === ""} onClick={() => { setStatus(""); setPage(1); }}>All</FilterChip>
        <FilterChip active={status === "active"} onClick={() => { setStatus("active"); setPage(1); }}>Active</FilterChip>
        <FilterChip active={status === "inactive"} onClick={() => { setStatus("inactive"); setPage(1); }}>Paused</FilterChip>
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

      {users.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="Nobody has a seat yet"
          description="Invite the first desk-keeper — roles decide what they can reach."
          action={canInvite ? <Button size="sm" variant="outline" className="rounded-full border-line text-xs" onClick={() => setInviteOpen(true)}>Send the first invite</Button> : undefined}
        />
      ) : (
        <>
          {view === "table" ? (
            <div className="paper-card overflow-hidden rounded-2xl">
              <div className="overflow-x-auto">
                <div className="min-w-[720px]">
                  <div className="rule-label grid grid-cols-[minmax(0,1.8fr)_minmax(0,1.1fr)_1fr_0.9fr_0.9fr_auto] items-center gap-3 border-b border-line px-5 py-2.5">
                    <span>Person</span>
                    <span>Roles</span>
                    <span>Branch</span>
                    <span>Status</span>
                    <span>Last sign-in</span>
                    <ManageHeading />
                  </div>
                  <div className="divide-y divide-line/70">
                    {rows.map((member) => (
                      <div key={member.profileId} className="group grid grid-cols-[minmax(0,1.8fr)_minmax(0,1.1fr)_1fr_0.9fr_0.9fr_auto] items-center gap-3 px-5 py-3 text-xs transition-colors hover:bg-muted/40">
                        <button type="button" onClick={() => router.push(`/admin/team/${member.profileId}`)} className="flex min-w-0 items-center gap-3 text-left">
                          <PersonAvatar name={`${member.firstName} ${member.lastName}`} src={member.avatarUrl} size="sm" />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{member.firstName} {member.lastName}</span>
                            <span className="block truncate text-[10px] text-ink-faint">{member.email ?? "No email on file"}</span>
                          </span>
                        </button>
                        <span className="truncate text-[11px] text-ink-soft">
                          {member.role.map((r) => resolveRoleLabel(r, labelMap)).join(" · ") || "No role assigned"}
                        </span>
                        <span className="truncate text-[11px] text-ink-soft">{member.branch?.name ?? "—"}</span>
                        <span>
                          <Tag tone={member.status === "active" ? "moss" : "rose"} dot>{member.status === "active" ? "Active" : "Paused"}</Tag>
                          {member.isAdminHq ? <Tag tone="sky" className="ml-1">HQ</Tag> : null}
                        </span>
                        <span className="num text-[10px] text-ink-faint">
                          {member.lastSignInAt ? new Date(member.lastSignInAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "never"}
                        </span>
                        <div className="flex justify-end">
                          <RowActions actions={manageActions(member)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <StaggerGroup className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((member) => (
                <StaggerItem key={member.profileId}>
                  <div className="paper-card flex h-full flex-col rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-2">
                      <button type="button" onClick={() => router.push(`/admin/team/${member.profileId}`)} className="flex min-w-0 items-center gap-3 text-left">
                        <PersonAvatar name={`${member.firstName} ${member.lastName}`} src={member.avatarUrl} size="md" />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold">{member.firstName} {member.lastName}</p>
                          <p className="truncate text-[11px] text-ink-faint">{member.role.map((r) => resolveRoleLabel(r, labelMap)).join(" · ") || "No role assigned"}</p>
                        </div>
                      </button>
                      <RowActions reveal={false} actions={manageActions(member)} />
                    </div>
                    <p className="mt-2 truncate text-[10px] text-ink-faint">{member.email ?? "No email on file"}</p>
                    <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-3 text-[10px] text-ink-faint">
                      <span className="flex items-center gap-1.5">
                        <Tag tone={member.status === "active" ? "moss" : "rose"} dot>{member.status === "active" ? "Active" : "Paused"}</Tag>
                        {member.isAdminHq ? <Tag tone="sky">HQ</Tag> : null}
                        {member.branch ? <span className="truncate">· {member.branch.name}</span> : null}
                      </span>
                      <span>{member.lastSignInAt ? new Date(member.lastSignInAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "never signed in"}</span>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerGroup>
          )}

          <div className="paper-card flex items-center justify-between rounded-2xl px-5 py-2.5 text-[11px] text-ink-faint">
            <span><span className="num font-medium text-ink">{(page - 1) * PAGE_SIZE + rows.length}</span> of <span className="num">{total}</span> seats</span>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="xs" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-full border-line bg-card">Prev</Button>
              <span className="num">{page} / {totalPages}</span>
              <Button variant="outline" size="xs" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded-full border-line bg-card">Next</Button>
            </div>
          </div>
        </>
      )}

      <UserFormDialog open={inviteOpen} onOpenChange={setInviteOpen} mode="invite" />
      <UserFormDialog open={!!roleTarget} onOpenChange={(value) => !value && setRoleTarget(null)} mode="edit-role" user={roleTarget ?? undefined} />
      <DeleteUserDialog
        open={!!deleteState?.users.length}
        onOpenChange={(value) => !value && setDeleteState(null)}
        users={deleteState?.users ?? []}
        mode={deleteState?.mode ?? "deactivate"}
      />

      <p className="flex items-center justify-center gap-1.5 text-[10px] text-ink-faint">
        <Mail className="size-3" /> Invitations arrive by email; recipients choose their own password before their first sign-in.
      </p>
    </div>
  );
}
