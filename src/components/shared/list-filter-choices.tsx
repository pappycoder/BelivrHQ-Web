"use client";
import { Children, Fragment, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { FilterChip } from "@/components/paper/primitives";

type ChipProps = {children?: ReactNode; active?: boolean; onClick?: () => void; count?: number; independent?: boolean};
function text(node: ReactNode): string {
  return Children.toArray(node).map(child => typeof child === "string" || typeof child === "number" ? String(child) : isValidElement<{children?:ReactNode}>(child) ? text(child.props.children) : "").join(" ").replace(/\s+/g," ").trim();
}
function groupLabel(chips: ReactElement<ChipProps>[], label?: string) {
  if (label) return label.replace(/ filters?$/i,"");
  const words = chips.map(chip => text(chip.props.children)).join(" ");
  if (/checked in|still out/i.test(words)) return "Check-in status";
  if (/payment|paid|failed|pending/i.test(words)) return "Payment status";
  if (/used|unused/i.test(words)) return "Ticket status";
  if (/month|quarter|year|today|week/i.test(words)) return "Period";
  if (/confidential|standard|restricted/i.test(words)) return "Confidentiality";
  if (/active|inactive|suspended|paused/i.test(words)) return "Status";
  if (/archive/i.test(words)) return "Records";
  return "Record type";
}
function Choice({chips,label}: {chips: ReactElement<ChipProps>[]; label?: string}) {
  const active = chips.findIndex(chip => chip.props.active);
  const value = active >= 0 ? String(active) : /^(all|any)\b/i.test(text(chips[0].props.children)) ? "0" : "";
  return <label className="list-drawer-field w-full"><span>{groupLabel(chips,label)}</span><select value={value} onChange={event => chips[Number(event.target.value)]?.props.onClick?.()} className="h-9 w-full rounded-lg border border-line bg-paper px-3 text-sm"><option value="" disabled>Choose a filter</option>{chips.map((chip,index) => <option key={index} value={String(index)}>{text(chip.props.children)}{chip.props.count !== undefined ? ` (${chip.props.count})` : ""}</option>)}</select></label>;
}
/** Single-choice chip groups keep their original handlers and become compact selects. */
export function compactFilterChoices(nodes: ReactNode, label?: string): ReactNode {
  const flat: ReactNode[] = [];
  function flatten(children: ReactNode) { Children.forEach(children,child => { if (isValidElement<{children?:ReactNode}>(child) && child.type === Fragment) flatten(child.props.children); else if (child != null && child !== false) flat.push(child); }); }
  flatten(nodes);
  const output: ReactNode[] = [];
  for (let index=0;index<flat.length;index++) {
    const node = flat[index];
    if (isValidElement<ChipProps>(node) && node.type === FilterChip && !node.props.independent) {
      const chips: ReactElement<ChipProps>[] = [node];
      while (index+1 < flat.length) { const next = flat[index+1]; if (!isValidElement<ChipProps>(next) || next.type !== FilterChip || next.props.independent) break; chips.push(next); index++; }
      output.push(chips.length > 1 ? <Choice key={`choice-${index}`} chips={chips} label={label} /> : node);
    } else if (isValidElement<{children?:ReactNode; "aria-label"?:string}>(node) && (node.type === "div" || node.type === "span")) output.push(cloneElement(node,{children:compactFilterChoices(node.props.children,node.props["aria-label"])}));
    else output.push(node);
  }
  return Children.toArray(output);
}
