import type { ComponentProps } from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/** Record navigation shares one wrapping treatment, including at narrow mobile widths. */
export function RecordTabsList({ className, ...props }: ComponentProps<typeof TabsList>) {
  return <TabsList {...props} className={cn("h-auto group-data-[orientation=horizontal]/tabs:h-auto max-w-full w-fit flex-wrap overflow-visible justify-start rounded-2xl border border-line bg-card p-1", className)} />;
}

export function RecordTabsTrigger({ className, ...props }: ComponentProps<typeof TabsTrigger>) {
  return <TabsTrigger {...props} className={cn("h-9 flex-none rounded-full px-4 py-2 text-sm data-[state=active]:bg-ink data-[state=active]:text-paper", className)} />;
}
