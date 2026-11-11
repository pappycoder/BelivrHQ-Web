"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { UrlTabs } from "@/components/shared/url-tabs";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { AttendanceWorkspace } from "@/components/attendance/attendance-workspace";
import { GeneralAttendancePanel } from "@/components/attendance/general-attendance-panel";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { toast } from "@/lib/toast";

import { DepartmentAttendancePanel } from "./department-attendance-panel";
import { ArrowLeft, UserPlus, PencilLine, Users } from "lucide-react";
import Link from "next/link";
import { PageHeader, SectionCard } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import { DataList, FieldRow, EmptyState } from "@/components/paper/primitives";
import { GroupMemberRoster } from "./group-member-roster";
import { DepartmentFormDialog } from "./department-form-dialog";
import { useCanViewGeneralAttendance } from "@/hooks/use-attendance";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MemberCombobox } from "@/components/members/member-combobox";
import {
  useDepartment,
  useDepartmentsList,
  useAddDepartmentMember,
  useRemoveDepartmentMember,
} from "@/hooks/use-admin";
import { usePermissions } from "@/hooks/use-permissions";
import { useCurrentProfile } from "@/hooks/use-profile";

function formatDate(value: string | undefined): string {
  if (!value) return "Not available";
  try {
    return format(parseISO(value), "dd MMM yyyy");
  } catch {
    return value;
  }
}

