"use client";

import { collectionLabel } from "@/lib/collection-label";

import { useId as useFormFieldId } from "react";



import { FormSection } from "@/components/shared/form-section";

import { FormDialogContent } from "@/components/shared/form-dialog";

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
import { PageTour, type TourStep } from "@/components/tours/page-tour";
import { useCurrentProfile } from "@/hooks/use-profile";
import { StatCard, Tag } from "@/components/paper/stat";
import { EmptyState, PersonAvatar } from "@/components/paper/primitives";
import { StaggerGroup, StaggerItem } from "@/components/paper/motion/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
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

const SEGMENTS_TOUR_STEPS: TourStep[] = [
  { target: ".segments-tour-heading", title: "Explore live groups", description: "Segments previews useful groups from the records your account can read. This tour explains the cards and their links. It does not create a list, change records or send messages." },
  { target: ".segments-tour-preview", title: "Understand the preview", description: "These cards are live summaries, not saved segments. Their rules cannot be edited here. Opening a linked page does not automatically apply the rule shown on a card; use that page's own filters." },
  { target: ".segments-tour-summary", title: "Read the overview", description: "The summary shows recent joiners, active and inactive members, and visitors in follow-up. Counts follow your account's access. A source your role cannot read contributes zero here, so zero does not always mean no matching records." },
  { target: ".segments-tour-recent", title: "Find recent joiners", description: "New this month counts members whose joined date is on or after the first of this month, among the 100 most recent members returned. It can be a partial count for larger registers. Open the directory takes you to the member register." },
  { target: ".segments-tour-active", title: "Review active members", description: "The active roll counts members with active status. Browse the roll opens the directory; choose its status filter there to view active members." },
  { target: ".segments-tour-inactive", title: "Understand the quiet list", description: "This card counts members with inactive status. Open pastoral notes leads to the care workspace, where your available records and actions depend on your permissions." },
  { target: ".segments-tour-visitors", title: "Welcome visitors", description: "Guests to welcome shows the visitor summary's in-follow-up count. Open the board takes you to visitor follow-up, where you can review the stages and available actions after this tour." },
  { target: ".segments-tour-risk", title: "Open the care radar", description: "This number is the total returned by the risk-score list, not a count filtered to a particular care level. Open the risk radar to inspect scores and apply the filters available there." },
  { target: ".segments-tour-giving", title: "Read the giving count", description: "Giving this year counts gifts since January 1. It counts transactions, not unique donors or households. Open giving analysis leads to the analytics page; check its date range before using its figures." },
  { target: ".segments-tour-destinations", title: "Use the working filters", description: "These shortcuts lead to member filters, visitor follow-up, care filters and the broadcast audience builder. Each destination has its own permissions. Following a link does not save a segment or send a broadcast." },
  { target: ".segments-tour-new", title: "Describe a possible segment", description: "After the tour, New segment opens a name and one rule with a field, operator and value. Describe it closes the dialog and shows a notice. It does not run the rule, create a saved list or change the cards. You can close the dialog without submitting." },
  { target: ".segments-tour-empty", title: "When no cards are available", description: "Cards appear only for member, visitor, care or giving sources your account can read. If none are available, this message explains the access limit. Describing a segment does not grant access to those sources." },
];

/**
 * Segments — Preview track.
 * No saved-segment API exists yet, so every card here is a live, permission-gated
 * query over real surfaces (members roll, visitor follow-up, care radar, giving
 * analytics). The create dialog explains the contract honestly and links through
 * to the working filters instead of faking persistence.
 */
