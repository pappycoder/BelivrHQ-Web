import { REPORT_RANGES } from "./report-range";
export type ReportBlockId="financial"|"attendance"|"members";
export interface ReportPreset {id:string;name:string;range:typeof REPORT_RANGES[number];branchId:string;blocks:ReportBlockId[]}
export const DEFAULT_REPORT_PRESETS:ReportPreset[]=[{id:"board-pack",name:"Board meeting pack",range:"This month",branchId:"",blocks:["financial","attendance","members"]},{id:"people-presence",name:"People & presence",range:"This month",branchId:"",blocks:["attendance","members"]}];
export function parseReportPresets(raw:unknown):ReportPreset[]{
 if(!Array.isArray(raw))return [];
 return raw.slice(0,10).flatMap(item=>{
  if(!item||typeof item!=="object"||typeof item.id!=="string"||item.id.length>100||typeof item.name!=="string"||!item.name.trim()||item.name.length>60||!REPORT_RANGES.includes(item.range)||typeof item.branchId!=="string"||item.branchId.length>100||!Array.isArray(item.blocks))return [];
  const blocks=[...new Set(item.blocks.filter((id:unknown)=>["financial","attendance","members"].includes(String(id))))] as ReportBlockId[];
  return [{id:item.id,name:item.name.trim(),range:item.range,branchId:item.branchId,blocks}];
 });
}
