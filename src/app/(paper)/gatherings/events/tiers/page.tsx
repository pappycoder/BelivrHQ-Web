"use client";

import { RequiredFieldsNotice } from "@/components/ui/required-fields";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Coins, PencilLine, Plus, Ticket, Trash2 } from "lucide-react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { PageHeader, SectionCard } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import { EmptyState, FilterChip, RowActions } from "@/components/paper/primitives";
import { StaggerGroup, StaggerItem } from "@/components/paper/motion/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/pastoral/confirm-delete-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useEventsList,
  useEventTiers,
  useCreateTier,
  useUpdateTier,
  useDeleteTier,
  useAllTickets,
  type EventTicketTier,
} from "@/hooks/use-events";
import { formatDate } from "@/hooks/use-media";
import { formatNaira } from "@/hooks/use-analytics";
import { number } from "@/lib/paper/format";

function TiersInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can, ready } = usePermissions();
  const canManage = ready && can("events", "update");

  const [eventId, setEventId] = React.useState(searchParams.get("event") ?? "");
  const [ticketFilter, setTicketFilter] = React.useState("");
  const [formTarget, setFormTarget] = React.useState<{ open: boolean; tier: EventTicketTier | null }>({ open: false, tier: null });
  const [deleteTarget, setDeleteTarget] = React.useState<EventTicketTier | null>(null);

  const events = useEventsList({ limit: 100, sortBy: "startDate", sortOrder: "desc" });
  const tiers = useEventTiers(eventId);
  const tickets = useAllTickets({ eventId: eventId || undefined, limit: 100 });
  const create = useCreateTier(eventId);
  const update = useUpdateTier(eventId);
  const del = useDeleteTier(eventId);

  const eventList = events.data?.data ?? [];
  const selected = eventList.find((e) => e.eventId === eventId);
  const paidEvent = selected && !selected.isFree;
  const rows = tiers.data ?? [];
  const ticketRows = (tickets.data?.data ?? []).slice(0, 10);
  const capacity = rows.reduce((sum, t) => sum + (t.capacity ?? 0), 0);
  const cappedCount = rows.filter((t) => t.capacity != null).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gatherings · Events"
        title="Pricing and capacity, decided kindly."
        description="Set ticket tiers and prices for each paid event before registration opens."
        actions={
          canManage && paidEvent ? (
            <Button className="h-9 gap-1.5 rounded-full text-xs" onClick={() => setFormTarget({ open: true, tier: null })}>
              <Plus className="size-3.5" /> New tier
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={eventId}
          onChange={(e) => { setEventId(e.target.value); router.replace(`/gatherings/events/tiers${e.target.value ? `?event=${e.target.value}` : ""}`); }}
          className="h-9 rounded-full border border-line bg-card px-3 text-[11px] outline-none"
          aria-label="Event selector"
        >
          <option value="">Choose an event…</option>
          {eventList.map((event) => (
            <option key={event.eventId} value={event.eventId}>
              {event.title} · {formatDate(event.startDate)}{event.isFree ? " (free)" : ""}
            </option>
          ))}
        </select>
        {selected && !selected.isFree ? <Tag tone="gold">paid event</Tag> : null}
        {selected?.isFree ? (
          <span className="text-[11px] text-ink-faint">Free events use registration check-in; no tiers needed.</span>
        ) : null}
      </div>

      {!eventId ? (
        <EmptyState icon={<Ticket />} title="Pick an event to manage its tickets" description="Tiers, capacity and every issued pass sit on one honest screen." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Tiers" value={rows.length} tone="brand" icon={<Coins className="size-4" />} />
            <StatCard label="Tickets issued" value={ticketRows.length} tone="moss" deltaLabel={`page of ${number(tickets.data?.total ?? 0)}`} />
            <StatCard label="Tier capacity" value={capacity} tone="gold" deltaLabel={`${cappedCount} capped · ${rows.length - cappedCount} uncapped`} />
            <StatCard label="Event capacity" value={selected?.capacity ?? 0} tone="sky" deltaLabel="from the event itself" />
          </div>

          <SectionCard
            eyebrow="Tiers"
            title={selected ? `Tickets for ${selected.title}` : "Ticket tiers"}
            bodyClassName="p-0"
          >
            {tiers.isLoading ? (
              <div className="space-y-2 p-5">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
            ) : rows.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-xs text-ink-faint">{paidEvent ? "No tiers yet. The first one sets the price of entry." : "Free event: registrations stand in for tickets."}</p>
                {canManage && paidEvent ? (
                  <Button size="sm" variant="outline" className="mt-3 rounded-full border-line text-xs" onClick={() => setFormTarget({ open: true, tier: null })}>Create the first tier</Button>
                ) : null}
              </div>
            ) : (
              <StaggerGroup className="divide-y divide-line/70">
                {rows.map((tier) => (
                  <StaggerItem key={tier.id}>
                    <div className="group flex items-center gap-4 px-5 py-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold"><Ticket className="size-3.5" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold">{tier.name}</span>
                        <span className="block truncate text-[10px] text-ink-faint">{tier.description || "No description"}</span>
                      </span>
                      <span className="num hidden w-24 text-right text-xs font-semibold sm:block">{formatNaira(tier.price)}</span>
                      <span className="num hidden w-28 text-right text-[11px] text-ink-soft md:block">
                        {tier.capacity != null ? <>{number(tier.capacity)} seats</> : "uncapped seats"}
                      </span>
                      {canManage && paidEvent ? (
                        <RowActions
                          actions={[
                            {
                              label: `Edit ${tier.name}`,
                              icon: <PencilLine />,
                              onSelect: () => setFormTarget({ open: true, tier }),
                            },
                            {
                              label: `Delete ${tier.name}`,
                              icon: <Trash2 />,
                              tone: "danger",
                              onSelect: () => setDeleteTarget(tier),
                            },
                          ]}
                        />
                      ) : null}
                    </div>
                  </StaggerItem>
                ))}
              </StaggerGroup>
            )}
          </SectionCard>

          <SectionCard
            eyebrow="Issued passes"
            title="Recent tickets"
            actions={
              <div className="flex items-center gap-2">
                <FilterChip active={ticketFilter === ""} onClick={() => setTicketFilter("")}>All</FilterChip>
                <FilterChip active={ticketFilter === "used"} onClick={() => setTicketFilter("used")}>Used</FilterChip>
                <FilterChip active={ticketFilter === "open"} onClick={() => setTicketFilter("open")}>Not used</FilterChip>
              </div>
            }
            bodyClassName="p-0"
          >
            {tickets.isLoading ? (
              <div className="space-y-2 p-5">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}</div>
            ) : (
              <div className="divide-y divide-line/70">
                {ticketRows
                  .filter((t) => (ticketFilter === "used" ? Boolean(t.usedAt) : ticketFilter === "open" ? !t.usedAt : true))
                  .map((t) => (
                    <div key={t.ticketId ?? t.code} className="flex items-center gap-3 px-5 py-2.5 text-[11px]">
                      <span className="font-mono text-[10px] text-ink-faint">{t.code}</span>
                      <span className="min-w-0 flex-1 truncate">{t.memberName ?? t.visitorName ?? "Unassigned"}</span>
                      <span className="hidden truncate text-[10px] text-ink-faint sm:block">{t.tierName ?? "Not available"} · {formatDate(t.createdAt)}</span>
                      <Tag tone={t.usedAt ? "moss" : "neutral"} dot>{t.usedAt ? "used" : "open"}</Tag>
                    </div>
                  ))}
                {!ticketRows.length ? <p className="px-5 py-8 text-center text-[11px] text-ink-faint">No passes issued for this event yet.</p> : null}
              </div>
            )}
            <div className="border-t border-line px-5 py-2.5 text-[10px] text-ink-faint">
              Ticket PDFs and claims live with the event page and the check-in desk.
            </div>
          </SectionCard>
        </>
      )}

      <TierFormDialog
        open={formTarget.open}
        onOpenChange={(value) => setFormTarget({ open: value, tier: value ? formTarget.tier : null })}
        tier={formTarget.tier}
        pending={create.isPending || update.isPending}
        onSave={(values, existing) => {
          const done = {
            onSuccess: () => { toast(existing ? "Tier updated." : "Tier created."); setFormTarget({ open: false, tier: null }); },
            onError: (e: unknown) => toast.error(getToastErrorMessage(e, "Couldn't save the tier. Capacity may already be sold out.")),
          };
          if (existing) update.mutate({ tierId: existing.id, input: values }, done);
          else create.mutate(values, done);
        }}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(value) => !value && setDeleteTarget(null)}
        title="Delete this tier?"
        description={deleteTarget ? `${deleteTarget.name} disappears from checkout. Sold tickets keep their code; the backend refuses deletion while registrations still point at it.` : ""}
        confirmLabel="Delete"
        pending={del.isPending}
        pendingLabel="Deleting…"
        onConfirm={() => {
          if (!deleteTarget) return;
          del.mutate(deleteTarget.id, {
            onSuccess: () => { toast("Tier deleted."); setDeleteTarget(null); },
            onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't delete it. Tickets may already be sold.")),
          });
        }}
      />
    </div>
  );
}

