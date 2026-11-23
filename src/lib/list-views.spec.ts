import { describe, expect, it } from "vitest";
import { listViewStorageKey, parseListViews } from "./list-views";
describe("private saved register views", () => {
  it("isolates accounts, churches and pages", () => {
    const key = listViewStorageKey("church-a","user-a","/people/members");
    expect(key).not.toBe(listViewStorageKey("church-b","user-a","/people/members"));
    expect(key).not.toBe(listViewStorageKey("church-a","user-b","/people/members"));
    expect(key).not.toBe(listViewStorageKey("church-a","user-a","/admin/team"));
  });
  it("ignores corrupt stored preferences and never restores a stale page number", () => {
    expect(parseListViews({})).toEqual([]);
    expect(parseListViews([null,{name:"bad"}])).toEqual([]);
    expect(parseListViews([{id:"1",name:" Active ",values:{status:"active",page:99,"intake:page":8,perPage:15,archived:false,unbounded:Infinity,nested:{read:true}}}])).toEqual([{id:"1",name:"Active",values:{status:"active",perPage:15,archived:false}}]);
  });
  it("bounds the saved collection", () => expect(parseListViews(Array.from({length:20},(_,id)=>({id:String(id),name:"View",values:{}})))).toHaveLength(12));
});