export function DepartmentDetailContent({
  departmentId,
}: {
  departmentId: string;
}) {
  const { can, canAny } = usePermissions();
  const { data: profile } = useCurrentProfile();
  // Department heads manage members only in the department they head (the
  // backend rejects add/remove elsewhere), so the Add/Remove affordances are
  // also gated on ownership for any department head.
  const isDepartmentHead =
    canAny("departments:own:read") && !canAny("departments:delete");
  const canUpdate = can("departments", "update");
  const query = useDepartment(departmentId);
  const { data: department, isLoading, error } = query;
  const isOwnDepartment =
    isDepartmentHead &&
    !!profile?.memberId &&
    department?.headMemberId === profile.memberId;
  const addMember = useAddDepartmentMember(departmentId);
  const removeMember = useRemoveDepartmentMember(departmentId);

  const [memberId, setMemberId] = React.useState("");
  const [selectedMemberName, setSelectedMemberName] = React.useState("");
  const [role, setRole] = React.useState("member");
  const [addOpen, setAddOpen] = React.useState(false);
  useUnsavedChanges(!!memberId);

  const handleAdd = () => {
    if (!memberId) return;
    addMember.mutate(
      { memberId, role: role || "member" },
      {
        onSuccess: () => {
          toast.success("Member added to department");
          setAddOpen(false);
          setMemberId("");
          setSelectedMemberName("");
          setRole("member");
        },
        onError: (err) => {
          toast.error("Failed to add member", {
            description: err?.message || "Please try again.",
          });
        },
      },
    );
  };

  const canManage =
    canUpdate &&
    (!isDepartmentHead || !!isOwnDepartment) &&
    !department?.archivedAt;
  const canReported = useCanViewGeneralAttendance("department");
  const [editing, setEditing] = React.useState(false);
  const departments = useDepartmentsList({ enabled: editing && canManage });
  if (isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  if (error || !department)
    return (
      <EmptyState
        title="Department could not be loaded"
        description="Try again or return to the department list."
        action={
          <Button variant="outline" onClick={() => query.refetch()}>
            Retry
          </Button>
        }
      />
    );
  const head =
    `${department.headFirstName || ""} ${department.headLastName || ""}`.trim();
  const tabs = [
    "overview",
    "members",
    "attendance",

  ];
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gatherings · Departments"
        title={department.name}
        description={
          department.description ||
          "Members, meeting attendance and department details in one place."
        }
        actions={
          <>
            <Button
              asChild
              variant="outline"
              className="h-9 rounded-full text-sm"
            >
              <Link href="/gatherings/groups">
                <ArrowLeft className="size-3.5" /> Departments
              </Link>
            </Button>
            {canManage && (
              <Button
                variant="outline"
                className="h-9 rounded-full text-sm"
                onClick={() => setEditing(true)}
              >
                <PencilLine className="size-3.5" /> Edit department
              </Button>
            )}
          </>
        }
      >
        <div className="flex flex-wrap gap-2">
          <Tag tone="sky">{department.branchName || "Unassigned branch"}</Tag>
          {department.archivedAt && <Tag>Archived</Tag>}
          {isOwnDepartment && <Tag tone="moss">Your department</Tag>}
        </div>
      </PageHeader>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          label="Members"
          value={department.memberCount ?? department.members.length}
          tone="brand"
          icon={<Users className="size-4" />}
        />
        <StatCard
          label="Roster leaders"
          value={
            department.members.filter(
              (member) =>
                member.role === "leader" || member.role === "assistant_leader",
            ).length
          }
          tone="moss"
        />
        <div className="paper-card col-span-2 rounded-2xl p-5 lg:col-span-1">
          <p className="rule-label">Department head</p>
          <p className="mt-4 font-display text-lg font-semibold">
            {head || "Not assigned"}
          </p>
        </div>
      </div>
      <UrlTabs defaultValue="overview" values={tabs} aliases={{ reported: "attendance" }}>
        <TabsList
          aria-label="Department workspace"
          className="h-auto group-data-[orientation=horizontal]/tabs:h-auto max-w-full flex-wrap overflow-visible justify-start rounded-2xl border border-line bg-card p-1"
        >
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="h-9 flex-none rounded-full px-4 py-2 text-sm data-[state=active]:bg-ink data-[state=active]:text-paper"
            >
              {
                {
                  overview: "Overview",
                  members: "Members",
                  attendance: "Attendance",
                  reported: "Reported totals",
                }[tab]
              }
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="overview" className="mt-5">
          <SectionCard eyebrow="Department details" title="About this team">
            <DataList>
              <FieldRow label="Description">
                {department.description || "Not available"}
              </FieldRow>
              <FieldRow label="Head">{head || "Not assigned"}</FieldRow>
              <FieldRow label="Branch">
                {department.branchName || "Unassigned"}
              </FieldRow>
              <FieldRow label="Status">
                {department.archivedAt ? "Archived" : "Active"}
              </FieldRow>
              <FieldRow label="Created">
                {formatDate(department.createdAt)}
              </FieldRow>
              <FieldRow label="Updated">
                {formatDate(department.updatedAt)}
              </FieldRow>
            </DataList>
          </SectionCard>
        </TabsContent>
        <TabsContent value="members" className="mt-5">
          <GroupMemberRoster
            members={department.members}
            tableId={`department-roster-${department.id}`}
            onRemove={
              canManage
                ? (member) =>
                    removeMember.mutateAsync(member.memberId, {
                      onSuccess: () =>
                        toast.success("Member removed from department"),
                    })
                : undefined
            }
            action={
              canManage ? (
                <Dialog open={addOpen} onOpenChange={setAddOpen}>
                  <DialogTrigger asChild>
                    <Button
                      className="h-8 rounded-full text-sm"
                      variant="outline"
                    >
                      <UserPlus className="size-4" />
                      Add member
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add department member</DialogTitle>
                      <DialogDescription>
                        Choose a member and their role in this department.
                      </DialogDescription>
                    </DialogHeader>{" "}
                    <div className="mt-4 space-y-3 rounded-lg border p-4">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <UserPlus className="h-4 w-4" /> Add Member
                      </p>
                      <MemberCombobox
                        value={memberId}
                        onChange={(id, member) => {
                          setMemberId(id);
                          setSelectedMemberName(
                            member
                              ? `${member.firstName} ${member.lastName}`
                              : "",
                          );
                        }}
                        selectedName={selectedMemberName}
                        excludeIds={department.members.map((m) => m.memberId)}
                        placeholder="Select a member..."
                        branchId={department.branchId}
                      />
                      <Select value={role} onValueChange={setRole}>
                        <SelectTrigger aria-label="Department membership role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="leader">Leader</SelectItem>
                          <SelectItem value="assistant_leader">
                            Assistant Leader
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        className="w-full"
                        onClick={handleAdd}
                        disabled={!memberId || addMember.isPending}
                      >
                        {addMember.isPending
                          ? "Adding..."
                          : "Add to Department"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              ) : undefined
            }
          />
        </TabsContent>
        <TabsContent value="attendance" className="mt-5">
          <AttendanceWorkspace name={department.name} scope="Department" canSeeHeadcount={canReported}>
            <TabsContent value="individual" forceMount className="data-[state=inactive]:hidden">
          <DepartmentAttendancePanel
            department={department}
            canManage={canManage}
          />
            </TabsContent>
            {canReported && <TabsContent value="general" forceMount className="data-[state=inactive]:hidden">
            <GeneralAttendancePanel
              context={{
                type: "department",
                id: department.id,
                name: department.name,
                branchId: department.branchId,
                active: !department.archivedAt,
              }}
              canManage={canManage}
            />
            </TabsContent>}
          </AttendanceWorkspace>
        </TabsContent>
      </UrlTabs>
      <DepartmentFormDialog
        open={editing}
        onOpenChange={setEditing}
        department={department}
        departments={departments.data || [department]}
      />
    </div>
  );
}