type TierValues = { name: string; price: number; capacity?: number; description?: string };

function TierFormDialog({
  open,
  onOpenChange,
  tier,
  onSave,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: EventTicketTier | null;
  onSave: (values: TierValues, existing: EventTicketTier | null) => void;
  pending: boolean;
}) {
  const [form, setForm] = React.useState({ name: "", price: "", capacity: "", description: "" });

  React.useEffect(() => {
    if (open) setForm({
      name: tier?.name ?? "",
      price: tier ? String(tier.price) : "",
      capacity: tier?.capacity ? String(tier.capacity) : "",
      description: tier?.description ?? "",
    });
  }, [open, tier]);

  const valid = form.name.trim().length >= 2 && Number(form.price) >= 0 && form.price !== "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border-line bg-card">
        <DialogHeader>
          <DialogTitle className="font-display">{tier ? `Edit ${tier.name}` : "Set a new tier"}</DialogTitle>
          <DialogDescription className="text-xs">Name the ticket the way the congregation would say it.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <RequiredFieldsNotice className="col-span-full" />
          <div className="space-y-1.5">
            <Label required className="text-xs">Tier name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Standard" className="h-10 rounded-lg border-line bg-background text-sm shadow-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label required className="text-xs">Price (₦)</Label>
              <Input inputMode="numeric" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value.replace(/[^\d]/g, "") }))} placeholder="5000" className="num h-10 rounded-lg border-line bg-background text-sm shadow-none" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Capacity (optional)</Label>
              <Input inputMode="numeric" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value.replace(/[^\d]/g, "") }))} placeholder="100" className="num h-10 rounded-lg border-line bg-background text-sm shadow-none" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Note (optional)</Label>
            <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="What the ticket covers" className="h-10 rounded-lg border-line bg-background text-sm shadow-none" />
          </div>
          <Button
            className="h-10 w-full rounded-lg text-sm"
            disabled={!valid || pending}
            onClick={() => onSave(
              {
                name: form.name.trim(),
                price: Number(form.price || 0),
                capacity: form.capacity ? Number(form.capacity) : undefined,
                description: form.description.trim() || undefined,
              },
              tier,
            )}
          >
            {pending ? "Saving…" : tier ? "Save tier" : "Create tier"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function EventTiersPage() {
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-6 w-40" /><Skeleton className="h-64 rounded-2xl" /></div>}>
      <TiersInner />
    </Suspense>
  );
}
