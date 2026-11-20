import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Member-register grammar: search and record filters left; scope/display controls right. */
export function ListToolbar({ search, controls, children, className, ...props }: ComponentProps<"div"> & {
  search?: ReactNode;
  controls?: ReactNode;
}) {
  return (
    <div data-list-toolbar className={cn("flex min-w-0 flex-wrap items-center gap-2", className)} {...props}>
      {search}
      {children && <div data-list-filters className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5">{children}</div>}
      {controls && <div data-list-controls className="ml-auto flex min-w-0 max-w-full flex-wrap items-center gap-2">{controls}</div>}
    </div>
  );
}
