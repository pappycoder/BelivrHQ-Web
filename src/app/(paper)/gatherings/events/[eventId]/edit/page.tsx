"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Save } from "lucide-react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { PageHeader, SectionCard } from "@/components/paper/section";
import { EmptyState } from "@/components/paper/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { usePermissions } from "@/hooks/use-permissions";
import { useCurrentProfile } from "@/hooks/use-profile";
import { useBranchesList } from "@/hooks/use-branches";
import {
  useEvent,
  useUpdateEvent,
  EVENT_TYPES,
  type EventType,
} from "@/hooks/use-events";
import {
  EVENT_RECURRENCES,
  EVENT_RECURRENCE_LABELS,
  type EventRecurrence,
} from "@/lib/schedule-occurrence";
import { cn } from "@/lib/utils";

/**
 * Render a stored ISO timestamp inside a datetime-local control in the
 * viewer's OWN wall time. The previous `iso.slice(0,16)` showed UTC values as
 * local, so every save shifted the event by the timezone offset — which
 * `toIso` (which parses local) then persisted.
 */
const toLocal = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : format(d, "yyyy-MM-dd'T'HH:mm");
};
const toIso = (local: string) => {
  if (!local) return undefined;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
};

export default function EditEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = React.use(params);
  const router = useRouter();
  const { can, ready } = usePermissions();
  const { data: profile } = useCurrentProfile();
  const isHq = !!profile?.isAdminHq;
  const canUpdate = ready && can("events", "update");

  const event = useEvent(eventId);
  const updateEvent = useUpdateEvent(eventId);
  const branches = useBranchesList({ limit: 100 }, { enabled: isHq });

  const [form, setForm] = React.useState<null | {
    title: string; type: EventType; start: string; end: string;
    recurrence: EventRecurrence;
    location: string;
    description: string; capacity: string; isFree: boolean; price: string; branchId: string;
  }>(null);

  React.useEffect(() => {
    const e = event.data;
    if (e && !form) {
      setForm({
        title: e.title,
        type: e.type,
        start: toLocal(e.startDate),
        end: toLocal(e.endDate),
        recurrence: e.recurrence ?? "one_time",
        location: e.location ?? "",
        description: e.description ?? "",
        capacity: e.capacity ? String(e.capacity) : "",
        isFree: e.isFree,
        price: e.price ? String(e.price) : "",
        branchId: e.branchId ?? "",
      });
    }
  }, [event.data, form]);

  const set = (key: string, value: string | boolean) =>
    setForm((current) => (current ? { ...current, [key]: value } : current));

  if (!canUpdate) {
    return (
      <EmptyState
        title="Editing events needs the events grant"
        description="Your role can view the calendar but not amend it."
        action={<Button asChild variant="outline" size="sm" className="rounded-full border-line text-xs"><Link href="/gatherings/events">Back to the calendar</Link></Button>}
      />
    );
  }

  if (!form) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  if (event.isError) {
    return (
      <EmptyState
        title="We couldn&apos;t open this event"
        description="It may have been deleted, or the link is old."
        action={<Button asChild variant="outline" size="sm" className="rounded-full border-line text-xs"><Link href="/gatherings/events">Back to the calendar</Link></Button>}
      />
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Even an event needs a name."); return; }
    if (!form.start) { toast.error("Every event needs a start date and time."); return; }
    // Same day-key rules the service dialog and the API enforce.
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
    updateEvent.mutate(
      {
        title: form.title.trim(),
        type: form.type,
        startDate: toIso(form.start),
        endDate: form.end ? toIso(form.end) : null,
        recurrence: form.recurrence,
        location: form.location.trim() || undefined,
        description: form.description.trim() || undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        isFree: form.isFree,
        price: !form.isFree && form.price ? Number(form.price) : undefined,
      },
      {
        onSuccess: () => { toast.success("Event updated."); router.push(`/gatherings/events/${eventId}`); },
        onError: (err) => toast.error(getToastErrorMessage(err, "Couldn't save the event.")),
      },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href={`/gatherings/events/${eventId}`} className="flex items-center gap-1.5 hover:text-ink">
            <ArrowLeft className="size-3" /> Gatherings · Events
          </Link>
        }
        title="Amend the plan."
        description="Change what needs changing. The calendar, the roster and the tickets all follow."
      />

      <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <SectionCard eyebrow="Details" title="What is it?">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Title</Label>
                <Input value={form.title} onChange={(e) => set("title", e.target.value)} className="h-10 rounded-lg border-line bg-card text-sm shadow-none" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Type</Label>
                <div className="flex flex-wrap gap-1.5">
                  {EVENT_TYPES.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => set("type", item.value)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-[11px] transition-colors",
                        form.type === item.value ? "border-ink/20 bg-ink text-paper" : "border-line bg-card text-ink-soft hover:border-ink/20",
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Description</Label>
                <Textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} className="resize-none rounded-lg border-line bg-card text-xs shadow-none" />
              </div>
            </div>
          </SectionCard>

          <SectionCard eyebrow="When & where" title="On the calendar">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Repeats</Label>
                <div className="flex flex-wrap gap-1.5">
                  {EVENT_RECURRENCES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => set("recurrence", item)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-[11px] transition-colors",
                        form.recurrence === item ? "border-ink/20 bg-ink text-paper" : "border-line bg-card text-ink-soft hover:border-ink/20",
                      )}
                    >
                      {EVENT_RECURRENCE_LABELS[item]}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] leading-relaxed text-ink-faint">
                  {form.recurrence === "weekly"
                    ? form.start
                      ? `Repeats every ${new Date(form.start).toLocaleDateString("en-GB", { weekday: "long" })} from the start date until the end date (or indefinitely).`
                      : "Repeats every week on the start date's weekday, until the end date or indefinitely."
                    : form.recurrence === "multi_day"
                      ? "Runs every day from the start date through the end date, inclusive. The check-in desk steps through the whole window."
                      : "Happens on the start day alone. The end time just closes that day. Check-in rejects any other date."}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Starts</Label>
                <Input picker="wheel" type="datetime-local" value={form.start} onChange={(e) => set("start", e.target.value)} className="h-10 rounded-lg border-line bg-card text-sm shadow-none" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {form.recurrence === "one_time"
                    ? "Ends (same day)"
                    : form.recurrence === "multi_day"
                      ? "Ends"
                      : "Until (optional)"}
                </Label>
                <Input picker="wheel" type="datetime-local" value={form.end} onChange={(e) => set("end", e.target.value)} className="h-10 rounded-lg border-line bg-card text-sm shadow-none" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Location</Label>
                <Input value={form.location} onChange={(e) => set("location", e.target.value)} className="h-10 rounded-lg border-line bg-card text-sm shadow-none" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Capacity</Label>
                <Input inputMode="numeric" value={form.capacity} onChange={(e) => set("capacity", e.target.value.replace(/[^\d]/g, ""))} className="num h-10 rounded-lg border-line bg-card text-sm shadow-none" />
              </div>
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-4">
          <SectionCard eyebrow="Access" title="Free or ticketed">
            <label className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5">
              <span className="text-xs">Free entry</span>
              <Switch checked={form.isFree} onCheckedChange={(v) => set("isFree", !!v)} />
            </label>
            {!form.isFree ? (
              <div className="mt-3 space-y-1.5">
                <Label className="text-xs">Ticket price (₦)</Label>
                <Input inputMode="numeric" value={form.price} onChange={(e) => set("price", e.target.value.replace(/[^\d]/g, ""))} className="num h-10 rounded-lg border-line bg-card text-sm shadow-none" />
                <p className="text-[10px] leading-relaxed text-ink-faint">Tiers per ticket type are managed on the Tiers page.</p>
              </div>
            ) : null}
          </SectionCard>

          {isHq ? (
            <SectionCard eyebrow="Home" title="Branch">
              <select value={form.branchId} onChange={(e) => set("branchId", e.target.value)} className="h-10 w-full rounded-lg border border-line bg-card px-2 text-xs outline-none" aria-label="Branch">
                <option value="">Church-wide (all branches)</option>
                {(branches.data?.data ?? []).map((b) => <option key={b.branchId} value={b.branchId}>{b.name}</option>)}
              </select>
            </SectionCard>
          ) : null}

          <Button type="submit" className="h-11 w-full gap-2 rounded-xl text-sm" disabled={updateEvent.isPending}>
            <Save className="size-4" /> {updateEvent.isPending ? "Saving…" : "Save changes"}
          </Button>
        </aside>
      </form>
    </div>
  );
}
