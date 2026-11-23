"use client";

import { FormActions } from "@/components/shared/form-actions";

import { CreatePreviewCard, CreatePreviewSidebar } from "@/components/shared/create-preview";


import { GuidedRecordForm } from "@/components/shared/guided-record-form";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarPlus, Ticket } from "lucide-react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { PageHeader, SectionCard } from "@/components/paper/section";
import { PageTour, type TourStep } from "@/components/tours/page-tour";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { usePermissions } from "@/hooks/use-permissions";
import { useCurrentProfile } from "@/hooks/use-profile";
import { useBranchesList } from "@/hooks/use-branches";
import { useCreateEvent, EVENT_TYPES, EVENT_CREATION_TYPES, type EventType } from "@/hooks/use-events";
import {
  EVENT_RECURRENCES,
  EVENT_RECURRENCE_LABELS,
  type EventRecurrence,
} from "@/lib/schedule-occurrence";
import { cn } from "@/lib/utils";

const NEW_EVENT_TOUR_STEPS: TourStep[] = [
  { target: ".new-event-tour-heading", title: "Plan a new event", description: "Use this form to prepare an event. Fields marked with an asterisk are required. The tour explains each part without entering details or submitting the form. You can replay it with Take a tour." },
  { target: ".new-event-tour-title", title: "Give the event a title", description: "Enter a clear event name. Title is required and appears in the calendar preview as you type. The placeholder is only an example, not a saved title." },
  { target: ".new-event-tour-type", title: "Choose an event type", description: "Choose Conference, Lifecycle, Training or Social. Conference is selected initially. Service schedules are created separately with Add service on the calendar or in the service register." },
  { target: ".new-event-tour-description", title: "Describe what to expect", description: "Add an optional description to explain the event. Keep useful details here, such as its purpose and who should attend. Typing only updates this form until you create the event." },
  { target: ".new-event-tour-recurrence", title: "Choose how the event repeats", description: "One-time stays on one calendar day. Every week repeats on the start date's weekday until the optional end date, or indefinitely. Date range runs each day from start through end, inclusive, and requires an end date." },
  { target: ".new-event-tour-start", title: "Set the start date and time", description: "Starts is required. Open its picker, choose the date and 24-hour time, then Apply. Cancel closes the picker without applying its draft. For weekly events, the start date also determines the recurring weekday." },
  { target: ".new-event-tour-end", title: "Review the end of the schedule", description: "One-time events can have an end time on the same day. Date range requires an end date on or after the start date. Weekly events have an optional Until date. Review the time as well as the date before saving." },
  { target: ".new-event-tour-location", title: "Tell people where to gather", description: "Location is optional. Enter the venue or meeting location you want shown with the event. It also appears in the preview; changing it here does not reserve a venue." },
  { target: ".new-event-tour-capacity", title: "Set a capacity when needed", description: "Capacity is an optional numeric limit for the event. Leave it blank if you do not want to set a capacity here. Check the value before creating the event; the preview shows what you entered." },
  { target: ".new-event-tour-branch", title: "Check the event's branch", description: "HQ accounts must select a branch. Other accounts see the branch the event will belong to. This choice determines the event's scope; it does not change your account's access." },
  { target: ".new-event-tour-pricing", title: "Choose free or priced attendance", description: "Free to attend starts switched on. If your plan includes paid events, turn it off to reveal Price. Plans that support free events only keep this switch locked. Free admission does not necessarily remove the need to register." },
  { target: ".new-event-tour-price", title: "Review the ticket price", description: "Enter the price for a priced event. Review it carefully before saving. Ticket tiers, check-in codes and checkout are managed from the event page after creation. This form does not charge anyone." },
  { target: ".new-event-tour-preview", title: "Check the calendar preview", description: "The preview follows your title, start date, location, type, capacity and pricing choices. It is a local summary of this draft, not a saved calendar entry. On small screens it appears below the form sections." },
  { target: ".new-event-tour-submit", title: "Create only when ready", description: "Create event validates the required fields and submits the form. Successful creation opens the new event's record. Review the schedule, branch and pricing first. Next and Finish in this tour never create an event." },
  { target: ".new-event-tour-cancel", title: "Leave without creating an event", description: "Cancel returns to the calendar without saving this form. The Gatherings · Events link above does the same. Draft entries are not saved automatically, so finish reviewing them before leaving." },
];

