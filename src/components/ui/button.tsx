import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { LoadingIndicator } from "@/components/shared/loading-indicator";

import { cn } from "@/lib/utils";
import { ActionTooltip } from "@/components/ui/tooltip";

function getChildText(node: React.ReactNode): string | undefined {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (!React.isValidElement<{ children?: React.ReactNode }>(node))
    return undefined;

  return (
    React.Children.toArray(node.props.children)
      .map(getChildText)
      .filter((text): text is string => Boolean(text))
      .join(" ") || undefined
  );
}

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all motion-reduce:transition-none outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-8 gap-1 rounded-md px-2 text-sm has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  tooltip,
  disableTooltip = false,
  loading = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /** Preserve the button label while displaying progress and preventing duplicate actions. */
    loading?: boolean;
    /** Required for icon-only action buttons so their intent is visible on hover and focus. */
    tooltip?: React.ReactNode;
    /** Used by composed primitives that render the tooltip around their trigger. */
    disableTooltip?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";
  const { title, "aria-label": ariaLabel, ...buttonProps } = props;
  const tooltipLabel =
    tooltip ?? ariaLabel ?? title ?? getChildText(props.children);
  const isIconOnly = typeof size === "string" && size.startsWith("icon");
  const hasExplicitLabel = Boolean(tooltip ?? ariaLabel ?? title);
  const shouldUseTooltip =
    !disableTooltip &&
    Boolean(tooltipLabel) &&
    (isIconOnly || hasExplicitLabel);
  const accessibleLabel =
    ariaLabel ?? (typeof tooltipLabel === "string" ? tooltipLabel : undefined);

  const button = (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      aria-label={accessibleLabel}
      title={shouldUseTooltip ? undefined : title}
      {...buttonProps}
      disabled={props.disabled || loading}
      aria-busy={loading || props["aria-busy"]}
    >
      {asChild ? props.children : <>
        {loading && <LoadingIndicator size="sm" label="Working" decorative className="text-current" />}
        {props.children}
      </>}
    </Comp>
  );

  return shouldUseTooltip ? (
    <ActionTooltip label={tooltipLabel}>{button}</ActionTooltip>
  ) : (
    button
  );
}

export { Button, buttonVariants };
