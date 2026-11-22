import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TicketsPage from "@/app/(paper)/gatherings/events/tickets/page";
import TiersPage from "@/app/(paper)/gatherings/events/tiers/page";

const state = vi.hoisted(() => ({
  eventError: false, ticketError: false, tierError: false,
  pending: false, empty: false, allowWrite: true,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams("event=event-a"),
}));
vi.mock("@/hooks/use-permissions", () => ({ usePermissions: () => ({ ready: true, can: () => state.allowWrite }) }));
vi.mock("@/components/tours/navigation-page-tour", () => ({ NavigationPageTour: () => null }));
vi.mock("@/components/paper/primitives", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/components/paper/primitives")>(),
  RowActions: () => null,
}));
vi.mock("@/components/shared/list-table", () => ({ ListTable: ({ children }: { children: ReactNode }) => createElement("div", null, children) }));
vi.mock("@/components/paper/motion/primitives", () => ({
  StaggerGroup: ({ children }: { children: ReactNode }) => createElement("div", null, children),
  StaggerItem: ({ children }: { children: ReactNode }) => createElement("div", null, children),
  CountUp: ({ value }: { value: number }) => createElement("span", null, value),
}));
vi.mock("@/components/members/member-combobox", () => ({ MemberCombobox: () => null }));
vi.mock("@/lib/ticket-pdf", () => ({ generateTicketPDF: vi.fn() }));
vi.mock("@/components/events/event-picker", () => ({
  EventPicker: () => createElement("div", null, "Event selector"),
  useEventPickerEvents: () => ({
    data: { data: [{ eventId: "event-a", title: "Example event", capacity: 100, isFree: false }] },
    isError: state.eventError, isSuccess: !state.eventError, isPending: false,
  }),
}));
vi.mock("@/hooks/use-events", () => {
  const mutation = () => ({ isPending: false, mutate: vi.fn() });
  return {
    useEventTiers: () => ({
      data: state.empty ? [] : [{ id: "tier-a", name: "Standard admission", price: 5000, capacity: 50 }],
      isError: state.tierError, isSuccess: !state.tierError && !state.pending, isPending: state.pending,
    }),
    useAllTickets: () => ({
      data: { data: state.empty ? [] : [{ ticketId: "ticket-a", code: "EVT-EXAMPLE", memberName: "Example Attendee", status: "paid", createdAt: "2026-11-01T10:00:00Z" }], total: state.empty ? 0 : 1 },
      isError: state.ticketError, isSuccess: !state.ticketError && !state.pending, isPending: state.pending,
    }),
    useCreateTicket: mutation, useCreateTier: mutation, useUpdateTier: mutation, useDeleteTier: mutation,
  };
});

const render = (Page: typeof TicketsPage) => renderToStaticMarkup(createElement(Page));
const unavailableCount = (html: string) => (html.match(/data-slot="stat-unavailable"/g) ?? []).length;

beforeEach(() => Object.assign(state, { eventError: false, ticketError: false, tierError: false, pending: false, empty: false, allowWrite: true }));

describe("issued-ticket read states", () => {
  it("replaces failed and stale ticket data with an error and unavailable metrics", () => {
    state.ticketError = true;
    const html = render(TicketsPage);
    expect(html).toContain("Unable to load issued tickets");
    expect(html).toContain("Try again");
    expect(unavailableCount(html)).toBe(3);
    expect(html).not.toContain("No tickets issued yet");
    expect(html).not.toContain("EVT-EXAMPLE");
    expect(html).not.toContain("Assign ticket");
  });
  it("keeps valid tickets visible when tier information fails and blocks assignment", () => {
    state.tierError = true;
    const html = render(TicketsPage);
    expect(html).toContain("Unable to load ticket tiers");
    expect(html).toContain("EVT-EXAMPLE");
    expect(html).not.toContain("no tiers (flat price)");
    expect(html).not.toContain("Assign ticket");
  });
  it("does not guess capacity or allow assignment when event metadata fails", () => {
    state.eventError = true;
    const html = render(TicketsPage);
    expect(unavailableCount(html)).toBe(1);
    expect(html).not.toContain("Assign ticket");
  });
  it("retains successful empty-state guidance", () => {
    state.empty = true;
    const html = render(TicketsPage);
    expect(html).toContain("No tickets issued yet");
    expect(unavailableCount(html)).toBe(0);
  });
  it("does not call a pending read empty", () => {
    state.pending = true;
    const html = render(TicketsPage);
    expect(html).toContain('data-slot="skeleton"');
    expect(html).not.toContain("No tickets issued yet");
    expect(html).not.toContain("Unable to load issued tickets");
  });
  it("preserves read-only action gating", () => {
    state.allowWrite = false;
    const html = render(TicketsPage);
    expect(html).toContain("EVT-EXAMPLE");
    expect(html).not.toContain("Assign ticket");
  });
});

describe("independent tier and recent-ticket states", () => {
  it("shows a tier error without hiding healthy recent tickets", () => {
    state.tierError = true;
    const html = render(TiersPage);
    expect(html).toContain("Unable to load ticket tiers");
    expect(html).toContain("EVT-EXAMPLE");
    expect(unavailableCount(html)).toBe(2);
    expect(html).not.toContain("No tiers yet");
    expect(html).not.toContain("New tier");
    expect(html).not.toContain("Standard admission");
  });
  it("shows a ticket error without hiding healthy tiers", () => {
    state.ticketError = true;
    const html = render(TiersPage);
    expect(html).toContain("Unable to load recent tickets");
    expect(html).toContain("Standard admission");
    expect(unavailableCount(html)).toBe(1);
    expect(html).not.toContain("No tickets issued for this event yet");
    expect(html).not.toContain("EVT-EXAMPLE");
  });
  it("shows both failures without create-first or empty-ticket advice", () => {
    state.ticketError = true; state.tierError = true;
    const html = render(TiersPage);
    expect(html).toContain("Unable to load ticket tiers");
    expect(html).toContain("Unable to load recent tickets");
    expect(unavailableCount(html)).toBe(3);
    expect(html).not.toContain("Create the first tier");
    expect(html).not.toContain("No tickets issued for this event yet");
  });
  it("retains successful empty-state guidance for both sections", () => {
    state.empty = true;
    const html = render(TiersPage);
    expect(html).toContain("No tiers yet");
    expect(html).toContain("No tickets issued for this event yet");
    expect(unavailableCount(html)).toBe(0);
  });
});
