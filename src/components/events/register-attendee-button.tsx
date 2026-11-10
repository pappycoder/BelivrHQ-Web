"use client";

import { RequiredIndicator } from "@/components/ui/required-fields";
import { ValidatedForm } from "@/components/ui/validated-form";

import { useRef, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MemberCombobox } from "@/components/members/member-combobox";
import {
  type EventItem,
  useEventRegistrations,
  useRegisterForEvent,
} from "@/hooks/use-events";
import { usePermissions } from "@/hooks/use-permissions";
import { getToastErrorMessage, toast } from "@/lib/toast";

/** Free registration is separate from recording attendance or selling tickets. */
export function RegisterAttendeeButton({ event }: { event: EventItem }) {
  const { can } = usePermissions();
  const [open, setOpen] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [memberName, setMemberName] = useState("");
  const [error, setError] = useState("");
  const lock = useRef(false);
  const registration = useRegisterForEvent(event.eventId);
  const registrations = useEventRegistrations(event.eventId);

  if (
    !event.isFree ||
    event.archivedAt ||
    !can("events:registrations", "create")
  )
    return null;

  const full = !!event.capacity && event.registrationCount >= event.capacity;
  const changeOpen = (next: boolean) => {
    if (lock.current) return;
    setOpen(next);
    if (next) {
      setMemberId("");
      setMemberName("");
      setError("");
    }
  };
  const submit = async () => {
    if (lock.current || !memberId || full) return;
    lock.current = true;
    setError("");
    try {
      await registration.mutateAsync({ memberId, quantity: 1 });
      toast.success(`${memberName || "Attendee"} registered`, {
        description: `Registration for ${event.title} is confirmed. Attendance has not been marked.`,
      });
      setOpen(false);
    } catch (cause) {
      setError(
        getToastErrorMessage(
          cause,
          "Registration could not be saved. Please try again.",
        ),
      );
    } finally {
      lock.current = false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <Button
        type="button"
        size="sm"
        disabled={full}
        onClick={() => changeOpen(true)}
      >
        <UserPlus className="mr-2 h-4 w-4" />
        {full ? "Event Full" : "Register Attendee"}
      </Button>
      <DialogContent showCloseButton={!registration.isPending}>
        <DialogHeader>
          <DialogTitle>Register Attendee</DialogTitle>
          <DialogDescription>
            Register a member for {event.title}. This event is free.
            Registration reserves a place; attendance is recorded separately on
            the event check-in page.
          </DialogDescription>
        </DialogHeader>
        <ValidatedForm
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className="space-y-4"
        >
          <fieldset disabled={registration.isPending} className="space-y-2">
            <p className="text-sm font-medium">Member <RequiredIndicator /></p>
            <MemberCombobox
              value={memberId}
              selectedName={memberName}
              disabled={registration.isPending}
              excludeIds={(registrations.data ?? []).map(
                (item) => item.memberId,
              )}
              onChange={(id, member) => {
                setMemberId(id);
                setMemberName(
                  member ? `${member.firstName} ${member.lastName}`.trim() : "",
                );
                setError("");
              }}
            />
          </fieldset>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={registration.isPending}
              onClick={() => changeOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!memberId || registration.isPending || full}
            >
              {registration.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {registration.isPending ? "Registering…" : "Confirm Registration"}
            </Button>
          </DialogFooter>
        </ValidatedForm>
      </DialogContent>
    </Dialog>
  );
}
