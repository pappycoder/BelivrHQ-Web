"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  HandCoins,
  Sparkles,
  Users,
} from "lucide-react";
import { PageHeader, SectionCard } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import { StaggerGroup, StaggerItem } from "@/components/paper/motion/primitives";
import { DonutChart, TrendChart } from "@/components/paper/charts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/paper/primitives";
import { useCurrentProfile } from "@/hooks/use-profile";
import { usePermissions } from "@/hooks/use-permissions";
import { useMemberDashboard, useGivingDashboardCharts } from "@/hooks/use-dashboard-charts";
import { useEventsSummary, type EventItem } from "@/hooks/use-events";
import { useNotificationsList, formatRelativeTime } from "@/hooks/use-notifications";
import { currency, number, shortDate } from "@/lib/paper/format";

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  suspended: "Suspended",
  transferred: "Transferred",
};

const STATUS_COLORS = ["var(--chart-2)", "var(--chart-4)", "var(--chart-5)", "var(--chart-3)"];

export default function PaperHomePage() {
  const { data: profile } = useCurrentProfile();
  const { canAny, ready } = usePermissions();
  const firstName = profile?.firstName ?? "there";

  // Clock reads only after mount to keep the prerendered HTML stable.
  const [today, setToday] = React.useState<{ date: string; greeting: string } | null>(null);
  React.useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    setToday({
      date: now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }),
      greeting: hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening",
    });
  }, []);

  const members = useMemberDashboard({}, { enabled: ready && canAny("members:all:read") });
  const giving = useGivingDashboardCharts({}, { enabled: ready && canAny("giving:dashboard:read") });
  const notifications = useNotificationsList({ page: 1, limit: 5, read: "all" });

  const memberTotal = members.data?.total ?? 0;
  const givingCurrency = giving.data?.currency;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            <Sparkles className="size-3 text-brand" />
            {today?.date ?? "\u00A0"}
          </span>
        }
        title={
          <>
            {today?.greeting ?? "Welcome back"}, <span className="text-brand">{firstName}</span>.
          </>
        }
        description="One quiet page for the whole church's rhythm — generosity, gathering, and the people waiting on a hello."
        actions={
          <Button variant="outline" className="h-9 gap-1.5 rounded-full border-line bg-card text-xs" asChild>
            <Link href="/notifications">
              Notifications <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        }
      />

      <StaggerGroup className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <GatedMetric ready={ready} show={canAny("members:all:read")}>
          <StatCard label="People" value={memberTotal} tone="moss" icon={<Users className="size-4" />} deltaLabel="known by name" />
        </GatedMetric>
        <GatedMetric ready={ready} show={canAny("giving:dashboard:read")}>
          <StatCard
            label="Giving · period"
            value={giving.data?.total ?? 0}
            prefix={givingCurrency === "NGN" ? "₦" : "$"}
            tone="brand"
            icon={<HandCoins className="size-4" />}
            deltaLabel={`${number(giving.data?.count ?? 0)} gifts`}
          />
        </GatedMetric>
        <GatedMetric ready={ready} show={canAny("events:calendar:read")}>
          <UpcomingStat />
        </GatedMetric>
        <StaggerItem>
          <StatCard
            label="Unread signals"
            value={notifications.data?.unreadCount ?? 0}
            tone="gold"
            icon={<Sparkles className="size-4" />}
            deltaLabel="waiting on you"
          />
        </StaggerItem>
      </StaggerGroup>

      <div className="grid gap-4 lg:grid-cols-12">
        {ready && canAny("giving:dashboard:read") ? (
          <SectionCard
            className="lg:col-span-7"
            eyebrow="Generosity"
            title="Giving, month by month"
            actions={
              <Button variant="ghost" size="sm" className="h-7 gap-1 rounded-full text-[11px] text-ink-faint" asChild>
                <Link href="/giving">Ledger <ArrowRight className="size-3" /></Link>
              </Button>
            }
          >
            {giving.isLoading ? (
              <Skeleton className="h-[220px]" />
            ) : giving.data?.trend?.length ? (
              <TrendChart
                data={giving.data.trend.map((point) => ({
                  label: shortDate(point.date),
                  total: point.total,
                }))}
                series={[{ key: "total", label: "Giving", color: "var(--chart-1)" }]}
                height={220}
                formatter={(value) => currency(Number(value), { code: giving.data?.currency === "NGN" ? "NGN" : undefined })}
              />
            ) : (
              <EmptyState title="No giving yet" description="Gifts will chart themselves here as they're recorded." />
            )}
          </SectionCard>
        ) : null}

        {ready && canAny("members:all:read") ? (
          <SectionCard
            className="lg:col-span-5"
            eyebrow="Congregation"
            title="How the room is made up"
          >
            {members.isLoading ? (
              <Skeleton className="h-[200px]" />
            ) : members.data ? (
              <>
                <DonutChart
                  data={Object.entries(members.data.byStatus).map(([key, value], index) => ({
                    name: STATUS_LABELS[key] ?? key,
                    value,
                    color: STATUS_COLORS[index % STATUS_COLORS.length],
                  }))}
                  centerValue={number(members.data.total)}
                  centerLabel="people"
                  height={168}
                  formatter={(value) => `${value} people`}
                />
                <div className="mt-3 space-y-1.5">
                  {Object.entries(members.data.byStatus).slice(0, 4).map(([key, value], index) => (
                    <div key={key} className="flex items-center gap-2 text-[11px]">
                      <span className="size-1.5 rounded-full" style={{ background: STATUS_COLORS[index % STATUS_COLORS.length] }} />
                      <span className="text-ink-soft">{STATUS_LABELS[key] ?? key}</span>
                      <span className="num ml-auto font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState title="Nothing to chart yet" description="Members appear as soon as the register has names." />
            )}
          </SectionCard>
        ) : null}

        {ready && canAny("events:calendar:read") ? <UpcomingEvents className="lg:col-span-5" /> : null}

        <SectionCard
          className="lg:col-span-7"
          eyebrow="Signals"
          title="What happened while you were away"
          actions={
            <Button variant="ghost" size="sm" className="h-7 gap-1 rounded-full text-[11px] text-ink-faint" asChild>
              <Link href="/notifications">All <ArrowRight className="size-3" /></Link>
            </Button>
          }
          bodyClassName="p-0"
        >
          <div className="divide-y divide-line/70">
            {(notifications.data?.data ?? []).map((item) => (
              <div key={item.id} className="flex gap-3 px-5 py-3">
                <span
                  className={
                    item.readAt
                      ? "mt-1.5 size-1.5 shrink-0 rounded-full bg-line"
                      : "mt-1.5 size-1.5 shrink-0 rounded-full bg-brand"
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{item.title}</p>
                  <p className="truncate text-[11px] text-ink-soft">{item.body}</p>
                </div>
                <span className="shrink-0 text-[10px] text-ink-faint">
                  {formatRelativeTime(item.createdAt)}
                </span>
              </div>
            ))}
            {!notifications.isLoading && !notifications.data?.data?.length ? (
              <p className="px-5 py-8 text-center text-xs text-ink-soft">
                Nothing new. Rare, lovely, and temporary.
              </p>
            ) : null}
          </div>
        </SectionCard>

        {ready && canAny("members:all:read") && members.data?.growth?.length ? (
          <SectionCard className="lg:col-span-12" eyebrow="Becoming" title="Membership growth">
            <TrendChart
              data={members.data.growth.map((point) => ({
                label: shortDate(point.date),
                members: point.members,
                visitors: point.visitors,
              }))}
              series={[
                { key: "members", label: "Members", color: "var(--chart-2)" },
                { key: "visitors", label: "Visitors", color: "var(--chart-1)" },
              ]}
              height={180}
              formatter={(value) => number(Number(value))}
            />
          </SectionCard>
        ) : null}
      </div>

      <p className="text-[10px] text-ink-faint">
        Press ⌘K anywhere to jump to a page you have access to.
      </p>
    </div>
  );
}

/**
 * One headline metric that only exists once its permission resolves.
 * Skeleton while the profile loads; nothing at all when the viewer (or the
 * church's plan) cannot see it — never an endless shimmer.
 */
function GatedMetric({
  ready,
  show,
  children,
}: {
  ready: boolean;
  show: boolean;
  children: React.ReactNode;
}) {
  if (!ready) {
    return (
      <StaggerItem>
        <Skeleton className="h-[124px] rounded-2xl" />
      </StaggerItem>
    );
  }
  return show ? <StaggerItem>{children}</StaggerItem> : null;
}

function UpcomingStat() {
  const events = useEventsSummary();
  const total = events.data?.total ?? 0;
  return (
    <StatCard label="Gatherings" value={total} tone="sky" icon={<CalendarDays className="size-4" />} deltaLabel="on the calendar" />
  );
}

function UpcomingEvents({ className }: { className?: string }) {
  const events = useEventsSummary();
  const upcoming = React.useMemo(() => {
    const list: EventItem[] = events.data?.data ?? [];
    return list
      .filter((event) => !event.archivedAt)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, 4);
  }, [events.data]);

  return (
    <SectionCard
      className={className}
      eyebrow="Gatherings"
      title="Next up"
      actions={
        <Button variant="ghost" size="sm" className="h-7 gap-1 rounded-full text-[11px] text-ink-faint" asChild>
          <Link href="/events">Calendar <ArrowRight className="size-3" /></Link>
        </Button>
      }
      bodyClassName="p-0"
    >
      <div className="divide-y divide-line/70">
        {upcoming.map((event) => (
          <Link
            key={event.eventId}
            href={`/gatherings/events/${event.eventId}`}
            className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50"
          >
            <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-card">
              <span className="num text-sm font-semibold leading-none">
                {new Date(event.startDate).getUTCDate()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{event.title}</p>
              <p className="truncate text-[11px] text-ink-soft">
                {shortDate(event.startDate)} · {event.location ?? "Location TBD"}
              </p>
            </div>
            <Tag tone="neutral">{event.isFree ? "Free" : "Ticketed"}</Tag>
          </Link>
        ))}
        {!upcoming.length ? (
          <p className="px-5 py-8 text-center text-xs text-ink-soft">
            Nothing scheduled yet — the calendar is waiting for its first plan.
          </p>
        ) : null}
      </div>
    </SectionCard>
  );
}
