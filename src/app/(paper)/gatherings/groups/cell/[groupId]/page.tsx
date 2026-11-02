"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarPlus,
  HandCoins,
  MapPin,
  Navigation,
  PencilLine,
  UserPlus,
  UserRoundX,
  Users,
} from "lucide-react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { SectionCard } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import {
  DataList,
  EmptyState,
  FieldRow,
  PersonAvatar,
  RowActions,
} from "@/components/paper/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDeleteDialog } from "@/components/pastoral/confirm-delete-dialog";
import { CellGroupFormDialog } from "@/components/departments/cell-group-form-dialog";
import { CellGroupMemberDialog } from "@/components/departments/cell-group-member-dialog";
import { CellGroupAttendanceDialog } from "@/components/departments/cell-group-attendance-dialog";
import { MeetingAttendanceTable } from "@/components/departments/meeting-attendance-table";
import { CellGroupGivingPanel } from "@/components/giving/cell-group-giving-panel";
import { GeneralAttendancePanel } from "@/components/attendance/general-attendance-panel";
import { usePermissions } from "@/hooks/use-permissions";
import { useCurrentProfile } from "@/hooks/use-profile";
import {
  useCellGroup,
  useCellGroupMembers,
  useCellGroupAttendance,
  useCellGroupAttendanceSummary,
  useNearestCellGroups,
  useRemoveCellGroupMember,
  GROUP_ROLES,
  type CellGroupMember,
} from "@/hooks/use-admin";
import { useCanViewGeneralAttendance } from "@/hooks/use-attendance";
import { formatDate } from "@/hooks/use-media";
import { number } from "@/lib/paper/format";

const isoDay = (offset = 0) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

