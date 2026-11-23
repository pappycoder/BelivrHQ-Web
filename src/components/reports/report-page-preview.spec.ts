import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReportPagePreview } from "./report-page-preview";
describe("report print preview", () => {
  it("preserves the export section order, recorded totals and empty sections", () => {
    const html = renderToStaticMarkup(createElement(ReportPagePreview,{church:"Example Church",period:"November 2026",branch:"Central",sections:[
      {title:"Membership summary",columns:[{key:"count",label:"Members"}],data:[{count:9}]},
      {title:"Giving by month",columns:[{key:"total",label:"Total (₦)"}],data:[{total:25000.5}]},
      {title:"Attendance",columns:[{key:"total",label:"Count"}],data:[]},
    ]}));
    expect(html.indexOf("Membership summary")).toBeLessThan(html.indexOf("Giving by month"));
    expect(html).toContain("₦25,000.5");
    expect(html).toContain("No records in this section");
    expect(html).toContain("November 2026");
    expect(html).toContain("Central");
  });
});
