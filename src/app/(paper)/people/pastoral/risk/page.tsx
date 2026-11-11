"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  HeartPulse,
  PhoneCall,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { PageHeader } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import {
  EmptyState,
  FilterChip,
  PersonAvatar,
  SearchField,
} from "@/components/paper/primitives";
import { StaggerGroup, StaggerItem } from "@/components/paper/motion/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MemberScoringDialog } from "@/components/pastoral/member-scoring-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useRiskScores,
  useRecalculateScores,
  RISK_LEVEL_LABELS,
  RISK_FACTOR_LABELS,
  type RiskLevel,
  type RiskScore,
} from "@/hooks/use-pastoral";
import { cn } from "@/lib/utils";

const LEVEL_TONES: Record<RiskLevel, "rose" | "gold" | "moss"> = {
  critical: "rose",
  high: "rose",
  medium: "gold",
  low: "moss",
};

const LEVELS: { value: RiskLevel | "all"; label: string }[] = [
  { value: "all", label: "All signals" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

function formatDate(value?: string) {
  if (!value) return "Not available";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function RiskRadarPage() {
  const { can, ready } = usePermissions();
  const canRecalculate = ready && can("pastoral", "update");

  const scores = useRiskScores({ limit: 200, sortBy: "score", sortOrder: "desc" });
  const recalculate = useRecalculateScores();

  const [query, setQuery] = React.useState("");
  const [level, setLevel] = React.useState<RiskLevel | "all">("all");
  const [scoring, setScoring] = React.useState<RiskScore | null>(null);

  const rows = React.useMemo(() => {
    const all = scores.data?.data ?? [];
    const q = query.trim().toLowerCase();
    return all.filter((r) => {
      const name = `${r.memberFirstName} ${r.memberLastName}`.toLowerCase();
      return (level === "all" || r.level === level) && (!q || name.includes(q));
    });
  }, [scores.data, query, level]);

  const counts = React.useMemo(() => {
    const all = scores.data?.data ?? [];
    return {
      high: all.filter((r) => r.level === "critical" || r.level === "high").length,
      medium: all.filter((r) => r.level === "medium").length,
      improving: all.filter((r) => r.score < 40).length,
      total: all.length,
    };
  }, [scores.data]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/people/pastoral" className="flex items-center gap-1.5 hover:text-ink">
            <ArrowLeft className="size-3" /> People · Pastoral care
          </Link>
        }
        title="Risk radar."
        description="A soft signal, not a verdict. These are people a quiet season could lose. A conversation may help."
        actions={
          canRecalculate ? (
            <Button
              variant="outline"
              className="h-9 gap-1.5 rounded-full border-line bg-card text-sm"
              disabled={recalculate.isPending}
              onClick={() =>
                recalculate.mutate(undefined, {
                  onSuccess: () => toast("Scores recalculated from the latest activity."),
                  onError: () => toast.error("Recalculation didn&apos;t finish."),
                })
              }
            >
              <RefreshCw className={cn("size-3.5", recalculate.isPending && "animate-spin")} />
              Recalculate
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="High signal" value={counts.high} tone="rose" icon={<HeartPulse className="size-4" />} deltaLabel="worth calling" />
        <StatCard label="Watching" value={counts.medium} tone="gold" />
        <StatCard label="Steady" value={counts.improving} tone="moss" deltaLabel="recent activity" />
        <StatCard label="Scored members" value={counts.total} tone="sky" icon={<Activity className="size-4" />} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchField value={query} onChange={setQuery} placeholder="Search by name…" className="w-full max-w-xs" />
        {LEVELS.map((item) => (
          <FilterChip key={item.value} active={level === item.value} onClick={() => setLevel(item.value)}>
            {item.label}
          </FilterChip>
        ))}
      </div>

      {scores.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<HeartPulse />}
          title="Nothing on the radar"
          description="Either everyone is well-tended, or scores haven&apos;t been calculated yet."
        />
      ) : (
        <StaggerGroup className="space-y-3">
          {rows.map((row) => {
            const name = `${row.memberFirstName} ${row.memberLastName}`;
            return (
              <StaggerItem key={row.id}>
                <div className="paper-card lift rounded-2xl p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <button type="button" onClick={() => setScoring(row)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <PersonAvatar name={name} size="md" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{name}</p>
                        <p className="truncate text-xs text-ink-faint">
                          {row.memberStatus ?? "member"} · last calculated {formatDate(row.calculatedAt)}
                        </p>
                      </div>
                    </button>
                    <div className="flex w-48 shrink-0 items-center gap-2">
                      <div className="flex-1">
                        <div className="flex justify-between text-xs">
                          <span className={cn("num font-semibold", row.level === "critical" || row.level === "high" ? "text-rose" : row.level === "medium" ? "text-gold" : "text-moss")}>
                            {row.score}
                          </span>
                          <span className="text-ink-faint">/ 100</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              row.level === "critical" || row.level === "high" ? "bg-rose" : row.level === "medium" ? "bg-gold" : "bg-moss",
                            )}
                            style={{ width: `${Math.min(100, row.score)}%` }}
                          />
                        </div>
                      </div>
                      <Tag tone={LEVEL_TONES[row.level]} dot>{RISK_LEVEL_LABELS[row.level]}</Tag>
                    </div>
                    <div className="hidden shrink-0 gap-2 md:flex">
                      <Button size="sm" variant="outline" className="h-8 rounded-full border-line text-sm" onClick={() => setScoring(row)}>
                        Why
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 gap-1.5 rounded-full text-sm"
                        onClick={() => toast(`Suggested: a ten-minute walk with ${row.memberFirstName}, no agenda.`)}
                      >
                        <PhoneCall className="size-3.5" /> Reach out
                      </Button>
                    </div>
                  </div>
                  {Object.keys(row.factors ?? {}).length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line/70 pt-3">
                      {Object.entries(row.factors)
                        .filter(([, value]) => Number(value) > 0)
                        .slice(0, 5)
                        .map(([key, value]) => (
                          <span key={key} className="rounded-full bg-muted px-2 py-0.5 text-xs text-ink-soft">
                            {RISK_FACTOR_LABELS[key] ?? key}
                            <span className="num ml-1 text-ink-faint">+{Math.round(Number(value))}</span>
                          </span>
                        ))}
                    </div>
                  ) : null}
                </div>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      )}

      <p className="mx-auto flex max-w-2xl items-start gap-2 rounded-xl border border-dashed border-line p-4 text-sm leading-relaxed text-ink-soft">
        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-brand" />
        This radar is a prompt for presence, not prediction. Scores are heuristic signals; the real discernment is yours. Nobody should ever be
        contacted because a number said so, only because a person cared.
      </p>

      <MemberScoringDialog
        open={!!scoring}
        onOpenChange={(value) => !value && setScoring(null)}
        memberId={scoring?.memberId}
        memberName={scoring ? `${scoring.memberFirstName} ${scoring.memberLastName}` : ""}
      />
    </div>
  );
}
