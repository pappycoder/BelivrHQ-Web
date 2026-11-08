"use client";

import { ListTable } from "@/components/shared/list-table";
import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Download, Ticket, UserPlus, Users } from "lucide-react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { PageHeader } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import { EmptyState, ListPaginationFooter, PersonAvatar } from "@/components/paper/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MemberCombobox } from "@/components/members/member-combobox";
import { usePermissions } from "@/hooks/use-permissions";
import { useEventsList, useEventTiers, useAllTickets, useCreateTicket, type AllTicketItem } from "@/hooks/use-events";
import { generateTicketPDF } from "@/lib/ticket-pdf";
import { formatDate } from "@/hooks/use-media";
import { formatNaira } from "@/hooks/use-analytics";

const PAGE_SIZE = 15;

function TicketsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can, ready } = usePermissions();
  const canAssign = ready && can("events:tickets", "create");

  const [eventId, setEventId] = React.useState(searchParams.get("event") ?? "");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(PAGE_SIZE);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [assignMember, setAssignMember] = React.useState<{ id: string; name: string } | null>(null);
  const [assignTier, setAssignTier] = React.useState("");
  const [pdfBusy, setPdfBusy] = React.useState<string | null>(null);

  const events = useEventsList({ limit: 100, sortBy: "startDate", sortOrder: "desc" });
  const tiers = useEventTiers(eventId);
  const tickets = useAllTickets({ eventId: eventId || undefined, page, limit: perPage });
  const createTicket = useCreateTicket();

  const eventList = events.data?.data ?? [];
  const selected = eventList.find((e) => e.eventId === eventId);
  const rows = tickets.data?.data ?? [];
  const total = tickets.data?.total ?? 0;
  const usedCount = rows.filter((t) => t.usedAt).length;
  const paidEvent = !!selected && !selected.isFree;

  const download = async (ticket: AllTicketItem) => {
    setPdfBusy(ticket.ticketId);
    try {
      await generateTicketPDF(ticket);
    } catch (e) {
      toast.error("Couldn't build the pass", { description: getToastErrorMessage(e, "Try again shortly.") });
    } finally {
      setPdfBusy(null);
    }
  };

  const assign = () => {
    if (!eventId || !assignMember) { toast.error("Pick the person first."); return; }
    createTicket.mutate(
      { eventId, input: { memberId: assignMember.id, tierId: paidEvent && assignTier ? assignTier : undefined } },
      {
        onSuccess: () => {
          toast.success(`Pass assigned to ${assignMember.name}.`);
          setAssignOpen(false);
          setAssignMember(null);
          setAssignTier("");
        },
        onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't assign the ticket — capacity or duplicate rules may apply.")),
      },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gatherings · Events"
        title="Passes in hand."
        description="Assign, print and track every ticket — the door should recognise a face, not fuss over a code."
        actions={
          canAssign && eventId ? (
            <Button className="h-9 gap-1.5 rounded-full text-xs" onClick={() => setAssignOpen(true)}>
              <UserPlus className="size-3.5" /> Assign ticket
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={eventId}
          onChange={(e) => { setEventId(e.target.value); setPage(1); router.replace(`/gatherings/events/tickets${e.target.value ? `?event=${e.target.value}` : ""}`); }}
          className="h-9 rounded-full border border-line bg-card px-3 text-[11px] outline-none"
          aria-label="Event selector"
        >
          <option value="">Choose an event…</option>
          {eventList.map((event) => (
            <option key={event.eventId} value={event.eventId}>
              {event.title} · {formatDate(event.startDate)}
            </option>
          ))}
        </select>
        {selected ? (
          <span className="flex items-center gap-1.5 text-[10px] text-ink-faint">
            {paidEvent ? <Tag tone="gold">paid</Tag> : <Tag tone="moss">free</Tag>}
            {(tiers.data ?? []).length ? <span>{(tiers.data ?? []).length} tiers</span> : paidEvent ? <span>no tiers — flat price</span> : null}
          </span>
        ) : null}
        {eventId ? (
          <Link href={`/gatherings/events/tiers?event=${encodeURIComponent(eventId)}`} className="ml-auto text-[11px] text-brand hover:underline">
            Manage tiers →
          </Link>
        ) : null}
      </div>

      {eventId ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Passes issued" value={total} tone="brand" icon={<Ticket className="size-4" />} />
            <StatCard label="Used this page" value={usedCount} tone="moss" deltaLabel={rows.length ? `${Math.round((usedCount / rows.length) * 100)}%` : "—"} />
            <StatCard label="Open this page" value={rows.length - usedCount} tone="gold" />
            <StatCard label="Capacity" value={selected?.capacity ?? 0} tone="sky" deltaLabel="event seats" />
          </div>

          {tickets.isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<Users />}
              title="No passes yet"
              description={paidEvent ? "Sales appear here automatically; you can also seat someone by hand." : "Free events still track attendance at the desk — claim happens member-side."}
              action={canAssign ? <Button size="sm" variant="outline" className="rounded-full border-line text-xs" onClick={() => setAssignOpen(true)}>Assign the first</Button> : undefined}
            />
          ) : (
            <ListTable className="paper-card divide-y divide-line/70 overflow-hidden rounded-2xl" tableId="gatherings-events-tickets-1" records={rows ?? []} recordKey="ticketId">
              <div className="rule-label grid grid-cols-[minmax(0,1.6fr)_1fr_0.8fr_1fr_0.8fr_auto] items-center gap-3 border-b border-line px-5 py-2.5">
                <span>Holder</span>
                <span>Code</span>
                <span>Tier</span>
                <span>Status</span>
                <span className="text-right">Issued</span>
                <span className="text-right">Pass</span>
              </div>
              {rows.map((ticket) => (
                <div key={ticket.ticketId} className="grid grid-cols-[minmax(0,1.6fr)_1fr_0.8fr_1fr_0.8fr_auto] items-center gap-3 px-5 py-3">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <PersonAvatar name={ticket.memberName ?? ticket.visitorName ?? "Unassigned"} size="xs" />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium">{ticket.memberName ?? ticket.visitorName ?? "Unassigned"}</span>
                      {ticket.visitorId ? <span className="block text-[9px] text-ink-faint">visitor</span> : null}
                    </span>
                  </span>
                  <span className="truncate font-mono text-[10px] text-ink-faint">{ticket.code}</span>
                  <span className="truncate text-[11px] text-ink-soft">{ticket.tierName ?? "General"}</span>
                  <span className="flex items-center gap-1.5">
                    <Tag tone={ticket.usedAt ? "moss" : ticket.status === "cancelled" || ticket.status === "refunded" ? "rose" : "gold"} dot>
                      {ticket.usedAt ? "used" : ticket.status}
                    </Tag>
                    {ticket.pricePaid ? <span className="num text-[10px] text-ink-faint">{formatNaira(ticket.pricePaid)}</span> : null}
                  </span>
                  <span className="num text-right text-[10px] text-ink-faint">{formatDate(ticket.createdAt)}</span>
                  <Button
                    size="xs"
                    variant="ghost"
                    className="ml-auto h-7 gap-1 rounded-full text-[10px]"
                    disabled={pdfBusy === ticket.ticketId}
                    onClick={() => download(ticket)}
                  >
                    <Download className="size-3" /> {pdfBusy === ticket.ticketId ? "…" : "PDF"}
                  </Button>
                </div>
              ))}
              <ListPaginationFooter
                page={page}
                perPage={perPage}
                total={total}
                onPageChange={setPage}
                onPerPageChange={setPerPage}
                itemName="passes"
                pending={tickets.isFetching}
              />
            </ListTable>
          )}
        </>
      ) : (
        <EmptyState
          icon={<Ticket />}
          title="Choose an event to work its passes"
          description="Issue counts, seats and printable A5 event passes — one honest list."
        />
      )}

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="rounded-2xl border-line bg-card">
          <DialogHeader>
            <DialogTitle className="font-display">Seat someone by hand</DialogTitle>
            <DialogDescription className="text-xs">A pass with their name on it — sometimes the right thing beats a queue.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-xs font-medium">Member</p>
              <MemberCombobox
                value={assignMember?.id ?? ""}
                onChange={(id, member) => setAssignMember(id ? { id, name: `${member?.firstName ?? ""} ${member?.lastName ?? ""}`.trim() || "the member" } : null)}
                placeholder="Search a member…"
              />
            </div>
            {paidEvent && (tiers.data ?? []).length ? (
              <div className="space-y-1.5">
                <p className="text-xs font-medium">Tier</p>
                <select value={assignTier} onChange={(e) => setAssignTier(e.target.value)} className="h-10 w-full rounded-lg border border-line bg-card px-2 text-xs outline-none" aria-label="Tier">
                  <option value="">General (no tier)</option>
                  {(tiers.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.name} · {formatNaira(t.price)}</option>)}
                </select>
              </div>
            ) : null}
            <Button className="h-10 w-full gap-2 rounded-lg text-sm" disabled={!assignMember || createTicket.isPending} onClick={assign}>
              <UserPlus className="size-4" /> {createTicket.isPending ? "Assigning…" : "Assign pass"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TicketsPage() {
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-6 w-40" /><Skeleton className="h-64 rounded-2xl" /></div>}>
      <TicketsInner />
    </Suspense>
  );
}
