"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Flower2,
  HeartHandshake,
  Plus,
  Sparkles,
  UserRoundSearch,
  Users,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { PageHeader } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import { EmptyState, PersonAvatar } from "@/components/paper/primitives";
import { StaggerGroup, StaggerItem } from "@/components/paper/motion/primitives";
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
import { useMembersList } from "@/hooks/use-members";
import { useVisitorsStats } from "@/hooks/use-visitors";
import { useRiskScores } from "@/hooks/use-pastoral";
import { useAnalyticsGiving } from "@/hooks/use-analytics";
import { number } from "@/lib/paper/format";

/**
 * Segments — Preview track.
 * No saved-segment API exists yet, so every card here is a live, permission-gated
 * query over real surfaces (members roll, visitor follow-up, care radar, giving
 * analytics). The create dialog explains the contract honestly and links through
 * to the working filters instead of faking persistence.
 */
export default function SegmentsPage() {
  const { can, ready } = usePermissions();
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const canMembers = ready && can("members:all", "read");
  const canVisitors = ready && can("visitors:list", "read");
  const canRisk = ready && can("pastoral:risk-scores", "read");
  const canGiving = ready && can("analytics:giving", "read");

  const startOfMonth = `${new Date().toISOString().slice(0, 7)}-01`;

  const recent = useMembersList(
    { limit: 100, sortBy: "member_since", sortOrder: "desc" },
    { enabled: canMembers },
  );
  const active = useMembersList({ status: "active", limit: 1 }, { enabled: canMembers });
  const quiet = useMembersList({ status: "inactive", limit: 1 }, { enabled: canMembers });
  const visitors = useVisitorsStats();
  const risk = useRiskScores({ limit: 1 });
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const giving = useAnalyticsGiving({ startDate: yearStart });

  const memberPage = recent.data?.data ?? [];
  const freshFaces = memberPage.filter((m) => m.memberSince >= startOfMonth);

  if (!ready) {
    return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>;
  }

  const anyRail = canMembers || canVisitors || canRisk || canGiving;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People · Segments"
        title="Lists that keep themselves fresh."
        description="Saved groups built from simple rules for messaging, care, and reports."
        actions={
          <>
            <Tag tone="gold" dot>Preview</Tag>
            <Button className="h-9 gap-1.5 rounded-full text-sm" onClick={() => setDialogOpen(true)}>
              <Plus className="size-3.5" /> New segment
            </Button>
          </>
        }
      />

      <div className="flex items-start gap-2.5 rounded-2xl border border-dashed border-gold/50 bg-gold-soft/30 px-4 py-3 text-sm leading-relaxed text-ink-soft">
        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-gold" />
        <span>
          Every card below runs a live query the moment you open this page. Nothing is stored. Saving a segment as a
          reusable list needs a backend contract (name + rules over these fields); until it exists, treat these as
          the six questions the register can already answer today.
        </span>
      </div>

      {!anyRail ? (
        <EmptyState
          icon={<Users />}
          title="Segments read the surfaces you can reach"
          description="Your role holds none of the member, visitor, care or giving reads. The directory stays closed to lists too."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Joined this month" value={canMembers ? freshFaces.length : 0} tone="brand" icon={<UserRoundSearch className="size-4" />} deltaLabel={canMembers && freshFaces.length >= 100 ? "page-capped" : "live count"} />
            <StatCard label="Active roll" value={canMembers ? active.data?.meta?.total ?? 0 : 0} tone="moss" />
            <StatCard label="On the quiet list" value={canMembers ? quiet.data?.meta?.total ?? 0 : 0} tone="sky" deltaLabel="inactive status" />
            <StatCard label="Guests in follow-up" value={canVisitors ? visitors.data?.inFollowUp ?? 0 : 0} tone="gold" icon={<HeartHandshake className="size-4" />} />
          </div>

          <StaggerGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {canMembers ? (
              <StaggerItem>
                <SegmentCard
                  tone="brand"
                  title="New this month"
                  blurb="Everyone who joined recently and is still settling in. A hello list, not a report."
                  rules={["Joined", "after", "1st of this month"]}
                  count={freshFaces.length}
                  faces={freshFaces.slice(0, 5).map((m) => ({ name: `${m.firstName} ${m.lastName}`, photoUrl: m.photoUrl }))}
                  href="/people/members"
                  cta="Open the directory"
                />
              </StaggerItem>
            ) : null}
            {canMembers ? (
              <StaggerItem>
                <SegmentCard
                  tone="moss"
                  title="The active roll"
                  blurb="Members in good standing for your membership reports."
                  rules={["Status", "is", "active"]}
                  count={active.data?.meta?.total ?? 0}
                  href="/people/members"
                  cta="Browse the roll"
                  loading={active.isLoading}
                />
              </StaggerItem>
            ) : null}
            {canMembers ? (
              <StaggerItem>
                <SegmentCard
                  tone="sky"
                  title="Quiet six-plus"
                  blurb="Inactive members who may need a follow-up."
                  rules={["Status", "is", "inactive"]}
                  count={quiet.data?.meta?.total ?? 0}
                  href="/people/pastoral"
                  cta="Open pastoral notes"
                  loading={quiet.isLoading}
                />
              </StaggerItem>
            ) : null}
            {canVisitors ? (
              <StaggerItem>
                <SegmentCard
                  tone="gold"
                  title="Guests to welcome"
                  blurb="Current visitors with follow-up in progress and a recorded first-visit date."
                  rules={["Follow-up", "is open"]}
                  count={visitors.data?.inFollowUp ?? 0}
                  href="/people/visitors/follow-up"
                  cta="Open the board"
                />
              </StaggerItem>
            ) : null}
            {canRisk ? (
              <StaggerItem>
                <SegmentCard
                  tone="rose"
                  title="On the radar"
                  blurb="People whose engagement scores fall below the active threshold."
                  rules={["Engagement", "falls", "weekly"]}
                  count={risk.data?.meta?.total ?? 0}
                  href="/people/pastoral/risk"
                  cta="Open the risk radar"
                  loading={risk.isLoading}
                />
              </StaggerItem>
            ) : null}
            {canGiving ? (
              <StaggerItem>
                <SegmentCard
                  tone="brand"
                  title="Giving this year"
                  blurb={`Households that gave since January: ${giving.data ? `${number(giving.data.count)} gifts counted` : "the ledger is waiting"}.`}
                  rules={["Gift date", "after", "Jan 1"]}
                  count={giving.data?.count ?? 0}
                  href="/insights/analytics/giving"
                  cta="Open giving analysis"
                />
              </StaggerItem>
            ) : null}
          </StaggerGroup>

          <div className="paper-card rounded-2xl p-5">
            <p className="rule-label mb-2">Where rules actually live today</p>
            <div className="flex flex-wrap gap-2 text-sm">
              <Link href="/people/members" className="rounded-full border border-line bg-card px-3 py-1.5 hover:border-brand/40">Members status &amp; branch filters</Link>
              <Link href="/people/visitors" className="rounded-full border border-line bg-card px-3 py-1.5 hover:border-brand/40">Visitor follow-up chips</Link>
              <Link href="/people/pastoral/risk" className="rounded-full border border-line bg-card px-3 py-1.5 hover:border-brand/40">Care level filters</Link>
              <Link href="/connect/broadcasts" className="rounded-full border border-line bg-card px-3 py-1.5 hover:border-brand/40">Broadcast audience builder</Link>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink-faint">
              The audience builder on a broadcast already does rule-based targeting ad hoc. Saved segments make
              those rules reusable. <Flower2 className="mr-1 inline size-3" />Until then, nothing here can go stale.
            </p>
          </div>
        </>
      )}

      <NewSegmentDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

function SegmentCard({
  tone,
  title,
  blurb,
  rules,
  count,
  faces,
  href,
  cta,
  loading,
}: {
  tone: "brand" | "moss" | "gold" | "sky" | "rose";
  title: string;
  blurb: string;
  rules: string[];
  count: number;
  faces?: { name: string; photoUrl?: string }[];
  href: string;
  cta: string;
  loading?: boolean;
}) {
  return (
    <div className="paper-card flex h-full flex-col rounded-2xl p-5">
      <div className="flex items-start justify-between gap-2">
        <Tag tone={tone} dot>{title}</Tag>
        <span className="num font-display text-2xl font-semibold leading-none">
          {loading ? <Skeleton className="h-7 w-10" /> : number(count)}
        </span>
      </div>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">{blurb}</p>
      <p className="mt-3 flex flex-wrap items-center gap-1 text-xs text-ink-faint">
        <span className="rounded bg-muted px-1.5 py-0.5 font-medium uppercase tracking-wider">{rules[0]}</span>
        <span>{rules[1]}</span>
        <span className="rounded bg-muted px-1.5 py-0.5">{rules[2] ?? rules[1] ?? ""}</span>
        <span className="ml-auto">live · not stored</span>
      </p>
      <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-3">
        {faces?.length ? (
          <span className="flex -space-x-2">
            {faces.map((face) => <PersonAvatar key={face.name} name={face.name} src={face.photoUrl} size="xs" className="ring-2 ring-card" />)}
          </span>
        ) : <span />}
        <Link href={href} className="flex items-center gap-1 text-sm text-brand hover:underline">
          {cta} <ArrowRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}

const RULE_FIELDS = ["Status", "Branch", "Gender", "Joined", "Last seen", "Giving"] as const;
const RULE_OPS = ["is", "is not", "after", "before", "greater than"] as const;

function NewSegmentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = React.useState("");
  const [field, setField] = React.useState<(typeof RULE_FIELDS)[number]>("Status");
  const [op, setOp] = React.useState<(typeof RULE_OPS)[number]>("is");
  const [value, setValue] = React.useState("active");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border-line bg-card">
        <DialogHeader>
          <DialogTitle className="font-display">Describe a segment</DialogTitle>
          <DialogDescription className="text-sm">
            Rules read like sentences. This preview runs them live and hands you the working filters today; saved
            lists arrive with the segments endpoint.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-sm">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Night-shift workers" className="h-10 rounded-lg border-line bg-background text-sm shadow-none" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">First rule</Label>
            <div className="grid grid-cols-3 gap-2">
              <select value={field} onChange={(e) => setField(e.target.value as typeof field)} className="h-10 rounded-lg border border-line bg-background px-2 text-sm outline-none" aria-label="Rule field">
                {RULE_FIELDS.map((f) => <option key={f}>{f}</option>)}
              </select>
              <select value={op} onChange={(e) => setOp(e.target.value as typeof op)} className="h-10 rounded-lg border border-line bg-background px-2 text-sm outline-none" aria-label="Operator">
                {RULE_OPS.map((o) => <option key={o}>{o}</option>)}
              </select>
              <Input value={value} onChange={(e) => setValue(e.target.value)} className="h-10 rounded-lg border-line bg-background text-sm shadow-none" aria-label="Rule value" />
            </div>
          </div>
          <div className="rounded-xl border border-dashed border-line px-3.5 py-2.5 text-sm text-ink-soft">
            “<span className="font-medium text-ink">{name.trim() || "This segment"}</span>” = members where {field.toLowerCase()} {op} <span className="font-mono text-xs text-brand">{value || "…"}</span>
          </div>
          <Button
            className="h-10 w-full gap-2 rounded-lg text-sm"
            onClick={() => {
              onOpenChange(false);
              toast(
                name.trim()
                  ? `“${name.trim()}” is described, not stored. Saved segments land with the lists API. Run it today from the People filters.`
                  : "Saved segments need the lists contract. The same rules run today on each surface.",
              );
            }}
          >
            <Users className="size-4" /> Describe it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
