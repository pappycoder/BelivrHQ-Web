"use client";
import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { launchPlans } from "@/components/marketing/plans";

export const subscriptionCurrencies = [
  "USD",
  "NGN",
  "EUR",
  "GBP",
  "CAD",
  "GHS",
  "KES",
  "ZAR",
  "UGX",
  "XAF",
  "XOF",
] as const;
export type SubscriptionCurrency = (typeof subscriptionCurrencies)[number];
const storageKey = "belivrhq:subscription-currency";
const changeEvent = "belivrhq:subscription-currency-changed";
function currentCurrency(): SubscriptionCurrency {
  try {
    const value = localStorage.getItem(storageKey);
    return subscriptionCurrencies.includes(value as SubscriptionCurrency)
      ? (value as SubscriptionCurrency)
      : "USD";
  } catch {
    return "USD";
  }
}
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(changeEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(changeEvent, callback);
  };
}
export function selectSubscriptionCurrency(currency: string) {
  if (!subscriptionCurrencies.includes(currency as SubscriptionCurrency))
    return;
  try {
    localStorage.setItem(storageKey, currency);
  } catch {
    return;
  }
  window.dispatchEvent(new Event(changeEvent));
}
export function subscriptionMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    currencyDisplay: "code",
    maximumFractionDigits: 0,
  }).format(amount);
}
interface PricingCatalog {
  currency: string;
  rateUpdatedAt: string | null;
  plans: { id: string; monthly: number; annual: number }[];
}
export function useSubscriptionPricing() {
  const currency = useSyncExternalStore(
    subscribe,
    currentCurrency,
    () => "USD" as const,
  );
  const query = useQuery({
    queryKey: ["subscription-pricing", currency],
    queryFn: async ({ signal }) => {
      const data = await api.get<PricingCatalog>(
        `/pricing/subscriptions?currency=${currency}`,
        { skipAuth: true, signal },
      );
      if (data.currency !== currency || !Array.isArray(data.plans))
        throw new Error("Unable to load subscription prices.");
      return data;
    },
    staleTime: 300000,
    retry: false,
  });
  function price(plan: string, cycle: "monthly" | "annual") {
    const quoted = query.data?.plans.find((p) => p.id === plan);
    if (quoted) return subscriptionMoney(quoted[cycle], currency);
    // USD needs no exchange rate. Converted currencies never use guessed rates.
    const base = launchPlans.find((p) => p.id === plan);
    if (currency === "USD" && base && base.id !== "enterprise")
      return subscriptionMoney(base[cycle], "USD");
    return query.isError ? "Rate unavailable" : "Loading price…";
  }
  return {
    currency,
    selectCurrency: selectSubscriptionCurrency,
    price,
    ...query,
  };
}
