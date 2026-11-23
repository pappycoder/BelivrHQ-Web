/** One presentation for recorded money; keep the supplied currency and its minor units. */
export function formatMoney(amount: number, currency = "NGN"): string {
  return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
