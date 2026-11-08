import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  label?: string;
  variant?: "spinner" | "inline" | "table" | "cards" | "detail" | "form";
  rows?: number;
  className?: string;
}

/** Accessible skeletons for content fetching. `spinner` is a legacy alias for detail. */
export function LoadingState({
  label = "Loading content",
  variant = "detail",
  rows = 5,
  className,
}: LoadingStateProps) {
  if (variant === "inline")
    return (
      <span
        role="status"
        aria-label={label}
        aria-busy="true"
        className={cn("inline-flex min-w-0 items-center gap-2", className)}
      >
        <span className="sr-only">{label}</span>
        <span
          data-slot="skeleton"
          aria-hidden="true"
          className="ui-skeleton inline-block h-4 w-24 max-w-full rounded bg-muted"
        />
      </span>
    );
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      className={cn("w-full space-y-4 p-4 sm:p-6", className)}
    >
      <span className="sr-only">{label}</span>
      {variant === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="space-y-4 rounded-2xl border bg-card p-5">
              <Skeleton className="size-10 rounded-xl" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-7 w-1/2" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      ) : variant === "form" ? (
        <>
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-5/6" />
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
          <Skeleton className="h-10 w-full rounded-md" />
        </>
      ) : variant === "detail" || variant === "spinner" ? (
        <>
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </>
      ) : (
        <div className="divide-y rounded-xl border">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="size-9 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
              </div>
              <Skeleton className="hidden h-6 w-20 sm:block" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
