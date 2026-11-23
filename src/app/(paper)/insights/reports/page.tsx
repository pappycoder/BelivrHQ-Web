"use client";

import { useExportBranding } from "@/hooks/use-export-branding";
import { ReportPresets } from "@/components/reports/report-presets";
import { ReportPagePreview } from "@/components/reports/report-page-preview";
import { useCurrentProfile } from "@/hooks/use-profile";

import { REPORT_RANGES as RANGES, reportRangeParams as rangeParams } from "@/lib/report-range";
import { formatRecordDate, formatRecordDateRange } from "@/lib/record-date";

import { collectionLabel } from "@/lib/collection-label";

import { PageHeader } from "@/components/paper/section";

import * as React from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  CalendarClock,
  Coins,
  Download,
  FileText,
  Loader2,
  GripVertical,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { StatCard } from "@/components/paper/stat";
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


export default function ReportsStudioPage() {
  const { can, ready } = usePermissions();
  const { data: profile } = useCurrentProfile();
  const resolveBranding = useExportBranding();
  const [zoom,setZoom]=React.useState(100);
  const [previewMode, setPreviewMode] = React.useState<"print" | "overview">("print");
  const [blocks, setBlocks] = React.useState<BlockId[]>(["financial", "attendance", "members"]);
  const [range, setRange] = React.useState<(typeof RANGES)[number]>("This month");
  const [branchId, setBranchId] = React.useState("");
  const [format, setFormat] = React.useState<Format>("PDF");
  const [exporting, setExporting] = React.useState(false);

  const branches = useBranchesList({ limit: 100 });
  const params = React.useMemo(() => ({ ...rangeParams(range), branchId: branchId || undefined }), [range, branchId]);

  const canUse = (id: BlockId) => { const block = BLOCKS.find(block => block.id === id)!; return ready && can(block.permission[0],block.permission[1]); };
  const activeBlocks = blocks.filter(canUse);
  const want = (id: BlockId) => blocks.includes(id) && canUse(id);
  const financial = useFinancialReport(params, { enabled: want("financial") });
  const attendance = useAttendanceReport(params, { enabled: want("attendance") });
  const membersReport = useMemberReport(params, { enabled: want("members") });

  const branchLabel = branchId
    ? (branches.data?.data ?? []).find((b) => b.branchId === branchId)?.name ?? "Selected branch"
    : "All branches";
  const rangeLabel = formatRecordDateRange(params.startDate, params.endDate);

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
    return activeBlocks.flatMap(id => out.filter(sheet => sheet.id === id));
  };

  const overviewBlocks = () => sheetsFor().map(sheet => ({ title: sheet.title, sections: sheet.sections, metrics: sheet.id === "financial" && fin ? [{label:"Giving received",value:formatNaira(fin.grandTotal)},{label:"Gifts recorded",value:number(fin.transactionCount)}] : sheet.id === "attendance" && att ? [{label:"People welcomed",value:number(att.totalAttendance)},{label:"Gatherings held",value:number(att.serviceCount)}] : mem ? [{label:"New members",value:number(mem.newMembersInPeriod)},{label:"Active members",value:number(mem.activeMembers)}] : [], trend: sheet.id === "financial" && fin ? fin.monthlyTrend.map(item => ({label:monthLabel(item.month),value:item.total})) : [] }));

  const handleGenerate = async () => {
    const sheets = sheetsFor();
    if (!sheets.length) {
      toast.error("Add at least one block with data first.");
      return;
    }
    setExporting(true);
    try {
      const branding = await resolveBranding();
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const metadata = [
        { label: "Period", value: rangeLabel },
        { label: "Branch", value: branchLabel },
      ];
      if (format === "PDF") {
        const sections = sheets.flatMap((s) => s.sections);
        await exportReportPDF("Ministry report", sections, `belivrhq-report-${stamp}`, { metadata, branding, overview:{period:rangeLabel,branch:branchLabel,blocks:overviewBlocks()} });
      } else if (format === "XLSX") {
        await exportExcel(
          sheets.flatMap(s => s.sections.map(section => ({ name: section.title, columns: section.columns, data: section.data, metadata }))),
          `belivrhq-report-${stamp}`,
          { branding },
        );
      } else {
        for (const s of sheets) {
          for (const section of s.sections) {
            exportCSV(section.data, section.columns, `${s.id}-${section.title.toLowerCase().replace(/\s+/g, "-")}-${stamp}`, branding);
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

  const loadingBlocks = activeBlocks.some((b) => {
    if (b === "financial") return financial.isLoading;
    if (b === "attendance") return attendance.isLoading;
    return membersReport.isLoading;
  });
  const anyError = activeBlocks.some((b) => {
    if (b === "financial") return financial.isError;
    if (b === "attendance") return attendance.isError;
    return membersReport.isError;
  });

  const fin = want("financial") ? financial.data : undefined;
  const att = want("attendance") ? attendance.data : undefined;
  const mem = want("members") ? membersReport.data : undefined;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Insights · Report studio" title="A useful report, ready next time." description="Save a section mix, change the period and inspect the pages at a comfortable size." actions={<Button className="h-10 gap-2 rounded-xl" onClick={handleGenerate} disabled={exporting || loadingBlocks || anyError || !sheetsFor().length}>
          {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Export {format}
        </Button>} />

      <div className="grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside data-tour-report-palette data-tour-report-settings className="min-w-0 space-y-4 lg:sticky lg:top-20">
          <div className="paper-card overflow-hidden rounded-2xl border border-line">
            <header className="border-b border-line p-5"><p className="rule-label mb-2">Report presets</p><h2 className="font-display text-2xl font-semibold">Start with a familiar view.</h2></header>
            <div className="space-y-5 p-5"><ReportPresets current={{range,branchId,blocks:activeBlocks}} onApply={preset=>{setRange(preset.range);setBranchId((branches.data?.data??[]).some(branch=>branch.branchId===preset.branchId)?preset.branchId:"");setBlocks(preset.blocks.filter(canUse));}} >
              <label className="grid gap-2 text-sm font-medium">Reporting period<select id="report-period" value={range} onChange={e => setRange(e.target.value as (typeof RANGES)[number])} className="h-11 w-full rounded-xl border border-line bg-paper px-3 text-sm">{RANGES.map(item => <option key={item}>{item}</option>)}</select></label>
              <label className="grid gap-2 text-sm font-medium">Branch<select id="report-branch" value={branchId} onChange={e => setBranchId(e.target.value)} className="h-11 w-full rounded-xl border border-line bg-paper px-3 text-sm"><option value="">All branches</option>{(branches.data?.data ?? []).map(branch => <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>)}</select></label>
              <fieldset><legend className="mb-3 text-sm font-medium">Include sections</legend><div className="space-y-1">{BLOCKS.map(block=><label key={block.id} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="size-4 accent-brand" checked={want(block.id)} disabled={!canUse(block.id)} onChange={()=>toggleBlock(block.id)}/>{block.title}</label>)}</div></fieldset>
              <div aria-label="Section order" className="divide-y divide-line rounded-xl border border-line">{activeBlocks.map((id,index)=>{const block=BLOCKS.find(item=>item.id===id)!;return <div key={id} className="flex min-w-0 items-center gap-2 p-2"><GripVertical className="size-4 shrink-0 text-ink-faint"/><span className="min-w-0 flex-1 text-sm">{block.title}</span><button type="button" aria-label={`Move ${block.title} up`} disabled={index===0} onClick={()=>move(blocks.indexOf(id),-1)} className="grid size-11 shrink-0 place-items-center rounded-lg hover:bg-muted disabled:opacity-25"><ArrowUp className="size-4"/></button><button type="button" aria-label={`Move ${block.title} down`} disabled={index===activeBlocks.length-1} onClick={()=>move(blocks.indexOf(id),1)} className="grid size-11 shrink-0 place-items-center rounded-lg hover:bg-muted disabled:opacity-25"><ArrowDown className="size-4"/></button></div>})}</div>
              </ReportPresets>
              <fieldset><legend className="mb-2 text-sm font-medium">Download format</legend><div className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-paper p-1">{(["PDF","XLSX","CSV"] as const).map(item => <button type="button" key={item} aria-pressed={format === item} onClick={() => setFormat(item)} className={cn("rounded-lg py-2 text-sm",format === item ? "bg-card font-semibold text-brand shadow-sm" : "text-ink-soft")}>{item}</button>)}</div></fieldset>
              <div className="flex items-start gap-2 rounded-xl border border-line bg-paper p-3 text-xs leading-relaxed text-ink-soft"><FileText className="mt-0.5 size-4 shrink-0 text-brand" />The preview and downloads use the same sections, period and recorded figures.</div>
            </div>
          </div>
          <p className="flex items-start gap-2 px-2 text-xs leading-relaxed text-ink-faint"><ShieldCheck className="size-4 shrink-0" />Print-friendly pages. Donor names are withheld.</p>
          <Link href="/insights/analytics" className="block px-2 text-sm text-brand hover:underline">Explore detailed analytics →</Link>
        </aside>

        {/* Sheet */}
        <section aria-label="Report preview" data-tour-report-preview className="min-w-0 space-y-3">
          <div className="flex flex-wrap gap-2" aria-label="Report preview mode"><Button size="sm" variant={previewMode === "print" ? "secondary" : "outline"} aria-pressed={previewMode === "print"} onClick={() => setPreviewMode("print")}>Print preview</Button><Button size="sm" variant={previewMode === "overview" ? "secondary" : "outline"} aria-pressed={previewMode === "overview"} onClick={() => setPreviewMode("overview")}>Charts & order</Button></div>
          {anyError && <div role="alert" className="paper-card rounded-xl border border-rose/30 p-4 text-sm">A selected report could not load. Export is paused to avoid an incomplete report.<Button variant="outline" size="sm" className="mt-2" onClick={() => { if(financial.isError) void financial.refetch(); if(attendance.isError) void attendance.refetch(); if(membersReport.isError) void membersReport.refetch(); }}>Retry reports</Button></div>}
          {previewMode === "print" && (loadingBlocks ? <Skeleton className="h-96 rounded-2xl" /> : sheetsFor().length ? <ReportPagePreview zoom={zoom} onZoomChange={setZoom} sections={sheetsFor().flatMap(sheet => sheet.sections)} period={rangeLabel} branch={branchLabel} church={profile?.church?.name || "Your church"} blocks={overviewBlocks()} /> : <EmptyState icon={<FileText />} title="Choose your report sections" description="Add a block to preview the report for this period." />)}
          {previewMode === "overview" && <div>
          <div className="paper-card mx-auto min-w-0 max-w-[720px] rounded-2xl p-4 sm:p-6 md:p-8">
            <header className="border-b border-line pb-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-9 place-items-center rounded-xl bg-ink text-paper">
                    <FileText className="size-4" />
                  </span>
                  <div>
                    <p className="font-display text-sm font-semibold">Ministry report</p>
                    <p className="text-xs text-ink-faint">{branchLabel}</p>
                  </div>
                </div>
                <CalendarClock className="size-4 text-ink-faint" />
              </div>
              <p className="mt-2 text-sm text-ink-soft">{rangeLabel}</p>
            </header>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {fin ? <StatCard label="Giving" value={fin.grandTotal} prefix="₦" tone="brand" deltaLabel={`${number(fin.transactionCount)} ${collectionLabel(fin.transactionCount, "transactions")}`} /> : null}
              {att ? <StatCard label="Attendance" value={att.totalAttendance} tone="moss" deltaLabel={`avg ${number(Math.round(att.averagePerService))}/service`} /> : null}
              {mem ? <StatCard label="Members" value={mem.totalMembers} tone="sky" deltaLabel={`${number(mem.newMembersInPeriod)} new in period`} /> : null}
              {!fin && !att && !mem ? (
                <div className="space-y-2 sm:col-span-2">
                  {loadingBlocks ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />) : null}
                </div>
              ) : null}
            </div>

            {anyError && !loadingBlocks ? (
              <EmptyState icon={<FileText />} title="One block couldn&apos;t load" description="The other figures are still available. Retry the failing block or adjust the range." />
            ) : null}

            <div className="mt-6 space-y-6">
              {activeBlocks.map((id, index) => {
                const block = BLOCKS.find((b) => b.id === id)!;
                const data = id === "financial" ? fin : id === "attendance" ? att : mem;
                if (!data) return null;
                return (
                  <section key={id} className="relative rounded-xl border border-line p-4">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                      <span className="rounded-full bg-card px-2 text-xs font-semibold uppercase tracking-wider text-ink-faint ring-1 ring-line">
                        {index + 1} · {block.title}
                      </span>
                      <div className="ml-auto flex shrink-0 gap-0.5">
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
                          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                            {formatNaira(fin.grandTotal)} given across {number(fin.transactionCount)} {collectionLabel(fin.transactionCount, "transactions")}
                            {fin.byCategory.length
                              ? `; ${fin.byCategory[0].name} leads at ${percent(fin.byCategory[0].total, fin.grandTotal)}% of the total.`
                              : "."}
                          </p>
                        </>
                      ) : null}
                      {id === "attendance" && att ? (
                        <>
                          <TrendChart integerAxis
                            data={att.monthlyTrend.map((m) => ({ label: monthLabel(m.month), total: m.total }))}
                            series={[{ key: "total", label: "Attendance", color: "var(--chart-1)" }]}
                            height={150}
                            formatter={(v) => number(Number(v))}
                          />
                          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                            Average {number(Math.round(att.averagePerService))} in the room across {number(att.serviceCount)} {collectionLabel(att.serviceCount, "services")}
                            {att.byService.length ? `; ${att.byService[0].name} carries the house.` : "."}
                          </p>
                        </>
                      ) : null}
                      {id === "members" && mem ? (
                        <>
                          <TrendChart integerAxis
                            data={mem.monthlyGrowth.map((m) => ({ label: monthLabel(m.month), total: m.total }))}
                            series={[{ key: "total", label: "Members", color: "var(--chart-2)" }]}
                            height={150}
                            formatter={(v) => number(Number(v))}
                          />
                          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                            {number(mem.totalMembers)} {collectionLabel(mem.totalMembers, "members")}, {number(mem.newMembersInPeriod)} new in the period, {number(mem.activeMembers)} active.
                          </p>
                        </>
                      ) : null}
                    </div>
                  </section>
                );
              })}
              {!activeBlocks.length || (!fin && !att && !mem && !loadingBlocks && !anyError) ? (
                <p className="rounded-xl border border-dashed border-line py-10 text-center text-sm text-ink-faint">
                  Add blocks from the left to assemble the report.
                </p>
              ) : null}
            </div>

            <footer className="mt-8 border-t border-dashed border-line pt-4 text-xs text-ink-faint">
              Generated {formatRecordDate(new Date())} · {rangeLabel} · {branchLabel} · donor names withheld
            </footer>
          </div>
          </div>}
        </section>

      </div>
    </div>
  );
}
