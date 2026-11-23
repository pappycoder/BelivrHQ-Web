import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {it,expect,vi} from "vitest";
import {AssetTimeline} from "./asset-timeline";
it("does not claim there is no work due when history fails",()=>{
 const html=renderToStaticMarkup(createElement(AssetTimeline,{loans:[],maintenance:[],loading:false,error:true,onRetry:vi.fn()}));
 expect(html).toContain('role="alert"');expect(html).toContain("Try again");expect(html).toContain("Upcoming work is unavailable");expect(html).not.toContain("No maintenance or loan returns");expect(html).not.toContain("The story starts here");
});
it("shows shared accessible skeletons while history and upcoming work are pending",()=>{
 const html=renderToStaticMarkup(createElement(AssetTimeline,{loans:[],maintenance:[],loading:true,error:false,onRetry:vi.fn()}));
 expect(html).toContain('data-slot="skeleton"');expect(html).toContain('aria-label="Loading asset history"');expect(html).not.toContain("No maintenance or loan returns");expect(html).not.toContain("The story starts here");
});
