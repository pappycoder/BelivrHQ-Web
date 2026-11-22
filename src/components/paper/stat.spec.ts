import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StatCard } from "./stat";

describe("unavailable dashboard metrics", () => {
  it("does not present stale currency, changes or totals after a failed read", () => {
    const html = renderToStaticMarkup(createElement(StatCard, {
      label: "Giving", value: 149, prefix: "₦", delta: 23,
      deltaLabel: "Please try again", footer: "stale footer", unavailable: true,
    }));
    expect(html).toContain("Unavailable");
    expect(html).toContain("Please try again");
    expect(html).not.toContain('data-slot="stat-value"');
    expect(html).not.toContain("149");
    expect(html).not.toContain("₦");
    expect(html).not.toContain("23%");
    expect(html).not.toContain("stale footer");
  });

  it("retains a real zero as a numeric value after a successful read", () => {
    const html = renderToStaticMarkup(createElement(StatCard, { label: "People", value: 0 }));
    expect(html).toContain('data-slot="stat-value"');
    expect(html).not.toContain("Unavailable");
  });
});
