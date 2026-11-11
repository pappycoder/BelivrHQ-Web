"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { useVisitorsList, useSearchVisitors, type Visitor } from "@/hooks/use-visitors";

interface VisitorComboboxProps {
  value: string;
  onChange: (visitorId: string, visitor?: Visitor) => void;
  selectedName?: string;
  placeholder?: string;
  excludeIds?: string[];
}

export function VisitorCombobox({
  value,
  onChange,
  selectedName,
  placeholder = "Select visitor...",
  excludeIds = [],
}: VisitorComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");

  const initialQuery = useVisitorsList({ limit: 20 });
  const searchQuery = useSearchVisitors(searchTerm.trim());

  const excluded = React.useMemo(() => new Set(excludeIds), [excludeIds]);

  const options = React.useMemo(() => {
    const source =
      searchTerm.trim().length >= 2
        ? (searchQuery.data?.data ?? [])
        : (initialQuery.data?.data ?? []);
    return source.filter((v) => !excluded.has(v.id));
  }, [searchTerm, searchQuery.data, initialQuery.data, excluded]);

  const handleSelect = (visitor: Visitor) => {
    onChange(visitor.id, visitor);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm",
            "hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value && selectedName ? selectedName : value ? value : placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search visitors by name..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            {searchTerm.trim().length >= 2 && searchQuery.isFetching ? (
              <div className="p-3 space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : options.length === 0 ? (
              <CommandEmpty>No visitors found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {options.map((visitor) => (
                  <CommandItem
                    key={visitor.id}
                    value={visitor.id}
                    onSelect={() => handleSelect(visitor)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === visitor.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span>
                      {visitor.firstName} {visitor.lastName}
                    </span>
                    {visitor.phone && (
                      <span className="ml-auto text-sm text-muted-foreground truncate max-w-[140px]">
                        {visitor.phone}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {value && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value="__clear__"
                    onSelect={() => {
                      onChange("");
                      setOpen(false);
                    }}
                  >
                    Clear selection
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
