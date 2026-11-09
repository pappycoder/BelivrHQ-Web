"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Bell, CheckCheck, Inbox } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import { EmptyState } from "@/components/paper/primitives";
import { StaggerGroup, StaggerItem } from "@/components/paper/motion/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useNotificationsList,
  useNotificationsUnread,
  useMarkAllAsRead,
  NOTIFICATION_TYPE_LABELS,
  formatRelativeTime,
  type Notification,
} from "@/hooks/use-notifications";
import { number } from "@/lib/paper/format";

function typeTone(type: string): "brand" | "moss" | "gold" | "sky" | "rose" | "neutral" {
  if (type.includes("member")) return "moss";
  if (type.includes("giving") || type.includes("payment")) return "gold";
  if (type.includes("event") || type.includes("attendance")) return "sky";
  if (type.includes("error") || type.includes("fail")) return "rose";
  return "brand";
}

export default function SettingsNotificationsPage() {
  const unread = useNotificationsUnread();
  const list = useNotificationsList({ page: 1, limit: 8, read: "all" });
  const markAll = useMarkAllAsRead();

  const unreadCount = unread.data?.count ?? list.data?.unreadCount ?? 0;

  const rows: Notification[] = list.data?.data ?? [];
  const types = [...new Set(rows.map((n) => n.type))];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings · Notifications"
        title="What reaches you, and when."
        description="Review system updates and recent notifications in your feed."
        actions={
          <Button asChild variant="outline" className="h-9 gap-1.5 rounded-full border-line bg-card text-xs">
            <Link href="/notifications">
              <Bell className="size-3.5" /> Open the full feed
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Waiting unread" value={unreadCount} tone="brand" icon={<Inbox className="size-4" />} deltaLabel="across the feed" />
        <StatCard label="Recent events" value={rows.length} tone="moss" deltaLabel="this snapshot" />
        <StatCard label="Event kinds seen" value={types.length} tone="sky" />
        <StatCard label="All caught up?" value={unreadCount === 0 ? 1 : 0} tone="gold" deltaLabel={unreadCount === 0 ? "Yes" : "not yet"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <SectionCard
          eyebrow="Most recent"
          title="Eight events, newest first"
          actions={
            unreadCount > 0 ? (
              <Button size="sm" variant="outline" className="h-7 gap-1.5 rounded-full border-line text-[11px]" disabled={markAll.isPending} onClick={() => markAll.mutate(undefined, { onSuccess: () => undefined })}>
                <CheckCheck className="size-3" /> Mark all read
              </Button>
            ) : null
          }
          bodyClassName="p-0"
        >
          {list.isLoading ? (
            <div className="space-y-2 p-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
          ) : rows.length === 0 ? (
            <div className="px-5 py-10">
              <EmptyState icon={<Bell />} title="The feed is quiet" description="New service records, answers and payments will surface here." />
            </div>
          ) : (
            <StaggerGroup className="divide-y divide-line/70">
              {rows.map((notification) => (
                <StaggerItem key={notification.id}>
                  <div className="flex items-start gap-3 px-5 py-3">
                    <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${notification.readAt ? "bg-line" : "bg-brand"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-xs font-medium">{notification.title}</span>
                        <Tag tone={typeTone(notification.type)}>{NOTIFICATION_TYPE_LABELS[notification.type] ?? notification.type}</Tag>
                      </span>
                      <span className="mt-0.5 block line-clamp-2 text-[11px] leading-relaxed text-ink-faint">{notification.body}</span>
                    </span>
                    <span className="num shrink-0 text-[10px] text-ink-faint">{formatRelativeTime(notification.createdAt)}</span>
                  </div>
                </StaggerItem>
              ))}
              <div className="flex items-center justify-between border-t border-line px-5 py-2.5 text-[11px] text-ink-faint">
                <span>Showing <span className="num">{number(rows.length)}</span> of <span className="num">{number(list.data?.total ?? rows.length)}</span></span>
                <Link href="/notifications" className="flex items-center gap-1 text-brand hover:underline">
                  Day filters, unread-only and the drawer live in the feed <ArrowRight className="size-3" />
                </Link>
              </div>
            </StaggerGroup>
          )}
        </SectionCard>

        <aside className="space-y-4">
          <SectionCard eyebrow="Delivery" title="Where these come from">
            <ul className="space-y-2 text-[11px] leading-relaxed text-ink-soft">
              <li className="rounded-lg border border-line px-3 py-2">In-app feed: everything the system records for you, by role.</li>
              <li className="rounded-lg border border-line px-3 py-2">Email: transactional and receipt mail follows your church&apos;s provider settings.</li>
              <li className="rounded-lg border border-line px-3 py-2">SMS / WhatsApp: sent only where a broadcast or appointment uses that channel.</li>
            </ul>
            <p className="mt-3 text-[10px] leading-relaxed text-ink-faint">
              Per-event preferences aren&apos;t wired to a personal channel yet. The honest controls today are your
              role and the church integration settings.
            </p>
          </SectionCard>
          <SectionCard eyebrow="Rhythm" title="A calm inbox habit">
            <p className="text-[11px] leading-relaxed text-ink-soft">
              One quiet pass each morning beats twelve reactive glances. The full feed&apos;s day filters exist so a
              Monday sweep takes two minutes, not two windows.
            </p>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
