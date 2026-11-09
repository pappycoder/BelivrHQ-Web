import { describe, expect, it } from "vitest";
import type { BillingStatus } from "@/types/billing";
import { paymentOutcome } from "./payment-confirmation";
const reference = "payment-a";
const result = (status: string, application_status: string, active = true) =>
  ({
    active,
    verification: { reference, status, application_status },
  }) as BillingStatus;
describe("confirmed subscription payments", () => {
  it("requires the exact successful applied payment and active access", () => {
    expect(paymentOutcome(result("success", "applied"), reference)).toBe(
      "applied",
    );
    expect(paymentOutcome(result("success", "applied", false), reference)).toBe(
      "pending",
    );
    expect(
      paymentOutcome(result("success", "applied"), "other-reference"),
    ).toBe("pending");
    expect(paymentOutcome({ active: true } as BillingStatus, reference)).toBe(
      "pending",
    );
  });
  it("keeps pending, failure and manual review out of the success path", () => {
    expect(paymentOutcome(result("pending", "pending"), reference)).toBe(
      "pending",
    );
    expect(paymentOutcome(result("failed", "pending"), reference)).toBe(
      "failed",
    );
    expect(paymentOutcome(result("success", "review"), reference)).toBe(
      "review",
    );
  });
  it("can use a matching historical payment on older API responses", () => {
    const data = {
      active: true,
      payments: [
        { reference, status: "success", application_status: "applied" },
      ],
    } as BillingStatus;
    expect(paymentOutcome(data, reference)).toBe("applied");
  });
  it("shows removed access instead of continuing to wait for payment", () => {
    expect(
      paymentOutcome(result("reversed", "revoked", false), reference),
    ).toBe("revoked");
  });
  it("recognizes closed checkout metadata alongside the current verification response", () => {
    const data = {
      ...result("pending", "pending", false),
      payments: [
        {
          reference,
          status: "pending",
          application_status: "pending",
          checkout_closed_at: "2026-11-09",
        },
      ],
    } as BillingStatus;
    expect(paymentOutcome(data, reference)).toBe("closed");
  });
});
