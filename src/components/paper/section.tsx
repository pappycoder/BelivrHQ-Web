import * as React from "react";
import { NavigationPageTour } from "@/components/tours/navigation-page-tour";
import { cn } from "@/lib/utils";

export function DetailHeading({ className, ...props }: React.ComponentProps<"h1">) {
  return <h1 {...props} className={cn("min-w-0 max-w-full [overflow-wrap:anywhere] font-display text-[clamp(1.65rem,2.4vw,2.15rem)] leading-[1.1] font-semibold tracking-tight text-balance", className)} />;
}

/** Keep back navigation, record actions and the tour together on detail pages. */
export function DetailNavigation({ children }: { children: React.ReactNode }) {
  return (
    <nav aria-label="Record navigation" className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3">{children}</div>
      <div data-tour-actions className="flex max-w-full flex-wrap items-center gap-2"><NavigationPageTour /></div>
    </nav>
  );
}

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
        <div className="min-w-0 max-w-full space-y-1.5">
          {eyebrow ? (
            <div className="rule-label flex items-center gap-2">{eyebrow}</div>
          ) : null}
          <h1
            className={cn(
              "[overflow-wrap:anywhere] font-display font-semibold tracking-tight text-balance",
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
        <div data-tour-actions className="flex max-w-full shrink-0 flex-wrap items-center gap-2 empty:hidden">
          {actions}<NavigationPageTour />
        </div>
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
      data-tour-section={typeof title === "string" ? title : undefined}
      className={cn(
        "paper-card overflow-hidden rounded-2xl",
        className,
      )}
    >
      {title || actions || eyebrow ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/80 px-5 py-4">
          <div className="min-w-0 max-w-full space-y-0.5">
            {eyebrow ? <div className="rule-label">{eyebrow}</div> : null}
            {title ? (
              <h2 className="[overflow-wrap:anywhere] font-display text-lg font-semibold leading-tight">
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
