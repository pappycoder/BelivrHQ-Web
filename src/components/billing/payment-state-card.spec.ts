import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PaymentStateCard } from "./payment-state-card";
describe("payment return presentation", () => {
  it("reserves confirmation for the applied outcome", () => {
    for (const outcome of ["pending","failed","review","revoked","closed","missing"] as const) {
      const html = renderToStaticMarkup(createElement(PaymentStateCard,{outcome}));
      expect(html).not.toContain("Your payment is confirmed");
      expect(html).toContain("Returning from checkout alone never confirms payment or grants access.");
    }
    expect(renderToStaticMarkup(createElement(PaymentStateCard,{outcome:"applied"}))).toContain("Your payment is confirmed");
  });
  it("shows a failed result without telling the user it succeeded or is still pending", () => {
    const html = renderToStaticMarkup(createElement(TooltipProvider,null,createElement(PaymentStateCard,{outcome:"failed",reference:"ref",amount:5000,currency:"NGN"})));
    expect(html).toContain("This payment was not completed");
    expect(html).toContain("₦5,000");
    expect(html).not.toContain("Waiting for Flutterwave");
  });
  it("distinguishes a connection failure from a failed charge", () => {
    expect(renderToStaticMarkup(createElement(PaymentStateCard,{outcome:"pending",connectionError:true}))).toContain("This is not confirmation of a failed charge.");
  });
});
