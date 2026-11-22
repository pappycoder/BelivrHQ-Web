"use client";

import { collectionLabel } from "@/lib/collection-label";

import { AttendanceHeadcountCharts } from "./attendance-headcount-charts";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ExportDropdown } from "@/components/shared/export-dropdown";
import {
  useGeneralAttendanceSummary,
  type GeneralAttendanceParams,
  type GeneralAttendanceSummary as Summary,
} from "@/hooks/use-attendance";

export function GeneralAttendanceSummaryCard({
  summary,
  exportable = false,
}: {
  summary?: Summary;
  exportable?: boolean;
}) {
  if (!summary?.reportCount) return null;
  const rows = [
    { label: "Total headcount", count: summary.total },
    { label: "Adults (reported)", count: summary.adultCount ?? 0 },
    { label: "Children (reported)", count: summary.childrenCount ?? 0 },
    { label: "Age not supplied", count: summary.unspecifiedAgeCount },
    { label: "Male (reported)", count: summary.maleCount ?? 0 },
    { label: "Female (reported)", count: summary.femaleCount ?? 0 },
    { label: "Gender not supplied", count: summary.unspecifiedGenderCount },
  ];
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>General attendance summary</CardTitle>
          {exportable && (
            <ExportDropdown
              columns={[
                { key: "label", label: "Measure" },
                { key: "count", label: "Count" },
              ]}
              data={rows}
              title="General attendance summary"
              filename="general-attendance-summary"
            />
          )}
        </div>
        <CardDescription>
          {summary.reportCount} {collectionLabel(summary.reportCount, "service headcount records")}. Separate from
          individual check-ins; age and gender are overlapping breakdowns of the
          same total.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-3">
          {rows.map((row) => (
            <div key={row.label}>
              <dt className="text-sm text-muted-foreground">{row.label}</dt>
              <dd className="text-xl font-semibold">
                {row.count.toLocaleString()}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
export function GeneralAttendanceReportSummary({
  filters,
  charts = false,
}: {
  filters: GeneralAttendanceParams;
  charts?: boolean;
}) {
  const query = useGeneralAttendanceSummary(filters);
  if (charts)
    return <AttendanceHeadcountCharts summary={query.data} query={query} />;
  if (query.isError)
    return <p role="alert">Could not load general attendance summary.</p>;
  return <GeneralAttendanceSummaryCard summary={query.data} />;
}
