"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Props = Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  label: string;
  loading?: boolean;
  failed?: boolean;
};

/** The input owns the value; choosing a suggestion is optional. */
export const FreeTextCombobox = React.forwardRef<HTMLInputElement, Props>(function FreeTextCombobox(
  { value, onChange, options, label, loading, failed, onBlur, onFocus, onKeyDown, disabled, className, ...props }, ref,
) {
  const [open, setOpen] = React.useState(false);
  const [showAll, setShowAll] = React.useState(true);
  const [active, setActive] = React.useState(-1);
  const input = React.useRef<HTMLInputElement>(null);
  const anchor = React.useRef<HTMLDivElement>(null);
  const listId = React.useId();
  const matches = React.useMemo(() => [...new Set(options)].filter(option => showAll || option.toLocaleLowerCase().includes(value.trim().toLocaleLowerCase())), [options, value, showAll]);
  React.useEffect(() => {
    if (open && active >= 0) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, listId]);
  const select = (name: string) => { onChange(name); setOpen(false); setActive(-1); };
  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div ref={anchor} className="relative">
          <Input {...props} ref={node => { input.current = node; if (typeof ref === "function") ref(node); else if (ref) ref.current = node; }}
            value={value} disabled={disabled} className={cn("pr-10", className)} role="combobox" autoComplete="off"
            aria-expanded={open && !disabled} aria-autocomplete="list" aria-controls={open ? listId : undefined}
            aria-activedescendant={open && active >= 0 && matches[active] ? `${listId}-${active}` : undefined}
            onFocus={event => { setShowAll(true); setOpen(true); setActive(-1); onFocus?.(event); }}
            onBlur={event => { setOpen(false); setActive(-1); onBlur?.(event); }}
            onChange={event => { onChange(event.target.value); setShowAll(false); setOpen(true); setActive(-1); }}
            onKeyDown={event => {
              onKeyDown?.(event);
              if (event.defaultPrevented) return;
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault(); setOpen(true);
                if (matches.length) setActive(index => event.key === "ArrowDown" ? (index + 1) % matches.length : (index <= 0 ? matches.length - 1 : index - 1));
              } else if (event.key === "Enter" && open) {
                event.preventDefault();
                if (active >= 0 && matches[active]) select(matches[active]); else setOpen(false);
              } else if (event.key === "Escape" && open) {
                event.preventDefault(); event.stopPropagation(); setOpen(false); setActive(-1);
              }
            }}
          />
          <button type="button" tabIndex={-1} disabled={disabled} aria-label={`Show existing ${label.toLowerCase()}`} aria-expanded={open && !disabled}
            onPointerDown={event => event.preventDefault()}
            onClick={() => { const wasOpen = open; input.current?.focus(); setShowAll(true); setActive(-1); setOpen(!wasOpen); }}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground disabled:opacity-50"><ChevronDown className="size-4" /></button>
        </div>
      </PopoverAnchor>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-56 max-w-[calc(100vw-2rem)] p-1" onOpenAutoFocus={event => event.preventDefault()} onCloseAutoFocus={event => event.preventDefault()} onInteractOutside={event => { if (anchor.current?.contains(event.target as Node)) event.preventDefault(); }}>
        <p className="px-3 py-2 text-[11px] font-medium text-muted-foreground">Choose an existing value or keep your own text</p>
        <div id={listId} role="listbox" aria-label={`Existing ${label.toLowerCase()}`} aria-busy={loading} className="max-h-56 overflow-y-auto">
          {matches.map((name, index) => <button type="button" role="option" id={`${listId}-${index}`} key={name} aria-selected={name === value} tabIndex={-1}
            onPointerDown={event => event.preventDefault()} onClick={() => select(name)} onPointerMove={() => setActive(index)}
            className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm", active === index ? "bg-accent text-accent-foreground" : "hover:bg-accent/60")}>
            <Check aria-hidden="true" className={cn("size-3.5 shrink-0", name !== value && "invisible")} /><span className="break-words">{name}</span>
          </button>)}
        </div>
        {!matches.length && <p role="status" className="px-3 py-3 text-xs leading-relaxed text-muted-foreground">{loading ? "Finding existing names…" : failed ? "Suggestions are unavailable. You can still type and save your own value." : value ? "No matching suggestions. Your text will be saved with the sermon." : "No saved names yet. Type a new value above."}</p>}
      </PopoverContent>
    </Popover>
  );
});
