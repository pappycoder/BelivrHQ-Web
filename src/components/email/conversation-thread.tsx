"use client";
import { useEmailThread, type EmailDetail } from "@/hooks/use-email";
import { useCurrentProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { PersonAvatar } from "@/components/paper/primitives";
import { formatRecordDateTime } from "@/lib/record-date";
export function ConversationThread({message,onReply,canReply}:{message:EmailDetail;onReply:()=>void;canReply:boolean}) {
 const thread=useEmailThread(message.id);const {data:profile}=useCurrentProfile();
 const messages=thread.data?.data??[message];
 return <div className="space-y-5 bg-muted/15 p-5 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-2"><p className="rule-label">CONVERSATION · {thread.isLoading?"Loading…":`${messages.length} message${messages.length===1?"":"s"}`}</p>{thread.data?.truncated&&<span className="text-xs text-ink-faint">Showing up to 200 linked messages</span>}</div>{thread.isError&&<div role="alert" className="rounded-xl border border-line bg-card p-3 text-sm">The conversation could not be loaded. Your selected message is below. <Button type="button" variant="outline" onClick={()=>void thread.refetch()}>Try again</Button></div>}{messages.map(item=>{const own=item.senderId===profile?.profileId;return <article key={item.id} className={`max-w-[94%] rounded-2xl border border-line p-4 sm:p-5 ${own?"ml-auto bg-brand-soft":"mr-auto bg-card"}`}><header className="mb-4 flex items-center gap-3"><PersonAvatar name={own?"You":item.senderName||"Teammate"} src={item.senderAvatarUrl}/><div className="min-w-0"><p className="text-sm font-medium">{own?"You":item.senderName||"Teammate"}</p><time className="text-xs text-ink-faint" dateTime={item.createdAt}>{formatRecordDateTime(item.createdAt)}</time></div></header><p className="whitespace-pre-wrap break-words text-sm leading-[1.85] text-ink-soft">{item.body}</p></article>})}{canReply&&<button type="button" onClick={onReply} className="flex min-h-16 w-full items-center rounded-xl border border-line bg-card px-5 text-left text-sm text-ink-faint">Write a reply… <span className="ml-auto text-brand">Reply →</span></button>}</div>;
}
