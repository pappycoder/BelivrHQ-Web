"use client";
import { useState, type ComponentProps } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
export function CompactListSummary({ className, children, ...props }: ComponentProps<"div">) {
  const [expanded, setExpanded] = useState(false);
  return <div {...props} data-list-summary data-expanded={expanded} role="region" aria-label="Register summary" className={cn("compact-list-summary", className)}>
    {children}<button type="button" className="summary-expand" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}><ChevronDown className={cn("size-4", expanded && "rotate-180")} />{expanded ? "Less" : "Summary"}</button>
  </div>;
}
