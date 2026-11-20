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
import { PageTour, SectionHelp, type TourStep } from "@/components/tours/page-tour";
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

  const tourSteps = React.useMemo<TourStep[]>(() => [
    { target: ".home-tour-welcome", title: "Your day, at a glance", description: "Home brings together the parts of your workspace you can access. Use Next and Previous to explore. You can skip at any time and return with Take a tour." },
    { target: ".home-tour-metrics", title: "Read your summary", description: "These cards summarise people, recorded giving, gatherings and unread notifications. The cards you see depend on your permissions. Use the sections below to explore the details." },
    ...(canAny("giving:dashboard:read") ? [{ target: ".home-tour-giving", title: "Understand giving", description: "Compare recorded giving across the dates shown in the chart. Hover or tap a point for its value. Open Ledger when you want to review the giving workspace." }] : []),
    ...(canAny("members:all:read") ? [{ target: ".home-tour-people", title: "Understand your congregation", description: "The ring and legend group members by their current status. Use this breakdown to understand the people represented in your total." }] : []),
    ...(canAny("events:calendar:read") ? [{ target: ".home-tour-events", title: "Find a gathering", description: "Review the listed gatherings, dates and locations. Select a gathering to open its details, or use Calendar to explore events. The tour itself will keep you on Home." }] : []),
    { target: ".home-tour-signals", title: "Catch up on activity", description: "This list shows your latest notifications. A coloured dot indicates an unread item. Use All or Notifications at the top of Home to review the full list." },
    ...(canAny("members:all:read") && members.data?.growth?.length ? [{ target: ".home-tour-growth", title: "Follow membership growth", description: "Compare the member and visitor series across the dates shown. Hover or tap the chart to inspect a point. This section appears when growth data is available." }] : []),
    { target: ".home-tour-shortcut", title: "Find your next page", description: "Press Command K on Mac or Control K on Windows and Linux to search for a page you have access to. The navigation also groups pages by area. Use the question-mark icons for quick explanations, or Take a tour to replay this guide." },
  ], [canAny, members.data?.growth?.length]);

  return (
    <div className="space-y-7">
      <PageHeader
        className="home-tour-welcome"
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
        description="See giving, gatherings and people who need a follow-up in one place."
        actions={
          <>
          <PageTour page="Home" account={profile ? `${profile.churchId}:${profile.profileId}` : undefined} ready={ready && !members.isLoading && !giving.isLoading && !notifications.isLoading} steps={tourSteps} />
          <Button variant="outline" className="h-9 gap-1.5 rounded-full border-line bg-card text-sm" asChild>
            <Link href="/notifications">
              Notifications <ArrowRight className="size-3.5" />
            </Link>
          </Button>
          </>
        }
      />

      <div className="home-tour-metrics space-y-2">
      <div className="flex items-center gap-1 text-sm font-medium">Your summary <SectionHelp title="Your summary">People counts members in your scope. Giving shows the total and gift count supplied by the giving dashboard for its reporting period. Gatherings is the calendar total. Unread signals counts your unread notifications. Only permitted metrics appear.</SectionHelp></div>
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
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        {ready && canAny("giving:dashboard:read") ? (
          <SectionCard
            className="home-tour-giving lg:col-span-7"
            eyebrow="Generosity"
            title={<span className="inline-flex items-center gap-1">Giving, month by month <SectionHelp title="Giving over time">This chart plots recorded giving on the dates shown, in the dashboard currency. Hover or tap a point to inspect its value. Open Ledger to review giving in detail.</SectionHelp></span>}
            actions={
              <Button variant="ghost" size="sm" className="h-7 gap-1 rounded-full text-sm text-ink-faint" asChild>
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
            className="home-tour-people lg:col-span-5"
            eyebrow="Congregation"
            title={<span className="inline-flex items-center gap-1">How the room is made up <SectionHelp title="Membership status">The total and legend show members grouped by status, such as active or inactive, within the scope your account can access.</SectionHelp></span>}
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
                    <div key={key} className="flex items-center gap-2 text-sm">
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
          className="home-tour-signals lg:col-span-7"
          eyebrow="Signals"
          title={<span className="inline-flex items-center gap-1">What happened while you were away <SectionHelp title="Recent activity">Your five latest notifications appear here. Coloured dots mark unread items. All opens the full notifications page.</SectionHelp></span>}
          actions={
            <Button variant="ghost" size="sm" className="h-7 gap-1 rounded-full text-sm text-ink-faint" asChild>
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
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="truncate text-sm text-ink-soft">{item.body}</p>
                </div>
                <span className="shrink-0 text-xs text-ink-faint">
                  {formatRelativeTime(item.createdAt)}
                </span>
              </div>
            ))}
            {!notifications.isLoading && !notifications.data?.data?.length ? (
              <p className="px-5 py-8 text-center text-sm text-ink-soft">
                Nothing new. Rare, lovely, and temporary.
              </p>
            ) : null}
          </div>
        </SectionCard>

        {ready && canAny("members:all:read") && members.data?.growth?.length ? (
          <SectionCard className="home-tour-growth lg:col-span-12" eyebrow="Becoming" title={<span className="inline-flex items-center gap-1">Membership growth <SectionHelp title="Membership growth">Compare the member and visitor series over the dates shown. Hover or tap a chart point for its values.</SectionHelp></span>}>
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

      <p className="home-tour-shortcut text-xs text-ink-faint">
        Press ⌘K on Mac or Ctrl K on Windows and Linux to jump to a page you have access to.
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
      className={`home-tour-events ${className ?? ""}`}
      eyebrow="Gatherings"
      title={<span className="inline-flex items-center gap-1">Next up <SectionHelp title="Gatherings">This list shows up to four unarchived gatherings ordered by start date. Check each date before planning: past gatherings may still appear. Select a gathering to view its details, or open Calendar.</SectionHelp></span>}
      actions={
        <Button variant="ghost" size="sm" className="h-7 gap-1 rounded-full text-sm text-ink-faint" asChild>
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
              <p className="truncate text-sm font-medium">{event.title}</p>
              <p className="truncate text-sm text-ink-soft">
                {shortDate(event.startDate)} · {event.location ?? "Location TBD"}
              </p>
            </div>
            <Tag tone="neutral">{event.isFree ? "Free" : "Ticketed"}</Tag>
          </Link>
        ))}
        {!upcoming.length ? (
          <p className="px-5 py-8 text-center text-sm text-ink-soft">
            Nothing scheduled yet. Add a gathering to get started.
          </p>
        ) : null}
      </div>
    </SectionCard>
  );
}
