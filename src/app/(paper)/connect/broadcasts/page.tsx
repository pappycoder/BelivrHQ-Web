"use client";

import { CommunicationRegisterControls, useCommunicationRegister } from "@/components/communication/register-controls";
import { ListTable } from "@/components/shared/list-table";
import { BotProtection } from "@/components/shared/bot-protection";
import { useBotProtectionReady } from "@/hooks/use-bot-protection";

import * as React from "react";
import Link from "next/link";
import {
  Ban,
  CalendarClock,
  Megaphone,
  Plus,
  Send,
} from "lucide-react";
import { getToastErrorMessage, toast } from "@/lib/toast";
import { PageHeader } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import { EmptyState, ListPaginationFooter, ManageHeading, RowActions } from "@/components/paper/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePermissions } from "@/hooks/use-permissions";
import { useCurrentProfile } from "@/hooks/use-profile";
import { useBranchesList } from "@/hooks/use-branches";
import {
  useBroadcastsList,
  useCreateBroadcast,
  useCancelBroadcast,
  BROADCAST_CHANNELS,
  BROADCAST_CHANNEL_LABELS,
  BROADCAST_STATUS_LABELS,
  MEMBER_STATUS_LABELS,
  type Broadcast,
  type BroadcastChannel,
  type BroadcastStatus,
  type ListBroadcastsParams,
} from "@/hooks/use-broadcasts";
import { useTemplatesList, TEMPLATE_CHANNEL_LABELS, type TemplateChannel } from "@/hooks/use-templates";

const STATUS_TONES: Record<string, "moss" | "gold" | "rose" | "sky" | "neutral"> = {
  sent: "moss",
  scheduled: "sky",
  sending: "gold",
  draft: "neutral",
  failed: "rose",
  cancelled: "neutral",
  pending: "gold",
};

