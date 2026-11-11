"use client";

import { RequiredFieldsNotice } from "@/components/ui/required-fields";

import * as React from "react";
import { toast } from "@/lib/toast";
import { ClipboardCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MeetingAttendanceRoster } from "./meeting-attendance-roster";
import type { CellGroupMember } from "@/hooks/use-admin";
import { VisitorCombobox } from "@/components/visitors/visitor-combobox";
import { useCreateVisitor } from "@/hooks/use-visitors";
import {
  ATTENDANCE_STATUSES,
  useRecordCellGroupAttendance,
} from "@/hooks/use-admin";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

interface CellGroupAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  attendanceDate?: string;
  members: CellGroupMember[];
  loadingMembers?: boolean;
  membersError?: boolean;
  onRetryMembers?: () => void;
}

export function CellGroupAttendanceDialog({
  open,
  onOpenChange,
  groupId,
  groupName,
  attendanceDate,
  members,
  loadingMembers,
  membersError,
  onRetryMembers,
}: CellGroupAttendanceDialogProps) {
  const recordAttendance = useRecordCellGroupAttendance(groupId);
  const createVisitor = useCreateVisitor();

  const [savingRoster, setSavingRoster] = React.useState(false);
  const [tab, setTab] = React.useState("member");
  const [meetingDate, setMeetingDate] = React.useState(todayISO());
  const [status, setStatus] = React.useState("present");
  const [notes, setNotes] = React.useState("");

  const [visitorId, setVisitorId] = React.useState("");
  const [visitorName, setVisitorName] = React.useState("");

  const [newVisitor, setNewVisitor] = React.useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });

  React.useEffect(() => {
    if (open) {
      setTab("member");
      setMeetingDate(attendanceDate || todayISO());
      setStatus("present");
      setNotes("");
      setVisitorId("");
      setVisitorName("");
      setNewVisitor({ firstName: "", lastName: "", phone: "", email: "" });
    }
  }, [open, attendanceDate]);

  const record = (
    payload: { memberId?: string; visitorId?: string; visitorName?: string },
    successMessage: string,
  ) => {
    if (!meetingDate) { toast.error("Meeting date is required."); return; }
    recordAttendance.mutate(
      {
        ...payload,
        meetingDate: new Date(meetingDate).toISOString(),
        status: status || "present",
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(successMessage);
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error("Failed to record attendance", {
            description: error?.message || "Please try again.",
          });
        },
      },
    );
  };

  const submitVisitor = () => {
    if (!visitorId) {
      toast.error("Select a visitor");
      return;
    }
    record(
      { visitorId },
      `Attendance recorded for ${visitorName || "visitor"}`,
    );
  };

  const submitNewVisitor = () => {
    if (!meetingDate) { toast.error("Meeting date is required."); return; }
    if (!newVisitor.firstName.trim()) {
      toast.error("First name is required");
      return;
    }
    createVisitor.mutate(
      {
        firstName: newVisitor.firstName.trim(),
        lastName: newVisitor.lastName?.trim() || undefined,
        phone: newVisitor.phone?.trim() || undefined,
        email: newVisitor.email?.trim() || undefined,
      },
      {
        onSuccess: (visitor) => {
          record(
            { visitorId: visitor.id },
            `Visitor ${visitor.firstName} ${visitor.lastName ?? ""}`.trim() +
              " added and checked in",
          );
        },
        onError: (error) => {
          toast.error("Failed to create visitor", {
            description: error?.message || "Please try again.",
          });
        },
      },
    );
  };

  const pending =
    recordAttendance.isPending || createVisitor.isPending || savingRoster;

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!pending) onOpenChange(value);
      }}
    >
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" /> Record Attendance
          </DialogTitle>
          <DialogDescription>
            Record member or visitor attendance for {groupName}.
          </DialogDescription>
        </DialogHeader>

        <fieldset disabled={savingRoster} className="space-y-4">
          <RequiredFieldsNotice className="col-span-full" />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="meeting-date">Meeting Date *</Label>
              <Input picker="wheel"
                id="meeting-date"
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label required htmlFor="attendance-status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="attendance-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ATTENDANCE_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs value={tab} onValueChange={setTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="member">Members (Roster)</TabsTrigger>
              <TabsTrigger value="visitor">Visitor</TabsTrigger>
              <TabsTrigger value="new">New Visitor</TabsTrigger>
            </TabsList>

            <TabsContent value="member" className="pt-4">
              <MeetingAttendanceRoster
                type="cell_group"
                onBusyChange={setSavingRoster}
                id={groupId}
                members={members}
                meetingDate={meetingDate}
                status={status}
                notes={notes}
                loading={loadingMembers}
                error={membersError}
                onRetry={onRetryMembers}
              />
            </TabsContent>

            <TabsContent value="visitor" className="pt-4">
              <VisitorCombobox
                value={visitorId}
                onChange={(id, visitor) => {
                  setVisitorId(id);
                  setVisitorName(
                    visitor ? `${visitor.firstName} ${visitor.lastName}` : "",
                  );
                }}
                selectedName={visitorName}
                placeholder="Select visitor..."
              />
              <Button
                className="w-full mt-4"
                onClick={submitVisitor}
                disabled={pending || !visitorId}
              >
                {pending ? "Recording..." : "Record Attendance"}
              </Button>
            </TabsContent>

            <TabsContent value="new" className="pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-first-name">First Name *</Label>
                  <Input
                    id="new-first-name"
                    placeholder="First name"
                    value={newVisitor.firstName}
                    onChange={(e) =>
                      setNewVisitor({
                        ...newVisitor,
                        firstName: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-last-name">Last Name</Label>
                  <Input
                    id="new-last-name"
                    placeholder="Last name"
                    value={newVisitor.lastName}
                    onChange={(e) =>
                      setNewVisitor({ ...newVisitor, lastName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-phone">Phone</Label>
                  <Input
                    id="new-phone"
                    placeholder="+234..."
                    value={newVisitor.phone}
                    onChange={(e) =>
                      setNewVisitor({ ...newVisitor, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-email">Email</Label>
                  <Input
                    id="new-email"
                    type="email"
                    placeholder="name@example.com"
                    value={newVisitor.email}
                    onChange={(e) =>
                      setNewVisitor({ ...newVisitor, email: e.target.value })
                    }
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Creates a visitor record, then checks them in automatically.
              </p>
              <Button
                className="w-full mt-4"
                onClick={submitNewVisitor}
                disabled={pending}
              >
                {pending
                  ? createVisitor.isPending
                    ? "Creating visitor..."
                    : "Recording..."
                  : "Create Visitor & Check In"}
              </Button>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="attendance-notes">Notes</Label>
            <Input
              id="attendance-notes"
              placeholder="Optional note..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
          </DialogFooter>
        </fieldset>
      </DialogContent>
    </Dialog>
  );
}
