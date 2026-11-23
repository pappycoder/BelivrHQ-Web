import { cloneElement, createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ListPaginationFooter } from "./list-pagination";
import { FilterChip } from "@/components/paper/primitives";
import { compactFilterChoices } from "./list-filter-choices";
const render=(node:React.ReactNode)=>renderToStaticMarkup(createElement(TooltipProvider,null,node));
describe("loaded-page feedback",()=>{
 it("describes local matches without claiming the whole result set was searched",()=>{
  const html=render(createElement(ListPaginationFooter,{page:1,perPage:20,total:87,visibleMatches:3,itemName:"notifications",onPageChange:vi.fn()}));
  expect(html).toContain("matches");expect(html).toContain("on this page");expect(html).toContain("87");expect(html).not.toContain("1–20");
 });
 it("retains ordinary server pagination when no local search is active",()=>{
  const html=render(createElement(ListPaginationFooter,{page:2,perPage:20,total:87,itemName:"notifications",onPageChange:vi.fn()}));
  expect(html).toContain("21–40");expect(html).not.toContain("matches on this page");
 });
 it("keeps independent boolean controls outside a single-choice dropdown",()=>{
  const chips=[cloneElement(createElement(FilterChip,null,"All types"),{key:"all",active:true,onClick:vi.fn()}),cloneElement(createElement(FilterChip,null,"Birthday"),{key:"birthday",onClick:vi.fn()}),cloneElement(createElement(FilterChip,null,"Upcoming only"),{key:"upcoming",independent:true,active:true,onClick:vi.fn()})];
  const html=render(createElement(Fragment,null,compactFilterChoices(chips,"Life event type")));
  expect(html.match(/<select\b/g)).toHaveLength(1);expect(html).not.toContain('<option value="2">Upcoming only</option>');expect(html).toMatch(/<button[^>]*>[\s\S]*Upcoming only/);
 });
});