function toIso(local: string) {
  if (!local) return undefined;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export default function NewEventPage() {
  const router = useRouter();
  const { can, ready } = usePermissions();
  const { data: profile } = useCurrentProfile();
  const isHq = !!profile?.isAdminHq;
  const canCreatePaidEvents = profile?.planFeatures?.includes("tickets") === true;
  // Coarse `events:create` grant — the previous "events:create" resource
  // string built a nonexistent `events:create:create` code that never opened.
  const canCreate = ready && can("events", "create");

  const branches = useBranchesList({ limit: 100 }, { enabled: isHq });
  const createEvent = useCreateEvent();

  const [form, setForm] = React.useState({
    title: "",
    type: "conference" as EventType,
    start: "",
    end: "",
    recurrence: "one_time" as EventRecurrence,
    location: "",
    description: "",
    capacity: "",
    isFree: true,
    price: "",
    branchId: "",
  });
  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canCreatePaidEvents && !form.isFree) { toast.error("Your plan supports free events. Paid events require Network or Enterprise."); return; }
    if (!form.title.trim()) { toast.error("Every event needs a name."); return; }
    if (!form.start) { toast.error("When is it, at least roughly?"); return; }
    // Same local-calendar-day arithmetic the service dialog uses: datetime-local
    // values carry their day in the first 10 characters, so no timezone maths.
    const startDay = form.start.slice(0, 10);
    const endDay = form.end ? form.end.slice(0, 10) : "";
    if (form.recurrence === "one_time" && endDay && endDay !== startDay) {
      toast.error("A one-time event happens on a single day. Pick Date range to run across several.");
      return;
    }
    if (form.recurrence === "multi_day") {
      if (!endDay) { toast.error("A date-range event needs an end date."); return; }
      if (endDay < startDay) { toast.error("The end date must be on or after the start date."); return; }
    }
    if (form.recurrence === "weekly" && endDay && endDay < startDay) {
      toast.error("The end date must be on or after the start date.");
      return;
    }
    createEvent.mutate(
      {
        title: form.title.trim(),
        type: form.type,
        startDate: toIso(form.start) ?? form.start,
        endDate: toIso(form.end),
        recurrence: form.recurrence,
        location: form.location.trim() || undefined,
        description: form.description.trim() || undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        isFree: form.isFree,
        price: !form.isFree && form.price ? Number(form.price) : undefined,
        branchId: isHq && form.branchId ? form.branchId : undefined,
      },
      {
        onSuccess: (created) => {
          toast.success(`${created.title} is on the calendar.`);
          router.push(`/gatherings/events/${created.eventId}`);
        },
        onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't create the event.")),
      },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        className="new-event-tour-heading"
        actions={<PageTour page="Create event" account={profile ? `${profile.churchId}:${profile.profileId}` : undefined} ready={ready && canCreate && !createEvent.isPending} steps={NEW_EVENT_TOUR_STEPS} />}
        eyebrow={
          <Link href="/gatherings/events" className="flex items-center gap-1.5 hover:text-ink">
            <ArrowLeft className="size-3" /> Gatherings · Events
          </Link>
        }
        title="Plan something new."
        description="A few honest fields now, a calm week later."
      />

      {!canCreate ? (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-ink-soft">
          Your role can view the calendar but not create events.
        </p>
      ) : (
        <GuidedRecordForm onSubmit={submit}>
          <div className="min-w-0 space-y-4">
            <SectionCard eyebrow="Details" title="What is it?">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="new-event-tour-title space-y-1.5 sm:col-span-2">
                  <Label required className="text-sm" htmlFor="new-event-title">Title</Label>
                  <Input id="new-event-title" required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Sunday Gathering" className="h-10 rounded-lg border-line bg-card text-sm shadow-none" />
                </div>
                <div className="new-event-tour-type space-y-1.5 sm:col-span-2">
                  <Label className="text-sm">Type</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {EVENT_CREATION_TYPES.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => set("type", item.value)}
                        aria-pressed={form.type === item.value}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-sm transition-colors",
                          form.type === item.value ? "border-ink/20 bg-ink text-paper" : "border-line bg-card text-ink-soft hover:border-ink/20",
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="new-event-tour-description space-y-1.5 sm:col-span-2">
                  <Label className="text-sm" htmlFor="new-event-description">Description</Label>
                  <Textarea id="new-event-description" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="A sentence people can picture themselves in…" className="resize-none rounded-lg border-line bg-card text-sm shadow-none" />
                </div>
              </div>
            </SectionCard>

            <SectionCard eyebrow="When & where" title="Put it on the calendar">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="new-event-tour-recurrence space-y-1.5 sm:col-span-2">
                  <Label className="text-sm">Repeats</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {EVENT_RECURRENCES.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => set("recurrence", item)}
                        aria-pressed={form.recurrence === item}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-sm transition-colors",
                          form.recurrence === item ? "border-ink/20 bg-ink text-paper" : "border-line bg-card text-ink-soft hover:border-ink/20",
                        )}
                      >
                        {EVENT_RECURRENCE_LABELS[item]}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs leading-relaxed text-ink-faint">
                    {form.recurrence === "weekly"
                      ? form.start
                        ? `Repeats every ${new Date(form.start).toLocaleDateString("en-GB", { weekday: "long" })} from the start date until the end date (or indefinitely).`
                        : "Repeats every week on the start date's weekday, until the end date or indefinitely."
                      : form.recurrence === "multi_day"
                        ? "Runs every day from the start date through the end date, inclusive. The check-in desk steps through the whole window."
                        : "Happens on the start day alone. The end time just closes that day. Check-in rejects any other date."}
                  </p>
                </div>
                <div className="new-event-tour-start space-y-1.5">
                  <Label required className="text-sm" htmlFor="new-event-start">Starts</Label>
                  <Input id="new-event-start" required picker="wheel" type="datetime-local" value={form.start} onChange={(e) => set("start", e.target.value)} className="h-10 rounded-lg border-line bg-card text-sm shadow-none" />
                </div>
                <div className="new-event-tour-end space-y-1.5">
                  <Label htmlFor="new-event-end" required={form.recurrence === "multi_day"} className="text-sm">
                    {form.recurrence === "one_time"
                      ? "Ends (same day)"
                      : form.recurrence === "multi_day"
                        ? "Ends"
                        : "Until (optional)"}
                  </Label>
                  <Input id="new-event-end" required={form.recurrence === "multi_day"} picker="wheel" type="datetime-local" value={form.end} onChange={(e) => set("end", e.target.value)} className="h-10 rounded-lg border-line bg-card text-sm shadow-none" />
                </div>
                <div className="new-event-tour-location space-y-1.5">
                  <Label className="text-sm" htmlFor="new-event-location">Location</Label>
                  <Input id="new-event-location" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Main Hall" className="h-10 rounded-lg border-line bg-card text-sm shadow-none" />
                </div>
                <div className="new-event-tour-capacity space-y-1.5">
                  <Label className="text-sm" htmlFor="new-event-capacity">Capacity</Label>
                  <Input id="new-event-capacity" type="number" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} placeholder="400" className="h-10 rounded-lg border-line bg-card text-sm shadow-none" />
                </div>
                {isHq ? (
                  <div className="new-event-tour-branch space-y-1.5 sm:col-span-2">
                    <Label required className="text-sm" htmlFor="new-event-branch">Branch</Label>
                    <select id="new-event-branch" required value={form.branchId} onChange={(e) => set("branchId", e.target.value)} className="h-10 w-full rounded-lg border border-line bg-card px-2 text-sm outline-none">
                      <option value="">Select a branch</option>
                      {(branches.data?.data ?? []).map((b) => (
                        <option key={b.branchId} value={b.branchId}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="new-event-tour-branch text-sm text-ink-faint sm:col-span-2">
                    This event will belong to {profile?.branch?.name ?? "your branch"}.
                  </p>
                )}
              </div>
            </SectionCard>

            <SectionCard className="new-event-tour-pricing" eyebrow="Tickets" title="Free or priced">
              <label className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5">
                <span className="flex items-center gap-2 text-sm"><Ticket className="size-3.5 text-ink-faint" /> Free to attend</span>
                <Switch disabled={!canCreatePaidEvents} checked={form.isFree} onCheckedChange={(v) => set("isFree", !!v)} />
              </label>
              {!canCreatePaidEvents && <p className="mt-3 text-sm leading-relaxed text-ink-muted">Your plan includes free events. Paid events are available on Network and Enterprise.</p>}
              {!form.isFree ? (
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div className="new-event-tour-price space-y-1.5">
                    <Label className="text-sm" htmlFor="new-event-price">Price</Label>
                    <Input id="new-event-price" type="number" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="10" className="h-10 rounded-lg border-line bg-card text-sm shadow-none" />
                  </div>
                  <p className="self-end text-xs leading-relaxed text-ink-faint">
                    Ticket tiers, check-in codes and checkout are managed from the event page after saving.
                  </p>
                </div>
              ) : null}
            </SectionCard>
          </div>

          <CreatePreviewSidebar>
            <CreatePreviewCard eyebrow="Calendar preview" title={form.title || "Untitled gathering"}>
              <div className="new-event-tour-preview space-y-3">
                <p className="mt-1 text-sm text-ink-soft">
                  {form.start ? new Date(form.start).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) : "Date not set"}
                  {form.location ? ` · ${form.location}` : ""}
                </p>
                <p className="mt-2 text-xs text-ink-faint">
                  {EVENT_TYPES.find((t) => t.value === form.type)?.label}
                  {form.capacity ? ` · capacity ${form.capacity}` : ""} · {form.isFree ? "free" : form.price ? `${form.price}/seat` : "priced"}
                </p>
              </div>
            </CreatePreviewCard>
            <FormActions>
              <Button type="submit" disabled={createEvent.isPending} className="new-event-tour-submit mt-4 h-10 w-full gap-2 rounded-lg text-sm">
                <CalendarPlus className="size-4" /> {createEvent.isPending ? "Creating…" : "Create event"}
              </Button>
              <Button asChild variant="ghost" className="new-event-tour-cancel mt-2 h-9 w-full rounded-lg text-sm text-ink-soft">
                <Link href="/gatherings/events">Cancel</Link>
              </Button>
            </FormActions>
          </CreatePreviewSidebar>
        </GuidedRecordForm>
      )}
    </div>
  );
}
