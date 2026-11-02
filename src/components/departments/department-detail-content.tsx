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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { GeneralAttendancePanel } from "@/components/attendance/general-attendance-panel";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { toast } from "@/lib/toast";
import { ExportDropdown } from "@/components/shared/export-dropdown";
import { DepartmentAttendancePanel } from "./department-attendance-panel";
import { ArrowLeft, UserPlus, X } from "lucide-react";
import { WorkspaceHeader as PageHeader } from "@/components/workspace/workspace-presentation";
import { PermissionLink } from "@/components/shared/permission-link";
import { ErrorState } from "@/components/shared/error-state";
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
  useAddDepartmentMember,
  useRemoveDepartmentMember,
} from "@/hooks/use-admin";
import { usePermissions } from "@/hooks/use-permissions";
import { useCurrentProfile } from "@/hooks/use-profile";

function formatDate(value: string | undefined): string {
  if (!value) return "—";
  try {
    return format(parseISO(value), "dd MMM yyyy");
  } catch {
    return value;
  }
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right font-medium">{value ?? "—"}</span>
    </div>
  );
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

  const handleRemove = (memberIdToRemove: string) => {
    removeMember.mutate(memberIdToRemove, {
      onSuccess: () => toast.success("Member removed from department"),
      onError: (err) => {
        toast.error("Failed to remove member", {
          description: err?.message || "Please try again.",
        });
      },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={department?.name ?? "Department"}
        breadcrumbs={[
          { label: "Departments", href: "/departments" },
          { label: department?.name ?? "Department" },
        ]}
        action={
          <Button variant="outline" asChild>
            <PermissionLink href="/departments">
              <ArrowLeft className="h-4 w-4" /> Back to departments
            </PermissionLink>
          </Button>
        }
      />
      {error ? (
        <ErrorState
          title="Could not load department"
          onRetry={() => void query.refetch()}
        />
      ) : isLoading || !department ? (
        <div className="space-y-4 mt-6">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <UrlTabs defaultValue="members" values={["members", "attendance"]}>
            <TabsList aria-label="Department workspace">
              <TabsTrigger value="members">Members & details</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
            </TabsList>
            <TabsContent
              value="members"
              forceMount
              className="space-y-4 data-[state=inactive]:hidden"
            >
              <section>
                <p className="text-sm font-medium mb-2">Details</p>
                <div className="rounded-lg border px-4 py-1">
                  <InfoRow
                    label="Description"
                    value={department.description || "—"}
                  />
                  <InfoRow label="Members" value={department.memberCount} />
                  <InfoRow
                    label="Created"
                    value={formatDate(department.createdAt)}
                  />
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">
                    Members ({department.memberCount})
                  </p>
                  <ExportDropdown
                    title="Department members"
                    filename="department-members"
                    columns={[
                      { key: "firstName", label: "First name" },
                      { key: "lastName", label: "Last name" },
                      { key: "role", label: "Role" },
                      { key: "joinedAt", label: "Joined" },
                    ]}
                    data={department.members.map((member) => ({ ...member }))}
                  />
                </div>
                <div className="rounded-lg border divide-y">
                  {department.members.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                      No members assigned yet.
                    </p>
                  ) : (
                    department.members.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {m.firstName} {m.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {m.role}
                          </p>
                        </div>
                        {canUpdate &&
                          (!isDepartmentHead || isOwnDepartment) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              disabled={removeMember.isPending}
                              onClick={() => handleRemove(m.memberId)}
                              aria-label={`Remove ${m.firstName} ${m.lastName}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                      </div>
                    ))
                  )}
                </div>

                {canUpdate && (!isDepartmentHead || isOwnDepartment) && (
                  <Dialog open={addOpen} onOpenChange={setAddOpen}>
                    <DialogTrigger asChild>
                      <Button className="mt-4" variant="outline">
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
                )}
              </section>
            </TabsContent>
            <TabsContent
              value="attendance"
              forceMount
              className="data-[state=inactive]:hidden"
            >
              <Tabs defaultValue="named">
                <TabsList className="h-9 w-fit rounded-full border border-line bg-card p-0.5">
                  <TabsTrigger
                    value="named"
                    className="rounded-full px-3.5 text-xs data-[state=active]:bg-ink data-[state=active]:text-paper"
                  >
                    Check-ins
                  </TabsTrigger>
                  <TabsTrigger
                    value="reported"
                    className="rounded-full px-3.5 text-xs data-[state=active]:bg-ink data-[state=active]:text-paper"
                  >
                    Reported totals
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="named" className="mt-4">
                  <DepartmentAttendancePanel
                    department={department}
                    canManage={
                      canUpdate && (!isDepartmentHead || !!isOwnDepartment)
                    }
                  />
                </TabsContent>
                <TabsContent value="reported" className="mt-4">
                  <GeneralAttendancePanel
                    context={{
                      type: "department",
                      id: department.id,
                      name: department.name,
                      branchId: department.branchId,
                      active: !department.archivedAt,
                    }}
                    canManage={
                      canUpdate && (!isDepartmentHead || !!isOwnDepartment)
                    }
                  />
                </TabsContent>
              </Tabs>
            </TabsContent>
          </UrlTabs>
        </div>
      )}
    </div>
  );
}
