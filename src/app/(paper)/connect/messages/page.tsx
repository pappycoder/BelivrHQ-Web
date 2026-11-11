"use client";

import { ValidatedForm } from "@/components/ui/validated-form";

import * as React from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  MessageCircle,
  Smartphone,
  Send,
} from "lucide-react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { PageHeader } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import {
  EmptyState,
  FilterChip,
  SearchField,
} from "@/components/paper/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useMessagesList,
  useCommunicationAnalytics,
  useSendMessage,
  MESSAGE_CHANNELS,
  MESSAGE_CHANNEL_LABELS,
  MESSAGE_STATUS_LABELS,
  type MessageChannel,
  type MessageDirection,
} from "@/hooks/use-communication";

const CHANNEL_TONES: Record<MessageChannel, "moss" | "sky" | "gold"> = {
  whatsapp: "moss",
  sms: "sky",
  email: "gold",
};

function stamp(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function MessagesPage() {
  const { can, ready } = usePermissions();
  // Outbound sends ride the `whatsapp` resource (SMS + WhatsApp share it);
  // a "messages" resource was never in the permission catalog.
  const canSend = ready && can("whatsapp", "create");

  const [direction, setDirection] = React.useState<MessageDirection | "all">("all");
  const [phone, setPhone] = React.useState("");
  const [sendOpen, setSendOpen] = React.useState(false);
  const [draft, setDraft] = React.useState({ to: "", text: "" });

  const messages = useMessagesList({ limit: 50, direction: direction === "all" ? undefined : direction, phone: phone || undefined });
  const analytics = useCommunicationAnalytics();
  const send = useSendMessage();

  const rows = React.useMemo(() => messages.data?.data ?? [], [messages.data]);
  const channels = analytics.data?.channels ?? [];
  const failed = channels.reduce((sum, c) => sum + c.failed, 0);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.to.trim() || !draft.text.trim()) { toast.error("A number and a message."); return; }
    send.mutate(
      { to: draft.to.trim(), type: "text", text: draft.text.trim() },
      {
        onSuccess: () => { toast("Message sent."); setDraft({ to: "", text: "" }); setSendOpen(false); },
        onError: (e) => toast.error(getToastErrorMessage(e, "The message couldn't be sent.")),
      },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Connect · Messages"
        title="SMS and WhatsApp, in one stream."
        description="Every conversation the church has had by text, with inbound questions answered within a day, outbound with purpose."
        actions={
          canSend ? (
            <Button className="h-9 gap-1.5 rounded-full text-sm" onClick={() => setSendOpen(true)}>
              <Send className="size-3.5" /> New message
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Messages this view" value={messages.data?.total ?? rows.length} tone="brand" icon={<MessageCircle className="size-4" />} />
        <StatCard label="Outbound today" value={rows.filter((m) => m.direction === "outbound").length} tone="moss" deltaLabel="this page" />
        <StatCard label="Inbound waiting" value={rows.filter((m) => m.direction === "inbound").length} tone="gold" deltaLabel="worth a reply" />
        <StatCard label="Delivery failures" value={failed} tone={failed ? "rose" : "sky"} deltaLabel="recent sends" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchField value={phone} onChange={setPhone} placeholder="Search by phone number…" className="w-full max-w-[240px]" />
        <FilterChip active={direction === "all"} onClick={() => setDirection("all")}>Both ways</FilterChip>
        <FilterChip active={direction === "inbound"} onClick={() => setDirection("inbound")}>Inbound</FilterChip>
        <FilterChip active={direction === "outbound"} onClick={() => setDirection("outbound")}>Outbound</FilterChip>
      </div>

      {channels.length ? (
        <div className="paper-card flex flex-wrap items-center gap-x-8 gap-y-2 rounded-2xl px-5 py-3">
          {channels.map((c) => (
            <span key={c.channel} className="flex items-center gap-2 text-sm text-ink-soft">
              <Tag tone={CHANNEL_TONES[c.channel as MessageChannel] ?? "neutral"}>{MESSAGE_CHANNEL_LABELS[c.channel as MessageChannel] ?? c.channel}</Tag>
              <span className="num">{c.sent}</span> sent ·
              <span className="num text-moss">{c.delivered}</span> delivered ·
              {c.failed ? <span className="num text-rose">{c.failed} failed</span> : <span className="text-ink-faint">clean</span>}
            </span>
          ))}
        </div>
      ) : null}

      {messages.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Smartphone />}
          title="No messages here"
          description="Texts sent from the phone bridges land in this stream."
        />
      ) : (
        <div className="paper-card divide-y divide-line/70 overflow-hidden rounded-2xl">
          {rows.map((message) => (
            <div key={message.messageId} className="flex items-center gap-3 px-5 py-3">
              <span className={
                message.direction === "outbound"
                  ? "grid size-8 shrink-0 place-items-center rounded-lg bg-moss-soft text-moss"
                  : "grid size-8 shrink-0 place-items-center rounded-lg bg-gold-soft text-gold"
              }
              >
                {message.direction === "outbound" ? <ArrowUpRight className="size-3.5" /> : <ArrowDownLeft className="size-3.5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2">
                  <span className="num truncate text-sm font-medium">{message.phone}</span>
                  <Tag tone={CHANNEL_TONES[message.channel]}>{MESSAGE_CHANNEL_LABELS[message.channel]}</Tag>
                </p>
                {message.content ? (
                  <p className="mt-0.5 truncate text-sm text-ink-soft">{message.content}</p>
                ) : null}
              </div>
              <Tag tone={message.status === "failed" ? "rose" : "neutral"}>{MESSAGE_STATUS_LABELS[message.status] ?? message.status}</Tag>
              <span className="num hidden w-32 shrink-0 text-right text-xs text-ink-faint sm:block">{stamp(message.createdAt)}</span>
              {canSend && message.direction === "inbound" ? (
                <button
                  type="button"
                  onClick={() => { setDraft({ to: message.phone, text: "" }); setSendOpen(true); }}
                  className="shrink-0 rounded-full px-2 py-1 text-xs text-brand opacity-0 transition-opacity hover:underline md:opacity-100"
                >
                  Reply
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="rounded-2xl border-line bg-card">
          <DialogHeader>
            <DialogTitle className="font-display">Send a text</DialogTitle>
            <DialogDescription className="text-sm">
              WhatsApp is tried first, then SMS falls back, using one number, one message.
            </DialogDescription>
          </DialogHeader>
          <ValidatedForm onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label required className="text-sm">To (phone)</Label>
              <Input required value={draft.to} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} placeholder="+1 415 555 0100" className="h-10 rounded-lg border-line bg-background text-sm shadow-none" />
            </div>
            <div className="space-y-1.5">
              <Label required className="text-sm">Message</Label>
              <Textarea required rows={4} value={draft.text} onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))} placeholder="Warm, short, and worth a reply…" className="resize-none rounded-lg border-line bg-background text-sm shadow-none" />
            </div>
            <Button type="submit" disabled={send.isPending} className="h-10 w-full gap-2 rounded-lg text-sm">
              <Send className="size-4" /> {send.isPending ? "Sending…" : "Send message"}
            </Button>
            <p className="text-center text-xs text-ink-faint">
              From addresses are managed on {MESSAGE_CHANNELS.join(", ")} in Settings → Integrations.
            </p>
          </ValidatedForm>
        </DialogContent>
      </Dialog>
    </div>
  );
}
