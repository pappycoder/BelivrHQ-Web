"use client";

import * as React from "react";
import { ChevronDown, UserRound } from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppointmentContacts, type AppointmentContact } from "@/hooks/use-appointments";

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

interface ContactComboboxProps {
  kind: "with" | "who";
  /** Selected contact id ("" = none). */
  value: string;
  onSelect: (contact: AppointmentContact) => void;
  placeholder?: string;
}

/**
 * Searchable single-select combobox for the appointment With/Who (person) pickers.
 * Options only appear inside a scrollable dropdown that opens when the field is
 * clicked — nothing is listed on the form itself.
 */
export function ContactCombobox({
  kind,
  value,
  onSelect,
  placeholder,
}: ContactComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const listId = React.useId();

  const { data, isLoading, isFetching } = useAppointmentContacts({
    kind,
    search: searchTerm.trim() || undefined,
  });

  const contacts = data?.data ?? [];
  const selected = contacts.find((c) => c.id === value);

  // Show a stale selected contact in the trigger even if it's filtered out of
  // the currently-loaded options. Persist the last selected across renders.
  const [fallback, setFallback] = React.useState<AppointmentContact | undefined>(undefined);
  React.useEffect(() => {
    if (selected) setFallback(selected);
  }, [selected]);

  const display = selected ?? fallback;
  const options = contacts.filter((c) => c.id !== value);

  const handleSelect = (contact: AppointmentContact) => {
    onSelect(contact);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          className={cn(
            "flex h-10 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm",
            "hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          {display && (
            <Avatar className="size-6 shrink-0">
              <AvatarImage src={display.avatarUrl} alt={display.name} />
              <AvatarFallback className="text-xs">
                {initials(display.name) || <UserRound className="size-3" />}
              </AvatarFallback>
            </Avatar>
          )}
          <span className={cn("truncate flex-1 text-left", !display && "text-muted-foreground")}>
            {display ? display.name : placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent id={listId} className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={
              kind === "with"
                ? "Search by name, role, or branch…"
                : "Search staff or members…"
            }
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
              <CommandEmpty>No {kind === "with" ? "pastors" : "people"} found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {options.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={c.id}
                    onSelect={() => handleSelect(c)}
                    className="gap-3"
                  >
                    <Avatar className="size-8 shrink-0">
                      <AvatarImage src={c.avatarUrl} alt={c.name} />
                      <AvatarFallback>{initials(c.name) || <UserRound className="size-4" />}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{c.name}</span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {ROLE_LABEL[c.role] ?? c.role}
                        {c.branchName ? ` · ${c.branchName}` : ""}
                      </span>
                    </span>
                    <span className="flex-none rounded border px-1.5 py-0.5 text-xs text-muted-foreground">
                      {c.role === "visitor" ? "Visitor" : c.isPastor ? "Pastor" : "Person"}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {display && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value="__clear__"
                    onSelect={() => {
                      onSelect({ ...display, id: "" } as AppointmentContact);
                      setOpen(false);
                    }}
                  >
                    <span className="text-destructive">Clear selection</span>
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
