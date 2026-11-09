"use client";

import { useManageConfirmation } from "@/components/shared/manage-confirmation";

import * as React from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCheck,
  MessageSquare,
  RefreshCw,
  Users,
  Archive,
  ArchiveRestore,
  Inbox as InboxIcon,
  Mail,
  MailOpen,
  PenSquare,
  Send,
  Trash2,
} from "lucide-react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import {
  FilterChip,
  PersonAvatar,
} from "@/components/paper/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ComposeEmailDialog } from "@/components/email/compose-email-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useEmails,
  useEmailDetail,
  useMarkEmailRead,
  useMarkEmailUnread,
  useTrashEmail,
  useRestoreEmail,
  useDeleteEmailForever,
  type EmailBox,
  type EmailContact,
} from "@/hooks/use-email";
import { cn } from "@/lib/utils";

function stamp(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const diff = Date.now() - d.getTime();
  if (diff < 86_400_000) return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (diff < 6 * 86_400_000) return d.toLocaleDateString("en-GB", { weekday: "short" });
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function SharedInboxPage() {
  const { confirm, dialog } = useManageConfirmation();
  const { can, ready } = usePermissions();
  const canAnswer = ready && can("emails", "create");
  const canReadMail = ready && can("emails", "read");

  const [box, setBox] = React.useState<EmailBox>("inbox");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [replyCtx, setReplyCtx] = React.useState<{ id: string; subject: string; recipient: EmailContact | null } | null>(null);

  const emails = useEmails({ box, page: 1, limit: 30 });
  const detail = useEmailDetail(selectedId);
  const markRead = useMarkEmailRead();
  const markUnread = useMarkEmailUnread();
  const trash = useTrashEmail();
  const restore = useRestoreEmail();
  const purge = useDeleteEmailForever();

  const rows = emails.data?.data ?? [];
  const unread = emails.data?.unreadCount ?? 0;

  // Read state is a property of the CALLER'S inbox copy only — sent mail
  // carries no read flag, so its rows must never paint as unread.
  const open = (id: string, wasRead: boolean) => {
    setSelectedId(id);
    if (!wasRead && box === "inbox") {
      markRead.mutate(id, {
        onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't mark that as read.")),
      });
    }
  };

  const markBackUnread = () => {
    if (!active) return;
    return markUnread.mutateAsync(active.id, {
      onSuccess: () => {
        // Reopening the detail re-marks read server-side, so leave the pane.
        setSelectedId(null);
        toast("Back in the unread pile.");
      },
      onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't mark it unread.")),
    });
  };

  const startReply = () => {
    if (!detail.data) return;
    const sender = detail.data.senderId;
    setReplyCtx({
      id: detail.data.id,
      subject: detail.data.subject.startsWith("Re:") ? detail.data.subject : `Re: ${detail.data.subject}`,
      recipient: { id: sender, name: detail.data.senderName ?? "Them", role: "" },
    });
    setComposeOpen(true);
  };

  const active = detail.data;
  const listLoading = emails.isLoading;
  const hasSelection = selectedId !== null;
  const compose = () => { setReplyCtx(null); setComposeOpen(true); };
  const mailboxTitle = box === "inbox" ? "Inbox" : "Sent messages";

  return (
    <div className="space-y-4">
      {dialog}
      <header className="flex flex-wrap items-end justify-between gap-4 pb-2">
        <div>
          <p className="rule-label">Connect · Messages</p>
          <h1 className="mt-2 font-display text-[clamp(1.75rem,3vw,2.5rem)] font-semibold tracking-tight">A place to stay connected.</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">Conversations, updates and a little encouragement. Keep your church team in the loop.</p>
        </div>
        {canAnswer && <Button className="h-10 gap-2 rounded-full px-5 text-xs" onClick={compose}><PenSquare className="size-4" /> Compose message</Button>}
      </header>

      <section aria-label="Mailbox" className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-muted/25 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2" aria-label="Mailbox folders">
            <FilterChip active={box === "inbox"} onClick={() => { setBox("inbox"); setSelectedId(null); }}>
              <InboxIcon className="mr-1.5 size-3.5" /> Inbox {unread > 0 && <span className="num ml-2 rounded-full bg-brand px-1.5 text-[10px] text-paper">{unread}</span>}
            </FilterChip>
            <FilterChip active={box === "sent"} onClick={() => { setBox("sent"); setSelectedId(null); }}><Send className="mr-1.5 size-3.5" /> Sent</FilterChip>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-ink-soft"><Mail className="size-3.5" />{emails.isError ? "Mailbox unavailable" : listLoading ? "Loading messages…" : `${emails.data?.total ?? 0} message${emails.data?.total === 1 ? "" : "s"}`}</span>
        </div>
        {emails.isError ? (
          <div role="alert" className="flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center">
            <AlertCircle className="mb-4 size-9 text-ink-soft" />
            <h2 className="font-display text-xl font-semibold">Your messages couldn’t be loaded</h2>
            <p className="mt-2 max-w-sm text-sm text-ink-soft">Check your connection and try opening your mailbox again.</p>
            <Button variant="outline" className="mt-6 gap-2 rounded-full" onClick={() => void emails.refetch()}><RefreshCw className="size-4" /> Try again</Button>
          </div>
        ) : !listLoading && rows.length === 0 ? (
          <div className="relative isolate overflow-hidden px-5 py-12 sm:px-10 sm:py-16">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(ellipse_at_top,var(--color-brand-soft),transparent_70%)]" />
            <div className="mx-auto flex max-w-lg flex-col items-center text-center">
              <div aria-hidden="true" className="relative mb-7 flex h-28 w-40 items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-brand/10 bg-brand-soft/30" />
                <div className="absolute h-16 w-24 -rotate-12 rounded-xl border border-line bg-card shadow-sm" />
                <div className="relative flex h-20 w-28 rotate-6 items-center justify-center rounded-xl border border-brand/20 bg-card text-brand shadow-md"><MailOpen className="size-10 stroke-[1.25]" /></div>
                <span className="absolute bottom-0 right-3 grid size-9 place-items-center rounded-full border-4 border-card bg-moss-soft text-moss">{box === "inbox" ? <CheckCheck className="size-4" /> : <Send className="size-4" />}</span>
              </div>
              <p className="rule-label text-brand">{box === "inbox" ? "Room for conversation" : "Make the first connection"}</p>
              <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">{box === "inbox" ? "A quiet inbox. A connected team." : "Good conversations start with hello."}</h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">{box === "inbox" ? "Messages from your church team will find a home here. Until then, reach out with an update, a question or a word of encouragement." : "You haven’t sent any messages yet. Share an update or check in with someone on your church team."}</p>
              {canAnswer && <Button className="mt-6 gap-2 rounded-full px-6" onClick={compose}><PenSquare className="size-4" /> Start a conversation</Button>}
            </div>
            <div className="mx-auto mt-10 grid max-w-2xl gap-3 border-t border-line pt-6 sm:grid-cols-2">
              <div className="flex gap-3 rounded-xl bg-muted/35 p-4"><Users className="mt-0.5 size-4 shrink-0 text-brand" /><div><p className="text-xs font-semibold">Your church, in reach</p><p className="mt-1 text-xs leading-relaxed text-ink-soft">Keep internal updates and team conversations together.</p></div></div>
              <div className="flex gap-3 rounded-xl bg-muted/35 p-4"><MessageSquare className="mt-0.5 size-4 shrink-0 text-brand" /><div><p className="text-xs font-semibold">A little care goes a long way</p><p className="mt-1 text-xs leading-relaxed text-ink-soft">A quick check-in can make someone’s day.</p></div></div>
            </div>
          </div>
        ) : (
      <div className="grid min-h-[60vh] md:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className={cn("max-h-[75vh] overflow-y-auto border-line md:border-r", hasSelection && "hidden md:block")}>
          <div className="flex items-center justify-between border-b border-line px-5 py-4"><h2 className="text-sm font-semibold">{mailboxTitle}</h2><span className="text-[11px] text-ink-faint">Most recent first</span></div>
          {listLoading ? (
            <div className="space-y-2 p-3">{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : (
            rows.map((email) => (
              <button
                key={email.id}
                aria-pressed={selectedId === email.id}
                type="button"
                onClick={() => open(email.id, !!email.readAt)}
                className={cn(
                  "flex w-full items-start gap-3 border-b border-line/50 px-5 py-5 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                  selectedId === email.id ? "bg-brand-soft/50 shadow-[inset_3px_0_0_var(--color-brand)]" : "hover:bg-muted/50",
                )}
              >
                <PersonAvatar name={box === "inbox" ? email.senderName ?? "?" : email.recipientName} src={box === "inbox" ? email.senderAvatarUrl : undefined} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className={cn(
                      "min-w-0 flex-1 truncate text-xs",
                      box === "inbox" && !email.readAt ? "font-semibold text-ink" : "text-ink-soft",
                    )}
                    >
                      {box === "inbox" ? email.senderName ?? "Member" : email.recipientName}
                    </span>
                    {box === "inbox" && !email.readAt ? <span className="size-1.5 shrink-0 rounded-full bg-brand" /> : null}
                    <span className="shrink-0 text-[9px] text-ink-faint">{stamp(email.createdAt)}</span>
                  </span>
                  <span className="mt-1 block truncate text-sm font-medium">{email.subject}</span>
                  <span className="mt-1 block truncate text-xs text-ink-faint">{email.preview}</span>
                </span>
              </button>
            ))
          )}
        </div>

        <div className={cn("flex min-w-0 flex-col", !hasSelection && "hidden md:flex")}>
          {!hasSelection ? (
            <div className="flex flex-1 flex-col items-center justify-center bg-muted/15 px-8 py-16 text-center">
              <span aria-hidden="true" className="mb-5 grid size-16 place-items-center rounded-2xl border border-line bg-card text-brand shadow-sm"><MailOpen className="size-7 stroke-[1.5]" /></span>
              <p className="rule-label">A little space to focus</p>
              <h2 className="mt-3 font-display text-2xl font-semibold">Your next conversation is here.</h2>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-soft">Choose a message to read it, catch up and keep the conversation going.</p>
            </div>
          ) : detail.isLoading ? (
            <div className="space-y-3 p-6"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-40 rounded-xl" /></div>
          ) : detail.isError || !active ? (
            <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center"><AlertCircle className="size-8 text-ink-soft" /><p className="text-sm text-ink-soft">This message couldn’t be opened.</p><Button variant="outline" onClick={() => void detail.refetch()}>Try again</Button><Button variant="ghost" onClick={() => setSelectedId(null)}><ArrowLeft className="mr-2 size-4" /> Back to messages</Button></div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
                <div className="min-w-0">
                  <h2 className="break-words font-display text-xl font-semibold">{active.subject}</h2>
                  <p className="mt-0.5 truncate text-[11px] text-ink-faint">
                    {box === "inbox" ? `From ${active.senderName ?? "someone"}` : `To ${active.recipientIds.length} recipient${active.recipientIds.length === 1 ? "" : "s"}`}
                    {" · "}{stamp(active.createdAt)}
                    {active.readAt ? " · read" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  {canAnswer ? (
                    <Button size="sm" className="h-8 gap-1.5 rounded-full text-xs" onClick={startReply}>
                      <Send className="size-3.5" /> Reply
                    </Button>
                  ) : null}
                  {canReadMail && box === "inbox" && active.readAt && !active.deletedAt ? (
                    <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-full border-line text-xs" onClick={() => confirm({ title: "Mark message unread?", subject: active.subject, onConfirm: markBackUnread })}>
                      <Mail className="size-3.5" /> Mark unread
                    </Button>
                  ) : null}
                  {canAnswer && box === "inbox" ? (
                    <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-full border-line text-xs" onClick={() => confirm({ title: "Archive message?", subject: active.subject, onConfirm: () => trash.mutateAsync(active.id, { onSuccess: () => { setSelectedId(null); toast("Archived."); }, onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't archive this message.")) }) })}>
                      <Archive className="size-3.5" /> Archive
                    </Button>
                  ) : null}
                  {active.deletedAt ? (
                    <>
                      <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-full border-line text-xs" onClick={() => confirm({ title: "Restore message?", subject: active.subject, onConfirm: () => restore.mutateAsync(active.id, { onSuccess: () => toast("Back in the inbox."), onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't restore it.")) }) })}>
                        <ArchiveRestore className="size-3.5" /> Restore
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-full border-line text-xs text-destructive" onClick={() => confirm({ title: "Delete message forever?", subject: active.subject, destructive: true, description: "This permanently deletes the message and cannot be undone.", onConfirm: () => purge.mutateAsync(active.id, { onSuccess: () => { setSelectedId(null); toast("Deleted for good."); }, onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't delete it.")) }) })}>
                        <Trash2 className="size-3.5" /> Delete forever
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-5">
                {detail.isError ? (
                  <p className="text-xs text-ink-soft">This message couldn&apos;t be opened. Please try again.</p>
                ) : (
                  <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">{active.body}</p>
                )}
              </div>
              <button type="button" className="border-t border-line px-5 py-2.5 text-left text-[11px] text-ink-faint hover:bg-muted/40" onClick={() => { setSelectedId(null); }}>
                ← back to the list
              </button>
            </>
          )}
        </div>
      </div>
        )}
      </section>

      <ComposeEmailDialog
        open={composeOpen}
        onOpenChange={(value) => { setComposeOpen(value); if (!value) setReplyCtx(null); }}
        replyToId={replyCtx?.id}
        replySubject={replyCtx?.subject}
        initialRecipients={replyCtx?.recipient ? [replyCtx.recipient] : undefined}
      />
    </div>
  );
}
