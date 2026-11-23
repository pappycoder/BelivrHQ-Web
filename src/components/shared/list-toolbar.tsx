"use client";
import { Children, Fragment, cloneElement, isValidElement, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { Bookmark, Check, ListFilter, RotateCcw, Settings2, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SearchField, ViewToggle } from "@/components/paper/primitives";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Select, SelectTrigger } from "@/components/ui/select";
import { compactFilterChoices } from "./list-filter-choices";
import { SavedListViews } from "./saved-list-views";
import { useRegisteredListFilters } from "@/hooks/use-list-filter-state";

// Older registers supplied search among their filters. Keep it on the register,
// never hidden in the drawer, while preserving the page's query handlers.
function separateSearch(nodes: ReactNode): { search: ReactNode[]; filters: ReactNode[] } {
  const result: { search: ReactNode[]; filters: ReactNode[] } = { search: [], filters: [] };
  Children.forEach(nodes, node => {
    if (isValidElement<{children?: ReactNode}>(node) && node.type === Fragment) {
      const nested = separateSearch(node.props.children);
      result.search.push(...nested.search); result.filters.push(...nested.filters);
    } else if (isValidElement<{children?:ReactNode}>(node) && (node.type === "div" || node.type === "span")) {
      const nested = separateSearch(node.props.children);
      result.search.push(...nested.search);
      if (nested.filters.length) result.filters.push(cloneElement(node,{children:nested.filters}));
    } else if (isValidElement(node) && node.type === SearchField) result.search.push(node);
    else if (node != null && node !== false) result.filters.push(node);
  });
  return {search:Children.toArray(result.search),filters:Children.toArray(result.filters)};
}
function labeledControls(nodes: ReactNode): ReactNode {
  return Children.map(nodes, node => {
    if (!isValidElement<{"aria-label"?: string; children?: ReactNode}>(node)) return node;
    if (node.type === Fragment) return labeledControls(node.props.children);
    if (node.type === "div" || node.type === "span") return cloneElement(node, {children:labeledControls(node.props.children)});
    if (node.type === ViewToggle) return <fieldset className="w-full"><legend className="mb-2 text-sm font-medium">Layout</legend>{node}</fieldset>;
    if (node.type === Select) {
      const selectTrigger = Children.toArray(node.props.children).find(child => isValidElement(child) && child.type === SelectTrigger);
      const name = isValidElement<{"aria-label"?: string}>(selectTrigger) ? selectTrigger.props["aria-label"] : undefined;
      if (name) return <div className="list-drawer-field w-full"><span>{name.replace(/^Filter .* by /i, "").replace(/^branch$/i, "Branch")}</span>{node}</div>;
    }
    const label = node.props["aria-label"];
    return node.type === "select" && label ? <label className="list-drawer-field"><span>{label.replace(/ filter$/i, "")}</span>{node}</label> : node;
  });
}

export function ListToolbar({ search, controls, children, className, inlineFilters = false, filterLabel, ...props }: ComponentProps<"div"> & { search?: ReactNode; controls?: ReactNode; inlineFilters?: boolean; filterLabel?: string }) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const filters = useRegisteredListFilters();
  const parts = separateSearch(children);
  const controlParts = separateSearch(controls);
  const visibleSearch = search || parts.search.length > 0 || controlParts.search.length > 0;
  const recordFilters = parts.filters;
  const displayControls = controlParts.filters;
  return <div data-list-toolbar className={cn("paper-card flex min-w-0 flex-wrap items-center gap-2 rounded-2xl border border-line p-3", className)} {...props}>
    {visibleSearch && <div className="min-w-0 flex-[1_1_15rem] [&>*]:w-full [&>*]:max-w-none">{search}{parts.search}{controlParts.search}</div>}
    {!inlineFilters && (recordFilters.length > 0 || displayControls.length > 0) && <Button ref={trigger} variant="outline" className="list-filter-trigger h-9 rounded-full" onClick={() => setOpen(true)}><SlidersHorizontal className="size-4" />Filters & display{filters.active > 0 && <span className="rounded-full bg-brand-soft px-1.5 text-brand">{filters.active}</span>}</Button>}
    {inlineFilters && <div className="flex min-w-0 flex-wrap gap-2">{recordFilters}{displayControls}</div>}
    <SavedListViews />
    {filters.active > 0 && <Button variant="ghost" size="sm" onClick={filters.reset}>Clear filters</Button>}
    <Sheet open={open} onOpenChange={setOpen}><SheetContent data-paper-root data-list-filter-drawer className="gap-0 overflow-hidden border-line bg-card sm:max-w-[27rem]" onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus(); }}>
      <SheetHeader className="shrink-0 gap-2 p-5 pr-12"><SheetTitle className="font-display text-2xl">Filters & display</SheetTitle><SheetDescription className="text-xs">Find the records you need and choose how to see them.</SheetDescription></SheetHeader>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
        <p className="flex items-center gap-2 text-xs text-ink-soft"><span className="size-1.5 rounded-full bg-brand" />Results update as you choose{filters.active > 0 && <span className="ml-auto rounded-full bg-brand-soft px-2 py-1 text-brand">{filters.active} active</span>}</p>
        {recordFilters.length > 0 && <section className="list-drawer-section"><header><ListFilter className="size-4 text-brand" /><div><h3>Filter records</h3><p>Narrow this register to what matters.</p></div></header><div data-list-filters className="list-drawer-controls">{labeledControls(compactFilterChoices(recordFilters,filterLabel))}</div></section>}
        {displayControls.length > 0 && <section className="list-drawer-section"><header><Settings2 className="size-4 text-brand" /><div><h3>Arrange your view</h3><p>Choose scope, sorting and layout.</p></div></header><div data-list-controls className="list-drawer-controls">{labeledControls(compactFilterChoices(displayControls))}</div></section>}
        <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-faint"><Bookmark className="size-3.5 shrink-0" />Save a useful combination from the register. Views stay private to your account.</p>
      </div><SheetFooter className="shrink-0 flex-row gap-3 border-line p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{filters.available && <Button variant="outline" className="flex-1 rounded-xl" onClick={filters.reset}><RotateCcw className="size-4" />Reset all</Button>}<Button className="flex-1 rounded-xl" onClick={() => setOpen(false)}><Check className="size-4" />Show results</Button></SheetFooter>
    </SheetContent></Sheet>
  </div>;
}
