"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarPlus,
  Navigation,
  PencilLine,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { PageHeader, SectionCard } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import { DataList, EmptyState, FieldRow } from "@/components/paper/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UrlTabs } from "@/components/shared/url-tabs";
import { GroupMemberRoster } from "@/components/departments/group-member-roster";
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
} from "@/hooks/use-admin";
import { useCanViewGeneralAttendance } from "@/hooks/use-attendance";
import { formatDate } from "@/hooks/use-media";

const isoDay = (offset = 0) =>
  new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

export default function CellGroupDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = React.use(params);
  const { can, canAny, ready } = usePermissions();
  const { data: profile } = useCurrentProfile();

  const canSeeDetails = ready && canAny("cell_groups:details:read");
  const group = useCellGroup(groupId);
  const members = useCellGroupMembers(canSeeDetails ? groupId : "");
  const summary = useCellGroupAttendanceSummary(canSeeDetails ? groupId : "");
  const nearby = useNearestCellGroups(
    group.data?.latitude,
    group.data?.longitude,
  );
  const removeMember = useRemoveCellGroupMember(groupId);

  const [meetingDate, setMeetingDate] = React.useState(isoDay());
  const attendance = useCellGroupAttendance(
    canSeeDetails ? groupId : "",
    meetingDate,
  );

  const [memberDialogOpen, setMemberDialogOpen] = React.useState(false);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);

  // Leadership semantics mirrored from the legacy detail: leaders manage
  // ONLY their own group; archive/delete stays pastor-side on the list.
  const isCellLeader =
    ready && canAny("cell_groups:own:read") && !canAny("cell_groups:delete");
  const isOwnGroup =
    isCellLeader &&
    !!profile?.memberId &&
    group.data?.leaderId === profile.memberId;
  const canManageMembers =
    canSeeDetails &&
    can("cell_groups", "create") &&
    (!isCellLeader || isOwnGroup);
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
        title="We couldn't find this group"
        description="It may have been archived away from your view, or the link is old."
        action={
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-full border-line text-xs"
          >
            <Link href="/gatherings/groups/cell">Back to groups</Link>
          </Button>
        }
      />
    );
  }

  const g = group.data;
  const memberRows = members.data ?? [];
  const records = attendance.data ?? [];
  const dayLabel = g.meetingDay ?? "Not set";

  const tabs = [
    "overview",
    ...(canSeeDetails ? ["members", "attendance"] : []),
    ...(canSeeReported ? ["reported"] : []),
    ...(canSeeGiving ? ["giving"] : []),
  ];
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gatherings · Cell groups"
        title={g.name}
        description={`Led by ${g.leaderFirstName ? `${g.leaderFirstName} ${g.leaderLastName || ""}`.trim() : "no assigned leader"} · ${dayLabel}${g.meetingTime ? ` at ${g.meetingTime.slice(0, 5)}` : ""}`}
        actions={
          <>
            <Button
              asChild
              variant="outline"
              className="h-9 rounded-full text-xs"
            >
              <Link href="/gatherings/groups/cell">
                <ArrowLeft className="size-3.5" /> Cell groups
              </Link>
            </Button>
            {canEdit && !g.archivedAt && (
              <Button
                variant="outline"
                className="h-9 rounded-full text-xs"
                onClick={() => setEditOpen(true)}
              >
                <PencilLine className="size-3.5" /> Edit group
              </Button>
            )}
          </>
        }
      >
        <div className="flex flex-wrap gap-2">
          {g.branchName && <Tag tone="sky">{g.branchName}</Tag>}
          {g.archivedAt && <Tag>Archived</Tag>}
          {isOwnGroup && <Tag tone="moss">Your group</Tag>}
        </div>
      </PageHeader>
      {canSeeDetails && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {members.isLoading ? (
            <Skeleton className="h-28 rounded-2xl" />
          ) : (
            <StatCard
              label="Members"
              value={memberRows.length}
              tone="brand"
              icon={<Users className="size-4" />}
            />
          )}
          {summary.isLoading ? (
            <>
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
            </>
          ) : summary.isError ? (
            <div className="paper-card col-span-2 rounded-2xl p-5">
              <p className="text-xs text-ink-soft">
                Attendance summary unavailable.
              </p>
              <Button variant="link" onClick={() => summary.refetch()}>
                Retry
              </Button>
            </div>
          ) : (
            <>
              <StatCard
                label="Meetings held"
                value={summary.data?.totalMeetings || 0}
                tone="moss"
              />
              <StatCard
                className="col-span-2 lg:col-span-1"
                label="Average attendance"
                value={Math.round(summary.data?.averageAttendance || 0)}
                tone="sky"
              />
            </>
          )}
        </div>
      )}
      <UrlTabs defaultValue="overview" values={tabs}>
        <TabsList
          aria-label="Cell group workspace"
          className="h-auto group-data-[orientation=horizontal]/tabs:h-auto max-w-full flex-wrap overflow-visible justify-start rounded-2xl border border-line bg-card p-1"
        >
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="h-9 flex-none rounded-full px-4 py-2 text-xs data-[state=active]:bg-ink data-[state=active]:text-paper"
            >
              {
                {
                  overview: "Overview",
                  members: "Members",
                  attendance: "Attendance",
                  reported: "Reported totals",
                  giving: "Giving",
                }[tab]
              }
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="overview" className="mt-5">
          {" "}
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard eyebrow="This group" title="Group details">
              <DataList>
                <FieldRow label="Leader">
                  {g.leaderFirstName
                    ? `${g.leaderFirstName} ${g.leaderLastName ?? ""}`
                    : "—"}
                </FieldRow>
                <FieldRow label="Branch">
                  {g.branchName ?? "Unassigned"}
                </FieldRow>
                <FieldRow label="Meeting day">{dayLabel}</FieldRow>
                <FieldRow label="Time">{g.meetingTime ?? "—"}</FieldRow>
                <FieldRow label="Coordinates">
                  {g.latitude != null && g.longitude != null ? (
                    <span className="num">
                      {String(g.latitude)}, {String(g.longitude)}
                    </span>
                  ) : (
                    "—"
                  )}
                </FieldRow>
                <FieldRow label="Added">{formatDate(g.createdAt)}</FieldRow>
              </DataList>
            </SectionCard>

            {g.latitude != null &&
            g.longitude != null &&
            (nearby.data?.length ?? 0) > 0 ? (
              <SectionCard
                eyebrow="Neighbours"
                title="Cell groups nearby"
                bodyClassName="p-0"
              >
                <div className="divide-y divide-line/70">
                  {(nearby.data ?? []).slice(0, 5).map((neighbour) => (
                    <Link
                      key={neighbour.id}
                      href={`/gatherings/groups/cell/${neighbour.id}`}
                      className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-muted/40"
                    >
                      <Navigation className="size-3.5 shrink-0 text-ink-faint" />
                      <span className="min-w-0 flex-1 truncate text-xs font-medium">
                        {neighbour.name}
                      </span>
                      <span className="num shrink-0 text-[10px] text-ink-faint">
                        {neighbour.distanceKm.toFixed(1)} km
                      </span>
                    </Link>
                  ))}
                </div>
                <p className="border-t border-line px-5 py-2 text-[10px] text-ink-faint">
                  Coverage gaps are invitations, not reports.
                </p>
              </SectionCard>
            ) : null}
          </div>
        </TabsContent>
        {canSeeDetails && (
          <TabsContent value="members" className="mt-5">
            <GroupMemberRoster
              tableId={`cell-roster-${g.id}`}
              members={memberRows}
              loading={members.isLoading}
              error={members.isError}
              onRetry={() => members.refetch()}
              action={
                canManageMembers && !g.archivedAt ? (
                  <Button
                    className="h-8 rounded-full text-xs"
                    onClick={() => setMemberDialogOpen(true)}
                  >
                    <UserPlus className="size-3.5" /> Add member
                  </Button>
                ) : undefined
              }
              onRemove={
                canManageMembers && !g.archivedAt
                  ? (member) =>
                      removeMember.mutateAsync(member.memberId, {
                        onSuccess: () =>
                          toast(`${member.firstName} removed from ${g.name}.`),
                      })
                  : undefined
              }
            />
          </TabsContent>
        )}
        {canSeeDetails && (
          <TabsContent value="attendance" className="mt-5">
            {" "}
            <MeetingAttendanceTable
              records={records}
              loading={attendance.isLoading}
              error={attendance.isError}
              onRetry={() => attendance.refetch()}
              date={meetingDate}
              onDateChange={setMeetingDate}
              title="Cell group attendance"
              action={
                canManageMembers && !g.archivedAt ? (
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 rounded-full text-xs"
                    onClick={() => setAttendanceDialogOpen(true)}
                  >
                    <CalendarPlus className="size-3.5" /> Record Attendance
                  </Button>
                ) : null
              }
            />
          </TabsContent>
        )}
        {canSeeReported && (
          <TabsContent value="reported" className="mt-5">
            {" "}
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
        )}
        {canSeeGiving && (
          <TabsContent value="giving" className="mt-5">
            <SectionCard
              eyebrow="Meeting giving"
              title="Group giving"
              description="Combined meeting totals recorded against this cell group."
            >
              <CellGroupGivingPanel groupId={g.id} archived={!!g.archivedAt} />
            </SectionCard>
          </TabsContent>
        )}
      </UrlTabs>
      <CellGroupFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        group={g}
        lockedLeaderBranch={isOwnGroup}
      />
      <CellGroupMemberDialog
        open={memberDialogOpen}
        onOpenChange={setMemberDialogOpen}
        groupId={g.id}
        groupName={g.name}
        existingMembers={memberRows}
      />
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
    </div>
  );
}
