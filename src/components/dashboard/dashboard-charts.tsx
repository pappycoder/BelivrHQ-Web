"use client";

import * as React from "react";
import Link from "next/link";
import { format, subDays } from "date-fns";
import {
  ArrowUpRight,
  ChartNoAxesCombined,
  HeartHandshake,
  PieChart,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { useCurrentProfile } from "@/hooks/use-profile";
import {
  useMemberDashboard,
  useGivingDashboardCharts,
} from "@/hooks/use-dashboard-charts";
import {
  useAttendanceSummary,
  useAttendanceTrends,
} from "@/hooks/use-attendance";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DashboardBars,
  DashboardDonut,
  DashboardTrend,
  dashboardColors,
} from "./dashboard-plots";

const tones = {
  blue: {
    background: "from-blue-500/[0.08]",
    icon: "bg-blue-500/10 text-blue-500",
  },
  violet: {
    background: "from-violet-500/[0.08]",
    icon: "bg-violet-500/10 text-violet-500",
  },
  pink: {
    background: "from-pink-500/[0.08]",
    icon: "bg-pink-500/10 text-pink-500",
  },
  teal: {
    background: "from-teal-500/[0.08]",
    icon: "bg-teal-500/10 text-teal-500",
  },
  amber: {
    background: "from-amber-500/[0.08]",
    icon: "bg-amber-500/10 text-amber-500",
  },
  orange: {
    background: "from-orange-500/[0.08]",
    icon: "bg-orange-500/10 text-orange-500",
  },
};

type PlotQuery = {
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
};

