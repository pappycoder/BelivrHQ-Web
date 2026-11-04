"use client";

import * as React from "react";
import { Mic2 } from "lucide-react";
import { PersonAvatar } from "@/components/paper/primitives";
import { SermonAggregateBrowser } from "@/components/sermons/sermon-aggregate-browser";
import { useSermonsSpeakers } from "@/hooks/use-sermons";
import { formatDate } from "@/hooks/use-media";

export default function SpeakersPage() {
  const speakers = useSermonsSpeakers();
  const rows = speakers.data ?? [];

  return (
    <SermonAggregateBrowser
      eyebrow="Library · Sermons"
      title="The voices in the room."
      description="Who has preached, how often, and what they&apos;ve given us to keep."
      nounSingular="Speaker"
      nounPlural="Speakers"
      rows={rows}
      isLoading={speakers.isLoading}
      emptyIcon={<Mic2 />}
      emptyTitle="No speakers yet"
      emptyDescription="Names appear here as sermons record who spoke."
      filterParam="speaker"
      nameColumnLabel="Speaker"
      lastColumnLabel="Last spoke"
      renderCard={(item, open) => (
        <button
          type="button"
          onClick={open}
          className="paper-card lift flex h-full w-full flex-col rounded-2xl p-5 text-left"
        >
          <div className="flex items-center gap-3">
            <PersonAvatar name={item.name} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold">{item.name}</p>
              <p className="num text-[11px] text-ink-faint">{item.count} messages on record</p>
            </div>
          </div>
          <div className="mt-4 flex-1" />
          <div className="flex items-center justify-between border-t border-line/70 pt-3 text-[10px] text-ink-faint">
            <span>latest {formatDate(item.lastDate)}</span>
          </div>
        </button>
      )}
    />
  );
}
