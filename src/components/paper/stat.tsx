import * as React from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { CountUp } from "./motion/primitives";

export type Tone = "brand" | "moss" | "gold" | "sky" | "rose" | "neutral";

const toneBg: Record<Tone, string> = {
  brand: "bg-brand-soft text-brand",
  moss: "bg-moss-soft text-moss",
  gold: "bg-gold-soft text-gold",
  sky: "bg-sky-soft text-sky",
  rose: "bg-rose-soft text-rose",
  neutral: "bg-muted text-ink-soft",
};

export function ToneDot({ tone }: { tone: Tone }) {
  const map: Record<Tone, string> = {
    brand: "bg-brand",
    moss: "bg-moss",
    gold: "bg-gold",
    sky: "bg-sky",
    rose: "bg-rose",
    neutral: "bg-ink-faint",
  };
  return <span className={cn("size-1.5 rounded-full", map[tone])} />;
}

export function Tag({
  children,
  tone = "neutral",
  className,
  dot = false,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium leading-5",
        toneBg[tone],
        className,
      )}
    >
      {dot ? <ToneDot tone={tone} /> : null}
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  delta,
  deltaLabel,
  tone = "brand",
  icon,
  footer,
  className,
  decimals = 0,
  prefix,
  suffix,
}: {
  label: string;
  value: number;
  delta?: number;
  deltaLabel?: string;
  tone?: Tone;
  icon?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}) {
  const positive = (delta ?? 0) > 0;
  const flat = delta === 0 || delta === undefined;
  return (
    <div
      className={cn(
        "paper-card lift group relative flex flex-col justify-between gap-4 overflow-hidden rounded-2xl p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="rule-label">{label}</span>
        {icon ? (
          <span
            className={cn(
              "grid size-8 place-items-center rounded-lg [&_svg]:size-4",
              toneBg[tone],
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <div className="font-display text-[1.9rem] font-semibold leading-none tracking-tight">
          <CountUp
            value={value}
            decimals={decimals}
            prefix={prefix}
            suffix={suffix}
          />
        </div>
        {delta !== undefined || footer ? (
          <div className="flex items-center gap-2 text-sm text-ink-soft">
            {delta !== undefined ? (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-medium",
                  flat
                    ? "text-ink-faint"
                    : positive
                      ? "text-moss"
                      : "text-rose",
                )}
              >
                {flat ? (
                  <Minus className="size-3" />
                ) : positive ? (
                  <ArrowUpRight className="size-3" />
                ) : (
                  <ArrowDownRight className="size-3" />
                )}
                {Math.abs(delta)}%
              </span>
            ) : null}
            {deltaLabel ? <span className="text-ink-faint">{deltaLabel}</span> : null}
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
