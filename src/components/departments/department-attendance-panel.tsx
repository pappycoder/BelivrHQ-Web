"use client";

import { ValidatedForm } from "@/components/ui/validated-form";
import { MeetingAttendanceRoster } from "./meeting-attendance-roster";
import { useState } from "react";
import {
  useDepartmentAttendance,
  useRecordDepartmentAttendance,
  type Department,
} from "@/hooks/use-admin";
import { MeetingAttendanceTable } from "./meeting-attendance-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getToastErrorMessage, toast } from "@/lib/toast";
export function DepartmentAttendancePanel({
  department,
  canManage,
}: {
  department: Department;
  canManage: boolean;
}) {
  const [date, setDate] = useState("");
  const [open, setOpen] = useState(false);
  const [savingRoster, setSavingRoster] = useState(false);
  const [mode, setMode] = useState("members");
  const [visitorName, setVisitorName] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [status, setStatus] = useState("present");
  const [notes, setNotes] = useState("");
  const query = useDepartmentAttendance(department.id, date);
  const mutation = useRecordDepartmentAttendance(department.id);
  return (
    <>
      <MeetingAttendanceTable
        title="Department meeting attendance"
        records={query.data ?? []}
        date={date}
        onDateChange={setDate}
        loading={query.isLoading}
        error={query.isError}
        onRetry={() => query.refetch()}
        action={
          canManage && !department.archivedAt ? (
            <Button
              onClick={() => {
                setMode("members");
                setVisitorName("");
                setMeetingDate(date || new Date().toISOString().slice(0, 10));
                setStatus("present");
                setNotes("");
                setOpen(true);
              }}
            >
              Record meeting attendance
            </Button>
          ) : undefined
        }
      />
      <Dialog
        open={open && canManage}
        onOpenChange={(value) => {
          if (!savingRoster) setOpen(value);
        }}
      >
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record department meeting attendance</DialogTitle>
            <DialogDescription>
              Select several department members from the roster, or record a
              visitor. Saving the same member and date updates their attendance.
            </DialogDescription>
          </DialogHeader>
          <ValidatedForm
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!canManage || mode !== "visitor") return;
              try {
                await mutation.mutateAsync({
                  visitorName: visitorName.trim(),
                  meetingDate,
                  status,
                  notes,
                });
                setOpen(false);
                toast.success("Attendance recorded");
              } catch (error) {
                toast.error("Attendance could not be recorded", {
                  description: getToastErrorMessage(error, "Please try again."),
                });
              }
            }}
          >
            <fieldset disabled={savingRoster} className="space-y-4">
              <Label required className="grid gap-2">
                Meeting date
                <Input
                  picker="wheel"
                  aria-label="Department meeting date"
                  type="date"
                  required
                  value={meetingDate}
                  onChange={(event) => setMeetingDate(event.target.value)}
                />
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={mode === "members" ? "default" : "outline"}
                  onClick={() => setMode("members")}
                >
                  Members (Roster)
                </Button>
                <Button
                  type="button"
                  variant={mode === "visitor" ? "default" : "outline"}
                  onClick={() => setMode("visitor")}
                >
                  Visitor
                </Button>
              </div>
              {mode === "visitor" && (
                <Label className="grid gap-2">
                  Visitor name
                  <Input
                    aria-label="Department visitor name"
                    required
                    maxLength={200}
                    value={visitorName}
                    onChange={(event) => setVisitorName(event.target.value)}
                  />
                </Label>
              )}
              <Label required className="grid gap-2">
                Status
                <select
                  aria-label="Department attendance status"
                  className="h-10 rounded-md border bg-background px-3"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  {["present", "late", "absent", "excused"].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </Label>
              <Label required className="grid gap-2">
                Notes
                <Input
                  aria-label="Department attendance notes"
                  maxLength={1000}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </Label>
              {mode === "members" && (
                <MeetingAttendanceRoster
                  type="department"
                  onBusyChange={setSavingRoster}
                  id={department.id}
                  members={department.members}
                  meetingDate={meetingDate}
                  status={status}
                  notes={notes}
                />
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={mutation.isPending}
                >
                  Cancel
                </Button>
                {mode === "visitor" && (
                  <Button
                    type="submit"
                    disabled={
                      mutation.isPending || !meetingDate || !visitorName.trim()
                    }
                  >
                    Save attendance
                  </Button>
                )}
              </div>
            </fieldset>
          </ValidatedForm>
        </DialogContent>
      </Dialog>
    </>
  );
}
