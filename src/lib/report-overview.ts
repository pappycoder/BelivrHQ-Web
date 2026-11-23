import type jsPDF from "jspdf";
import { PDF_FONT, pdfText } from "./pdf-design";
export interface ReportOverviewBlock {
  title: string;
  metrics: {label:string; value:string}[];
  trend?: {label:string; value:number}[];
}
export interface ReportOverview { period:string; branch:string; blocks:ReportOverviewBlock[] }
const ink="#191813", muted="#716b60", line="#e2dbcb", paper="#fcfaf4", brand="#0f766e";
export function drawStudioHeader(doc:jsPDF, church:string, continuation=false, paintPage=true) {
  const width=doc.internal.pageSize.getWidth(),height=doc.internal.pageSize.getHeight();
  doc.setFillColor(paper);doc.rect(0,0,width,paintPage ? height : 35,"F");
  doc.setFillColor(ink);doc.roundedRect(14,13,10,10,2,2,"F");
  doc.setFont("times","bold");doc.setFontSize(20);doc.setTextColor(paper);doc.text("b.",16,20);
  const churchHeight=pdfText(doc,church,28,17,width-75,10,true,ink);
  pdfText(doc,continuation ? "Ministry report · recorded breakdown" : "Ministry report",28,19+churchHeight,width-75,7,false,muted);
  pdfText(doc,"PRIVATE REPORT",width-50,17,36,6,false,muted);
  const bottom=Math.max(31,23+churchHeight);doc.setDrawColor(line);doc.setLineWidth(.25);if(!continuation)doc.line(14,bottom,width-14,bottom);
  return bottom+10;
}
/** Vector summary uses exactly the overview metrics/order shown in the studio. */
export function drawReportOverview(doc:jsPDF, overview:ReportOverview, church:string) {
  const width=doc.internal.pageSize.getWidth(),usable=width-28,bottom=doc.internal.pageSize.getHeight()-24;
  let y=drawStudioHeader(doc,church);
  pdfText(doc,"THE PERIOD IN PERSPECTIVE",14,y,usable,7,false,muted);y+=11;
  doc.setFont("times","bold");doc.setFontSize(22);doc.setTextColor(ink);doc.text("People. Presence. Generosity.",14,y);y+=7;
  y+=pdfText(doc,`${overview.period} · ${overview.branch}`,14,y,usable,8,false,muted)+5;
  doc.setDrawColor(line);doc.line(14,y,width-14,y);y+=9;
  overview.blocks.forEach((block,index)=>{
    const trend=block.trend?.slice(-12) ?? [];
    const labelHeight=Math.max(4,...block.metrics.map(metric=>Math.ceil(metric.label.length/35)*4));
    const blockHeight=33+labelHeight+(trend.length?44:0);
    if(y+blockHeight>bottom){doc.addPage();y=drawStudioHeader(doc,church);}
    pdfText(doc,String(index+1).padStart(2,"0"),14,y,8,7,true,brand);
    doc.setFont("times","bold");doc.setFontSize(13);doc.setTextColor(ink);doc.text(block.title,23,y);y+=9;
    const cell=usable/Math.max(1,block.metrics.length);
    block.metrics.forEach((metric,metricIndex)=>{
      const x=14+cell*metricIndex;
      pdfText(doc,metric.label,x,y,cell-8,7,false,muted);
      pdfText(doc,metric.value,x,y+labelHeight+5,cell-8,17,false,ink);
    });
    y+=labelHeight+17;
    if(trend.length){
      const max=Math.max(1,...trend.map(point=>Number.isFinite(point.value)?Math.max(0,point.value):0));
      const step=usable/trend.length;
      trend.forEach((point,i)=>{
        const h=Math.max(0,Number.isFinite(point.value)?point.value:0)/max*26;
        doc.setFillColor(brand);if(h>0)doc.roundedRect(14+i*step+step*.15,y+27-h,step*.7,h,.6,.6,"F");
        pdfText(doc,point.label,14+i*step,y+32,step-1,5.5,false,muted);
      });
      y+=42;
      if((block.trend?.length??0)>12){pdfText(doc,"Latest 12 months shown · full period in the recorded breakdown",14,y,usable,6,false,muted);y+=5;}
    }
    doc.setDrawColor(line);doc.line(14,y,width-14,y);y+=10;
  });
  if(y+9<bottom)pdfText(doc,"Full recorded breakdowns follow. Donor names are withheld.",14,y,usable,7,false,muted);
}
export function drawStudioFooters(doc:jsPDF) {
  const total=doc.getNumberOfPages();
  for(let page=1;page<=total;page++){
    doc.setPage(page);const width=doc.internal.pageSize.getWidth(),height=doc.internal.pageSize.getHeight();
    doc.setDrawColor(line);doc.line(14,height-16,width-14,height-16);
    doc.setFont(PDF_FONT,"normal");doc.setFontSize(6.5);doc.setTextColor(muted);
    doc.text("Prepared with BelivrHQ · Donor names withheld",14,height-10);doc.text(`${page} / ${total}`,width-14,height-10,{align:"right"});
  }
}
