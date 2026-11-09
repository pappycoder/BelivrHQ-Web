"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BarChart3,
  CalendarClock,
  Coins,
  Download,
  FileText,
  Loader2,
  Plus,
  Users,
  X,
} from "lucide-react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { SectionCard } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import { EmptyState } from "@/components/paper/primitives";
import { TrendChart } from "@/components/paper/charts";
import { Button } from "@/components/ui/button";
import { ActionTooltip } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { exportCSV, exportReportPDF, type ExportColumn, type PdfReportSection } from "@/lib/export-utils";
import { exportExcel } from "@/lib/export-utils";
import { cn } from "@/lib/utils";
import { number, percent } from "@/lib/paper/format";
import { formatNaira } from "@/hooks/use-analytics";
import {
  monthLabel,
  useAttendanceReport,
  useFinancialReport,
  useMemberReport,
  type ReportQueryParams,
} from "@/hooks/use-reports";
import { useBranchesList } from "@/hooks/use-branches";
import { usePermissions } from "@/hooks/use-permissions";

type BlockId = "financial" | "attendance" | "members";
type Format = "PDF" | "XLSX" | "CSV";

const BLOCKS: { id: BlockId; title: string; description: string; icon: React.ElementType; permission: [string, "read"] }[] = [
  { id: "financial", title: "Financial summary", description: "Giving by category and month.", icon: Coins, permission: ["reports:financial", "read"] },
  { id: "attendance", title: "Attendance summary", description: "Headcount per service and trends.", icon: Users, permission: ["reports:attendance", "read"] },
  { id: "members", title: "Membership summary", description: "Growth and demographics.", icon: BarChart3, permission: ["reports:members", "read"] },
];

const RANGES = ["This month", "This quarter", "Year to date", "All time"] as const;

