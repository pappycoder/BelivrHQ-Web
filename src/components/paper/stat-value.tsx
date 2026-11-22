"use client";

import * as React from "react";
import { CountUp } from "./motion/primitives";

/** Fit the complete amount, rather than a shorter intermediate animation frame. */
export function StatValue({ value, decimals, prefix = "", suffix = "" }: {
  value: number;
  decimals: number;
  prefix?: string;
  suffix?: string;
}) {
  const container = React.useRef<HTMLDivElement>(null);
  const ruler = React.useRef<HTMLSpanElement>(null);
  const [scale, setScale] = React.useState(1);
  const formatted = `${prefix}${value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}${suffix}`;

  React.useLayoutEffect(() => {
    const fit = () => {
      const available = container.current?.clientWidth ?? 0;
      const needed = ruler.current?.getBoundingClientRect().width ?? 0;
      if (available && needed) setScale(Math.max(0.5, Math.min(1, available / needed)));
    };
    const observer = new ResizeObserver(fit);
    if (container.current) observer.observe(container.current);
    if (ruler.current) observer.observe(ruler.current);
    fit();
    return () => observer.disconnect();
  }, [formatted]);

  return (
    <div ref={container} data-slot="stat-value" className="relative min-w-0 font-display text-[1.9rem] font-semibold leading-none tracking-tight">
      <span ref={ruler} aria-hidden="true" className="num invisible absolute left-0 top-0 inline-block whitespace-nowrap">{formatted}</span>
      <span className="block [overflow-wrap:anywhere]" style={{ fontSize: `${1.9 * scale}rem` }}>
        <CountUp value={value} decimals={decimals} prefix={prefix} suffix={suffix} />
      </span>
    </div>
  );
}