export default function CellGroupDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = React.use(params);
  const { can, canAny, ready } = usePermissions();
  const { data: profile } = useCurrentProfile();

  const group = useCellGroup(groupId);
  const members = useCellGroupMembers(groupId);
  const summary = useCellGroupAttendanceSummary(groupId);
  const nearby = useNearestCellGroups(group.data?.latitude, group.data?.longitude);
  const removeMember = useRemoveCellGroupMember(groupId);

  const [meetingDate, setMeetingDate] = React.useState(isoDay());
  const attendance = useCellGroupAttendance(groupId, meetingDate);

  const [memberDialogOpen, setMemberDialogOpen] = React.useState(false);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [removeTarget, setRemoveTarget] = React.useState<CellGroupMember | null>(null);

  // Leadership semantics mirrored from the legacy detail: leaders manage
  // ONLY their own group; archive/delete stays pastor-side on the list.
  const isCellLeader = ready && canAny("cell_groups:own:read") && !canAny("cell_groups:delete");
  const isOwnGroup =
    isCellLeader && !!profile?.memberId && group.data?.leaderId === profile.memberId;
  const canManageMembers = can("cell_groups", "create") && (!isCellLeader || isOwnGroup);
  const canEdit = can("cell_groups", "update") && (!isCellLeader || isOwnGroup);
  const canSeeGiving = ready && canAny("cell_groups:giving:read");
  const canSeeReported = useCanViewGeneralAttendance("cell_group");

  if (group.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  if (group.isError || !group.data) {
    return (
      <EmptyState
        icon={<Users />}
        title="We couldn&apos;t find this group"
        description="It may have been archived away from your view, or the link is old."
        action={<Button asChild variant="outline" size="sm" className="rounded-full border-line text-xs"><Link href="/gatherings/groups/cell">Back to groups</Link></Button>}
      />
    );
  }

  const g = group.data;
  const memberRows = members.data ?? [];
  const records = attendance.data ?? [];
  const dayLabel = g.meetingDay ?? "Not set";

  return (
    <div className="space-y-6">
      <Link href="/gatherings/groups/cell" className="inline-flex items-center gap-1.5 text-[11px] text-ink-faint hover:text-ink">
        <ArrowLeft className="size-3" /> Gatherings · Cell Groups
      </Link>

      <div className="paper-card rounded-2xl p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              {g.branchName ? <Tag tone="sky">{g.branchName}</Tag> : null}
              {g.archivedAt ? <Tag tone="neutral">Archived</Tag> : null}
              {isOwnGroup ? <Tag tone="moss" dot>Your group</Tag> : null}
            </div>
            <h1 className="font-display text-[clamp(1.4rem,2.4vw,2rem)] font-semibold tracking-tight">{g.name}</h1>
            <p className="text-[11px] text-ink-soft">
              Led by {g.leaderFirstName ? `${g.leaderFirstName} ${g.leaderLastName ?? ""}` : "no assigned leader"}
              {g.meetingTime ? <span className="num"> · meets {dayLabel} at {g.meetingTime}</span> : <> · meets {dayLabel}</>}
            </p>
            {g.address ? (
              <p className="flex items-center gap-1.5 text-[10px] text-ink-faint"><MapPin className="size-3" /> {g.address}</p>
            ) : null}
          </div>
          {canEdit ? (
            <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full border-line bg-card text-xs" onClick={() => setEditOpen(true)}>
              <PencilLine className="size-3.5" /> Edit group
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Members" value={memberRows.length} tone="brand" icon={<Users className="size-4" />} />
        <StatCard label="Meetings held" value={summary.data?.totalMeetings ?? 0} tone="moss" deltaLabel="on record" />
        <StatCard label="Average turn-out" value={Math.round(summary.data?.averageAttendance ?? 0)} tone="sky" deltaLabel="per meeting" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Tabs defaultValue="named">
            {canSeeReported ? (
              <TabsList className="h-9 w-fit rounded-full border border-line bg-card p-0.5">
                <TabsTrigger value="named" className="rounded-full px-3.5 text-xs data-[state=active]:bg-ink data-[state=active]:text-paper">
                  Named attendance
                </TabsTrigger>
                <TabsTrigger value="reported" className="rounded-full px-3.5 text-xs data-[state=active]:bg-ink data-[state=active]:text-paper">
                  Reported totals
                </TabsTrigger>
              </TabsList>
            ) : null}
            <TabsContent value="named" className={canSeeReported ? "mt-4" : undefined}>
              <MeetingAttendanceTable
                records={records}
                loading={attendance.isLoading}
                error={attendance.isError}
                date={meetingDate}
                onDateChange={setMeetingDate}
                title="Cell group attendance"
                action={
                  canManageMembers && !g.archivedAt ? (
                    <Button size="sm" className="h-8 gap-1.5 rounded-full text-xs" onClick={() => setAttendanceDialogOpen(true)}>
                      <CalendarPlus className="size-3.5" /> Record Attendance
                    </Button>
                  ) : null
                }
              />
            </TabsContent>
            {canSeeReported ? (
              <TabsContent value="reported" className="mt-4">
                <GeneralAttendancePanel
                  context={{
                    type: "cell_group",
                    id: g.id,
                    name: g.name,
                    branchId: g.branchId,
                    active: !g.archivedAt,
                  }}
                  canManage={!isCellLeader || isOwnGroup}
                />
              </TabsContent>
            ) : null}
          </Tabs>

          <SectionCard
            eyebrow="The roster"
            title="Who belongs here"
            actions={
              canManageMembers && !g.archivedAt ? (
                <Button size="sm" variant="outline" className="h-7 gap-1.5 rounded-full border-line text-[11px]" onClick={() => setMemberDialogOpen(true)}>
                  <UserPlus className="size-3" /> Add member
                </Button>
              ) : null
            }
            bodyClassName="p-0"
          >
            {members.isLoading ? (
              <div className="space-y-2 p-5">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}</div>
            ) : memberRows.length === 0 ? (
              <p className="px-5 py-10 text-center text-[11px] text-ink-faint">No names on this roster yet — a group is people, not a schedule.</p>
            ) : (
              <div className="divide-y divide-line/70">
                {memberRows.map((member) => (
                  <div key={member.id} className="group flex items-center gap-3 px-5 py-2.5">
                    <PersonAvatar name={`${member.firstName} ${member.lastName}`} size="xs" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">{member.firstName} {member.lastName}</span>
                      <span className="block text-[10px] text-ink-faint">joined {formatDate(member.joinedAt)}</span>
                    </span>
                    <Tag tone={member.role === "leader" ? "brand" : "neutral"}>{GROUP_ROLES.find((r) => r.value === member.role)?.label ?? member.role}</Tag>
                    <RowActions
                      actions={[
                        {
                          label: `Open ${member.firstName} ${member.lastName}`,
                          icon: <ArrowUpRight />,
                          href: `/people/members/${member.memberId}`,
                        },
                        canManageMembers && {
                          label: `Remove ${member.firstName} ${member.lastName} from the group`,
                          icon: <UserRoundX />,
                          tone: "danger",
                          onSelect: () => setRemoveTarget(member),
                        },
                      ]}
                    />
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {canSeeGiving ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <HandCoins className="size-4 text-gold" />
                <p className="rule-label">Meeting giving</p>
                <span className="text-[10px] text-ink-faint">recorded against this group&apos;s own ledger</span>
              </div>
              <CellGroupGivingPanel groupId={g.id} archived={!!g.archivedAt} />
            </div>
          ) : isOwnGroup ? (
            <div className="rounded-2xl border border-dashed border-gold/50 bg-gold-soft/20 px-4 py-3 text-[11px] text-ink-soft">
              Your group&apos;s meeting-giving panel appears once the group-giving grant is provisioned for your role.
            </div>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <SectionCard eyebrow="This group" title="The shape of it">
            <DataList>
              <FieldRow label="Leader">{g.leaderFirstName ? `${g.leaderFirstName} ${g.leaderLastName ?? ""}` : "—"}</FieldRow>
              <FieldRow label="Branch">{g.branchName ?? "Unassigned"}</FieldRow>
              <FieldRow label="Meeting day">{dayLabel}</FieldRow>
              <FieldRow label="Time">{g.meetingTime ?? "—"}</FieldRow>
              <FieldRow label="Coordinates">{g.latitude && g.longitude ? <span className="num">{number(Math.abs(g.latitude))}, {number(Math.abs(g.longitude))}</span> : "—"}</FieldRow>
              <FieldRow label="Added">{formatDate(g.createdAt)}</FieldRow>
            </DataList>
          </SectionCard>

          {g.latitude && g.longitude && (nearby.data?.length ?? 0) > 0 ? (
            <SectionCard eyebrow="Neighbours" title="Cell groups nearby" bodyClassName="p-0">
              <div className="divide-y divide-line/70">
                {(nearby.data ?? []).slice(0, 5).map((neighbour) => (
                  <Link key={neighbour.id} href={`/gatherings/groups/cell/${neighbour.id}`} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-muted/40">
                    <Navigation className="size-3.5 shrink-0 text-ink-faint" />
                    <span className="min-w-0 flex-1 truncate text-xs font-medium">{neighbour.name}</span>
                    <span className="num shrink-0 text-[10px] text-ink-faint">{neighbour.distanceKm.toFixed(1)} km</span>
                  </Link>
                ))}
              </div>
              <p className="border-t border-line px-5 py-2 text-[10px] text-ink-faint">Coverage gaps are invitations, not reports.</p>
            </SectionCard>
          ) : null}

          <div className="rounded-2xl border border-dashed border-line p-5 text-[10px] leading-relaxed text-ink-faint">
            Leaders record for their own group — attendance here feeds the same
            named-check-in ledger as every service and event.
          </div>
        </aside>
      </div>

      <CellGroupFormDialog open={editOpen} onOpenChange={setEditOpen} group={g} lockedLeaderBranch={isOwnGroup} />
      <CellGroupMemberDialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen} groupId={g.id} groupName={g.name} existingMembers={memberRows} />
      <CellGroupAttendanceDialog
        open={attendanceDialogOpen}
        onOpenChange={setAttendanceDialogOpen}
        groupId={g.id}
        groupName={g.name}
        members={memberRows}
        loadingMembers={members.isLoading}
        membersError={members.isError}
        onRetryMembers={() => members.refetch()}
      />
      <ConfirmDeleteDialog
        open={!!removeTarget}
        onOpenChange={(value) => !value && setRemoveTarget(null)}
        title="Remove from the group?"
        description={removeTarget ? `${removeTarget.firstName} ${removeTarget.lastName} leaves this roster; their membership and history are untouched.` : ""}
        confirmLabel="Remove"
        pending={removeMember.isPending}
        pendingLabel="Removing…"
        onConfirm={() => {
          if (!removeTarget) return;
          removeMember.mutate(removeTarget.memberId, {
            onSuccess: () => { toast(`${removeTarget.firstName} removed from ${g.name}.`); setRemoveTarget(null); },
            onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't remove them.")),
          });
        }}
      />
    </div>
  );
}
