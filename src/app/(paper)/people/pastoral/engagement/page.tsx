"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Gauge, RefreshCw, Search, TrendingUp } from "lucide-react";
import { toast } from "@/lib/toast";
import { PageHeader } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import {
  EmptyState,
  FilterChip,
  ListPaginationFooter,
  PersonAvatar,
  SearchField,
} from "@/components/paper/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MemberScoringDialog } from "@/components/pastoral/member-scoring-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useEngagementScores,
  useEngagementDistribution,
  useRecalculateScores,
  ENGAGEMENT_BUCKET_LABELS,
  type EngagementBucket,
  type EngagementScore,
} from "@/hooks/use-pastoral";
import { cn } from "@/lib/utils";

const BUCKETS: { value: EngagementBucket | "all"; label: string; tone: "moss" | "sky" | "gold" | "rose" }[] = [
  { value: "all", label: "Everyone", tone: "sky" },
  { value: "highly_engaged", label: "Highly engaged", tone: "moss" },
  { value: "moderately_engaged", label: "Moderately", tone: "sky" },
  { value: "low_engagement", label: "Low", tone: "gold" },
  { value: "disengaged", label: "Disengaged", tone: "rose" },
];

export default function EngagementPage() {
  const { can, ready } = usePermissions();
  const canRecalculate = ready && can("pastoral", "update");

  const [bucket, setBucket] = React.useState<EngagementBucket | "all">("all");
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(15);
  const [scoring, setScoring] = React.useState<EngagementScore | null>(null);

  const distribution = useEngagementDistribution();
  const scores = useEngagementScores({
    page,
    limit: perPage,
    search: query || undefined,
    bucket: bucket === "all" ? undefined : bucket,
    sortBy: "score",
    sortOrder: "asc",
  });
  const recalculate = useRecalculateScores();

  const rows = scores.data?.data ?? [];
  const total = scores.data?.meta?.total ?? 0;
  const dist = distribution.data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/people/pastoral" className="flex items-center gap-1.5 hover:text-ink">
            <ArrowLeft className="size-3" /> People · Pastoral care
          </Link>
        }
        title="Engagement."
        description="See who the church is currently reaching. Low numbers are invitations, not reports."
        actions={
          canRecalculate ? (
            <Button
              variant="outline"
              className="h-9 gap-1.5 rounded-full border-line bg-card text-sm"
              disabled={recalculate.isPending}
              onClick={() =>
                recalculate.mutate(undefined, {
                  onSuccess: () => toast("Engagement scores refreshed."),
                })
              }
            >
              <RefreshCw className={cn("size-3.5", recalculate.isPending && "animate-spin")} /> Recalculate
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Highly engaged" value={dist?.highly_engaged ?? 0} tone="moss" icon={<TrendingUp className="size-4" />} />
        <StatCard label="Moderately" value={dist?.moderately_engaged ?? 0} tone="sky" />
        <StatCard label="Low engagement" value={dist?.low_engagement ?? 0} tone="gold" />
        <StatCard label="Disengaged" value={dist?.disengaged ?? 0} tone="rose" icon={<Gauge className="size-4" />} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchField value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="Search by name…" className="w-full max-w-xs" />
        {BUCKETS.map((item) => (
          <FilterChip key={item.value} active={bucket === item.value} onClick={() => { setBucket(item.value); setPage(1); }}>
            {item.label}
          </FilterChip>
        ))}
      </div>

      {scores.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={<Search />} title="Nobody in this view" description="Try another bucket or clear the search." />
      ) : (
        <div className="paper-card overflow-hidden rounded-2xl">
          <div className="divide-y divide-line/70">
            {rows.map((row) => {
              const name = `${row.memberFirstName} ${row.memberLastName}`;
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setScoring(row)}
                  className="flex w-full items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-muted/40"
                >
                  <PersonAvatar name={name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{name}</p>
                    <p className="truncate text-xs text-ink-faint">{row.memberEmail ?? "Not available"}</p>
                  </div>
                  <div className="w-40 shrink-0">
                    <div className="flex justify-between text-xs text-ink-soft">
                      <span className="num font-semibold">{Math.round(row.score)}</span>
                      <span className="text-ink-faint">/ 100</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          row.score >= 70 ? "bg-moss" : row.score >= 45 ? "bg-sky" : row.score >= 25 ? "bg-gold" : "bg-rose",
                        )}
                        style={{ width: `${Math.min(100, row.score)}%` }}
                      />
                    </div>
                  </div>
                  <span className="hidden w-32 shrink-0 text-right text-xs text-ink-faint sm:block">
                    calculated {new Date(row.calculatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                </button>
              );
            })}
          </div>
          <ListPaginationFooter
            page={page}
            perPage={perPage}
            total={total}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
            itemName="scores"
            pending={scores.isFetching}
          />
        </div>
      )}

      <div className="rounded-2xl border border-dashed border-line p-4">
        <p className="rule-label mb-2">Buckets</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
          {BUCKETS.filter((b) => b.value !== "all").map((b) => (
            <span key={b.value} className="flex items-center gap-1.5">
              <Tag tone={b.tone} dot>{ENGAGEMENT_BUCKET_LABELS[b.value as EngagementBucket]}</Tag>
            </span>
          ))}
        </div>
      </div>

      <MemberScoringDialog
        open={!!scoring}
        onOpenChange={(value) => !value && setScoring(null)}
        memberId={scoring?.memberId}
        memberName={scoring ? `${scoring.memberFirstName} ${scoring.memberLastName}` : ""}
      />
    </div>
  );
}
