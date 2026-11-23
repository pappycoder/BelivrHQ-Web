import { afterEach, describe, expect, it, vi } from "vitest";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createReportPDF } from "./export-utils";
import { drawReportOverview } from "./report-overview";
import { preparePdf } from "./pdf-design";
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
const overview={period:"1-23 November 2026",branch:"All branches",blocks:[
 {title:"Financial summary",metrics:[{label:"Giving received",value:"₦284,000.50"},{label:"Gifts recorded",value:"38"}],trend:[{label:"Week 1",value:42000},{label:"Week 2",value:67000},{label:"Week 3",value:54000},{label:"Week 4",value:121000.5}]},
 {title:"Attendance summary",metrics:[{label:"People welcomed",value:"426"},{label:"Gatherings held",value:"12"}]},
 {title:"Membership summary",metrics:[{label:"New members",value:"8"},{label:"Active members",value:"98"}]},
]};
describe("studio PDF presentation",()=>{
 it("draws the same ordered metrics and handles a zero trend without invalid geometry",async()=>{
  vi.stubGlobal("fetch",async(url:string)=>new Response(await readFile(`public${url}`)));
  const {jsPDF}=await import("jspdf");const doc=new jsPDF();await preparePdf(doc);
  const text=vi.spyOn(doc,"text");drawReportOverview(doc,{...overview,blocks:[overview.blocks[2],{...overview.blocks[0],trend:[{label:"Nov",value:0}]}]},"Sample Church");
  const words=text.mock.calls.flatMap(call=>Array.isArray(call[0])?call[0]:[call[0]]).join(" ");
  expect(words.indexOf("Membership summary")).toBeLessThan(words.indexOf("Financial summary"));
  expect(words).toContain("₦284,000.50");expect(words).toContain("Donor names are withheld");expect(doc.output()).not.toMatch(/NaN|Infinity/);
 });
 it("exports the editorial summary before complete paginated breakdowns",async()=>{
  vi.stubGlobal("fetch",async(url:string)=>new Response(await readFile(`public${url}`)));
  const doc=await createReportPDF("Ministry report",[{title:"Recorded giving",columns:[{key:"month",label:"Month"},{key:"total",label:"Giving (₦)"}],data:Array.from({length:75},(_,i)=>({month:`Recorded row ${i+1}`,total:i+0.5}))}],{branding:{churchName:"Sample Church"},overview});
  expect(doc.getNumberOfPages()).toBeGreaterThan(2);expect(doc.output()).toContain("People. Presence. Generosity.");
  if(process.env.BELIVR_PDF_EVIDENCE){await mkdir(process.env.BELIVR_PDF_EVIDENCE,{recursive:true});await writeFile(`${process.env.BELIVR_PDF_EVIDENCE}/studio-parity-sample.pdf`,Buffer.from(doc.output("arraybuffer")));}
 });
});
