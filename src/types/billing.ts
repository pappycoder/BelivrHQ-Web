/** Wire values mirror the backend Prisma enums; repositories build independently. */
export type SubscriptionPlan =
  "essentials" | "community" | "network" | "enterprise";
export type BillingCycle = "monthly" | "annual";
export type SubscriptionGateway = "paystack" | "flutterwave";
export interface BillingStatus {
  verification?: {
    reference: string;
    status: string;
    application_status: string;
  } | null;
  baseCurrency: "USD";
  gatewayCurrencies: Partial<Record<SubscriptionGateway, string[]>>;
  catalog: PlanCatalogEntry[];
  limits: PlanLimits;
  features: string[];
  usage: PlanLimits & { pendingInvitations: number };
  payments: {
    reference: string;
    plan: SubscriptionPlan;
    cycle: BillingCycle;
    amount: number;
    currency: string;
    status: string;
    intent: string;
    application_status: string;
    lifecycle?: {
      access: "clear" | "review" | "revoked";
      refundedAmount: number;
    };
    checkout_closed_at?: string | null;
    checkout_close_reason?: string | null;
    created_at: string;
  }[];
  subscription: {
    plan: SubscriptionPlan;
    cycle: BillingCycle;
    paid_until: string | null;
    scheduled_plan?: SubscriptionPlan | null;
    scheduled_cycle?: BillingCycle | null;
  } | null;
  accessReview?: boolean;
  active: boolean;
  gateways: SubscriptionGateway[];
  latestPayment: {
    reference: string;
    gateway: SubscriptionGateway;
    plan: SubscriptionPlan;
    cycle: BillingCycle;
    amount: number;
    currency: string;
  } | null;
}
export interface PlanLimits {
  members: number;
  staff: number;
  locations: number;
}
export interface PlanCatalogEntry {
  id: Exclude<SubscriptionPlan, "enterprise">;
  name: string;
  monthly: number;
  annual: number;
  limits: PlanLimits;
}
export interface BillingQuote {
  quoteId: string;
  currency: string;
  expiresAt: string;
  exchangeRate: number;
  rateUpdatedAt: string | null;
  usdAmount: number;
  intent: "renewal" | "upgrade";
  amount: number;
  effectiveAt: string;
  renewBy: string;
  credit: number;
}
