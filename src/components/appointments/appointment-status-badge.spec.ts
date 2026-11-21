import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppointmentStatusBadge } from "./appointment-status-badge";

describe("shared appointment status presentation", () => {
  it.each([
    ["pending", "Pending", "gold"],
    ["confirmed", "Confirmed", "moss"],
    ["completed", "Completed", "sky"],
    ["cancelled", "Cancelled", "neutral"],
  ])("presents %s with the same semantic palette for lists and dialogs", (status, label, tone) => {
    const html = renderToStaticMarkup(createElement(AppointmentStatusBadge, { status }));
    expect(html).toContain(label);
    expect(html).toContain(tone === "neutral" ? "bg-muted" : `bg-${tone}-soft`);
    expect(html).toContain(tone === "neutral" ? "bg-ink-faint" : `bg-${tone}`);
    expect(html).not.toMatch(/bg-(blue|green|amber|red)-100/);
  });
  it("keeps unknown statuses readable with a neutral presentation", () => {
    const html = renderToStaticMarkup(createElement(AppointmentStatusBadge, { status: "review" }));
    expect(html).toContain("Review");
    expect(html).toContain("bg-muted");
  });
});
