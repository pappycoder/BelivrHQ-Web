"use client";

import type { ComponentProps } from "react";
import type { GeneralAttendanceSummary } from "@/hooks/use-attendance";
import { AttendanceChartCard } from "./attendance-chart-card";
import {
  DashboardBars,
  dashboardColors,
} from "@/components/dashboard/dashboard-plots";

export function AttendanceHeadcountCharts({
  summary,
  query,
}: {
  summary?: GeneralAttendanceSummary;
  query: ComponentProps<typeof AttendanceChartCard>["query"];
}) {
  const age = summary
    ? [
        ...(summary.adultCount != null
          ? [{ label: "Adults", value: summary.adultCount }]
          : []),
        ...(summary.childrenCount != null
          ? [{ label: "Children", value: summary.childrenCount }]
          : []),
        { label: "Age not supplied", value: summary.unspecifiedAgeCount },
      ]
    : [];
  const gender = summary
    ? [
        ...(summary.maleCount != null
          ? [{ label: "Male", value: summary.maleCount }]
          : []),
        ...(summary.femaleCount != null
          ? [{ label: "Female", value: summary.femaleCount }]
          : []),
        { label: "Gender not supplied", value: summary.unspecifiedGenderCount },
      ]
    : [];
  return (
    <section aria-label="Reported service headcounts" className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Reported service headcounts</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Separate from named check-ins. Age and gender are breakdowns of the
          same reported total; do not add them together.
        </p>
      </div>
      {!query.error && !query.isLoading && !summary?.reportCount ? (
        <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
          No reported service headcounts in this period.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <AttendanceChartCard
            title="Reported age breakdown"
            description="Includes age not supplied"
            tone="amber"
            query={query}
          >
            <DashboardBars
              data={age}
              colors={[
                dashboardColors[3],
                dashboardColors[5],
                dashboardColors[1],
              ]}
            />
          </AttendanceChartCard>
          <AttendanceChartCard
            title="Reported gender breakdown"
            description="Includes gender not supplied"
            tone="pink"
            query={query}
          >
            <DashboardBars
              data={gender}
              colors={[
                dashboardColors[0],
                dashboardColors[2],
                dashboardColors[1],
              ]}
            />
          </AttendanceChartCard>
        </div>
      )}
    </section>
  );
}
