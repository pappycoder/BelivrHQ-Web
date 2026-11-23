import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,it,expect,vi,beforeEach} from "vitest";
import type {EmailDetail} from "@/hooks/use-email";
const state=vi.hoisted(()=>({data:undefined as {data:EmailDetail[];truncated:boolean}|undefined,error:false}));
vi.mock("@/hooks/use-email",()=>({useEmailThread:()=>({data:state.data,isError:state.error,isLoading:false,refetch:vi.fn()})}));
vi.mock("@/hooks/use-profile",()=>({useCurrentProfile:()=>({data:{profileId:"self"}})}));
import {ConversationThread} from "./conversation-thread";
const original:EmailDetail={id:"original",subject:"Team meeting",senderId:"teammate",senderName:"Team member",recipientIds:["self"],body:"Earlier message",createdAt:"2026-11-01T10:00:00Z"};
beforeEach(()=>{state.data=undefined;state.error=false;});
describe("conversation reading pane",()=>{
 it("shows linked messages with their own sender and timestamp without treating plain text as HTML",()=>{
  state.data={data:[original,{...original,id:"reply",senderId:"self",body:"<script>unsafe()</script>",createdAt:"2026-11-02T10:00:00Z"}],truncated:false};
  const html=renderToStaticMarkup(createElement(ConversationThread,{message:original,canReply:true,onReply:vi.fn()}));
  expect(html.indexOf("Earlier message")).toBeLessThan(html.indexOf("&lt;script&gt;"));expect(html).toContain("You");expect(html).toContain("Team member");expect(html).toContain('dateTime="2026-11-02T10:00:00Z"');expect(html).toContain("Write a reply");expect(html).not.toContain("<script>");
 });
 it("keeps the selected message readable when linked history fails and suppresses reply without permission",()=>{
  state.error=true;const html=renderToStaticMarkup(createElement(ConversationThread,{message:original,canReply:false,onReply:vi.fn()}));
  expect(html).toContain("Earlier message");expect(html).toContain("Try again");expect(html).not.toContain("Write a reply");
 });
});
