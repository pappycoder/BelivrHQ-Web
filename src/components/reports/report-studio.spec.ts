import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ReportsStudioPage from "@/app/(paper)/insights/reports/page";
import { TooltipProvider } from "@/components/ui/tooltip";
const state=vi.hoisted(()=>({failed:false,pending:false,financialAllowed:true,financialRequested:false}));
vi.mock("@/hooks/use-permissions",()=>({usePermissions:()=>({ready:true,can:(permission:string)=>permission!=="reports:financial"||state.financialAllowed})}));
vi.mock("@/hooks/use-profile",()=>({useCurrentProfile:()=>({data:{church:{name:"Example Church"}}})}));
vi.mock("@/hooks/use-export-branding",()=>({useExportBranding:()=>async()=>({churchName:"Example Church"})}));
vi.mock("@/hooks/use-branches",()=>({useBranchesList:()=>({data:{data:[]}})}));
vi.mock("@/components/tours/navigation-page-tour",()=>({NavigationPageTour:()=>null}));
vi.mock("@/components/paper/charts",()=>({TrendChart:()=>null}));
vi.mock("@/hooks/use-reports",()=>({
 monthLabel:(month:string)=>month,
 useFinancialReport:(_params:unknown,options:{enabled:boolean})=>{state.financialRequested=options.enabled;return {isError:state.failed,isLoading:state.pending,refetch:vi.fn(),data:{grandTotal:987654,transactionCount:1,monthlyTrend:[{month:"2026-11",total:987654}],byCategory:[]}};},
 useAttendanceReport:()=>({isError:false,isLoading:false,refetch:vi.fn(),data:{totalAttendance:5,averagePerService:5,serviceCount:1,byService:[{name:"Sunday",total:5,average:5}],monthlyTrend:[]}}),
 useMemberReport:()=>({isError:false,isLoading:false,refetch:vi.fn()}),
}));
const render=()=>renderToStaticMarkup(createElement(TooltipProvider,null,createElement(ReportsStudioPage)));
function exportButton(html:string){
  const button=html.match(/<button\b[\s\S]*?<\/button>/g)?.find(button=>button.replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim()==="Export PDF");
  expect(button).toBeDefined();return button!.slice(0,button!.indexOf(">")+1);
}
beforeEach(()=>Object.assign(state,{failed:false,pending:false,financialAllowed:true,financialRequested:false}));
describe("report export readiness and access",()=>{
 it("blocks an incomplete export when a selected request fails even with stale data",()=>{state.failed=true;const html=render();expect(html).toContain("Export is paused to avoid an incomplete report");expect(exportButton(html)).toMatch(/\sdisabled(?:=|[\s>])/g);});
 it("waits for every selected block before allowing export",()=>{state.pending=true;expect(exportButton(render())).toMatch(/\sdisabled(?:=|[\s>])/g);});
 it("does not request or render stale financial data without the report grant",()=>{state.financialAllowed=false;const html=render();expect(state.financialRequested).toBe(false);expect(html).not.toContain("987,654");expect(html).toContain("Sunday");});
 it("enables a complete authorized report",()=>{const html=render();expect(state.financialRequested).toBe(true);expect(exportButton(html)).not.toMatch(/\sdisabled(?:=|[\s>])/g);expect(html).toContain("987,654");});
});
