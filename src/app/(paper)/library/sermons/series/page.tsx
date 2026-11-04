"use client";

import * as React from "react";
import { ChevronRight, Layers, Radio } from "lucide-react";
import { Tag } from "@/components/paper/stat";
import { SermonAggregateBrowser } from "@/components/sermons/sermon-aggregate-browser";
import { useSermonsSeries } from "@/hooks/use-sermons";
import { formatDate } from "@/hooks/use-media";

export default function SermonSeriesPage() {
  const series = useSermonsSeries();
  const rows = series.data ?? [];

  return (
    <SermonAggregateBrowser
      eyebrow="Library · Sermons"
      title="Series — messages that keep talking."
      description="Collections people can binge, and preachers can plan a whole season around."
      nounSingular="Series"
      nounPlural="Series"
      rows={rows}
      isLoading={series.isLoading}
      emptyIcon={<Layers />}
      emptyTitle="No series yet"
      emptyDescription="Series form as sermons share a name — a book-by-book plan starts here."
      filterParam="series"
      nameColumnLabel="Series"
      lastColumnLabel="Last preached"
      renderCard={(item, open) => (
        <button
          type="button"
          onClick={open}
          className="paper-card lift flex h-full w-full flex-col rounded-2xl p-5 text-left"
        >
          <div className="flex items-start justify-between">
            <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
              <Radio className="size-4" />
            </span>
            <Tag tone="neutral">{new Date(item.lastDate).getFullYear() || "—"}</Tag>
          </div>
          <p className="mt-3 flex-1 font-display text-base font-semibold leading-snug tracking-tight">{item.name}</p>
          <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-3 text-[11px] text-ink-faint">
            <span className="num">{item.count} messages · last {formatDate(item.lastDate)}</span>
            <ChevronRight className="size-3.5" />
          </div>
        </button>
      )}
    />
  );
}
