"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarPlus, Ticket } from "lucide-react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { PageHeader, SectionCard } from "@/components/paper/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { usePermissions } from "@/hooks/use-permissions";
import { useCurrentProfile } from "@/hooks/use-profile";
import { useBranchesList } from "@/hooks/use-branches";
import { useCreateEvent, EVENT_TYPES, type EventType } from "@/hooks/use-events";
import {
  EVENT_RECURRENCES,
  EVENT_RECURRENCE_LABELS,
  type EventRecurrence,
} from "@/lib/schedule-occurrence";
import { cn } from "@/lib/utils";

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
  // Coarse `events:create` grant — the previous "events:create" resource
  // string built a nonexistent `events:create:create` code that never opened.
  const canCreate = ready && can("events", "create");

  const branches = useBranchesList({ limit: 100 }, { enabled: isHq });
  const createEvent = useCreateEvent();

  const [form, setForm] = React.useState({
    title: "",
    type: "service" as EventType,
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
    if (!form.title.trim()) { toast.error("Even a service needs a name."); return; }
    if (!form.start) { toast.error("When is it, at least roughly?"); return; }
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
        eyebrow={
          <Link href="/gatherings/events" className="flex items-center gap-1.5 hover:text-ink">
            <ArrowLeft className="size-3" /> Gatherings · Events
          </Link>
        }
        title="Plan something new."
        description="A few honest fields now, a calm week later."
      />

      {!canCreate ? (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-xs text-ink-soft">
          Your role can view the calendar but not create events.
        </p>
      ) : (
        <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0 space-y-4">
            <SectionCard eyebrow="Details" title="What is it?">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Title</Label>
                  <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Sunday Gathering" className="h-10 rounded-lg border-line bg-card text-sm shadow-none" />
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
                  <Textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="A sentence people can picture themselves in…" className="resize-none rounded-lg border-line bg-card text-xs shadow-none" />
                </div>
              </div>
            </SectionCard>

            <SectionCard eyebrow="When & where" title="Put it on the calendar">
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
                      : "Open every day from the start date to the end date. Leave the end blank for a single day."}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Starts</Label>
                  <Input type="datetime-local" value={form.start} onChange={(e) => set("start", e.target.value)} className="h-10 rounded-lg border-line bg-card text-sm shadow-none" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Ends</Label>
                  <Input type="datetime-local" value={form.end} onChange={(e) => set("end", e.target.value)} className="h-10 rounded-lg border-line bg-card text-sm shadow-none" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Location</Label>
                  <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Main Hall" className="h-10 rounded-lg border-line bg-card text-sm shadow-none" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Capacity</Label>
                  <Input type="number" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} placeholder="400" className="h-10 rounded-lg border-line bg-card text-sm shadow-none" />
                </div>
                {isHq ? (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Branch</Label>
                    <select value={form.branchId} onChange={(e) => set("branchId", e.target.value)} className="h-10 w-full rounded-lg border border-line bg-card px-2 text-xs outline-none">
                      <option value="">All branches (no assignment)</option>
                      {(branches.data?.data ?? []).map((b) => (
                        <option key={b.branchId} value={b.branchId}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="text-[11px] text-ink-faint sm:col-span-2">
                    This event will belong to {profile?.branch?.name ?? "your branch"}.
                  </p>
                )}
              </div>
            </SectionCard>

            <SectionCard eyebrow="Tickets" title="Free or priced">
              <label className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5">
                <span className="flex items-center gap-2 text-xs"><Ticket className="size-3.5 text-ink-faint" /> Free to attend</span>
                <Switch checked={form.isFree} onCheckedChange={(v) => set("isFree", !!v)} />
              </label>
              {!form.isFree ? (
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Price</Label>
                    <Input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="10" className="h-10 rounded-lg border-line bg-card text-sm shadow-none" />
                  </div>
                  <p className="self-end text-[10px] leading-relaxed text-ink-faint">
                    Ticket tiers, check-in codes and checkout are managed from the event page after saving.
                  </p>
                </div>
              ) : null}
            </SectionCard>
          </div>

          <aside className="lg:sticky lg:top-20 lg:self-start">
            <div className="paper-card rounded-2xl p-4">
              <p className="rule-label mb-3">Calendar preview</p>
              <div className="rounded-xl border border-line bg-background p-3.5">
                <p className="font-display text-sm font-semibold">{form.title || "Untitled gathering"}</p>
                <p className="mt-1 text-[11px] text-ink-soft">
                  {form.start ? new Date(form.start).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) : "Date not set"}
                  {form.location ? ` · ${form.location}` : ""}
                </p>
                <p className="mt-2 text-[10px] text-ink-faint">
                  {EVENT_TYPES.find((t) => t.value === form.type)?.label}
                  {form.capacity ? ` · capacity ${form.capacity}` : ""} · {form.isFree ? "free" : form.price ? `${form.price}/seat` : "priced"}
                </p>
              </div>
              <Button type="submit" disabled={createEvent.isPending} className="mt-4 h-10 w-full gap-2 rounded-lg text-sm">
                <CalendarPlus className="size-4" /> {createEvent.isPending ? "Creating…" : "Create event"}
              </Button>
              <Button asChild variant="ghost" className="mt-2 h-9 w-full rounded-lg text-xs text-ink-soft">
                <Link href="/gatherings/events">Cancel</Link>
              </Button>
            </div>
          </aside>
        </form>
      )}
    </div>
  );
}
