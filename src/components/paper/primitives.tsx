"use client";

import {
  useBulkRowActions,
  type BulkManageAction,
} from "@/contexts/list-bulk-context";
import {
  useManageConfirmation,
  type ManageConfirmationOptions,
} from "@/components/shared/manage-confirmation";
import * as React from "react";
import { isRecordOpenLabel } from "@/lib/record-row-navigation";
import Link from "next/link";
import { ChevronDown, Search, X } from "lucide-react";
import { IdentityImage } from "@/components/shared/identity-image";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ActionTooltip } from "@/components/ui/tooltip";

export { Tag } from "./stat";

const sizes = {
  xs: "size-6 text-xs",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-base",
  xl: "size-20 text-xl",
};

export function PersonAvatar({
  name,
  size = "md",
  className,
  ring = false,
  src,
}: {
  name: string;
  hue?: number;
  size?: keyof typeof sizes;
  className?: string;
  ring?: boolean;
  src?: string;
}) {
  return (
    <span className={cn("inline-block shrink-0 overflow-hidden rounded-full", sizes[size], ring && "ring-2 ring-card", className)}>
      <IdentityImage src={src} alt={name} />
    </span>
  );
}

export function AvatarStack({
  people,
  max = 3,
  size = "sm",
}: {
  people: { name: string; hue?: number; src?: string }[];
  max?: number;
  size?: keyof typeof sizes;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((person, i) => (
        <PersonAvatar
          key={person.name + i}
          name={person.name}
          hue={person.hue}
          src={person.src}
          size={size}
          ring
          className={i > 0 ? "-ml-2" : undefined}
        />
      ))}
      {rest > 0 ? (
        <span
          className={cn(
            "-ml-2 inline-grid shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-ink-soft ring-2 ring-card",
            sizes[size],
          )}
        >
          +{rest}
        </span>
      ) : null}
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder = "Search…",
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div data-tour-search className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-faint" />
      <Input
        aria-label={ariaLabel ?? placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-9 rounded-lg border-line bg-card pl-9 pr-8 text-sm shadow-none"
      />
      {value ? (
        <ActionTooltip label="Clear search">
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full text-ink-faint hover:bg-muted hover:text-ink"
          >
            <X className="size-3" />
          </button>
        </ActionTooltip>
      ) : null}
    </div>
  );
}

const iconActionTones = {
  default: "hover:bg-muted hover:text-ink",
  danger: "hover:bg-rose-soft hover:text-rose",
  success: "hover:bg-moss-soft hover:text-moss",
  warning: "hover:bg-gold-soft hover:text-gold",
} as const;

export type IconActionTone = keyof typeof iconActionTones;

function iconActionClass(
  tone: IconActionTone,
  disabled?: boolean,
  className?: string,
) {
  return cn(
    "grid size-7 shrink-0 place-items-center rounded-full text-ink-faint transition-colors [&_svg]:size-3.5",
    iconActionTones[tone],
    disabled && "pointer-events-none opacity-50",
    className,
  );
}

/** Icon-only button with a visible tooltip — the Paper grammar for compact actions. */
export function IconAction({
  label,
  icon,
  onSelect,
  tone = "default",
  disabled,
  className,
  rowOpen,
}: {
  label: string;
  icon: React.ReactNode;
  onSelect?: () => void;
  tone?: IconActionTone;
  disabled?: boolean;
  className?: string;
  rowOpen?: boolean;
}) {
  return (
    <ActionTooltip label={label}>
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        data-row-open={rowOpen ? "true" : undefined}
        aria-label={label}
        className={iconActionClass(tone, disabled, className)}
      >
        {icon}
      </button>
    </ActionTooltip>
  );
}

/** Icon-only navigation control with the same tooltip grammar as IconAction. */
export function IconActionLink({
  label,
  icon,
  href,
  tone = "default",
  className,
  rowOpen,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  href: string;
  tone?: IconActionTone;
  className?: string;
  rowOpen?: boolean;
  onClick?: () => void;
}) {
  return (
    <ActionTooltip label={label}>
      <Link
        href={href}
        data-row-open={rowOpen ? "true" : undefined}
        aria-label={label}
        onClick={onClick}
        className={iconActionClass(tone, undefined, className)}
      >
        {icon}
      </Link>
    </ActionTooltip>
  );
}

/** One row action: either navigates (href) or fires a handler (onSelect). */
export interface RowAction {
  opensRecord?: boolean;
  label: string;
  icon: React.ReactNode;
  href?: string;
  onSelect?: () => unknown | Promise<unknown>;
  tone?: IconActionTone;
  disabled?: boolean;
  bulk?: BulkManageAction;
  /** Required for direct record writes. Actions opening an existing dialog omit it. */
  confirmation?: ManageConfirmationOptions;
}

type Falsy = false | null | undefined | 0 | "";