function ChartCard({
  title,
  description,
  href,
  tone,
  icon: Icon,
  query,
  children,
}: {
  title: string;
  description: string;
  href: string;
  tone: keyof typeof tones;
  icon: LucideIcon;
  query: PlotQuery;
  children: React.ReactNode;
}) {
  const style = tones[tone];
  return (
    <Card
      data-dashboard-chart
      className="min-w-0 gap-5 rounded-2xl border-border bg-card py-6 shadow-sm"
    >
      <CardHeader className="px-4 pb-0">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${style.icon}`}
          >
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            <CardDescription className="mt-1 text-sm">
              {description}
            </CardDescription>
          </div>
          <Link
            href={href}
            aria-label={`View details: ${title}`}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="px-4">
        {query.error ? (
          <div
            role="alert"
            className="flex h-54 flex-col items-center justify-center gap-2 text-center"
          >
            <p className="text-sm text-muted-foreground">
              Unable to load {title.toLowerCase()}.
            </p>
            <Button
              size="sm"
              variant="ghost"
              disabled={query.isFetching}
              onClick={() => {
                void query.refetch();
              }}
            >
              Retry
            </Button>
          </div>
        ) : query.isLoading ? (
          <Skeleton
            className="h-54 w-full rounded-xl"
            aria-label={`Loading ${title}`}
          />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardCharts() {
  const { can } = usePermissions();
  const { data: profile } = useCurrentProfile();
  const showAttendance = can("attendance:dashboard", "read");
  const showAttendanceTrend = can("attendance:reports", "read");
  const showGiving = can("giving:dashboard", "read");
  const showMembers = can("members:all", "read");
  const [range] = React.useState(() => {
    const today = new Date();
    return {
      startDate: format(subDays(today, 29), "yyyy-MM-dd"),
      endDate: `${format(today, "yyyy-MM-dd")}T23:59:59.999Z`,
    };
  });
  const branchId = profile?.isAdminHq ? undefined : profile?.branchId;
  const params = { ...range, branchId };
  const attendance = useAttendanceSummary(params, {
    enabled: !!profile && !showAttendanceTrend,
  });
  const attendanceTrend = useAttendanceTrends(params, { enabled: !!profile });
  const giving = useGivingDashboardCharts(
    { ...params, currency: "NGN" },
    { enabled: !!profile },
  );
  const members = useMemberDashboard({ branchId }, { enabled: !!profile });
  const attendanceHref = can("analytics:attendance", "read")
    ? "/analytics/attendance"
    : showAttendanceTrend
      ? "/attendance/reports"
      : "/attendance";
  const givingHref = can("analytics:giving", "read")
    ? "/analytics/giving"
    : "/giving";
  const membersHref = can("analytics:members", "read")
    ? "/analytics/members"
    : "/members";
  const money = (value: number) =>
    `NGN ${value.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
  const ageLabels: Record<string, string> = {
    under_18: "Under 18",
    age_18_30: "18–30",
    age_31_45: "31–45",
    age_46_60: "46–60",
    age_60_plus: "Over 60",
    unspecified: "Unspecified",
  };
  const scope = profile?.isAdminHq
    ? "All permitted branches"
    : (profile?.branch?.name ?? "Your branch");
  if (!showAttendance && !showAttendanceTrend && !showGiving && !showMembers)
    return null;

  return (
    <section aria-label="Dashboard charts" className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-base font-semibold">Your church in perspective</h2><p className="text-sm text-muted-foreground">
        Last 30 days <span aria-hidden="true">·</span> {scope}
      </p></div>
      <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
        {(showAttendance || showAttendanceTrend) && (
          <ChartCard
            title={
              showAttendanceTrend ? "Attendance trend" : "Attendance breakdown"
            }
            description={
              showAttendanceTrend
                ? "Members & visitors"
                : "Check-ins by attendee"
            }
            href={attendanceHref}
            tone="blue"
            icon={ChartNoAxesCombined}
            query={showAttendanceTrend ? attendanceTrend : attendance}
          >
            {showAttendanceTrend ? (
              <DashboardTrend
                data={attendanceTrend.data ?? []}
                colors={[dashboardColors[0], dashboardColors[2]]}
                split
              />
            ) : (
              <DashboardBars
                data={
                  attendance.data?.totalCheckIns
                    ? [
                        {
                          label: "Members",
                          value: attendance.data.memberCheckIns,
                        },
                        {
                          label: "Visitors",
                          value: attendance.data.visitorCheckIns,
                        },
                      ]
                    : []
                }
                colors={[dashboardColors[0], dashboardColors[2]]}
              />
            )}
          </ChartCard>
        )}
        {showGiving && (
          <ChartCard
            title="Giving trend"
            description="Successful giving · NGN"
            href={givingHref}
            tone="violet"
            icon={Wallet}
            query={giving}
          >
            <DashboardTrend
              data={giving.data?.trend ?? []}
              colors={[dashboardColors[1]]}
              formatValue={money}
            />
          </ChartCard>
        )}
        {showMembers && (
          <>
            <ChartCard
              title="Member composition"
              description="Current membership status"
              href={membersHref}
              tone="pink"
              icon={PieChart}
              query={members}
            >
              <DashboardDonut
                data={Object.entries(members.data?.byStatus ?? {}).map(
                  ([name, value]) => ({ name: name.replace(/_/g, " "), value }),
                )}
              />
            </ChartCard>
            <ChartCard
              title="Member growth"
              description="Full joining history"
              href={membersHref}
              tone="teal"
              icon={TrendingUp}
              query={members}
            >
              <DashboardTrend
                data={members.data?.growth ?? []}
                colors={[dashboardColors[4]]}
                monthly
              />
            </ChartCard>
            <ChartCard
              title="Age distribution"
              description="Current members by age"
              href={membersHref}
              tone="amber"
              icon={Users}
              query={members}
            >
              <DashboardBars
                data={Object.entries(members.data?.byAgeGroup ?? {}).map(
                  ([key, value]) => ({ label: ageLabels[key] ?? key, value }),
                )}
                colors={[
                  dashboardColors[3],
                  dashboardColors[5],
                  dashboardColors[2],
                  dashboardColors[1],
                  dashboardColors[0],
                  dashboardColors[4],
                ]}
              />
            </ChartCard>
          </>
        )}
        {showGiving && (
          <ChartCard
            title="Giving by category"
            description="Successful giving · NGN"
            href={givingHref}
            tone="orange"
            icon={HeartHandshake}
            query={giving}
          >
            <DashboardBars
              data={(giving.data?.byCategory ?? []).map((c) => ({
                label: c.categoryName,
                value: c.total,
              }))}
              colors={[
                dashboardColors[5],
                dashboardColors[1],
                dashboardColors[4],
                dashboardColors[2],
                dashboardColors[0],
              ]}
              formatValue={money}
            />
          </ChartCard>
        )}
      </div>
    </section>
  );
}
