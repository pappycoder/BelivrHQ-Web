import { describe, expect, it } from "vitest";
import { formatMoney } from "./money";

describe("shared money presentation", () => {
  it("uses the same naira symbol for NGN records and preserves kobo", () => {
    expect(formatMoney(2000, "NGN")).toBe("₦2,000");
    expect(formatMoney(2000.5, "NGN")).toBe("₦2,000.5");
  });
  it("preserves the actual currency instead of replacing non-NGN values with USD", () => {
    expect(formatMoney(2000, "USD")).toBe("$2,000");
    expect(formatMoney(2000, "EUR")).toBe("€2,000");
    expect(formatMoney(2000, "GBP")).toBe("£2,000");
  });
});
