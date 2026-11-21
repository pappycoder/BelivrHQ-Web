import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SubmissionStatusBadge } from "./submission-status-badge";

describe("shared form-response status badges", () => {
  it.each([
    ["pending", "Pending", "gold"],
    ["approved", "Approved", "moss"],
    ["rejected", "Rejected", "rose"],
  ])("renders %s using the shared semantic tag", (status, label, tone) => {
    const html = renderToStaticMarkup(createElement(SubmissionStatusBadge, { status }));
    expect(html).toContain('data-slot="paper-tag"');
    expect(html).toContain(`bg-${tone}-soft`);
    expect(html).toContain(label);
    expect(html).not.toContain("text-yellow-600");
  });
  it("keeps an unexpected status readable with a neutral fallback", () => {
    const html = renderToStaticMarkup(createElement(SubmissionStatusBadge, { status: "review" }));
    expect(html).toContain("Review");
    expect(html).toContain("bg-muted");
  });
});
