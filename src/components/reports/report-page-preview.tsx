"use client";
import { Button } from "@/components/ui/button";
import { Eye, ZoomIn, ZoomOut } from "lucide-react";
import type { PdfReportSection } from "@/lib/export-utils";
import { formatMoney } from "@/lib/money";

import type { ReportOverviewBlock } from "@/lib/report-overview";
type PreviewBlock = ReportOverviewBlock & {sections: PdfReportSection[]};
/** Both the editorial summary and its expandable data use the export payload. */
export function ReportPagePreview({ sections, blocks, period, branch, church, zoom=100, onZoomChange }: { sections: PdfReportSection[]; blocks?: PreviewBlock[]; period: string; branch: string; church: string;zoom?:number;onZoomChange?:(zoom:number)=>void }) {
  function dataTable(section: PdfReportSection) {
    return <div key={section.title} className="mt-4"><h4 className="mb-2 text-sm font-semibold">{section.title}</h4>{section.description && <p className="mb-3 text-sm text-[#56514a]">{section.description}</p>}{section.data.length ? <table className="w-full table-fixed border-collapse text-xs"><thead className="bg-[#efeade]"><tr>{section.columns.map(column => <th key={column.key} className="break-words px-2 py-3 text-left font-semibold">{column.label}</th>)}</tr></thead><tbody>{section.data.map((row,rowIndex) => <tr key={rowIndex} className="border-b border-[#e2dbcb]">{section.columns.map(column => <td key={column.key} className="break-words px-2 py-3 [overflow-wrap:anywhere]">{typeof row[column.key] === "number" ? /₦/.test(column.label) ? formatMoney(row[column.key] as number) : (row[column.key] as number).toLocaleString("en-NG",{maximumFractionDigits:8}) : String(row[column.key] ?? "")}</td>)}</tr>)}</tbody></table> : <p className="rounded-xl border border-dashed border-[#e2dbcb] p-4 text-sm text-[#56514a]">No records in this section for the selected period.</p>}</div>;
  }
  const content: PreviewBlock[] = blocks ?? sections.map(section => ({title:section.title,sections:[section],metrics:[]}));
  return <div data-report-page-preview className="rounded-2xl border border-line bg-paper-deep p-3 sm:p-5">
    <p className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-soft"><span className="flex items-center gap-2"><Eye className="size-3.5" />Page preview</span><span className="flex items-center gap-1">{onZoomChange ? <><Button variant="ghost" size="icon" className="size-11" aria-label="Zoom out" disabled={zoom<=80} onClick={()=>onZoomChange(Math.max(80,zoom-10))}><ZoomOut className="size-4" /></Button><span className="num">{zoom}%</span><Button variant="ghost" size="icon" className="size-11" aria-label="Zoom in" disabled={zoom>=130} onClick={()=>onZoomChange(Math.min(130,zoom+10))}><ZoomIn className="size-4" /></Button></> : "Summary preview · PDF includes full breakdowns"}</span></p>
    <div className="overflow-x-auto pb-1"><article style={{width:`${zoom}%`,minWidth:280}} className="mx-auto max-w-none bg-[#fcfaf4] p-5 text-[#191813] shadow-sm sm:p-8 lg:p-7 xl:p-10">
      <header className="flex items-center gap-3 border-b border-[#e2dbcb] pb-6"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#191813] font-display text-2xl text-[#fcfaf4]">b·</span><div className="min-w-0"><p className="break-words text-sm font-semibold">{church}</p><p className="mt-1 text-xs text-[#716b60]">Ministry report</p></div><span className="ml-auto hidden text-[10px] uppercase tracking-widest text-[#716b60] sm:block">PRIVATE REPORT</span></header>
      <div className="border-b border-[#e2dbcb] py-7"><p className="mb-3 text-[10px] uppercase tracking-[.16em] text-[#716b60]">The period in perspective</p><h2 className="font-display text-[clamp(1.6rem,3vw,2.3rem)] font-semibold leading-tight tracking-tight">People. Presence. Generosity.</h2><p className="mt-3 text-xs text-[#716b60]">{period} · {branch}</p></div>
      {content.map((block,index) => <section key={`${index}:${block.title}`} className="border-b border-[#e2dbcb] py-6">
        <div className="mb-5 flex items-baseline gap-2"><span className="text-xs font-semibold text-[#0f766e]">{String(index+1).padStart(2,"0")}</span><h3 className="font-display text-xl font-semibold">{block.title}</h3></div>
        {block.metrics.length > 0 && <div className="grid grid-cols-2 gap-4">{block.metrics.map(metric => <div key={metric.label} className="min-w-0"><p className="text-xs text-[#716b60]">{metric.label}</p><p className="mt-2 break-words font-display text-[clamp(1.4rem,2.8vw,2rem)] leading-tight [overflow-wrap:anywhere]">{metric.value}</p></div>)}</div>}
        {"trend" in block && block.trend && block.trend.length > 0 && <div className="mt-6 flex h-32 items-end gap-2 overflow-x-auto border-b border-[#e2dbcb]" aria-label="Recorded giving trend">{block.trend.slice(-12).map((point,index) => <div key={index} className="flex h-full min-w-10 flex-1 flex-col justify-end gap-2 text-center"><div title={`${point.label}: ${formatMoney(point.value)}`} className="mx-auto w-3/4 rounded-t-sm bg-[#0f766e]" style={{height:`${Math.max(point.value > 0 ? 3 : 0,point.value / Math.max(1,...block.trend!.slice(-12).map(item => item.value)) * 75)}%`}} /><span className="pb-2 text-[10px] text-[#716b60]">{point.label}</span></div>)}</div>}
        {block.trend && block.trend.length > 12 && <p className="mt-2 text-[10px] text-[#716b60]">Latest 12 months shown · full period in the recorded breakdown</p>}
        {blocks ? <details className="mt-5 text-[#56514a]"><summary className="cursor-pointer text-xs underline decoration-[#e2dbcb] underline-offset-4">View recorded breakdown</summary>{block.sections.map(dataTable)}</details> : block.sections.map(dataTable)}
      </section>)}
      <footer className="flex flex-wrap justify-between gap-2 pt-5 text-[10px] text-[#716b60]"><span>Prepared with BelivrHQ · Donor names withheld</span><span>{content.length} {content.length === 1 ? "section" : "sections"}</span></footer>
    </article></div>
  </div>;
}
