"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Search } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { ColorModeToggle } from "@/components/shared/color-mode-toggle";
// Temporarily hidden until offline workspace returns in a future build.
// import { OfflineHeaderButton } from "@/components/offline/offline-entry";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { usePermissions } from "@/hooks/use-permissions";
import { useEmailUnread } from "@/hooks/use-email";
import { useVisibleNavigation, navigationLeaves } from "./sidebar";
import { ContextHelpMenu } from "@/components/help/context-help-menu";
import { AskBelivrHQ } from "@/components/assistant/ask-belivrhq";
import { AccountMenu } from "./account-menu";
import { usePathname } from "next/navigation";
import { areaForPath, groupWorkspaceNavigation } from "@/lib/workspace-navigation";
import { confirmDiscardChanges } from "@/hooks/use-unsaved-changes";

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const router = useRouter();
  const groups = useVisibleNavigation();
  const pathname = usePathname();
  const area = areaForPath(groupWorkspaceNavigation(groups.flatMap(group => group.items)), pathname);
  const { ready, can } = usePermissions();
  const canViewInbox = ready && can("emails", "read");
  const { data: unread } = useEmailUnread(canViewInbox);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); setSearchOpen((open) => !open); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return <header className="workspace-topbar sticky top-0 z-30 flex shrink-0 items-center gap-2 sm:gap-3">
    <SidebarTrigger variant="ghost" /><Separator orientation="vertical" className="!h-5" />
    <span className="hidden text-sm font-medium text-muted-foreground sm:inline">{area?.title ?? (pathname === "/settings/profile" ? "Your account" : "Workspace")}</span>
    <Button variant="ghost" className="workspace-search h-9 justify-start text-muted-foreground lg:ms-5 lg:w-60" onClick={() => setSearchOpen(true)} aria-label="Search navigation">
      <Search className="size-4" /><span className="hidden lg:inline">Jump to a page...</span><kbd className="ms-auto hidden rounded border px-1.5 font-mono text-[10px] lg:inline-flex">Ctrl K</kbd>
    </Button>
    <div className="ms-auto flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1 sm:gap-2">
      <AskBelivrHQ /><ContextHelpMenu />{/* <OfflineHeaderButton /> */}
      {canViewInbox && <Button variant="ghost" size="icon" asChild tooltip="Inbox"><Link href="/connect/inbox" className="relative"><Mail className="size-4" />{(unread?.count ?? 0) > 0 && <span className="absolute end-0 top-0 rounded-full bg-destructive px-1 text-[10px] text-white">{unread!.count > 99 ? "99+" : unread!.count}</span>}</Link></Button>}
      <NotificationBell compact /><ColorModeToggle className="md:hidden" /><AccountMenu />
    </div>
    <CommandDialog open={searchOpen} onOpenChange={setSearchOpen} title="Search navigation" description="Find pages in your BelivrHQ workspace.">
      <CommandInput placeholder="Search pages..." /><CommandList><CommandEmpty>No accessible pages found.</CommandEmpty>
        {groups.map((group) => <CommandGroup heading={group.section} key={group.section}>
          {navigationLeaves(group.items).map((item) => <CommandItem key={item.href} value={`${item.title} ${item.href}`} onSelect={() => { if (!confirmDiscardChanges()) return; setSearchOpen(false); router.push(item.href!); }}>{item.icon && <item.icon className="size-4" />}<span>{item.title}</span><span className="ms-auto text-xs text-muted-foreground">{item.href}</span></CommandItem>)}
        </CommandGroup>)}
      </CommandList>
    </CommandDialog>
  </header>;
}
