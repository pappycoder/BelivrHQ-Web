import type { ReactNode } from "react";
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
  children,
}: PublicFormFrameProps) {
  return (
    <div
      data-public-form-frame
      data-paper-root
      aria-busy={loading || undefined}
      className="min-h-svh bg-background text-foreground"
    >
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-6 sm:px-8">
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
      <main className="mx-auto grid w-full max-w-6xl min-w-0 gap-0 px-4 pb-10 sm:px-8 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
        <aside className="relative overflow-hidden rounded-t-3xl bg-[var(--brand)] px-6 py-8 text-white sm:p-10 lg:rounded-l-3xl lg:rounded-tr-none">
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
                <h1 className="mt-5 break-words text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                  {title}
                </h1>
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
          className="min-w-0 rounded-b-3xl border border-t-0 bg-white p-6 shadow-sm dark:bg-card sm:p-10 lg:rounded-r-3xl lg:rounded-bl-none lg:border-t lg:border-l-0"
        >
          {children}
        </section>
      </main>
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
