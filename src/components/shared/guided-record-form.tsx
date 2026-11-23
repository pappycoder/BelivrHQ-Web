"use client";

import * as React from "react";
import { formatFormReviewValue } from "@/lib/form-review";
import { Check, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { ValidatedForm } from "@/components/ui/validated-form";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/paper/section";
import { CreatePreviewSidebar } from "./create-preview";
import { DialogFooter } from "@/components/ui/dialog";
import { FormActions } from "./form-actions";

type Element = React.ReactElement<{children?: React.ReactNode; title?: React.ReactNode; "data-guided-review"?: boolean}>;
function elements(children:React.ReactNode): Element[] {return React.Children.toArray(children).filter(React.isValidElement) as Element[];}
function sectionTitle(node:React.ReactNode):string {return React.Children.toArray(node).map(item=>typeof item==="string"||typeof item==="number"?String(item):React.isValidElement<{children?:React.ReactNode}>(item)?sectionTitle(item.props.children):"").join("").trim();}
function labelFor(control:HTMLElement, form:HTMLFormElement) {
  const label=control.id?Array.from(form.querySelectorAll("label")).find(label=>label.htmlFor===control.id):undefined;
  return (label?.textContent||control.getAttribute("aria-label")||control.getAttribute("name")||"Field").replace(/\s*\*\s*/g," ").trim();
}
/** Keep every field mounted so schema validation, controlled inputs and unsaved state survive section changes. */
export function GuidedRecordForm({children, onSubmit, className: originalClassName, ...props}: React.ComponentProps<typeof ValidatedForm>) {
  const root=React.useRef<HTMLDivElement>(null);
  const [step,setStep]=React.useState(0);
  const [errors,setErrors]=React.useState<{id:string;label:string;step:number}[]>([]);
  const [progress,setProgress]=React.useState({filled:0,total:0});
  const [summary,setSummary]=React.useState<{label:string;value:string}[]>([]);
  const parts=elements(children), content=parts.find(part=>part.type==="div"), sidebar=parts.find(part=>part.type===CreatePreviewSidebar);
  const sectionParts=content?elements(content.props.children):parts.filter(part=>part!==sidebar&&part.type!==DialogFooter);
  const reviewFields=sectionParts.find(part=>part.props["data-guided-review"]!==undefined);
  const sections=sectionParts.filter(part=>part!==reviewFields);
  const sidebarParts=elements(sidebar?.props.children);
  const actions=sidebarParts.find(part=>part.type===FormActions)||parts.find(part=>part.type===DialogFooter);
  const total=sections.length+1;
  const read=React.useCallback(()=>{
    const form=root.current?.querySelector("form");if(!form)return;
    const controls=Array.from(form.querySelectorAll<HTMLElement>("input:not([type=hidden]):not([type=file]),textarea,select:not([aria-hidden=true]),button[role=combobox]"));
    const required=controls.filter(control=>!control.hasAttribute("disabled")&&(control.hasAttribute("required")||control.getAttribute("aria-required")==="true"));
    const value=(control:HTMLElement)=>{
      if(control instanceof HTMLSelectElement)return control.value?(control.selectedOptions[0]?.textContent||control.value):"";
      if(control instanceof HTMLInputElement&&["checkbox","radio"].includes(control.type))return control.checked?control.value:"";
      if(control instanceof HTMLInputElement||control instanceof HTMLTextAreaElement)return control.value;
      const native=(control.closest('[data-slot="form-item"]')||control.parentElement)?.querySelector("select");
      if(native&&["","__none__","none"].includes(native.value))return "";
      const text=control.textContent||"";
      return control.hasAttribute("data-placeholder")||/^(Not set|Select[ .…]|Link to a family)/i.test(text)?"":text;
    };
    const next={total:required.length,filled:required.filter(control=>value(control).trim()).length};
    setProgress(old=>old.total===next.total&&old.filled===next.filled?old:next);
    const entries=controls.filter(control=>!control.hasAttribute("disabled")&&!(control instanceof HTMLInputElement&&["checkbox","radio"].includes(control.type))).map(control=>({label:labelFor(control,form),value:formatFormReviewValue(value(control).trim(),control instanceof HTMLInputElement?control.type:undefined)})).filter(item=>item.value&&item.label!=="Field").slice(0,8);
    setSummary(old=>JSON.stringify(old)===JSON.stringify(entries)?old:entries);
    const invalid=Array.from(form.querySelectorAll<HTMLElement>('[aria-invalid="true"]')).map((control,index)=>({id:control.id||(control.id=`guided-error-${index}`),label:labelFor(control,form),step:Number(control.closest<HTMLElement>("[data-guided-step]")?.dataset.guidedStep||0)}));
    setErrors(old=>JSON.stringify(old)===JSON.stringify(invalid)?old:invalid);
  },[]);
  React.useEffect(()=>{read();const observer=new MutationObserver(read);if(root.current)observer.observe(root.current,{subtree:true,attributes:true,attributeFilter:["aria-invalid","data-placeholder","value"],childList:true});return()=>observer.disconnect();},[read]);
  const go=(index:number,id?:string)=>{setStep(index);requestAnimationFrame(()=>{const target=id?document.getElementById(id):root.current?.querySelector<HTMLElement>(`[data-guided-step="${index}"] h2`);if(target){if(!id)target.tabIndex=-1;target.focus();}});};
  return <div ref={root} className="guided-record" data-dialog={originalClassName?.includes("space-y")?"true":undefined} onSubmitCapture={()=>setTimeout(()=>{read();const invalid=root.current?.querySelector<HTMLElement>('[aria-invalid="true"]');if(invalid){setStep(Number(invalid.closest<HTMLElement>("[data-guided-step]")?.dataset.guidedStep||0));requestAnimationFrame(()=>invalid.focus());}},100)} onChangeCapture={read} onClickCapture={()=>requestAnimationFrame(read)}>
    <ValidatedForm {...props} className={`guided-record-layout ${!sidebar?"guided-record-no-summary":""}`} onSubmit={event=>{if(step<total-1){event.preventDefault();go(step+1);return;}onSubmit?.(event);setTimeout(()=>{read();const invalid=root.current?.querySelector<HTMLElement>('[aria-invalid="true"]');if(invalid){setStep(Number(invalid.closest<HTMLElement>("[data-guided-step]")?.dataset.guidedStep||0));requestAnimationFrame(()=>invalid.focus());}},100);}} onInvalidCapture={event=>{const control=event.target as HTMLElement;setStep(Number(control.closest<HTMLElement>("[data-guided-step]")?.dataset.guidedStep||0));}}>
      {parts.filter(part=>!!content&&part!==content&&part!==sidebar).map((part,index)=><div key={index} className="col-span-full">{part}</div>)}
      <div className="guided-progress-mobile"><span>{progress.filled} of {progress.total} required fields complete</span><progress aria-label="Mobile required field completion" max={progress.total||1} value={progress.filled}/></div>
      <nav className="guided-record-nav" aria-label="Form sections"><p className="rule-label">A LITTLE AT A TIME</p>{sections.map((section,index)=><button key={index} type="button" aria-current={step===index?"step":undefined} onClick={()=>go(index)}><span>{step>index?<Check className="size-4"/>:String(index+1).padStart(2,"0")}</span><strong>{sectionTitle(section.props.title)||`Section ${index+1}`}</strong></button>)}<button type="button" aria-current={step===total-1?"step":undefined} onClick={()=>go(total-1)}><span>{String(total).padStart(2,"0")}</span><strong>Review & save</strong></button><div className="guided-progress"><span>{progress.filled} of {progress.total} required fields complete</span><progress aria-label="Required field completion" max={progress.total||1} value={progress.filled}/><small>Your record is saved only when you confirm.</small></div></nav>
      <div className="min-w-0 space-y-4">
        {!!errors.length&&<div role="alert" className="rounded-xl border border-destructive/30 bg-card p-4"><p className="font-medium">A few details need attention.</p><ul className="mt-2 space-y-1">{errors.map(error=><li key={error.id}><button type="button" className="min-h-11 text-sm text-destructive underline" onClick={()=>go(error.step,error.id)}>{error.label}</button></li>)}</ul></div>}
        {sections.map((section,index)=><div key={index} data-guided-step={index} hidden={step!==index}>{section}</div>)}
        <div className="space-y-4" data-guided-step={total-1} hidden={step!==total-1}>{reviewFields}<SectionCard eyebrow="ONE LAST LOOK" title="Ready when you are."><p className="mb-5 text-sm text-ink-soft">Review these details, or choose a section to make a change.</p><dl className="grid gap-4 sm:grid-cols-2">{summary.map((item,index)=><div key={index} className="min-w-0"><dt className="text-xs text-ink-faint">{item.label}</dt><dd className="mt-1 break-words text-sm font-medium">{item.value}</dd></div>)}</dl></SectionCard></div>
        <footer className="guided-record-footer"><Button type="button" variant="outline" disabled={step===0} onClick={()=>go(step-1)}><ChevronLeft className="size-4"/>Previous</Button><span className="text-xs text-ink-faint">Section {step+1} of {total}</span>{step<total-1&&elements(actions?.props.children).filter(child=>(child.props as {type?:string}).type!=="submit")} {step<total-1?<Button type="button" onClick={()=>go(step+1)}>Continue<ChevronRight className="size-4"/></Button>:null}<div hidden={step<total-1}>{actions}</div></footer>
      </div>
      {sidebar&&<aside className="guided-record-summary"><div className="mb-4 flex items-center gap-2 text-xs text-ink-faint"><ShieldCheck className="size-4 text-brand"/>Live summary · not yet saved</div>{sidebarParts.filter(part=>part.type!==FormActions)}</aside>}
    </ValidatedForm>
  </div>;
}
