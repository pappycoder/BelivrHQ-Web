import { describe, expect, it } from "vitest";
import { searchListRecords } from "./list-search";
describe("loaded register search", () => {
 const rows = [{name:"Grace Family",contact:{email:"grace@example.org"},amount:25000},{name:"Hope Family",contact:null,amount:500}];
 it("matches separate terms across displayed record values regardless of case",()=>expect(searchListRecords(rows,"  GRACE   example.org ")).toEqual([rows[0]]));
 it("does not mistake schema property names for matching values",()=>expect(searchListRecords(rows,"contact")).toEqual([]));
 it("supports numbers and restores all rows after clearing",()=>{expect(searchListRecords(rows,"25000")).toEqual([rows[0]]);expect(searchListRecords(rows," ")).toEqual(rows);});
});
