import * as React from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
  compact = false,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <header className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          {eyebrow ? (
            <div className="rule-label flex items-center gap-2">{eyebrow}</div>
          ) : null}
          <h1
            className={cn(
              "font-display font-semibold tracking-tight text-balance",
              compact ? "text-2xl" : "text-[clamp(1.65rem,2.4vw,2.15rem)] leading-[1.1]",
            )}
          >
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-sm leading-relaxed text-ink-soft">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {children}
    </header>
  );
}

export function SectionCard({
  title,
  eyebrow,
  description,
  actions,
  children,
  className,
  bodyClassName,
  as: Tag = "section",
}: {
  title?: React.ReactNode;
  eyebrow?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  as?: React.ElementType;
}) {
  return (
    <Tag
      className={cn(
        "paper-card overflow-hidden rounded-2xl",
        className,
      )}
    >
      {title || actions || eyebrow ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/80 px-5 py-4">
          <div className="min-w-0 space-y-0.5">
            {eyebrow ? <div className="rule-label">{eyebrow}</div> : null}
            {title ? (
              <h2 className="font-display text-lg font-semibold leading-tight">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="text-sm text-ink-soft">{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 items-center gap-1.5">{actions}</div>
          ) : null}
        </div>
      ) : null}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </Tag>
  );
}
