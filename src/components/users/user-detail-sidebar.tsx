import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WorkspaceAvatar } from "@/components/workspace/workspace-presentation";
import { Separator } from "@/components/ui/separator";
import { type UserProfile } from "@/hooks/use-users";
import { useRoleLabelMap, resolveRoleLabel } from "@/hooks/use-roles";
import { Mail, Phone, Calendar, Shield, Church, MapPin } from "lucide-react";

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function RoleBadge({
  role,
  labels,
}: {
  role: string;
  labels: Map<string, string>;
}) {
  const variant = role === "super_admin" ? "destructive" : "secondary";
  return (
    <Badge variant={variant} className="text-xs">
      {resolveRoleLabel(role, labels)}
    </Badge>
  );
}

interface UserDetailSidebarProps {
  user: UserProfile;
}

export function UserDetailSidebar({ user }: UserDetailSidebarProps) {
  const labels = useRoleLabelMap();
  return (
    <Card>
      <CardHeader className="text-center">
        <WorkspaceAvatar
          id={user.profileId}
          name={`${user.firstName} ${user.lastName}`}
          photoUrl={user.avatarUrl ?? user.member?.photoUrl}
          className="mx-auto size-14"
        />
        <h1 className="mt-2 text-xl font-semibold">
          {user.firstName} {user.lastName}
        </h1>
        <div className="flex justify-center gap-2 mt-1">
          <Badge variant={user.status === "active" ? "default" : "destructive"}>
            {user.status}
          </Badge>
          {user.mfaEnabled && <Badge variant="secondary">MFA Enabled</Badge>}
          {user.isAdminHq && (
            <Badge
              variant="secondary"
              title="Admin HQ — cross-branch access enabled"
            >
              Admin HQ
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-start gap-3">
            <span className="text-muted-foreground mt-0.5">
              <Shield className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Roles</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {(user.role?.length ? user.role : ["No role assigned"]).map(
                  (role) => (
                    <RoleBadge key={role} role={role} labels={labels} />
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
        {user.email && (
          <InfoRow
            icon={<Mail className="h-4 w-4" />}
            label="Email"
            value={user.email}
          />
        )}
        {user.phone && (
          <InfoRow
            icon={<Phone className="h-4 w-4" />}
            label="Phone"
            value={user.phone}
          />
        )}
        {user.branch && (
          <InfoRow
            icon={<MapPin className="h-4 w-4" />}
            label="Branch"
            value={`${user.branch.name}${user.branch.isHeadquarters ? " (HQ)" : ""}`}
          />
        )}
        {user.church && (
          <InfoRow
            icon={<Church className="h-4 w-4" />}
            label="Church"
            value={user.church.name}
          />
        )}
        <Separator />
        <InfoRow
          icon={<Calendar className="h-4 w-4" />}
          label="Joined"
          value={new Date(user.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        />
      </CardContent>
    </Card>
  );
}
