import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ClipboardList, LockKeyhole } from "lucide-react";
import {
  ChurchFormBranding,
  type ChurchFormIdentity,
} from "./church-form-branding";
import { LoadingState } from "@/components/shared/loading-state";
import { Skeleton } from "@/components/ui/skeleton";

interface PublicFormFrameProps extends ChurchFormIdentity {
  title: string;
  description: string;
  eyebrow?: string;
  aside?: ReactNode;
  loading?: boolean;
  /** Embed the respondent layout in the builder without nested page landmarks. */
  embedded?: boolean;
  stacked?: boolean;
  children: ReactNode;
}
/** The same Paper introduction/response layout used by church-created public forms. */
export function PublicFormFrame({
  churchName,
  churchLogoUrl,
  title,
  description,
  eyebrow = "A place to connect",
  aside,
  loading,
  embedded = false,
  stacked = false,
  children,
}: PublicFormFrameProps) {
  const Content = embedded ? "div" : "main";
  const Heading = embedded ? "h3" : "h1";
  return (
    <div
      data-public-form-frame
      data-paper-root
      aria-busy={loading || undefined}
      className={cn("bg-background text-foreground", !embedded && "min-h-svh")}
    >
      <header
        className={cn(
          "mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4",
          embedded ? "px-4 py-5" : "px-5 py-6 sm:px-8",
        )}
      >
        {loading ? (
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="size-12 shrink-0" />
            <Skeleton className="h-5 w-36 max-w-full" />
          </div>
        ) : churchName ? (
          <ChurchFormBranding
            churchName={churchName}
            churchLogoUrl={churchLogoUrl}
          />
        ) : (
          <span>Community forms</span>
        )}
        <span className="flex shrink-0 items-center gap-2 rounded-full border border-current/10 bg-white/60 px-3 py-2 text-xs dark:bg-card">
          <ClipboardList className="size-3.5" />
          Community forms
        </span>
      </header>
      <Content
        className={cn(
          "mx-auto grid w-full max-w-6xl min-w-0 gap-0",
          embedded ? "px-3 pb-3" : "px-4 pb-10 sm:px-8",
          !stacked && "lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]",
        )}
      >
        <aside
          className={cn(
            "relative overflow-hidden rounded-t-3xl bg-[var(--brand)] text-white",
            embedded ? "p-5" : "px-6 py-8 sm:p-10",
            !stacked && "lg:rounded-l-3xl lg:rounded-tr-none",
          )}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-28 -top-28 size-80 rounded-full border-[40px] border-white/5"
          />
          <div className="relative lg:sticky lg:top-10">
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#d6e5ba]">
              {eyebrow}
            </p>
            {loading ? (
              <div className="mt-6 space-y-5">
                <Skeleton className="h-10 w-4/5 bg-white/15" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full bg-white/15" />
                  <Skeleton className="h-4 w-5/6 bg-white/15" />
                  <Skeleton className="h-4 w-3/4 bg-white/15" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-24 rounded-full bg-white/15" />
                  <Skeleton className="h-8 w-24 rounded-full bg-white/15" />
                </div>
              </div>
            ) : (
              <>
                <Heading
                  className={cn(
                    "mt-4 break-words font-semibold leading-tight tracking-tight",
                    embedded ? "text-2xl" : "text-3xl sm:text-4xl",
                  )}
                >
                  {title}
                </Heading>
                <p className="mt-5 whitespace-pre-line break-words text-sm leading-7 text-white/75">
                  {description}
                </p>
                {aside}
              </>
            )}
            <p className="mt-8 flex gap-2 border-t border-white/15 pt-5 text-xs leading-6 text-white/70">
              <LockKeyhole className="mt-1 size-4 shrink-0" />
              Your response goes to the church team that shared this form.
            </p>
          </div>
        </aside>
        <section
          aria-label="Your response"
          className={cn(
            "min-w-0 rounded-b-3xl border border-t-0 bg-card shadow-sm",
            embedded ? "p-5" : "p-6 sm:p-10",
            !stacked &&
              "lg:rounded-r-3xl lg:rounded-bl-none lg:border-t lg:border-l-0",
          )}
        >
          {children}
        </section>
      </Content>
    </div>
  );
}
export function PublicFormLoading({
  label = "Loading registration form",
}: {
  label?: string;
}) {
  return (
    <PublicFormFrame loading title="" description="">
      <LoadingState
        label={label}
        variant="form"
        rows={4}
        className="p-0 sm:p-0"
      />
    </PublicFormFrame>
  );
}
