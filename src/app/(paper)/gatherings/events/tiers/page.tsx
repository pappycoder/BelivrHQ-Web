"use client";

import { ErrorState } from "@/components/shared/error-state";

import { formatStatusLabel } from "@/lib/status-label";


import { collectionLabel } from "@/lib/collection-label";

import { EventPicker, useEventPickerEvents } from "@/components/events/event-picker";

import { DialogFooter, DialogClose } from "@/components/ui/dialog";

import { useId as useFormFieldId } from "react";

import { FormSection } from "@/components/shared/form-section";

import { FormDialogContent } from "@/components/shared/form-dialog";

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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/pastoral/confirm-delete-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import {
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
  const canCreate = ready && can("events:tickets", "create");
  const canUpdate = ready && can("events:tickets", "update");
  const canDelete = ready && can("events:tickets", "delete");

  const [eventId, setEventId] = React.useState(searchParams.get("event") ?? "");
  const [ticketFilter, setTicketFilter] = React.useState("");
  const [formTarget, setFormTarget] = React.useState<{ open: boolean; tier: EventTicketTier | null }>({ open: false, tier: null });
  const [deleteTarget, setDeleteTarget] = React.useState<EventTicketTier | null>(null);

  const events = useEventPickerEvents();
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
  const visibleTicketRows = ticketRows.filter((ticket) =>
    ticketFilter === "used" ? Boolean(ticket.usedAt) : ticketFilter === "open" ? !ticket.usedAt : true,
  );
  const capacity = rows.reduce((sum, t) => sum + (t.capacity ?? 0), 0);
  const cappedCount = rows.filter((t) => t.capacity != null).length;
  const eventReady = events.isSuccess && !events.isError && !!selected;
  const tierDataReady = eventReady && tiers.isSuccess && !tiers.isError;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gatherings · Events"
        title="Pricing and capacity, decided kindly."
        description="Set ticket tiers and prices for each paid event before registration opens."
        actions={
          canCreate && paidEvent && tierDataReady ? (
            <Button className="h-9 gap-1.5 rounded-full text-sm" onClick={() => setFormTarget({ open: true, tier: null })}>
              <Plus className="size-3.5" /> New tier
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <EventPicker query={events} value={eventId} showPricing
          onValueChange={value => { setEventId(value); router.replace(`/gatherings/events/tiers${value ? `?event=${value}` : ""}`); }} />
        {selected && !selected.isFree ? <Tag tone="gold">paid event</Tag> : null}
        {selected?.isFree ? (
          <span className="text-sm text-ink-faint">Free events use registration check-in; no tiers needed.</span>
        ) : null}
      </div>

      {!eventId ? (events.isSuccess && eventList.length ? <EmptyState icon={<Ticket />} title="Pick an event to manage its tickets" description="Tiers, capacity and every issued ticket sit on one honest screen." /> : null
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {tiers.isPending ? <Skeleton className="h-32 rounded-2xl" /> : <StatCard unavailable={tiers.isError} label="Tiers" value={rows.length} tone="brand" icon={<Coins className="size-4" />} />}
            {tickets.isPending ? <Skeleton className="h-32 rounded-2xl" /> : <StatCard unavailable={tickets.isError} label="Tickets issued" value={ticketRows.length} tone="moss" deltaLabel={tickets.isError ? "Please try again" : `page of ${number(tickets.data?.total ?? 0)}`} />}
            {tiers.isPending ? <Skeleton className="h-32 rounded-2xl" /> : <StatCard unavailable={tiers.isError} label="Tier capacity" value={capacity} tone="gold" deltaLabel={tiers.isError ? "Please try again" : `${cappedCount} capped · ${rows.length - cappedCount} uncapped`} />}
            {events.isPending ? <Skeleton className="h-32 rounded-2xl" /> : <StatCard unavailable={!eventReady} label="Event capacity" value={selected?.capacity ?? 0} tone="sky" deltaLabel="from the event itself" />}
          </div>

          <SectionCard
            eyebrow="Tiers"
            title={selected ? `Tickets for ${selected.title}` : "Ticket tiers"}
            bodyClassName="p-0"
          >
            {tiers.isError ? (
              <ErrorState title="Unable to load ticket tiers" />
            ) : tiers.isPending ? (
              <div className="space-y-2 p-5">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
            ) : rows.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-ink-faint">{paidEvent ? "No tiers yet. The first one sets the price of entry." : "Free event: registrations stand in for tickets."}</p>
                {canCreate && paidEvent && tierDataReady ? (
                  <Button size="sm" variant="outline" className="mt-3 rounded-full border-line text-sm" onClick={() => setFormTarget({ open: true, tier: null })}>Create the first tier</Button>
                ) : null}
              </div>
            ) : (
              <StaggerGroup className="divide-y divide-line/70">
                {rows.map((tier) => (
                  <StaggerItem key={tier.id}>
                    <div className="group flex items-center gap-4 px-5 py-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold"><Ticket className="size-3.5" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{tier.name}</span>
                        <span className="block truncate text-xs text-ink-faint">{tier.description || "No description"}</span>
                        <span className="mt-1 flex flex-wrap gap-x-2 text-xs text-ink-soft md:hidden">
                          <span className="num font-semibold sm:hidden">{formatNaira(tier.price)}</span>
                          <span>{tier.capacity != null ? `${number(tier.capacity)} ${collectionLabel(tier.capacity, "seats")}` : "Uncapped seats"}</span>
                        </span>
                      </span>
                      <span className="num hidden w-24 text-right text-sm font-semibold sm:block">{formatNaira(tier.price)}</span>
                      <span className="num hidden w-28 text-right text-sm text-ink-soft md:block">
                        {tier.capacity != null ? <>{number(tier.capacity)} {collectionLabel(tier.capacity, "seats")}</> : "uncapped seats"}
                      </span>
                      {(canUpdate || canDelete) && paidEvent && tierDataReady ? (
                        <RowActions
                          actions={[
                            canUpdate && {
                              label: `Edit ${tier.name}`,
                              icon: <PencilLine />,
                              onSelect: () => setFormTarget({ open: true, tier }),
                            },
                            canDelete && {
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
            eyebrow="Issued tickets"
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
            {tickets.isError ? (
              <ErrorState title="Unable to load recent tickets" />
            ) : tickets.isPending ? (
              <div className="space-y-2 p-5">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}</div>
            ) : (
              <div className="divide-y divide-line/70">
                {visibleTicketRows.map((t) => (
                    <div key={t.ticketId ?? t.code} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 px-5 py-3 text-sm sm:flex sm:items-center">
                      <span className="col-start-1 row-start-1 min-w-0 font-medium [overflow-wrap:anywhere] sm:flex-1 sm:truncate">{t.memberName ?? t.visitorName ?? "Unassigned"}</span>
                      <span className="col-start-1 row-start-2 min-w-0 break-all font-mono text-xs text-ink-faint sm:order-first sm:w-40 sm:shrink-0 sm:truncate">{t.code}</span>
                      <span className="col-start-1 row-start-3 min-w-0 text-xs text-ink-faint [overflow-wrap:anywhere] sm:max-w-[35%] sm:truncate">{t.tierName ?? "Not available"} · {formatDate(t.createdAt)}</span>
                      <Tag className="col-start-2 row-start-1 self-start sm:order-last sm:shrink-0 sm:self-center" tone={t.usedAt ? "moss" : "neutral"} dot>{formatStatusLabel(t.usedAt ? "used" : "open")}</Tag>
                    </div>
                  ))}
                {!visibleTicketRows.length ? (
                  <div role="status" className="space-y-3 px-5 py-8 text-center">
                    <p className="text-sm text-ink-faint">{ticketRows.length ? `No ${ticketFilter === "used" ? "used" : "unused"} tickets in this recent list.` : "No tickets issued for this event yet."}</p>
                    {ticketRows.length ? <Button size="sm" variant="outline" className="rounded-full" onClick={() => setTicketFilter("")}>Show all tickets</Button> : null}
                  </div>
                ) : null}
              </div>
            )}
            <div className="border-t border-line px-5 py-2.5 text-xs text-ink-faint">
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
        disabled={!tierDataReady}
        onSave={(values, existing) => {
          if (!tierDataReady) return;
          const done = {
            onSuccess: () => { toast(existing ? "Tier updated." : "Tier created."); setFormTarget({ open: false, tier: null }); },
            onError: (e: unknown) => toast.error(getToastErrorMessage(e, "Couldn't save the tier. Capacity may already be sold out.")),
          };
          if (existing && canUpdate) update.mutate({ tierId: existing.id, input: values }, done);
          else if (!existing && canCreate) create.mutate(values, done);
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
          if (!canDelete || !deleteTarget || !tierDataReady) return;
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
  disabled = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: EventTicketTier | null;
  onSave: (values: TierValues, existing: EventTicketTier | null) => void;
  pending: boolean;
  disabled?: boolean;
}) {
  const formFieldId = useFormFieldId();
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
      <FormDialogContent className="rounded-2xl border-line bg-card">
        <DialogHeader>
          <DialogTitle className="font-display">{tier ? `Edit ${tier.name}` : "Set a new tier"}</DialogTitle>
          <DialogDescription className="text-sm">Name the ticket the way the congregation would say it.</DialogDescription>
        </DialogHeader>
        <FormSection title="Details">
          <div className="space-y-3">
            <RequiredFieldsNotice className="col-span-full" />
            <div className="space-y-1.5">
              <Label htmlFor={`${formFieldId}-field-1`} required className="text-sm">Tier name</Label>
              <Input id={`${formFieldId}-field-1`} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Standard" className="h-10 rounded-lg border-line bg-background text-sm shadow-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`${formFieldId}-field-2`} required className="text-sm">Price (₦)</Label>
                <Input id={`${formFieldId}-field-2`} inputMode="numeric" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value.replace(/[^\d]/g, "") }))} placeholder="5000" className="num h-10 rounded-lg border-line bg-background text-sm shadow-none" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${formFieldId}-field-3`} className="text-sm">Capacity (optional)</Label>
                <Input id={`${formFieldId}-field-3`} inputMode="numeric" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value.replace(/[^\d]/g, "") }))} placeholder="100" className="num h-10 rounded-lg border-line bg-background text-sm shadow-none" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${formFieldId}-field-4`} className="text-sm">Note (optional)</Label>
              <Input id={`${formFieldId}-field-4`} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="What the ticket covers" className="h-10 rounded-lg border-line bg-background text-sm shadow-none" />
            </div>

          </div>
        </FormSection>
<DialogFooter>
<DialogClose asChild><Button type="button" variant="outline" disabled={pending}>Cancel</Button></DialogClose>
<Button
              className="h-10 rounded-lg text-sm"
              disabled={disabled || !valid || pending}
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
</DialogFooter>
      </FormDialogContent>
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