export default function SegmentsPage() {
  const { can, ready } = usePermissions();
  const { data: profile } = useCurrentProfile();
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
        className="segments-tour-heading"
        eyebrow="People · Segments"
        title="Lists that keep themselves fresh."
        description="Explore live summaries for membership, visitor follow-up, care and giving."
        actions={
          <>
            <PageTour page="Segments" account={profile ? `${profile.churchId}:${profile.profileId}` : undefined} ready={ready && !dialogOpen} steps={SEGMENTS_TOUR_STEPS} />
            <Tag tone="gold" dot>Preview</Tag>
            <Button className="segments-tour-new h-9 gap-1.5 rounded-full text-sm" onClick={() => setDialogOpen(true)}>
              <Plus className="size-3.5" /> New segment
            </Button>
          </>
        }
      />

      <div className="segments-tour-preview flex items-start gap-2.5 rounded-2xl border border-dashed border-gold/50 bg-gold-soft/30 px-4 py-3 text-sm leading-relaxed text-ink-soft">
        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-gold" />
        <span>
          These cards show live summaries from the records you can access. Saved segments are not available yet.
          Card links open the related pages; apply filters there to explore a group. New segment lets you describe
          a rule, but does not run it or save a list.
        </span>
      </div>

      {!anyRail ? (
        <div className="segments-tour-empty">
          <EmptyState
            icon={<Users />}
            title="Segments read the surfaces you can reach"
            description="Your role holds none of the member, visitor, care or giving reads. The directory stays closed to lists too."
          />
        </div>
      ) : (
        <>
          <div className="segments-tour-summary grid grid-cols-2 gap-3 lg:grid-cols-4">
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
                  tourTarget="recent"
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
                  tourTarget="active"
                  title="The active roll"
                  blurb="Members whose membership status is active."
                  rules={["Status", "is", "Active"]}
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
                  tourTarget="inactive"
                  title="Inactive members"
                  blurb="Inactive members who may need a follow-up."
                  rules={["Status", "is", "Inactive"]}
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
                  tourTarget="visitors"
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
                  tourTarget="risk"
                  title="On the radar"
                  blurb="People returned by the care risk-score register. Open the radar to review their levels."
                  rules={["Care scores", "in", "register"]}
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
                  tourTarget="giving"
                  title="Giving this year"
                  blurb={`Gifts recorded since January: ${giving.data ? `${number(giving.data.count)} ${collectionLabel(giving.data.count, "gifts")} counted` : "the ledger is waiting"}.`}
                  rules={["Gift date", "after", "Jan 1"]}
                  count={giving.data?.count ?? 0}
                  href="/insights/analytics/giving"
                  cta="Open giving analysis"
                />
              </StaggerItem>
            ) : null}
          </StaggerGroup>

          <div className="segments-tour-destinations paper-card rounded-2xl p-5">
            <p className="rule-label mb-2">Where rules actually live today</p>
            <div className="flex flex-wrap gap-2 text-sm">
              <Link href="/people/members" className="rounded-full border border-line bg-card px-3 py-1.5 hover:border-brand/40">Members status &amp; branch filters</Link>
              <Link href="/people/visitors" className="rounded-full border border-line bg-card px-3 py-1.5 hover:border-brand/40">Visitor follow-up chips</Link>
              <Link href="/people/pastoral/risk" className="rounded-full border border-line bg-card px-3 py-1.5 hover:border-brand/40">Care level filters</Link>
              <Link href="/connect/broadcasts" className="rounded-full border border-line bg-card px-3 py-1.5 hover:border-brand/40">Broadcast audience builder</Link>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink-faint">
              The broadcast audience builder supports targeting for an individual broadcast.
              <Flower2 className="mx-1 inline size-3" />These shortcuts do not save a reusable segment.
            </p>
          </div>
        </>
      )}

      <NewSegmentDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

function SegmentCard({
  tourTarget,
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
  tourTarget: string;
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
    <div className={`segments-tour-${tourTarget} paper-card flex h-full flex-col rounded-2xl p-5`}>
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
  const formFieldId = useFormFieldId();

  const [name, setName] = React.useState("");
  const [field, setField] = React.useState<(typeof RULE_FIELDS)[number]>("Status");
  const [op, setOp] = React.useState<(typeof RULE_OPS)[number]>("is");
  const [value, setValue] = React.useState("active");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent className="rounded-2xl border-line bg-card">
        <DialogHeader>
          <DialogTitle className="font-display">Describe a segment</DialogTitle>
          <DialogDescription className="text-sm">
            Describe one rule as a sentence. This preview does not run the rule or save a list.
            Use the filters on the related pages to explore the records.
          </DialogDescription>
        </DialogHeader>
        <FormSection title="Details">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`${formFieldId}-field-1`} className="text-sm">Name</Label>
              <Input id={`${formFieldId}-field-1`} value={name} onChange={(e) => setName(e.target.value)} placeholder="Night-shift workers" className="h-10 rounded-lg border-line bg-background text-sm shadow-none" />
            </div>
            <div className="space-y-1.5">
              <Label id={`${formFieldId}-field-2`} className="text-sm">First rule</Label>
              <div role="group" aria-labelledby={`${formFieldId}-field-2`} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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
                    ? `“${name.trim()}” is described only. No rule was run or list saved. Explore records using the filters on the related pages.`
                    : "No rule was run or list saved. Explore records using the filters on the related pages.",
                );
              }}
            >
              <Users className="size-4" /> Describe it
            </Button>
          </div>
        </FormSection>
      </FormDialogContent>
    </Dialog>
  );
}
