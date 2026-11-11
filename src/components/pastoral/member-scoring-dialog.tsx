"use client";

import * as React from "react";
import { Activity, AlertTriangle, ShieldAlert, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useMemberScoring,
  RISK_LEVEL_LABELS,
  RISK_LEVEL_TEXT,
  RISK_FACTOR_LABELS,
  ENGAGEMENT_FACTOR_LABELS,
} from "@/hooks/use-pastoral";

interface FactorBarsProps {
  factors: Record<string, number>;
  labels: Record<string, string>;
  danger?: boolean;
}

function FactorBars({ factors, labels, danger = false }: FactorBarsProps) {
  const entries = Object.entries(factors ?? {});
  if (entries.length === 0) return null;
  const max = Math.max(1, ...entries.map(([, value]) => Number(value) || 0));

  return (
    <div className="space-y-2.5">
      {entries.map(([key, value]) => {
        const numeric = Number(value) || 0;
        return (
          <div key={key}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span>{labels[key] ?? key}</span>
              <span className="text-muted-foreground">
                {Math.round(numeric * 100)}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  danger ? "bg-red-500" : "bg-emerald-500"
                )}
                style={{ width: `${(numeric / max) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface MemberScoringDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId?: string;
  memberName: string;
}

export function MemberScoringDialog({
  open,
  onOpenChange,
  memberId,
  memberName,
}: MemberScoringDialogProps) {
  const query = useMemberScoring(memberId ?? "");

  const data = query.data;
  const hasRisk = !!data?.risk;
  const hasEngagement = !!data?.engagement;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{memberName || "Member"}</DialogTitle>
          <DialogDescription>Factors are normalised indicators from 0% to 100%, rather than the probability of a future outcome.</DialogDescription>
        </DialogHeader>

        {query.isLoading || query.isFetching ? (
          <div className="space-y-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : query.isError ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <p className="text-sm text-muted-foreground">
              Could not load scoring for this member.
            </p>
          </div>
        ) : !hasRisk && !hasEngagement ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <ShieldAlert className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No scoring yet. Run &quot;Recalculate Scores&quot; to generate risk and
              engagement values for all members.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {hasRisk && data?.risk && (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Activity className="h-4 w-4 text-red-500" />
                    Disengagement Risk
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-sm",
                        RISK_LEVEL_TEXT[data.risk.level as keyof typeof RISK_LEVEL_TEXT] ??
                          ""
                      )}
                    >
                      {RISK_LEVEL_LABELS[data.risk.level as keyof typeof RISK_LEVEL_LABELS] ??
                        data.risk.level}
                    </Badge>
                    <span className="text-2xl font-semibold">
                      {Math.round(data.risk.score)}
                    </span>
                  </div>
                </div>
                <FactorBars
                  factors={data.risk.factors}
                  labels={RISK_FACTOR_LABELS}
                  danger
                />
              </section>
            )}

            {hasEngagement && data?.engagement && (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                    Engagement Score
                  </div>
                  <span className="text-2xl font-semibold">
                    {Math.round(data.engagement.score)}
                  </span>
                </div>
                <FactorBars
                  factors={data.engagement.factors}
                  labels={ENGAGEMENT_FACTOR_LABELS}
                />
              </section>
            )}

            {data?.suggestions && data.suggestions.length > 0 && (
              <section>
                <h3 className="mb-2 text-sm font-medium">Suggested follow-ups</h3>
                <ul className="space-y-1.5">
                  {data.suggestions.map((suggestion, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}