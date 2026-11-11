"use client";

import * as React from "react";
import { Check, ChevronDown, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEmailContacts, type EmailContact } from "@/hooks/use-email";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  senior_pastor: "Senior Pastor",
  church_admin: "Church Admin",
  branch_pastor: "Branch Pastor",
  department_head: "Department Head",
  secretary: "Secretary",
  treasurer: "Treasurer",
  usher: "Usher",
  cell_leader: "Cell Leader",
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

interface RecipientComboboxProps {
  /** Ids already selected — hidden from the dropdown. */
  excludeIds: string[];
  onToggle: (contact: EmailContact) => void;
  placeholder?: string;
}

/**
 * Searchable multi-select combobox for the compose dialog's To field. Clicking
 * the field opens a scrollable dropdown of recipients; picking toggles a
 * recipient in and keeps the popover open so several can be added at once.
 */
export function RecipientCombobox({
  excludeIds,
  onToggle,
  placeholder,
}: RecipientComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const listId = React.useId();

  const { data, isLoading, isFetching } = useEmailContacts({
    search: searchTerm.trim() || undefined,
  });

  const excluded = React.useMemo(() => new Set(excludeIds), [excludeIds]);
  const options = (data?.data ?? []).filter((c) => !excluded.has(c.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm",
            "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          <span className="truncate text-muted-foreground">{placeholder}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent id={listId} className="z-[2010] w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by name, role, branch, or email…"
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            {isLoading || (searchTerm.trim().length > 0 && isFetching) ? (
              <div className="p-3 space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : options.length === 0 ? (
              <CommandEmpty>
                {excludeIds.length > 0 && !searchTerm
                  ? "All matching contacts are already selected."
                  : "No contacts found."}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {options.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={c.id}
                    onSelect={() => {
                      onToggle(c);
                      setSearchTerm("");
                    }}
                    className="gap-3"
                  >
                    <Check className="mr-0 h-4 w-4 opacity-0" />
                    <Avatar className="size-8 shrink-0">
                      <AvatarImage src={c.avatarUrl} alt={c.name} />
                      <AvatarFallback>{initials(c.name) || <UserRound className="size-4" />}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{c.name}</span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {ROLE_LABEL[c.role] ?? c.role}
                        {c.branchName ? ` · ${c.branchName}` : ""}
                        {c.email ? ` · ${c.email}` : ""}
                      </span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
