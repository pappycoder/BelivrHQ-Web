import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BillingStatus } from "@/types/billing";
import SettingsBillingPage from "@/app/(paper)/settings/billing/page";

const state = vi.hoisted(() => ({ data: null as BillingStatus | null, isError: false }));
vi.mock("@/hooks/use-billing", () => ({ useBillingStatus: () => ({ accessReady: true, allowed: true, isLoading: false, canPay: false, data: state.data, isError: state.isError }) }));
vi.mock("@/components/tours/navigation-page-tour", () => ({ NavigationPageTour: () => null }));
vi.mock("@/components/shared/list-table", () => ({ ListTable: ({ children }: { children: ReactNode }) => createElement("div", null, children) }));
vi.mock("@/components/paper/motion/primitives", () => ({
  StaggerGroup: ({ children }: { children: ReactNode }) => createElement("div", null, children),
  StaggerItem: ({ children }: { children: ReactNode }) => createElement("div", null, children),
}));

function payment(status = "success", amount = 25): BillingStatus["payments"][number] {
  return { reference: "recorded-payment-reference", plan: "network", cycle: "monthly", amount, currency: "USD", status, intent: "renewal", application_status: "applied", created_at: "2026-11-20T12:00:00Z" };
}
function render() { return renderToStaticMarkup(createElement(SettingsBillingPage)); }

describe("billing payment history presentation", () => {
  beforeEach(() => {
    state.isError = false;
    state.data = {
      baseCurrency: "USD", gatewayCurrencies: {}, catalog: [], limits: { members: 100, staff: 2, locations: 1 },
      features: [], usage: { members: 1, staff: 1, locations: 1, pendingInvitations: 0 },
      payments: [], subscription: null, active: true, gateways: [], latestPayment: null,
    };
  });
  it("replaces loading placeholders with recovery feedback after a failed read", () => {
    state.data = null;
    state.isError = true;
    const html = render();
    expect(html).toContain('role="alert"');
    expect(html).toContain("Unable to load plan and billing");
    expect(html).toContain("Try again");
    expect(html).not.toContain('data-slot="skeleton"');
  });
  it("does not present stale payment data as current after a failed refresh", () => {
    state.data!.payments = [payment()];
    state.isError = true;
    const html = render();
    expect(html).toContain("Try again");
    expect(html).not.toContain("recorded-payment-reference");
  });
  it("shows a recorded payment even when there is no unfinished checkout", () => {
    state.data!.payments = [payment()];
    const html = render();
    expect(html).toContain("Latest payment");
    expect(html).toContain("reference recorded-p");
    expect(html).not.toContain("No payments recorded yet");
    expect(html).not.toContain("No payment charges yet");
  });
  it("uses the ledger rather than the separate unfinished checkout for its summary", () => {
    state.data!.payments = [payment()];
    state.data!.latestPayment = { reference: "unfinished-checkout", gateway: "flutterwave", plan: "network", cycle: "monthly", amount: 999, currency: "USD" };
    const summary = render().split("Latest payment")[1];
    expect(summary).toContain("25");
    expect(summary).not.toContain("999");
    expect(summary).not.toContain("unfinished");
  });
  it.each([["pending", "Pending"], ["failed", "Failed"]])("does not present a %s history record as a completed charge", (status, caption) => {
    state.data!.payments = [payment(status)];
    const html = render();
    expect(html).toContain("Latest payment");
    expect(html.split("Latest payment")[1]).toContain(caption);
    expect(html).not.toContain("Last charge");
  });
  it("only shows the no-records message for an empty history", () => {
    const html = render();
    expect(html).toContain("No payments recorded yet");
    expect(html).not.toContain("Latest payment");
  });
  it("names the payment status column accurately", () => {
    state.data!.payments = [payment()];
    const html = render();
    expect(html).toContain("<span>Status</span>");
    expect(html).not.toContain("<span>Method</span>");
  });
});
