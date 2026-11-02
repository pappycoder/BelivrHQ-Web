"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChevronRight,
  CircleHelp,
  LogOut,
  Search,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { navTrail } from "@/lib/paper-nav";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentProfile } from "@/hooks/use-profile";
import { useNotificationsUnread } from "@/hooks/use-notifications";
import { PersonAvatar } from "@/components/paper/primitives";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ActionTooltip } from "@/components/ui/tooltip";

export function ContextBar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const pathname = usePathname();
  const trail = React.useMemo(() => navTrail(pathname), [pathname]);
  const { data: unread } = useNotificationsUnread();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line/70 bg-background/80 px-4 backdrop-blur-xl md:px-7">
      <Link href="/home" className="md:hidden">
        <span className="grid size-8 place-items-center rounded-[11px] bg-ink text-paper">
          <span className="font-display text-sm font-semibold leading-none">a</span>
        </span>
      </Link>

      <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-xs md:flex">
        {trail.area ? (
          <>
            <Link
              href={trail.area.children[0]?.children[0]?.href ?? "/home"}
              className="shrink-0 font-medium text-ink-soft transition-colors hover:text-ink"
            >
              {trail.area.label}
            </Link>
            <ChevronRight className="size-3 shrink-0 text-ink-faint/60" />
            <span className="truncate font-medium text-ink">
              {trail.leaf?.title ?? trail.module?.title ?? "Workspace"}
            </span>
          </>
        ) : (
          <span className="font-medium text-ink">Today</span>
        )}
      </nav>

      <span className="truncate text-sm font-semibold md:hidden">
        {trail.leaf?.title ?? "Today"}
      </span>

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={onOpenSearch}
          className="hidden h-8 items-center gap-2 rounded-full border border-line bg-card px-3 text-xs text-ink-faint transition-colors hover:border-ink/20 hover:text-ink sm:flex"
        >
          <Search className="size-3.5" />
          <span>Search</span>
          <kbd className="ml-2 rounded border border-line bg-muted px-1 font-mono text-[9px] text-ink-soft">
            ⌘K
          </kbd>
        </button>
        <ActionTooltip label="Search">
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Search"
            className="grid size-8 place-items-center rounded-full text-ink-faint hover:bg-muted hover:text-ink sm:hidden"
          >
            <Search className="size-4" />
          </button>
        </ActionTooltip>

        <ActionTooltip label="Help and support">
          <Link
            href="/support"
            aria-label="Help and support"
            className="hidden size-8 place-items-center rounded-full text-ink-faint hover:bg-muted hover:text-ink sm:grid"
          >
            <CircleHelp className="size-4" />
          </Link>
        </ActionTooltip>

        <ActionTooltip label={`Notifications${unread?.count ? ` (${unread.count} unread)` : ""}`}>
          <Link
            href="/notifications"
            aria-label={`Notifications${unread?.count ? ` (${unread.count} unread)` : ""}`}
            className="relative grid size-8 place-items-center rounded-full text-ink-faint hover:bg-muted hover:text-ink"
          >
            <Bell className="size-4" />
            {unread?.count ? (
              <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground ring-2 ring-background">
                {unread.count > 99 ? "99+" : unread.count}
              </span>
            ) : null}
          </Link>
        </ActionTooltip>

        <AccountMenu />
      </div>
    </header>
  );
}

function AccountMenu() {
  const { user, logout } = useAuth();
  const { data: profile } = useCurrentProfile();
  const router = useRouter();
  const fullName =
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "You";

  return (
    <DropdownMenu>
      <ActionTooltip label="Account menu">
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Account menu"
            className="ml-1 rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <PersonAvatar name={fullName} src={profile?.avatarUrl} size="sm" />
          </button>
        </DropdownMenuTrigger>
      </ActionTooltip>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2.5 py-2">
          <PersonAvatar name={fullName} src={profile?.avatarUrl} size="md" />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold">{fullName}</p>
            <p className="truncate text-[11px] font-normal text-ink-faint">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/settings/profile" className="gap-2">Your profile</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/subscription" className="gap-2">Plan &amp; billing</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/support" className="gap-2">Help &amp; support</Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2 text-destructive focus:text-destructive"
          onClick={async () => {
            await logout();
            toast("Signed out. See you soon.");
            router.replace("/login");
          }}
        >
          <LogOut className="size-3.5" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
