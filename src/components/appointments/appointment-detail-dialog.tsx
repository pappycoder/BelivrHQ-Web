"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  CalendarClock,
  MapPin,
  NotebookPen,
  UserRound,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_TEXT,
  type Appointment,
} from "@/hooks/use-appointments";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  senior_pastor: "Senior Pastor",
  church_admin: "Church Admin",
  branch_pastor: "Branch Pastor",
  department_head: "Department Head",
  secretary: "Secretary",
  treasurer: "Treasurer",
  usher: "Usher",
  cell_leader: "Cell Leader",
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function PersonRow({
  name,
  role,
  isPastor,
  isVisitor,
  avatarUrl,
}: {
  name?: string;
  role?: string;
  isPastor: boolean;
  isVisitor?: boolean;
  avatarUrl?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Avatar className="size-9">
        <AvatarImage src={avatarUrl} alt={name ?? ""} />
        <AvatarFallback>
          {initials(name ?? "?") || <UserRound className="size-4" />}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{name || "Not available"}</p>
        <p className="truncate text-xs text-muted-foreground">
          {role && !isVisitor && (ROLE_LABEL[role] ?? role)}
          {isPastor ? " · Pastor" : ""}
          {isVisitor ? `${role ? " · " : ""}Visitor` : ""}
        </p>
      </div>
    </div>
  );
}

interface AppointmentDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
}

export function AppointmentDetailDialog({
  open,
  onOpenChange,
  appointment,
}: AppointmentDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2 pr-8">
            {appointment?.title ?? "Appointment"}
            {appointment && (
              <Badge
                variant="secondary"
                className={
                  APPOINTMENT_STATUS_TEXT[appointment.status as keyof typeof APPOINTMENT_STATUS_TEXT] ??
                  "bg-gray-100 text-gray-800"
                }
              >
                {APPOINTMENT_STATUS_LABELS[appointment.status as keyof typeof APPOINTMENT_STATUS_LABELS] ??
                  appointment.status}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>Appointment details</DialogDescription>
        </DialogHeader>

        {appointment && (
          <div className="space-y-5">
            {/* People */}
            <div className="space-y-3">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  With
                </p>
                <PersonRow
                  name={appointment.pastorName}
                  role={appointment.pastorRole}
                  isPastor
                  avatarUrl={appointment.pastorAvatarUrl}
                />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Who
                </p>
                <PersonRow
                  name={
                    appointment.whoKind === "visitor"
                      ? appointment.visitorName
                      : appointment.personName
                  }
                  role={appointment.whoKind === "visitor" ? "visitor" : "person"}
                  isPastor={false}
                  isVisitor={appointment.whoKind === "visitor"}
                  avatarUrl={appointment.whoKind === "visitor" ? undefined : appointment.personAvatarUrl}
                />
              </div>
            </div>

            {/* Scheduled */}
            <div className="flex items-center gap-3 text-sm">
              <CalendarClock className="size-4 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">Scheduled</span>
              <span className="font-medium">
                {format(new Date(appointment.scheduledAt), "EEE, MMM d, yyyy · h:mm a")}
              </span>
            </div>

            {/* Location */}
            {appointment.location && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="size-4 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">Location</span>
                <span className="font-medium">{appointment.location}</span>
              </div>
            )}

            {/* Notes */}
            {appointment.notes && (
              <div className="rounded-lg border bg-muted/40 p-3">
                <div className="flex items-center gap-2 text-sm font-medium mb-1">
                  <NotebookPen className="size-4 text-muted-foreground" />
                  Purpose / notes
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {appointment.notes}
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