/**
 * The standard Manage cell. Fixed grammar: Open → Edit → domain actions →
 * Archive/Restore → destructive last. Falsy entries are dropped so callers can
 * gate actions inline (`canUpdate && { … }`).
 */
export function RowActions({
  actions,
  reveal = true,
  className,
}: {
  actions: (RowAction | Falsy)[];
  reveal?: boolean;
  className?: string;
}) {
  const visible = actions.filter((action): action is RowAction =>
    Boolean(action),
  );
  const { confirm, dialog } = useManageConfirmation();
  useBulkRowActions(visible);
  const primary = visible.find(
    (action) =>
      !action.confirmation &&
      !action.disabled &&
      (action.opensRecord || isRecordOpenLabel(action.label)),
  );
  if (visible.length === 0) return null;
  return (
    <>
      <div
        className={cn(
          "row-actions flex items-center justify-end gap-1",
          reveal && "row-actions--reveal",
          className,
        )}
      >
        {visible.map((action) =>
          action.href ? (
            <IconActionLink
              key={action.label}
              rowOpen={action === primary}
              label={action.label}
              icon={action.icon}
              href={action.href}
              tone={action.tone}
            />
          ) : (
            <IconAction
              key={action.label}
              rowOpen={action === primary}
              label={action.label}
              icon={action.icon}
              onSelect={() => {
                if (!action.onSelect || action.disabled) return;
                if (action.confirmation)
                  confirm({
                    ...action.confirmation,
                    title: action.confirmation.title ?? `${action.label}?`,
                    destructive:
                      action.confirmation.destructive ??
                      action.tone === "danger",
                    onConfirm: action.onSelect,
                  });
                else void action.onSelect();
              }}
              tone={action.tone}
              disabled={action.disabled}
            />
          ),
        )}
      </div>
      {dialog}
    </>
  );
}

/** The single header cell every list table uses above its RowActions. */
export function ManageHeading() {
  return <span className="text-right">Manage</span>;
}

/** asc/desc flip control shared by every sortable Paper list. */
export function SortDirectionToggle({
  ascending,
  onToggle,
  className,
}: {
  ascending: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <IconAction
      label={ascending ? "Sort descending" : "Sort ascending"}
      icon={
        <ChevronDown
          className={cn("transition-transform", ascending && "rotate-180")}
        />
      }
      onSelect={onToggle}
      className={cn(
        "size-8 rounded-full border border-line bg-card",
        className,
      )}
    />
  );
}

export function FilterChip({
  active,
  children,
  onClick,
  count,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  count?: number;
}) {
  return (
    <Button
      data-tour-filter
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn(
        "h-8 gap-1.5 rounded-full border-line bg-card px-3 text-sm font-medium shadow-none",
        active &&
          "border-ink/20 bg-ink text-paper hover:bg-ink/90 hover:text-paper",
      )}
    >
      {children}
      {count !== undefined ? (
        <span
          className={cn(
            "num rounded-full px-1.5 text-xs",
            active ? "bg-paper/20" : "bg-muted text-ink-soft",
          )}
        >
          {count}
        </span>
      ) : null}
    </Button>
  );
}

export function ViewToggle<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; icon: React.ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-lg border border-line bg-card p-0.5">
      {options.map((option) => (
        <ActionTooltip key={option.value} label={option.label}>
          <button
            type="button"
            onClick={() => onChange(option.value)}
            aria-label={option.label}
            aria-pressed={value === option.value}
            className={cn(
              "grid size-7 place-items-center rounded-md text-ink-faint transition-colors [&_svg]:size-3.5",
              value === option.value
                ? "bg-ink text-paper"
                : "hover:bg-muted hover:text-ink",
            )}
          >
            {option.icon}
          </button>
        </ActionTooltip>
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-tour-empty
      className={cn(
        "paper-card bg-card flex flex-col items-center justify-center gap-3 rounded-2xl border border-line px-6 py-14 text-center",
        className,
      )}
    >
      {icon ? (
        <span className="grid size-11 place-items-center rounded-full bg-muted text-ink-faint [&_svg]:size-5">
          {icon}
        </span>
      ) : null}
      <div className="space-y-1">
        <p className="font-display text-base font-semibold">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-ink-soft">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function FieldRow({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("flex items-start justify-between gap-4 py-2.5", className)}
    >
      <span className="text-sm text-ink-faint">{label}</span>
      <span className="text-right text-sm font-medium text-ink">
        {children}
      </span>
    </div>
  );
}

export function DataList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("divide-y divide-line/70", className)}>{children}</div>
  );
}

/**
 * One pagination footer for every Paper list: the honest count, a rows-per-page
 * control and Prev/Next. Server-paginated pages drive it from their hook params;
 * client-sliced lists pass their computed window.
 */
export { ListPaginationFooter } from "@/components/shared/list-pagination";
