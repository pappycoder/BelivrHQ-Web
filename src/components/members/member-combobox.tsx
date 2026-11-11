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
import { useMembersList, useSearchMembers, type Member } from "@/hooks/use-members";

interface MemberComboboxProps {
  /** Selected member id ("" = none). */
  value: string;
  onChange: (memberId: string, member?: Member) => void;
  /** Display name for the currently selected member. */
  selectedName?: string;
  placeholder?: string;
  excludeIds?: string[];
  disabled?: boolean;
  /** Restrict the picker to members of this branch (mirrors the backend rule). */
  branchId?: string;
}

export function MemberCombobox({
  value,
  onChange,
  selectedName,
  placeholder = "Select member...",
  excludeIds = [],
  disabled = false,
  branchId,
}: MemberComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [chosen, setChosen] = React.useState<{ id: string; name: string }>();

  const initialQuery = useMembersList({ limit: 20, branchId }, { enabled: open && !disabled && searchTerm.trim().length < 2 });
  const searchQuery = useSearchMembers(searchTerm.trim(), 20, { branchId, enabled: open && !disabled });

  const excluded = React.useMemo(() => new Set(excludeIds), [excludeIds]);

  const options = React.useMemo(() => {
    const source =
      searchTerm.trim().length >= 2
        ? (searchQuery.data?.data ?? [])
        : (initialQuery.data?.data ?? []);
    return source.filter(
      (m) => !excluded.has(m.memberId) && (!branchId || m.branchId === branchId)
    );
  }, [searchTerm, searchQuery.data, initialQuery.data, excluded, branchId]);

  const handleSelect = (member: Member) => {
    setChosen({ id: member.memberId, name: `${member.firstName} ${member.lastName}`.trim() });
    onChange(member.memberId, member);
    setOpen(false);
  };

  const option = options.find(member => member.memberId === value);
  const displayName = selectedName || (option ? `${option.firstName} ${option.lastName}`.trim() : undefined) ||
    (chosen?.id === value ? chosen.name : undefined) || "Selected member";

  return (
    <Popover open={open && !disabled} onOpenChange={(next) => !disabled && setOpen(next)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm",
            "hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value ? displayName : placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search members by name..."
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
              <CommandEmpty>No members found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {options.map((member) => (
                  <CommandItem
                    key={member.memberId}
                    value={member.memberId}
                    onSelect={() => handleSelect(member)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === member.memberId ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span>
                      {member.firstName} {member.lastName}
                    </span>
                    {member.email && (
                      <span className="ml-auto text-sm text-muted-foreground truncate max-w-[140px]">
                        {member.email}
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
