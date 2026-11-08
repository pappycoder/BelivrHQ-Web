"use client";
import { LoadingState } from "@/components/shared/loading-state";
import {
  subscriptionCurrencies,
  useSubscriptionPricing,
} from "@/hooks/use-subscription-pricing";
export function SubscriptionCurrencySwitcher() {
  const pricing = useSubscriptionPricing();
  return (
    <div className="space-y-1.5 text-sm">
      <label className="inline-flex items-center gap-2">
        Currency
        <select
          aria-label="Subscription currency"
          className="rounded-md border bg-background px-3 py-2 text-foreground"
          value={pricing.currency}
          onChange={(event) => pricing.selectCurrency(event.target.value)}
        >
          {subscriptionCurrencies.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-muted-foreground">
        USD base prices. Converted totals are rounded up to a whole currency
        unit. Annual savings apply to the USD base.
      </p>
      {pricing.currency !== "USD" && (
        <p className="text-xs text-muted-foreground">
          {pricing.isError ? (
            "Conversion unavailable. Try again or select USD. "
          ) : pricing.data?.rateUpdatedAt ? (
            `Rate updated ${new Date(pricing.data.rateUpdatedAt).toLocaleDateString()}. `
          ) : pricing.isPending ? (
            <LoadingState label="Loading conversion" variant="inline" />
          ) : (
            ""
          )}
          <a
            href="https://www.exchangerate-api.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Rates by ExchangeRate-API
          </a>
          {pricing.isError && (
            <button
              type="button"
              className="ml-2 underline"
              onClick={() => void pricing.refetch()}
            >
              Retry
            </button>
          )}
        </p>
      )}
    </div>
  );
}
export function SubscriptionStartingPrice() {
  const pricing = useSubscriptionPricing();
  return (
    <>
      Plans from{" "}
      <SubscriptionPrice pricing={pricing} plan="essentials" cycle="monthly" />{" "}
      / month
    </>
  );
}

/** Price content stays a skeleton while a non-USD quote is being fetched. */
export function SubscriptionPrice({
  pricing,
  plan,
  cycle,
}: {
  pricing: Pick<ReturnType<typeof useSubscriptionPricing>, "currency" | "isPending" | "isError" | "data" | "price">;
  plan: string;
  cycle: "monthly" | "annual";
}) {
  if (
    pricing.currency !== "USD" &&
    !pricing.data?.plans.some((item) => item.id === plan)
  ) {
    return pricing.isPending && !pricing.isError ? (
      <LoadingState label="Loading price" variant="inline" />
    ) : (
      <>Rate unavailable</>
    );
  }
  return <span className="not-italic">{pricing.price(plan, cycle)}</span>;
}
