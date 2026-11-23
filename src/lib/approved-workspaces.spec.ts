import {describe,it,expect} from "vitest";
import {parseEmailDraft} from "./email-draft";
import {parseReportPresets} from "./report-presets";
import {assetActivity} from "./asset-activity";
import {accountStorageKey} from "@/hooks/use-account-storage";
describe("approved workspace persistence",()=>{
 it("isolates personal drafts by church, account and conversation",()=>{
  const key=accountStorageKey("email-draft:one","church","profile");
  expect(key).not.toBe(accountStorageKey("email-draft:two","church","profile"));
  expect(key).not.toBe(accountStorageKey("email-draft:one","other","profile"));
  expect(key).not.toBe(accountStorageKey("email-draft:one","church","other"));
 });
 it("recovers bounded drafts and ignores malformed contacts",()=>{
  expect(parseEmailDraft(null)).toEqual({recipients:[],subject:"",body:""});
  expect(parseEmailDraft({recipients:[null,{id:"1",name:"Person",role:"secretary"},{id:7}],subject:"Draft",body:"Body"})).toEqual({recipients:[{id:"1",name:"Person",role:"secretary"}],subject:"Draft",body:"Body"});
  expect(parseEmailDraft({body:"x".repeat(100001)}).body).toHaveLength(100000);
 });
 it("restores only known report sections, in their saved order",()=>{
  expect(parseReportPresets([null,{id:"bad",name:"Bad",range:"never",branchId:"",blocks:[]}])).toEqual([]);
  expect(parseReportPresets([{id:"one",name:" Board pack ",range:"This month",branchId:"branch",blocks:["members","financial","members","private"]}])).toEqual([{id:"one",name:"Board pack",range:"This month",branchId:"branch",blocks:["members","financial"]}]);
 });
});
describe("combined asset history",()=>{
 it("keeps distinct loans, returns, scheduled and completed work in descending date order",()=>{
  const history=assetActivity([{id:"loan",assetId:"asset",loanDate:"2026-11-01",expectedReturnDate:"2026-11-03",actualReturnDate:"2026-11-04",status:"returned",conditionAfter:"good",createdAt:"",updatedAt:""}],[{id:"work",assetId:"asset",type:"routine",status:"completed",scheduledDate:"2026-11-02",completedDate:"2026-11-05",createdAt:"",updatedAt:""}]);
  expect(history.map(item=>item.id)).toEqual(["completed:work","return:loan","scheduled:work","loan:loan"]);
  expect(history.find(item=>item.id==="loan:loan")?.due).toBe("2026-11-03");
  expect(history.filter(item=>item.kind==="loan")).toHaveLength(2);
 });
});
