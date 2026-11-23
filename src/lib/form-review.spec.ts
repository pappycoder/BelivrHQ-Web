import {describe,it,expect} from "vitest";
import {formatFormReviewValue} from "./form-review";
describe("guided form review values",()=>{
 it("formats calendar dates and local timestamps while leaving submitted values untouched",()=>{
  expect(formatFormReviewValue("2026-11-01","date")).toBe("1 Nov 2026");
  const value="2026-11-01T09:00";const label=formatFormReviewValue(value,"datetime-local");
  expect(label).toContain("1 Nov 2026");expect(label).toContain("09:00");expect(label).not.toContain("T09");expect(value).toBe("2026-11-01T09:00");
 });
 it("keeps ordinary values, zeroes and empty optional fields intact",()=>{
  expect(formatFormReviewValue("0","number")).toBe("0");expect(formatFormReviewValue("","date")).toBe("");expect(formatFormReviewValue("A name","text")).toBe("A name");
 });
});