function rangeParams(range: (typeof RANGES)[number]): ReportQueryParams {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (range === "This month") return { startDate: iso(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: iso(now) };
  if (range === "This quarter") {
    const q = Math.floor(now.getMonth() / 3) * 3;
    return { startDate: iso(new Date(now.getFullYear(), q, 1)), endDate: iso(now) };
  }
  if (range === "Year to date") return { startDate: `${now.getFullYear()}-01-01`, endDate: iso(now) };
  return {};
}

export default function ReportsStudioPage() {
  const { can, ready } = usePermissions();
  const [blocks, setBlocks] = React.useState<BlockId[]>(["financial", "attendance"]);
  const [range, setRange] = React.useState<(typeof RANGES)[number]>("Year to date");
  const [branchId, setBranchId] = React.useState("");
  const [format, setFormat] = React.useState<Format>("PDF");
  const [exporting, setExporting] = React.useState(false);

  const branches = useBranchesList({ limit: 100 });
  const params = React.useMemo(() => ({ ...rangeParams(range), branchId: branchId || undefined }), [range, branchId]);

  const want = (id: BlockId) => blocks.includes(id);
  const financial = useFinancialReport(params, { enabled: want("financial") });
  const attendance = useAttendanceReport(params, { enabled: want("attendance") });
  const membersReport = useMemberReport(params, { enabled: want("members") });

  const branchLabel = branchId
    ? (branches.data?.data ?? []).find((b) => b.branchId === branchId)?.name ?? "Selected branch"
    : "All branches";
  const rangeLabel = params.startDate || params.endDate ? `${params.startDate ?? "…"} → ${params.endDate ?? "…"}` : "All time";

  const toggleBlock = (id: BlockId) => {
    const block = BLOCKS.find((b) => b.id === id)!;
    if (!ready || !can(block.permission[0], block.permission[1])) {
      toast.error("That report block needs its own grant.");
      return;
    }
    setBlocks((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
  };

  const move = (index: number, direction: -1 | 1) => {
    setBlocks((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  // ── Sheet builders (same payloads feed preview + every export) ──
  const sheetsFor = (): { id: BlockId; title: string; sections: PdfReportSection[] }[] => {
    const out: { id: BlockId; title: string; sections: PdfReportSection[] }[] = [];
    if (want("financial") && financial.data) {
      const f = financial.data;
      out.push({
        id: "financial",
        title: "Financial summary",
        sections: [
          {
            title: "Giving by month",
            columns: [{ key: "month", label: "Month" }, { key: "total", label: "Total (₦)" }] as ExportColumn[],
            data: f.monthlyTrend.map((m) => ({ month: monthLabel(m.month), total: m.total })),
          },
          {
            title: "Giving by category",
            columns: [{ key: "name", label: "Category" }, { key: "total", label: "Total (₦)" }, { key: "count", label: "Gifts" }] as ExportColumn[],
            data: f.byCategory.map((c) => ({ name: c.name, total: c.total, count: c.count })),
          },
        ],
      });
    }
    if (want("attendance") && attendance.data) {
      const a = attendance.data;
      out.push({
        id: "attendance",
        title: "Attendance summary",
        sections: [
          {
            title: "Average by service",
            columns: [{ key: "name", label: "Service" }, { key: "total", label: "Total" }, { key: "average", label: "Average" }] as ExportColumn[],
            data: a.byService.map((s) => ({ name: s.name, total: s.total, average: Math.round(s.average) })),
          },
          {
            title: "Monthly trend",
            columns: [{ key: "month", label: "Month" }, { key: "total", label: "Attendance" }] as ExportColumn[],
            data: a.monthlyTrend.map((m) => ({ month: monthLabel(m.month), total: m.total })),
          },
        ],
      });
    }
    if (want("members") && membersReport.data) {
      const m = membersReport.data;
      out.push({
        id: "members",
        title: "Membership summary",
        sections: [
          {
            title: "Members by status",
            columns: [{ key: "status", label: "Status" }, { key: "count", label: "Members" }] as ExportColumn[],
            data: m.byStatus.map((s) => ({ status: s.status, count: s.count })),
          },
          {
            title: "Members by gender",
            columns: [{ key: "gender", label: "Gender" }, { key: "count", label: "Members" }] as ExportColumn[],
            data: m.byGender.map((s) => ({ gender: s.gender, count: s.count })),
          },
          {
            title: "Monthly growth",
            columns: [{ key: "month", label: "Month" }, { key: "total", label: "Members" }] as ExportColumn[],
            data: m.monthlyGrowth.map((s) => ({ month: monthLabel(s.month), total: s.total })),
          },
        ],
      });
    }
    return out;
  };

  const handleGenerate = async () => {
    const sheets = sheetsFor();
    if (!sheets.length) {
      toast.error("Add at least one block with data first.");
      return;
    }
    setExporting(true);
    try {
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const metadata = [
        { label: "Period", value: rangeLabel },
        { label: "Branch", value: branchLabel },
      ];
      if (format === "PDF") {
        const sections = sheets.flatMap((s) => s.sections);
        await exportReportPDF("Ministry report", sections, `belivrhq-report-${stamp}`, { metadata });
      } else if (format === "XLSX") {
        await exportExcel(
          sheets.map((s) => ({
            name: s.title,
            columns: s.sections[0]!.columns,
            data: s.sections[0]!.data,
            metadata,
          })),
          `belivrhq-report-${stamp}`,
        );
      } else {
        for (const s of sheets) {
          for (const section of s.sections) {
            exportCSV(section.data, section.columns, `${s.id}-${section.title.toLowerCase().replace(/\s+/g, "-")}-${stamp}`);
          }
        }
      }
      toast.success(`${format} generated. Check your downloads.`);
    } catch (error) {
      toast.error("Report export failed", { description: getToastErrorMessage(error, "Please try again.") });
    } finally {
      setExporting(false);
    }
  };

  const loadingBlocks = blocks.some((b) => {
    if (b === "financial") return financial.isLoading;
    if (b === "attendance") return attendance.isLoading;
    return membersReport.isLoading;
  });
  const anyError = blocks.some((b) => {
    if (b === "financial") return financial.isError;
    if (b === "attendance") return attendance.isError;
    return membersReport.isError;
  });

  const fin = financial.data;
  const att = attendance.data;
  const mem = membersReport.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/insights/analytics" className="flex items-center gap-1.5 text-[11px] text-ink-faint hover:text-ink">
            <ArrowLeft className="size-3" /> Insights
          </Link>
          <h1 className="mt-1 font-display text-[clamp(1.65rem,2.4vw,2.15rem)] font-semibold tracking-tight">Report studio</h1>
          <p className="text-sm text-ink-soft">Prepare a report using your church&apos;s recorded figures.</p>
        </div>
        <Button className="h-9 gap-1.5 rounded-full text-xs" onClick={handleGenerate} disabled={exporting || loadingBlocks}>
          {exporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />} Export {format}
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[220px_1fr_280px]">
        {/* Palette */}
        <aside className="paper-card h-max rounded-2xl p-4 xl:sticky xl:top-20">
          <p className="rule-label mb-3">Blocks</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar xl:flex-col xl:overflow-visible">
            {BLOCKS.map((block) => (
              <button
                key={block.id}
                type="button"
                onClick={() => toggleBlock(block.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors xl:w-full",
                  blocks.includes(block.id) ? "border-brand/40 bg-brand-soft/30" : "border-line bg-card hover:border-brand/40",
                )}
              >
                <span className="grid size-7 place-items-center rounded-lg bg-muted text-ink-soft">
                  <block.icon className="size-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-medium">{block.title}</span>
                  <span className="hidden truncate text-[10px] text-ink-faint sm:block">{block.description}</span>
                </span>
                <Plus className="ml-auto hidden size-3 text-ink-faint xl:block" />
              </button>
            ))}
          </div>
          <div className="mt-4 border-t border-line pt-3">
            <p className="rule-label mb-2">Also worth checking</p>
            <Link href="/insights/analytics/giving" className="block truncate rounded-lg px-2 py-1.5 text-[11px] text-ink-soft hover:bg-muted hover:text-ink">Giving analysis</Link>
            <Link href="/insights/analytics/attendance" className="block truncate rounded-lg px-2 py-1.5 text-[11px] text-ink-soft hover:bg-muted hover:text-ink">Attendance analysis</Link>
            <Link href="/insights/analytics/members" className="block truncate rounded-lg px-2 py-1.5 text-[11px] text-ink-soft hover:bg-muted hover:text-ink">Membership analysis</Link>
          </div>
        </aside>

        {/* Sheet */}
        <main className="min-w-0">
          <div className="paper-card mx-auto max-w-[720px] rounded-2xl p-6 md:p-8">
            <header className="border-b border-line pb-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-9 place-items-center rounded-xl bg-ink text-paper">
                    <FileText className="size-4" />
                  </span>
                  <div>
                    <p className="font-display text-sm font-semibold">Ministry report</p>
                    <p className="text-[10px] text-ink-faint">{branchLabel}</p>
                  </div>
                </div>
                <CalendarClock className="size-4 text-ink-faint" />
              </div>
              <p className="mt-2 text-xs text-ink-soft">{rangeLabel}</p>
            </header>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {fin ? <StatCard label="Giving" value={fin.grandTotal} prefix="₦" tone="brand" deltaLabel={`${number(fin.transactionCount)} transactions`} /> : null}
              {att ? <StatCard label="Attendance" value={att.totalAttendance} tone="moss" deltaLabel={`avg ${number(Math.round(att.averagePerService))}/service`} /> : null}
              {mem ? <StatCard label="Members" value={mem.totalMembers} tone="sky" deltaLabel={`${number(mem.newMembersInPeriod)} new in period`} /> : null}
              {!fin && !att && !mem ? (
                <div className="col-span-2 space-y-2">
                  {loadingBlocks ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />) : null}
                </div>
              ) : null}
            </div>

            {anyError && !loadingBlocks ? (
              <EmptyState icon={<FileText />} title="One block couldn&apos;t load" description="The other figures are still available. Retry the failing block or adjust the range." />
            ) : null}

            <div className="mt-6 space-y-6">
              {blocks.map((id, index) => {
                const block = BLOCKS.find((b) => b.id === id)!;
                const data = id === "financial" ? fin : id === "attendance" ? att : mem;
                if (!data) return null;
                return (
                  <section key={id} className="relative rounded-xl border border-line p-4">
                    <div className="absolute -top-2.5 left-3">
                      <span className="rounded-full bg-card px-2 text-[9px] font-semibold uppercase tracking-wider text-ink-faint ring-1 ring-line">
                        {index + 1} · {block.title}
                      </span>
                    </div>
                    <div className="absolute -top-2.5 right-3 flex gap-0.5">
                      <ActionTooltip label="Move block up">
                        <button type="button" aria-label="Move up" onClick={() => move(index, -1)} className="grid size-5 place-items-center rounded-full bg-card text-ink-faint ring-1 ring-line hover:text-ink"><ArrowUp className="size-2.5" /></button>
                      </ActionTooltip>
                      <ActionTooltip label="Move block down">
                        <button type="button" aria-label="Move down" onClick={() => move(index, 1)} className="grid size-5 place-items-center rounded-full bg-card text-ink-faint ring-1 ring-line hover:text-ink"><ArrowDown className="size-2.5" /></button>
                      </ActionTooltip>
                      <ActionTooltip label="Remove block">
                        <button type="button" aria-label="Remove" onClick={() => setBlocks((current) => current.filter((item) => item !== id))} className="grid size-5 place-items-center rounded-full bg-card text-ink-faint ring-1 ring-line hover:text-rose"><X className="size-2.5" /></button>
                      </ActionTooltip>
                    </div>
                    <div className="mt-2">
                      {id === "financial" && fin ? (
                        <>
                          <TrendChart
                            data={fin.monthlyTrend.map((m) => ({ label: monthLabel(m.month), total: m.total }))}
                            series={[{ key: "total", label: "Giving", color: "var(--chart-1)" }]}
                            height={150}
                            formatter={(v) => formatNaira(Number(v))}
                          />
                          <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
                            {formatNaira(fin.grandTotal)} given across {number(fin.transactionCount)} transactions
                            {fin.byCategory.length
                              ? `; ${fin.byCategory[0].name} leads at ${percent(fin.byCategory[0].total, fin.grandTotal)}% of the total.`
                              : "."}
                          </p>
                        </>
                      ) : null}
                      {id === "attendance" && att ? (
                        <>
                          <TrendChart
                            data={att.monthlyTrend.map((m) => ({ label: monthLabel(m.month), total: m.total }))}
                            series={[{ key: "total", label: "Attendance", color: "var(--chart-1)" }]}
                            height={150}
                            formatter={(v) => number(Number(v))}
                          />
                          <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
                            Average {number(Math.round(att.averagePerService))} in the room across {number(att.serviceCount)} services
                            {att.byService.length ? `; ${att.byService[0].name} carries the house.` : "."}
                          </p>
                        </>
                      ) : null}
                      {id === "members" && mem ? (
                        <>
                          <TrendChart
                            data={mem.monthlyGrowth.map((m) => ({ label: monthLabel(m.month), total: m.total }))}
                            series={[{ key: "total", label: "Members", color: "var(--chart-2)" }]}
                            height={150}
                            formatter={(v) => number(Number(v))}
                          />
                          <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
                            {number(mem.totalMembers)} members, {number(mem.newMembersInPeriod)} new in the period, {number(mem.activeMembers)} active.
                          </p>
                        </>
                      ) : null}
                    </div>
                  </section>
                );
              })}
              {!blocks.length || (!fin && !att && !mem && !loadingBlocks && !anyError) ? (
                <p className="rounded-xl border border-dashed border-line py-10 text-center text-xs text-ink-faint">
                  Add blocks from the left to assemble the report.
                </p>
              ) : null}
            </div>

            <footer className="mt-8 border-t border-dashed border-line pt-4 text-[10px] text-ink-faint">
              Generated {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · {rangeLabel} · {branchLabel} · donor names withheld
            </footer>
          </div>
        </main>

        {/* Settings */}
        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <div className="paper-card rounded-2xl p-4">
            <p className="rule-label mb-3">Report settings</p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <span className="text-[10px] text-ink-faint">Period</span>
                <select value={range} onChange={(e) => setRange(e.target.value as (typeof RANGES)[number])} className="h-9 w-full rounded-lg border border-line bg-card px-2 text-xs outline-none">
                  {RANGES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] text-ink-faint">Branch</span>
                <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="h-9 w-full rounded-lg border border-line bg-card px-2 text-xs outline-none">
                  <option value="">All branches</option>
                  {(branches.data?.data ?? []).map((branch) => <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] text-ink-faint">Format</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["PDF", "XLSX", "CSV"] as const).map((item) => (
                    <button key={item} type="button" onClick={() => setFormat(item)} className={cn("rounded-lg border px-2 py-1.5 text-[10px] transition-colors", format === item ? "border-ink/20 bg-ink text-paper" : "border-line bg-card text-ink-soft")}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[10px] leading-relaxed text-ink-faint">
                Board packs hide names by default to protect donor privacy.
              </p>
            </div>
          </div>
          <SectionCard eyebrow="Blocks in this report" title={`${blocks.length} of ${BLOCKS.length}`}>
            <div className="flex flex-wrap gap-1.5">
              {BLOCKS.map((block) => (
                <Tag key={block.id} tone={blocks.includes(block.id) ? "moss" : "neutral"} dot>{block.title}</Tag>
              ))}
            </div>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
