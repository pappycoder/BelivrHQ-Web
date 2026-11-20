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
import { useFamiliesList, type Family } from "@/hooks/use-families";

interface FamilyComboboxProps extends Pick<React.ComponentProps<"button">, "id" | "aria-label" | "aria-labelledby" | "aria-describedby" | "aria-invalid" | "aria-required"> {
  /** Selected family id ("" = none). */
  value: string;
  onChange: (familyId: string, family?: Family) => void;
  /** Display name for the currently selected family. */
  selectedName?: string;
  placeholder?: string;
}

export function FamilyCombobox({
  value,
  onChange,
  selectedName,
  placeholder = "Select family...",
  ...accessibilityProps
}: FamilyComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const listId = React.useId();
  const [searchTerm, setSearchTerm] = React.useState("");

  const initialQuery = useFamiliesList({ limit: 20 });
  const searchQuery = useFamiliesList(
    searchTerm.trim().length >= 2
      ? { search: searchTerm.trim(), limit: 20 }
      : {}
  );

  const options = React.useMemo(() => {
    if (searchTerm.trim().length >= 2) return searchQuery.data?.data ?? [];
    return initialQuery.data?.data ?? [];
  }, [searchTerm, searchQuery.data, initialQuery.data]);

  const handleSelect = (family: Family) => {
    onChange(family.familyId, family);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          {...accessibilityProps}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          className={cn(
            "flex h-10 min-w-0 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm",
            "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
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
            placeholder="Search families by name..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList id={listId}>
            {searchTerm.trim().length >= 2 && searchQuery.isFetching ? (
              <div className="p-3 space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : options.length === 0 ? (
              <CommandEmpty>No families found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {options.map((family) => (
                  <CommandItem
                    key={family.familyId}
                    value={family.familyId}
                    onSelect={() => handleSelect(family)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === family.familyId ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span>{family.name}</span>
                    <span className="ml-auto text-sm text-muted-foreground">
                      {family.members.length} member(s)
                    </span>
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
