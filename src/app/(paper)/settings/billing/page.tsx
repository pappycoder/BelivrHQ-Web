"use client";

import { ListTable } from "@/components/shared/list-table";
import * as React from "react";
import Link from "next/link";
import {
  Check,
  CreditCard,
  Download,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/paper/section";
import { Tag } from "@/components/paper/stat";
import { EmptyState } from "@/components/paper/primitives";
import { StaggerGroup, StaggerItem } from "@/components/paper/motion/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBillingStatus } from "@/hooks/use-billing";
import { subscriptionMoney } from "@/hooks/use-subscription-pricing";
import { number, percent } from "@/lib/paper/format";
import { cn } from "@/lib/utils";

/**
 * Plan & Billing — the Abide billing layout on live data: current-plan band
 * with a four-cell usage strip, a three-card plan comparison driven by the
 * server catalog with real limits, and the payments ledger beneath.
 */

const PAYMENT_TONES: Record<string, "moss" | "gold" | "rose" | "neutral"> = {
  success: "moss",
  applied: "moss",
  pending: "gold",
  failed: "rose",
  cancelled: "neutral",
  reversed: "neutral",
};

export default function SettingsBillingPage() {
  const status = useBillingStatus();

  if (!status.accessReady) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!status.allowed) {
    return (
      <EmptyState
        icon={<CreditCard />}
        title="Billing stays with the church admins"
        description="Plan, payments and usage are visible to those who hold the billing grant. Your role keeps the register running — this ledger isn't yours to carry."
        action={<Button asChild variant="outline" size="sm" className="rounded-full border-line text-xs"><Link href="/settings/profile">Back to your profile</Link></Button>}
      />
    );
  }

  if (status.isLoading || !status.data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const d = status.data;
  const sub = d.subscription;
  const planName = (p?: string | null) =>
    p ? p.charAt(0).toUpperCase() + p.slice(1) : "Not subscribed";
  const priceFor = (planId: string) => {
    const entry = d.catalog.find((c) => c.id === planId);
    if (!entry) return null;
    return subscriptionMoney(entry.monthly, d.baseCurrency);
  };
  const monthly = sub ? priceFor(sub.plan) : null;

  const usageCells = [
    { label: "Seats used", value: `${number(d.usage.staff)} of ${d.limits.staff > 0 ? number(d.limits.staff) : "∞"}`, pct: d.limits.staff ? percent(d.usage.staff, d.limits.staff) : 6 },
    { label: "Branches", value: `${number(d.usage.locations)} of ${d.limits.locations > 0 ? number(d.limits.locations) : "∞"}`, pct: d.limits.locations ? percent(d.usage.locations, d.limits.locations) : 6 },
    { label: "People in register", value: `${number(d.usage.members)} of ${d.limits.members > 0 ? number(d.limits.members) : "∞"}`, pct: d.limits.members ? percent(d.usage.members, d.limits.members) : 6 },
    { label: "Pending invitations", value: number(d.usage.pendingInvitations ?? 0), pct: 6 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings · Billing"
        title="The plainest receipt the church ever kept."
        description="Current plan, real usage and every payment — no small print, no surprises at renewal."
      />

      {/* ── Current plan band ─────────────────────────────────────────── */}
      <div className="paper-card overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-muted/30 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
              <Sparkles className="size-4" />
            </span>
            <div>
              <p className="text-xs text-ink-faint">Current plan</p>
              <p className="font-display text-lg font-semibold leading-tight">{planName(sub?.plan)}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone={d.active ? "moss" : "rose"} dot>{d.active ? "Active" : "Lapsed"}</Tag>
            {sub?.paid_until ? (
              <span className="text-[11px] text-ink-soft">
                Renews {new Date(sub.paid_until).toLocaleDateString("en-GB", { month: "short", day: "numeric" })}
              </span>
            ) : null}
            {sub && monthly ? (
              <span className="num text-sm font-semibold">
                {monthly}
                <span className="text-[10px] font-normal text-ink-faint">/{sub.cycle === "annual" ? "yr" : "mo"}</span>
              </span>
            ) : null}
            {sub?.scheduled_plan && sub.scheduled_plan !== sub.plan ? (
              <Tag tone="gold">Next: {planName(sub.scheduled_plan)}</Tag>
            ) : null}
            {status.canPay ? (
              <Button asChild className="h-8 gap-1.5 rounded-full text-xs">
                <Link href="/subscription">
                  <CreditCard className="size-3.5" /> Open checkout
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-line/60 sm:grid-cols-4">
          {usageCells.map((cell) => (
            <div key={cell.label} className="bg-card px-4 py-3">
              <p className="text-[9px] uppercase tracking-wider text-ink-faint">{cell.label}</p>
              <p className="num mt-0.5 text-xs font-semibold">{cell.value}</p>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, cell.pct)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Plan comparison (server catalog, Abide card grammar) ──────── */}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="paper-card rounded-2xl p-5">
            <p className="rule-label mb-3">Change plan — grow when it&apos;s time, not before</p>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {d.catalog.map((entry) => {
                const current = sub?.plan === entry.id;
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "rounded-xl border p-4 transition-colors",
                      current ? "border-brand/50 bg-brand-soft/40" : "border-line",
                    )}
                  >
                    <p className="flex items-center justify-between text-xs font-semibold">
                      {entry.name}
                      {current ? <Tag tone="brand">Current</Tag> : null}
                    </p>
                    <p className="num mt-2 font-display text-2xl font-semibold">
                      {subscriptionMoney(entry.monthly, d.baseCurrency)}
                      <span className="text-[10px] font-normal text-ink-faint">/mo</span>
                    </p>
                    <p className="mt-1 text-[10px] text-ink-faint">
                      {entry.limits.members > 0 ? number(entry.limits.members) : "Unlimited"} people ·{" "}
                      {entry.limits.locations > 0 ? `${number(entry.limits.locations)} branch${entry.limits.locations === 1 ? "" : "es"}` : "unlimited branches"} ·{" "}
                      {entry.limits.staff > 0 ? `${number(entry.limits.staff)} staff seats` : "unlimited staff"}
                    </p>
                    {!current && status.canPay ? (
                      <Button asChild size="sm" variant="outline" className="mt-3 h-8 w-full rounded-full border-line text-[11px]">
                        <Link href="/subscription">Choose {entry.name}</Link>
                      </Button>
                    ) : null}
                  </div>
                );
              })}
              <div className="rounded-xl border border-line p-4">
                <p className="flex items-center justify-between text-xs font-semibold">
                  Enterprise
                  <Tag tone="gold">By agreement</Tag>
                </p>
                <p className="num mt-2 font-display text-2xl font-semibold">Negotiated</p>
                <p className="mt-1 text-[10px] text-ink-faint">
                  Everything in Network, plus custom terms, onboarding and support agreements.
                </p>
                <Button asChild size="sm" variant="outline" className="mt-3 h-8 w-full rounded-full border-line text-[11px]">
                  <Link href="/help/contact-support">Talk to sales</Link>
                </Button>
              </div>
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-ink-faint">
              Switching runs through the secure checkout — quotes are priced in your display currency and verified
              before anything changes. Renewals are manual by design; nothing charges silently.
            </p>
          </div>

          {/* ── Payments ledger ─────────────────────────────────────── */}
          <div className="paper-card overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <p className="font-display text-sm font-semibold">Payment history</p>
              <span className="text-[10px] text-ink-faint">Every invoice is church-business receipts-ready.</span>
            </div>
            {d.payments.length === 0 ? (
              <div className="px-5 py-10 text-center text-[11px] text-ink-faint">
                No payments recorded yet — the register stays honest either way.
              </div>
            ) : (
              <ListTable className="divide-y divide-line/70" tableId="settings-billing-1" records={d.payments.slice(0, 12) ?? []} recordKey="reference"><StaggerGroup className="divide-y divide-line/70">
                <div className="rule-label grid grid-cols-[1.2fr_1fr_0.8fr_1fr_0.9fr] items-center gap-3 border-b border-line px-5 py-2.5">
                  <span>Invoice</span>
                  <span>Date</span>
                  <span>Plan</span>
                  <span>Method</span>
                  <span className="text-right">Amount</span>
                </div>
                {d.payments.slice(0, 12).map((p) => (
                  <StaggerItem key={p.reference}>
                    <div className="grid grid-cols-[1.2fr_1fr_0.8fr_1fr_0.9fr] items-center gap-3 px-5 py-3 text-xs">
                      <span className="truncate font-mono text-[10px] text-ink-faint">{p.reference.slice(0, 16)}</span>
                      <span className="text-ink-soft">
                        {new Date(p.created_at).toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      <span>{planName(p.plan)}</span>
                      <span className="flex items-center gap-1.5 text-[11px]">
                        <Tag tone={PAYMENT_TONES[p.status] ?? "neutral"} dot>{p.status}</Tag>
                      </span>
                      <span className="num text-right font-semibold">{subscriptionMoney(p.amount, p.currency)}</span>
                    </div>
                  </StaggerItem>
                ))}
                <div className="bg-muted/20 px-5 py-2.5 text-[10px] text-ink-faint">
                  <Link href="/help" className="flex items-center gap-1 text-brand hover:underline">
                    <Download className="size-3" /> How billing &amp; renewals work — the guide
                  </Link>
                </div>
              </StaggerGroup></ListTable>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="paper-card rounded-2xl p-5">
            <p className="rule-label mb-3">What the plan unlocks</p>
            <ul className="space-y-1.5 text-[11px] leading-relaxed text-ink-soft">
              {(d.features.slice(0, 10)).map((f) => (
                <li key={f} className="flex items-start gap-1.5">
                  <Check className="mt-0.5 size-3 shrink-0 text-moss" /> {f.replace(/_/g, " ")}
                </li>
              ))}
              {d.features.length > 10 ? (
                <li className="text-[10px] text-ink-faint">+ {number(d.features.length - 10)} more feature surfaces</li>
              ) : null}
            </ul>
          </div>
          {d.latestPayment ? (
            <div className="paper-card rounded-2xl p-5">
              <p className="rule-label mb-2">Last charge</p>
              <p className="num font-display text-lg font-semibold">
                {subscriptionMoney(d.latestPayment.amount, d.latestPayment.currency)}
              </p>
              <p className="mt-0.5 text-[10px] text-ink-faint">
                via {d.latestPayment.gateway} · exact reference {d.latestPayment.reference.slice(0, 10)}…
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-line p-5 text-[10px] leading-relaxed text-ink-faint">
              No gateway charge yet — the plan card above is where the first one begins.
            </div>
          )}
          <div className="rounded-2xl border border-dashed border-line p-5 text-[10px] leading-relaxed text-ink-faint">
            Board packs default to withholding donor names — the numbers invite trust, the names invite gossip.
          </div>
        </aside>
      </div>
    </div>
  );
}