function stamp(value?: string) {
  if (!value) return "Not available";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

interface Draft {
  name: string;
  channel: BroadcastChannel;
  templateId: string;
  audienceStatus: string;
  audienceBranch: string;
  audienceGender: string;
  scheduledAt: string;
}

const BLANK: Draft = { name: "", channel: "whatsapp", templateId: "", audienceStatus: "", audienceBranch: "", audienceGender: "", scheduledAt: "" };

export default function BroadcastsPage() {
  const { can, ready } = usePermissions();
  const { data: profile } = useCurrentProfile();
  const isHq = !!profile?.isAdminHq;
  const canCreate = ready && can("broadcasts", "create");
  const canUpdate = ready && can("broadcasts", "update");

  const controls = useCommunicationRegister("createdAt", false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Draft>(BLANK);

  const broadcasts = useBroadcastsList({
    page: controls.page, limit: controls.perPage,
    search: controls.search || undefined,
    channel: controls.channel === "all" ? undefined : controls.channel as BroadcastChannel,
    status: controls.status === "all" ? undefined : controls.status as BroadcastStatus,
    branchId: controls.branch === "all" ? undefined : controls.branch,
    sortBy: controls.sort as ListBroadcastsParams["sortBy"], sortOrder: controls.ascending ? "asc" : "desc",
  });
  const publishedTemplates = useTemplatesList({ status: "published", limit: 100 });
  const branches = useBranchesList({ limit: 100 }, { enabled: isHq });
  const createBroadcast = useCreateBroadcast();
  const captchaReady = useBotProtectionReady("/broadcasts");
  const cancel = useCancelBroadcast();

  const rows = broadcasts.data?.data ?? [];
  const filtered = rows;
  const total = broadcasts.data?.meta?.total ?? 0;
  const { page, perPage, setPage } = controls;
  React.useEffect(() => {
    if (broadcasts.data && page > Math.max(1, Math.ceil(total / perPage))) setPage(Math.max(1, Math.ceil(total / perPage)));
  }, [broadcasts.data, total, page, perPage, setPage]);

  const channelTemplates = (publishedTemplates.data?.data ?? []).filter(
    (t) => t.channel === (draft.channel as TemplateChannel),
  );

  const openForm = () => { setDraft(BLANK); setFormOpen(true); };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim() || !draft.templateId) { toast.error("A name and a published template, please."); return; }
    const audienceFilter: Record<string, string> = {};
    if (draft.audienceStatus) audienceFilter.status = draft.audienceStatus;
    if (isHq && draft.audienceBranch) audienceFilter.branchId = draft.audienceBranch;
    if (draft.audienceGender) audienceFilter.gender = draft.audienceGender;
    createBroadcast.mutate(
      {
        name: draft.name.trim(),
        templateId: draft.templateId,
        channel: draft.channel,
        audienceFilter: Object.keys(audienceFilter).length ? (audienceFilter as never) : undefined,
        scheduledAt: draft.scheduledAt ? new Date(draft.scheduledAt).toISOString() : undefined,
        ...(isHq && draft.audienceBranch ? { branchId: draft.audienceBranch } : {}),
      },
      {
        onSuccess: (b: Broadcast) => {
          toast(draft.scheduledAt ? `“${b.name}” scheduled for ${stamp(b.scheduledAt)}.` : `“${b.name}” is queued to ${b.totalRecipients} people.`);
          setFormOpen(false);
        },
        onError: (e) => toast.error(getToastErrorMessage(e, "Couldn't queue the broadcast.")),
      },
    );
  };

  const sent = rows.filter((b) => b.status === "sent");
  const reach = sent.reduce((sum, b) => sum + (b.totalRecipients ?? 0), 0);

  const actionsFor = (b: Broadcast, reveal = true) => (
    <RowActions
                      reveal={reveal}
                      actions={[
                        canUpdate && b.status === "scheduled" && {
                          label: "Cancel scheduled send", confirmation: { subject: `${b.templateName ?? "Scheduled broadcast"} · ${b.scheduledAt ?? b.createdAt}` },
                          icon: <Ban />,
                          tone: "danger",
                          bulk: { key: "cancel", label: "Cancel selected sends", destructive: true, run: () => cancel.mutateAsync(b.broadcastId) },
                          onSelect: () => cancel.mutateAsync(b.broadcastId, { onSuccess: () => toast("Scheduled send cancelled."), onError: () => toast.error("Couldn't cancel it.") }),
                        },
                      ]}
                    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Connect · Broadcasts"
        title="Say it once, well."
        description="Send to groups and review delivery receipts. Aim for no more than two broadcasts a week."
        actions={
          canCreate ? (
            <Button className="h-9 gap-1.5 rounded-full text-xs" onClick={openForm}>
              <Plus className="size-3.5" /> New broadcast
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Broadcasts" value={broadcasts.data?.meta?.total ?? rows.length} tone="brand" icon={<Megaphone className="size-4" />} />
        <StatCard label="Recipients on page" value={reach} tone="moss" deltaLabel="from sent sends" />
        <StatCard label="Scheduled on page" value={rows.filter((b) => b.status === "scheduled").length} tone="sky" icon={<CalendarClock className="size-4" />} />
        <StatCard label="Failed on page" value={rows.filter((b) => b.status === "failed").length} tone="gold" />
      </div>

      <CommunicationRegisterControls controls={controls} kind="Broadcasts"
        channels={BROADCAST_CHANNELS.map(value => ({ value, label: BROADCAST_CHANNEL_LABELS[value] }))}
        statuses={Object.entries(BROADCAST_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
        sorts={[{ value: "createdAt", label: "Date added" }, { value: "name", label: "Name" }, { value: "scheduledAt", label: "Scheduled date" }, { value: "sentAt", label: "Sent date" }, { value: "totalRecipients", label: "Recipients" }, { value: "channel", label: "Channel" }, { value: "status", label: "Status" }]}
        branches={isHq ? (branches.data?.data ?? []).map(b => ({ value: b.branchId, label: b.name })) : undefined}
      />

      {broadcasts.isError ? (
        <EmptyState title="Broadcasts could not be loaded" description="Try loading the register again." action={<Button variant="outline" onClick={() => void broadcasts.refetch()}>Retry</Button>} />
      ) : broadcasts.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Megaphone />}
          title="No broadcasts here"
          description="When the whole church needs to hear something once, this is where it starts."
        />
      ) : controls.view === "cards" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map(b => <article key={b.broadcastId} className="paper-card flex flex-col gap-4 rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-2"><Tag tone={b.channel === "whatsapp" ? "moss" : b.channel === "sms" ? "sky" : "gold"}>{BROADCAST_CHANNEL_LABELS[b.channel]}</Tag><Tag tone={STATUS_TONES[b.status] ?? "neutral"} dot>{BROADCAST_STATUS_LABELS[b.status]}</Tag></div>
            <div><h2 className="break-words font-display text-lg font-semibold">{b.name}</h2><p className="mt-1 text-xs text-ink-soft">{b.templateName}</p></div>
            <dl className="grid grid-cols-2 gap-3 text-xs"><div><dt className="text-ink-faint">Recipients</dt><dd className="mt-1 font-semibold num">{b.totalRecipients}</dd></div><div><dt className="text-ink-faint">{b.scheduledAt ? "Scheduled" : "Sent / added"}</dt><dd className="mt-1">{stamp(b.scheduledAt ?? b.sentAt ?? b.createdAt)}</dd></div></dl>
            <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3"><span className="text-xs text-ink-faint">{b.branchName ?? "All branches"}</span>{actionsFor(b, false)}</div>
          </article>)}
        </div>
      ) : (
        <div className="paper-card overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <ListTable className="min-w-[640px]" label="Broadcasts" tableId="connect-broadcasts-1" records={filtered ?? []} recordKey="broadcastId">
              <div className="rule-label grid grid-cols-[minmax(0,1.5fr)_1fr_1fr_0.8fr_1.1fr_1fr_auto] items-center gap-3 border-b border-line px-5 py-2.5">
                <span>Broadcast</span>
                <span>Template</span>
                <span>Channel</span>
                <span>Reached</span>
                <span>State</span>
                <span>When</span>
                <ManageHeading />
              </div>
              <div className="divide-y divide-line/70">
                {filtered.map((b) => (
                  <div key={b.broadcastId} className="group grid grid-cols-[minmax(0,1.5fr)_1fr_1fr_0.8fr_1.1fr_1fr_auto] items-center gap-3 px-5 py-3 text-xs">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{b.name}</span>
                      {b.branchName ? <span className="block text-[10px] text-ink-faint">{b.branchName}</span> : null}
                    </span>
                    <span className="truncate text-[11px] text-ink-soft">{b.templateName}</span>
                    <span><Tag tone={b.channel === "whatsapp" ? "moss" : b.channel === "sms" ? "sky" : "gold"}>{BROADCAST_CHANNEL_LABELS[b.channel]}</Tag></span>
                    <span className="num">{b.totalRecipients}</span>
                    <span><Tag tone={STATUS_TONES[b.status] ?? "neutral"} dot>{BROADCAST_STATUS_LABELS[b.status as keyof typeof BROADCAST_STATUS_LABELS] ?? b.status}</Tag></span>
                    <span className="num text-[11px] text-ink-faint">{b.scheduledAt ? `sched ${stamp(b.scheduledAt)}` : stamp(b.sentAt ?? b.createdAt)}</span>
                    {actionsFor(b)}
                  </div>
                ))}
              </div>
            </ListTable>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-2.5 text-[10px] text-ink-faint">
            <span>Recipients are computed when a scheduled send runs, with branch and audience rules honoured at the server.</span>
            <Button asChild variant="ghost" size="xs" className="rounded-full text-[10px] text-brand">
              <Link href="/connect/templates">Manage templates</Link>
            </Button>
          </div>
        </div>
      )}

      {!broadcasts.isError && <ListPaginationFooter page={controls.page} perPage={controls.perPage} total={total} onPageChange={controls.setPage} onPerPageChange={value => { controls.setPerPage(value); controls.setPage(1); }} perPageOptions={[12, 24, 48]} itemName="broadcasts" />}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="rounded-2xl border-line bg-card sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="font-display">Compose a broadcast</DialogTitle>
            <DialogDescription className="text-xs">
              A name, a published template, an audience, sent once, remembered kindly.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="November news" className="h-10 rounded-lg border-line bg-background text-sm shadow-none" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Channel</Label>
                <select value={draft.channel} onChange={(e) => setDraft((d) => ({ ...d, channel: e.target.value as BroadcastChannel, templateId: "" }))} className="h-10 w-full rounded-lg border border-line bg-background px-2 text-xs outline-none">
                  {BROADCAST_CHANNELS.map((c) => <option key={c} value={c}>{BROADCAST_CHANNEL_LABELS[c]}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Template ({TEMPLATE_CHANNEL_LABELS[draft.channel as TemplateChannel] ?? draft.channel} · published only)</Label>
              {channelTemplates.length ? (
                <select value={draft.templateId} onChange={(e) => setDraft((d) => ({ ...d, templateId: e.target.value }))} className="h-10 w-full rounded-lg border border-line bg-background px-2 text-xs outline-none">
                  <option value="">Choose a template…</option>
                  {channelTemplates.map((t) => <option key={t.templateId} value={t.templateId}>{t.name}</option>)}
                </select>
              ) : (
                <p className="rounded-lg border border-dashed border-line px-3 py-2.5 text-[11px] text-ink-faint">
                  No published {draft.channel} templates yet.{" "}
                  <Link href="/connect/templates" className="text-brand underline">publish one first</Link>.
                </p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Audience</Label>
                <select value={draft.audienceStatus} onChange={(e) => setDraft((d) => ({ ...d, audienceStatus: e.target.value }))} className="h-10 w-full rounded-lg border border-line bg-background px-2 text-xs outline-none">
                  <option value="">Everyone</option>
                  {Object.entries(MEMBER_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Branch</Label>
                <select disabled={!isHq} value={draft.audienceBranch} onChange={(e) => setDraft((d) => ({ ...d, audienceBranch: e.target.value }))} className="h-10 w-full rounded-lg border border-line bg-background px-2 text-xs outline-none disabled:opacity-50">
                  <option value="">All branches</option>
                  {(branches.data?.data ?? []).map((b) => <option key={b.branchId} value={b.branchId}>{b.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Gender</Label>
                <select value={draft.audienceGender} onChange={(e) => setDraft((d) => ({ ...d, audienceGender: e.target.value }))} className="h-10 w-full rounded-lg border border-line bg-background px-2 text-xs outline-none">
                  <option value="">Any</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Send later? (optional)</Label>
              <Input picker="wheel" type="datetime-local" value={draft.scheduledAt} onChange={(e) => setDraft((d) => ({ ...d, scheduledAt: e.target.value }))} className="h-10 rounded-lg border-line bg-background text-sm shadow-none" />
            </div>
            <BotProtection path="/broadcasts" authenticated />
            <Button type="submit" disabled={createBroadcast.isPending || !captchaReady} className="h-10 w-full gap-2 rounded-lg text-sm">
              <Send className="size-4" /> {createBroadcast.isPending ? "Queueing…" : draft.scheduledAt ? "Schedule broadcast" : "Send now"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
