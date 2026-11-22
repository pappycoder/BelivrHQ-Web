import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventPicker, useEventPickerEvents } from "./event-picker";

const mocks = vi.hoisted(() => ({ ready: true, allowed: true, list: vi.fn() }));
vi.mock("@/hooks/use-permissions", () => ({ usePermissions: () => ({ ready: mocks.ready, can: () => mocks.allowed }) }));
vi.mock("@/hooks/use-events", () => ({ useEventsList: mocks.list }));

function render(overrides: Record<string, unknown> = {}, value = "") {
  const query = { isPending: false, isError: false, isFetching: false, error: null, data: { data: [], total: 0 }, refetch: vi.fn(), ...overrides };
  return renderToStaticMarkup(createElement(EventPicker, { value, onValueChange: vi.fn(), query: query as Parameters<typeof EventPicker>[0]["query"] }));
}

describe("event picker feedback", () => {
  beforeEach(() => { mocks.ready = true; mocks.allowed = true; mocks.list.mockClear(); });
  it("waits for permissions instead of claiming that there are no events", () => {
    mocks.ready = false;
    const html = render();
    expect(html).toContain("Loading events");
    expect(html).not.toContain("No events available");
    expect(html).toMatch(/<select[^>]*\sdisabled(?:=|\s|>)/);
  });
  it("explains restricted access without offering a forbidden list request", () => {
    mocks.allowed = false;
    const html = render({ isPending: true });
    expect(html).toContain("Your role cannot browse event choices");
    expect(html).not.toContain("Refresh events");
    expect(html).not.toContain("Open events");
  });
  it("shows loading feedback while the first request is pending", () => {
    expect(render({ isPending: true, data: undefined })).toContain('aria-label="Loading events"');
  });
  it("provides refresh and navigation for a successfully empty result", () => {
    const html = render();
    expect(html).toContain("No events available");
    expect(html).toContain("Refresh events");
    expect(html).toContain('href="/gatherings/events"');
  });
  it("distinguishes a failed request from an empty list", () => {
    const html = render({ isError: true, error: { message: "Service temporarily unavailable." } });
    expect(html).toContain('role="alert"');
    expect(html).toContain("Service temporarily unavailable.");
    expect(html).not.toContain("No events available");
  });
  it("keeps existing choices usable if a background refresh fails", () => {
    const html = render({ isError: true, data: { data: [{ eventId: "past", title: "Past conference", startDate: "2026-01-01" }] } });
    expect(html).toContain("Past conference");
    expect(html).not.toMatch(/<select[^>]*\sdisabled(?:=|\s|>)/);
    expect(html).toContain("Refresh events");
  });
  it("renders successful choices without an empty or failure message", () => {
    const html = render({ data: { data: [{ eventId: "future", title: "Future conference", startDate: "2026-12-20" }] } });
    expect(html).toContain('value="future"');
    expect(html).not.toContain("Refresh events");
    expect(html).not.toMatch(/<select[^>]*\sdisabled(?:=|\s|>)/);
  });
  it("exposes the full selected title when the native control has limited space", () => {
    const title = "Annual leadership conference and volunteer appreciation gathering";
    const html = render({ data: { data: [{ eventId: "selected", title, startDate: "2026-12-20" }] } }, "selected");
    expect(html).toContain(`title="${title}"`);
    expect(html).toMatch(/data-event-selection-name[^>]*>Annual leadership conference and volunteer appreciation gathering<\/p>/);
    expect(html).toContain('value="selected" selected=""');
  });
  it("uses the register scope instead of an implicit event filter", () => {
    useEventPickerEvents();
    expect(mocks.list).toHaveBeenCalledWith({ page: 1, limit: 100, status: "all", sortBy: "startDate", sortOrder: "desc" });
  });
});
