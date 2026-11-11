"use client";

import * as React from "react";
import { Check, ChevronDown, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { DENOMINATION_GROUPS } from "@/lib/denominations";

interface DenominationComboboxProps {
  id?: string;
  className?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function DenominationCombobox({
  id,
  className,
  value,
  onChange,
  placeholder = "Select denomination...",
}: DenominationComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [customMode, setCustomMode] = React.useState(false);
  const [customInput, setCustomInput] = React.useState("");
  const customInputRef = React.useRef<HTMLInputElement>(null);

  const handleSelect = (denomination: string) => {
    onChange(denomination);
    setOpen(false);
    setCustomMode(false);
    setCustomInput("");
  };

  const handleCustomSubmit = () => {
    const capitalized = toTitleCase(customInput.trim());
    if (capitalized) {
      onChange(capitalized);
      setOpen(false);
      setCustomMode(false);
      setCustomInput("");
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setCustomMode(false);
      setCustomInput("");
    }
  };

  React.useEffect(() => {
    if (customMode && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [customMode]);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          aria-expanded={open}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-sm",
            "hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <span className={cn("truncate", !value && "text-gray-400")}>
            {value || placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search denominations..." />
          <CommandList>
            <CommandEmpty>
              <div className="py-3 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  No denomination found.
                </p>
                <button
                  type="button"
                  className="text-sm font-medium"
                  style={{ color: "var(--primary)" }}
                  onClick={() => setCustomMode(true)}
                >
                  Type a custom denomination
                </button>
              </div>
            </CommandEmpty>

            {DENOMINATION_GROUPS.map((group) => (
              <CommandGroup key={group.label} heading={group.label}>
                {group.denominations.map((denomination) => (
                  <CommandItem
                    key={denomination}
                    value={denomination}
                    onSelect={() => handleSelect(denomination)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === denomination ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {denomination}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}

            <CommandSeparator />

            {/* Custom entry option */}
            {!customMode && (
              <CommandGroup>
                <CommandItem
                  value="__custom__"
                  onSelect={() => setCustomMode(true)}
                >
                  <PenLine className="mr-2 h-4 w-4" />
                  Type a custom denomination
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>

          {/* Inline custom input panel */}
          {customMode && (
            <div className="border-t p-3">
              <p className="text-sm text-muted-foreground mb-2">
                Enter your denomination (auto-capitalized):
              </p>
              <div className="flex gap-2">
                <input
                  ref={customInputRef}
                  type="text"
                  value={customInput}
                  onChange={(e) => setCustomInput(toTitleCase(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCustomSubmit();
                    }
                    if (e.key === "Escape") {
                      setCustomMode(false);
                      setCustomInput("");
                    }
                  }}
                  placeholder="e.g. Living Spring Assembly"
                  className="flex-1 rounded-md border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={handleCustomSubmit}
                  disabled={!customInput.trim()}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: "var(--primary)" }}
                >
                  Add
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCustomMode(false);
                  setCustomInput("");
                }}
                className="mt-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
