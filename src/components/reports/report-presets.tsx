"use client";
import { useEffect, useState, type ReactNode } from "react";
import { Save, Trash2 } from "lucide-react";
import { useAccountStorage } from "@/hooks/use-account-storage";
import { DEFAULT_REPORT_PRESETS, parseReportPresets, type ReportPreset } from "@/lib/report-presets";
import { Button } from "@/components/ui/button";
import { RequiredIndicator } from "@/components/ui/required-fields";
import { Input } from "@/components/ui/input";
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
export function ReportPresets({current,onApply,children}:{children?:ReactNode;current:Omit<ReportPreset,"id"|"name">;onApply:(preset:ReportPreset)=>void}) {
 const store=useAccountStorage<ReportPreset[]>("report-presets",DEFAULT_REPORT_PRESETS,parseReportPresets);
 const [selected,setSelected]=useState("board-pack");const [open,setOpen]=useState(false);const [name,setName]=useState("");
 useEffect(()=>{const preset=store.value.find(item=>item.id===selected);if(selected&&(!preset||JSON.stringify({range:preset.range,branchId:preset.branchId,blocks:preset.blocks})!==JSON.stringify(current)))setSelected("");},[current,selected,store.value]);
 return <div className="space-y-3"><label className="grid gap-2 text-sm font-medium">Saved report<select aria-label="Saved report" value={selected} className="h-11 w-full rounded-xl border border-line bg-paper px-3 text-sm" disabled={!store.ready} onChange={event=>{setSelected(event.target.value);const preset=store.value.find(item=>item.id===event.target.value);if(preset)onApply(preset);}}><option value="">Custom report</option>{store.value.map(preset=><option value={preset.id} key={preset.id}>{preset.name}</option>)}</select></label>
 {children}
 <div className="flex gap-2"><Button type="button" variant="outline" className="min-h-11 flex-1 rounded-xl" disabled={!store.ready||store.value.length>=10} onClick={()=>{setName("");setOpen(true);}}><Save className="size-4" />Save this report setup</Button>{selected&&<Button type="button" variant="outline" size="icon" className="size-11 shrink-0" aria-label="Remove saved report preset" onClick={()=>{store.setValue(previous=>previous.filter(item=>item.id!==selected));setSelected("");}}><Trash2 className="size-4" /></Button>}</div>
 <p className="text-xs leading-relaxed text-ink-faint">{store.error ? "This browser could not save your presets. Your current report still works." : "Personal presets on this browser. No report is scheduled or shared."}</p>
 <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Keep this report setup.</DialogTitle><DialogDescription>Save its sections, period and branch for your account on this browser.</DialogDescription></DialogHeader><label className="grid gap-2 text-sm"><span className="flex items-center gap-1">Preset name<RequiredIndicator/></span><Input required value={name} maxLength={60} onChange={event=>setName(event.target.value)} placeholder="For example, Monthly board pack" /></label><DialogFooter><Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button><Button disabled={!name.trim()} onClick={()=>{const preset:ReportPreset={...current,id:crypto.randomUUID(),name:name.trim()};store.setValue(previous=>[...previous.filter(item=>item.name!==preset.name),preset].slice(-10));setSelected(preset.id);setOpen(false);toast.success("Report preset saved.");}}>Save preset</Button></DialogFooter></DialogContent></Dialog></div>;
}
