"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Film,
  Layers,
  Link2,
  PencilLine,
  PlayCircle,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { SectionCard } from "@/components/paper/section";
import { Tag } from "@/components/paper/stat";
import {
  DataList,
  EmptyState,
  FieldRow,
} from "@/components/paper/primitives";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useSermon,
  useSermonsList,
  useIsBookmarked,
  useToggleBookmark,
} from "@/hooks/use-sermons";
import { formatDate } from "@/hooks/use-media";
import { mediaPlaybackUrl, videoEmbedUrl } from "@/lib/media-playback";
import { number } from "@/lib/paper/format";

function fmtDate(value?: string) {
  if (!value) return "Not available";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function duration(seconds?: number) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function SermonDetailPage({
  params,
}: {
  params: Promise<{ sermonId: string }>;
}) {
  const { sermonId } = React.use(params);
  const { can, ready } = usePermissions();
  const canUpdate = ready && can("sermons", "update");

  const sermon = useSermon(sermonId);
  const bookmarked = useIsBookmarked(sermonId);
  const toggleBookmark = useToggleBookmark(sermonId);
  const related = useSermonsList({ series: sermon.data?.seriesName, limit: 6 });

  if (sermon.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-4 w-40 animate-pulse rounded bg-line" />
        <div className="aspect-video w-full animate-pulse rounded-2xl bg-line" />
      </div>
    );
  }

  if (sermon.isError || !sermon.data) {
    return (
      <EmptyState
        icon={<Bookmark />}
        title="We couldn&apos;t find this message"
        description="It may have been deleted, or the link is old."
        action={
          <Button asChild variant="outline" size="sm" className="rounded-full border-line text-xs">
            <Link href="/library/sermons">Back to the archive</Link>
          </Button>
        }
      />
    );
  }

  const s = sermon.data;
  const audio = s.audioUrl ? mediaPlaybackUrl(s.audioUrl) : undefined;
  const embed = s.videoUrl ? videoEmbedUrl(s.videoUrl) : undefined;
  const video = s.videoUrl ? mediaPlaybackUrl(s.videoUrl) : undefined;
  const isBookmarked = !!bookmarked.data?.bookmarked;
  const siblings = (related.data?.data ?? []).filter((r) => r.sermonId !== s.sermonId);

  return (
    <div className="space-y-6">
      <Link href="/library/sermons" className="inline-flex items-center gap-1.5 text-[11px] text-ink-faint hover:text-ink">
        <ArrowLeft className="size-3" /> Library · Sermons
      </Link>

      <div className="paper-card overflow-hidden rounded-2xl">
        <div className="h-2 bg-[linear-gradient(90deg,var(--brand),var(--gold)_55%,var(--moss))]" />
        <div className="flex flex-wrap items-start justify-between gap-4 p-5 md:p-6">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {s.seriesName ? (
                <Link href={`/library/sermons?series=${encodeURIComponent(s.seriesName)}`}>
                  <Tag tone="brand">{s.seriesName}</Tag>
                </Link>
              ) : null}
              <Tag tone="neutral">{fmtDate(s.sermonDate)}</Tag>
              {s.branchName ? <Tag tone="sky">{s.branchName}</Tag> : null}
              {s.archivedAt ? <Tag tone="rose">Archived</Tag> : null}
            </div>
            <h1 className="font-display text-[clamp(1.5rem,3vw,2.2rem)] font-semibold leading-tight tracking-tight">
              {s.title}
            </h1>
            <p className="text-xs text-ink-soft">
              {s.speaker ?? "Unknown speaker"}
              {s.scriptureReference ? <span className="ml-2 font-mono text-brand">{s.scriptureReference}</span> : null}
              {s.durationSeconds ? <span className="num ml-2 text-ink-faint">{duration(s.durationSeconds)}</span> : null}
            </p>
            {s.tags?.length ? (
              <p className="flex flex-wrap gap-1.5">
                {s.tags.map((t) => <Tag key={t} tone="gold">{t}</Tag>)}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={isBookmarked ? "default" : "outline"}
              size="sm"
              className={isBookmarked ? "h-8 gap-1.5 rounded-full text-xs" : "h-8 gap-1.5 rounded-full border-line bg-card text-xs"}
              disabled={toggleBookmark.isPending}
              onClick={() => toggleBookmark.mutate(isBookmarked, {
                onSuccess: () => toast(isBookmarked ? "Removed from your library." : "Saved to your library."),
              })}
            >
              {isBookmarked ? <BookmarkCheck className="size-3.5" /> : <Bookmark className="size-3.5" />}
              {isBookmarked ? "Saved" : "Save"}
            </Button>
            {canUpdate ? (
              <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 rounded-full border-line bg-card text-xs">
                <Link href={`/library/sermons/${s.sermonId}/edit`}>
                  <PencilLine className="size-3.5" /> Edit
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        {audio || embed || video ? (
          <div className="space-y-4 border-t border-line px-5 py-5 md:px-6">
            {audio ? (
              <div className="flex items-center gap-3 rounded-xl border border-line bg-muted/20 p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand text-paper">
                  <PlayCircle className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-ink-faint">
                    Listen
                    <button
                      type="button"
                      className="flex items-center gap-1 normal-case tracking-normal text-brand hover:underline"
                      onClick={() => { navigator.clipboard?.writeText(audio).catch(() => undefined); toast("Audio link copied."); }}
                    >
                      <Link2 className="size-2.5" /> copy link
                    </button>
                  </p>
                  <audio controls preload="metadata" src={audio} className="w-full" />
                </div>
              </div>
            ) : null}
            {embed ? (
              <div className="overflow-hidden rounded-xl border border-line">
                <iframe src={embed} title={s.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="aspect-video w-full" />
              </div>
            ) : video ? (
              <video controls preload="metadata" src={video} className="aspect-video w-full rounded-xl bg-ink" />
            ) : null}
            <p className="flex flex-wrap gap-4 text-[11px]">
              {video ? <a href={video} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-ink-faint hover:text-brand"><ExternalLink className="size-3" /> Original video</a> : null}
              {audio ? <a href={audio} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-ink-faint hover:text-brand"><ExternalLink className="size-3" /> Download audio</a> : null}
            </p>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <SectionCard eyebrow="The shape of it" title="Summary">
          {s.description ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">{s.description}</p>
          ) : (
            <p className="text-xs text-ink-faint">No summary recorded. Add one to help people find this sermon.</p>
          )}
          {audio || video ? null : (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-line px-4 py-3 text-[11px] text-ink-faint">
              <Film className="size-3.5" /> No recording attached yet. Audio and video save independently from the editor.
            </div>
          )}
        </SectionCard>
        <SectionCard eyebrow="Record" title="Details">
          <DataList>
            <FieldRow label="Preached">{fmtDate(s.sermonDate)}</FieldRow>
            <FieldRow label="Speaker">{s.speaker ?? "Not available"}</FieldRow>
            <FieldRow label="Scripture">{s.scriptureReference ?? "Not available"}</FieldRow>
            <FieldRow label="Series">{s.seriesName ?? "Not available"}</FieldRow>
            <FieldRow label="Length">{s.durationSeconds ? `${number(Math.round(s.durationSeconds / 60))} min` : "Not available"}</FieldRow>
            <FieldRow label="In the archive since">{formatDate(s.createdAt)}</FieldRow>
          </DataList>
        </SectionCard>
      </div>

      {s.seriesName && siblings.length ? (
        <SectionCard
          eyebrow={`More in ${s.seriesName}`}
          title="The series continues"
          actions={<Link href={`/library/sermons?series=${encodeURIComponent(s.seriesName)}`} className="flex items-center gap-1 text-[11px] text-brand hover:underline"><Layers className="size-3" /> All parts</Link>}
          bodyClassName="p-0"
        >
          <div className="divide-y divide-line/70">
            {siblings.map((r) => (
              <Link key={r.sermonId} href={`/library/sermons/${r.sermonId}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40">
                <Film className="size-3.5 shrink-0 text-ink-faint" />
                <span className="min-w-0 flex-1 truncate text-xs font-medium">{r.title}</span>
                <span className="num shrink-0 text-[10px] text-ink-faint">{formatDate(r.sermonDate)}</span>
              </Link>
            ))}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
