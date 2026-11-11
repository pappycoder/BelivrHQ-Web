"use client";

import * as React from "react";
import { MoreVertical, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

type ManagementAction = {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  destructive?: boolean;
};
export function DetailManagementMenu({
  label,
  actions,
  triggerRef,
}: {
  label: string;
  actions: ManagementAction[];
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  if (!actions.length) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          size="icon"
          className="size-11 shrink-0 rounded-xl"
          aria-label={label}
          tooltip={label}
        >
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-sm text-muted-foreground">
          Management
        </DropdownMenuLabel>
        {actions.map((action, index) => (
          <React.Fragment key={action.label}>
            {action.destructive && !actions[index - 1]?.destructive && (
              <DropdownMenuSeparator />
            )}
            <DropdownMenuItem
              variant={action.destructive ? "destructive" : "default"}
              className="min-h-10"
              onSelect={action.onSelect}
            >
              <action.icon className="size-4" />
              {action.label}
            </DropdownMenuItem>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
