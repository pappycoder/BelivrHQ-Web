"use client";

import { useManageConfirmation } from "@/components/shared/manage-confirmation";

import * as React from "react";
import {
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
import { StatCard } from "@/components/paper/stat";
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

  return (
    <div className="space-y-4">
      {dialog}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="rule-label">Connect · Inbox</p>
          <h1 className="mt-1 font-display text-[clamp(1.5rem,2.2vw,2rem)] font-semibold tracking-tight">The shared desk</h1>
        </div>
        <div className="flex items-center gap-2">
          <FilterChip active={box === "inbox"} onClick={() => { setBox("inbox"); setSelectedId(null); }}>
            Inbox {unread ? <span className="num ml-1 rounded-full bg-brand px-1.5 text-[9px] text-paper">{unread}</span> : null}
          </FilterChip>
          <FilterChip active={box === "sent"} onClick={() => { setBox("sent"); setSelectedId(null); }}>Sent</FilterChip>
          {canAnswer ? (
            <Button className="h-9 gap-1.5 rounded-full text-xs" onClick={() => { setReplyCtx(null); setComposeOpen(true); }}>
              <PenSquare className="size-3.5" /> Compose
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <StatCard label="Total here" value={emailEmailsTotal(rows)} tone="brand" icon={<InboxIcon className="size-4" />} />
        <StatCard label="Unread" value={unread} tone="gold" icon={<Mail className="size-4" />} deltaLabel="answers waiting" />
        <div className="paper-card flex flex-col justify-between gap-4 rounded-2xl p-5">
          <span className="rule-label">One desk, many hands</span>
          <span className="text-[11px] leading-relaxed text-ink-soft">Read receipts are per person — someone&apos;s already answering is the only rule.</span>
        </div>
      </div>

      <div className="grid min-h-[60vh] gap-0 overflow-hidden rounded-2xl border border-line bg-card md:grid-cols-[minmax(0,340px)_1fr]">
        <div className={cn("max-h-[70vh] overflow-y-auto border-line md:border-r", active && "hidden md:block")}>
          {listLoading ? (
            <div className="space-y-2 p-3">{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : rows.length === 0 ? (
            <p className="px-4 py-16 text-center text-xs text-ink-faint">
              {box === "inbox" ? "Nothing to answer. Enjoy it." : "Nothing sent from here yet."}
            </p>
          ) : (
            rows.map((email) => (
              <button
                key={email.id}
                type="button"
                onClick={() => open(email.id, !!email.readAt)}
                className={cn(
                  "flex w-full items-start gap-3 border-b border-line/50 px-4 py-3 text-left transition-colors",
                  selectedId === email.id ? "bg-brand-soft/40" : "hover:bg-muted/50",
                )}
              >
                <PersonAvatar name={email.senderName ?? "?"} src={email.senderAvatarUrl} size="sm" />
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
                  <span className="mt-0.5 block truncate text-[11px] font-medium">{email.subject}</span>
                  <span className="block truncate text-[10px] text-ink-faint">{email.preview}</span>
                </span>
              </button>
            ))
          )}
        </div>

        <div className={cn("flex min-w-0 flex-col", !active && "hidden md:flex")}>
          {!active ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
              <MailOpen className="size-6 text-ink-faint" />
              <p className="text-xs text-ink-soft">Pick a thread from the left.</p>
            </div>
          ) : detail.isLoading ? (
            <div className="space-y-3 p-6"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-40 rounded-xl" /></div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
                <div className="min-w-0">
                  <h2 className="truncate font-display text-base font-semibold">{active.subject}</h2>
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
                  <p className="text-xs text-ink-soft">This message couldn&apos;t be opened — try again.</p>
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

function emailEmailsTotal(rows: { id: string }[]) {
  return rows.length;
}
