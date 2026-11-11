"use client";

import { ListTable } from "@/components/shared/list-table";
import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Download,
  Headphones,
  LayoutGrid,
  PencilLine,
  Plus,
  Rows3,
  Search,
  Video,
} from "lucide-react";
import { api } from "@/lib/api";
import { fetchAllPages, listUrl } from "@/lib/export-all";
import type { ExportColumn } from "@/lib/export-utils";
import { PageHeader } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import {
  EmptyState,
  FilterChip,
  ListPaginationFooter,
  ManageHeading,
  RowActions,
  SearchField,
  SortDirectionToggle,
  ViewToggle,
  type RowAction,
} from "@/components/paper/primitives";
import { StaggerGroup, StaggerItem } from "@/components/paper/motion/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExportDropdown } from "@/components/shared/export-dropdown";
import { usePermissions } from "@/hooks/use-permissions";
import { useCurrentProfile } from "@/hooks/use-profile";
import { useBranchesList } from "@/hooks/use-branches";
import {
  useSermonsList,
  useSermonsSeries,
  useSermonsSpeakers,
  type Sermon,
} from "@/hooks/use-sermons";
import { formatDate } from "@/hooks/use-media";

const PAGE_SIZE = 15;

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: "title", label: "Title" },
  { key: "speaker", label: "Speaker" },
  { key: "series", label: "Series" },
  { key: "date", label: "Date" },
  { key: "scripture", label: "Scripture" },
];

function exportRows(rows: Sermon[]) {
  return rows.map((s) => ({
    title: s.title,
    speaker: s.speaker ?? "",
    series: s.seriesName ?? "",
    date: s.sermonDate?.slice(0, 10) ?? "",
    scripture: s.scriptureReference ?? "",
  }));
}

function duration(seconds?: number) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function SermonsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can, ready } = usePermissions();
  const { data: profile } = useCurrentProfile();
  const isHq = !!profile?.isAdminHq;
  const canCreate = ready && can("sermons:new", "create");
  const canUpdate = ready && can("sermons", "update");

  const [query, setQuery] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(PAGE_SIZE);
  const [sortBy, setSortBy] = React.useState<"sermonDate" | "title" | "createdAt">("sermonDate");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
  const [branchId, setBranchId] = React.useState("all");
  const [archivedView, setArchivedView] = React.useState(false);
  const [view, setView] = React.useState<"rows" | "grid">("rows");
  const series = searchParams.get("series") ?? undefined;
  const speaker = searchParams.get("speaker") ?? undefined;

  React.useEffect(() => {
    const t = setTimeout(() => { setSearch(query); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const branches = useBranchesList({ limit: 100 }, { enabled: isHq });
  const params = React.useMemo(() => ({
    page,
    limit: perPage,
    search: search || undefined,
    series,
    speaker,
    sortBy,
    sortOrder,
    branchId: isHq && branchId !== "all" ? branchId : undefined,
    archived: archivedView ? true : undefined,
  }), [page, perPage, search, series, speaker, sortBy, sortOrder, isHq, branchId, archivedView]);

  const sermons = useSermonsList(params);
  const seriesAgg = useSermonsSeries();
  const speakersAgg = useSermonsSpeakers();

  const rows = React.useMemo(() => sermons.data?.data ?? [], [sermons.data]);
  const total = sermons.data?.total ?? 0;

  // One Manage grammar shared by the table rows and the cards.
  const manageActions = (sermon: Sermon): (RowAction | false | "" | undefined)[] => [
    {
      label: `Open ${sermon.title}`,
      icon: <ArrowUpRight />,
      href: `/library/sermons/${sermon.sermonId}`,
    },
    canUpdate && !sermon.archivedAt && {
      label: "Edit sermon",
      icon: <PencilLine />,
      href: `/library/sermons/${sermon.sermonId}/edit`,
    },
  ];

  const fetchAllExport = React.useCallback(async () => {
    const all = await fetchAllPages<Sermon>((p) =>
      api.get(listUrl("/sermons", { ...params, page: p, limit: 100 })),
    );
    return exportRows(all);
  }, [params]);

  const clearDeepLinks = () => router.push("/library/sermons");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Library · Sermons"
        title="Words worth returning to."
        description="Find sermons by title, speaker and scripture, and share them with your church."
        actions={
          <>
            <ExportDropdown
              tableId="sermons"
              columns={EXPORT_COLUMNS}
              data={exportRows(rows)}
              title="Sermons"
              filename="sermons-export"
              disabled={!rows.length}
              fetchAllRows={fetchAllExport}
            />
            {canCreate ? (
              <Button className="h-9 gap-1.5 rounded-full text-sm" onClick={() => router.push("/library/sermons/new")}>
                <Plus className="size-3.5" /> New sermon
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Sermons" value={total} tone="brand" icon={<BookOpen className="size-4" />} deltaLabel={archivedView ? "archived" : "matching"} />
        <StatCard label="Series" value={seriesAgg.data?.length ?? 0} tone="moss" />
        <StatCard label="Speakers" value={speakersAgg.data?.length ?? 0} tone="sky" />
        <StatCard label="With media" value={rows.filter((s) => s.audioUrl || s.videoUrl).length} tone="gold" deltaLabel="on this page" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchField value={query} onChange={setQuery} placeholder="Search title, speaker or scripture…" className="w-full max-w-xs" />
        <FilterChip active={sortBy === "sermonDate"} onClick={() => { setSortBy("sermonDate"); setPage(1); }}>Newest</FilterChip>
        <FilterChip active={sortBy === "title"} onClick={() => { setSortBy("title"); setPage(1); }}>A–Z</FilterChip>
        <FilterChip active={sortBy === "createdAt"} onClick={() => { setSortBy("createdAt"); setPage(1); }}>Recently added</FilterChip>
        <FilterChip active={archivedView} onClick={() => { setArchivedView((v) => !v); setPage(1); }}>Archived</FilterChip>
        <SortDirectionToggle
          ascending={sortOrder === "asc"}
          onToggle={() => { setSortOrder((o) => (o === "asc" ? "desc" : "asc")); setPage(1); }}
        />
        {isHq ? (
          <Select value={branchId} onValueChange={(value) => { setBranchId(value); setPage(1); }}>
            <SelectTrigger className="h-9 w-44 rounded-full border-line bg-card text-sm shadow-none">
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {(branches.data?.data ?? []).map((branch) => (
                <SelectItem key={branch.branchId} value={branch.branchId}>{branch.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <ViewToggle
          value={view}
          onChange={setView}
          options={[
            { value: "rows", label: "List view", icon: <Rows3 className="size-3.5" /> },
            { value: "grid", label: "Card view", icon: <LayoutGrid className="size-3.5" /> },
          ]}
        />
        <Button asChild variant="ghost" size="sm" className="ml-auto gap-1.5 rounded-full text-sm text-brand">
          <Link href="/library/sermons/series"><Rows3 className="size-3" /> Series</Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="rounded-full text-sm text-brand">
          <Link href="/library/sermons/speakers">Speakers</Link>
        </Button>
      </div>

      {(series || speaker) ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand/30 bg-brand-soft/30 px-4 py-2.5 text-sm">
          <span className="font-medium text-ink">Filtered:</span>
          {series ? <Tag tone="brand">series · {series}</Tag> : null}
          {speaker ? <Tag tone="brand">speaker · {speaker}</Tag> : null}
          <button type="button" onClick={clearDeepLinks} className="ml-auto text-brand hover:underline">Clear</button>
        </div>
      ) : null}

      {sermons.isError ? (
        <EmptyState icon={<Search />} title="Couldn&apos;t load the archive" action={<Button size="sm" variant="outline" className="rounded-full border-line text-sm" onClick={() => sermons.refetch()}>Retry</Button>} />
      ) : sermons.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<BookOpen />}
          title="No sermons match"
          description="Try another name, or clear the filters."
          action={canCreate ? <Button size="sm" variant="outline" className="rounded-full border-line text-sm" onClick={() => router.push("/library/sermons/new")}>Add the first</Button> : undefined}
        />
      ) : view === "grid" ? (
        <>
          <StaggerGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((sermon) => (
              <StaggerItem key={sermon.sermonId}>
                <div className="paper-card lift flex h-full flex-col rounded-2xl p-4">
                  <span className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => router.push(`/library/sermons/${sermon.sermonId}`)}
                      className="flex min-w-0 flex-1 items-start justify-between gap-2 text-left"
                    >
                      <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
                        {sermon.videoUrl ? <Video className="size-4" /> : <Headphones className="size-4" />}
                      </span>
                      <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                        {sermon.seriesName ? <Tag tone="gold">{sermon.seriesName}</Tag> : null}
                        {sermon.archivedAt ? <Tag tone="neutral">Archived</Tag> : null}
                      </span>
                    </button>
                    <RowActions reveal={false} actions={manageActions(sermon)} />
                  </span>
                  <button type="button" onClick={() => router.push(`/library/sermons/${sermon.sermonId}`)} className="mt-3 text-left">
                    <span className="line-clamp-2 font-display text-sm font-semibold leading-snug">{sermon.title}</span>
                    <span className="mt-1 block text-sm text-ink-soft">{sermon.speaker ?? "Unknown speaker"}</span>
                  </button>
                  {sermon.scriptureReference ? <span className="mt-1 font-mono text-xs text-brand">{sermon.scriptureReference}</span> : null}
                  <span className="num mt-auto pt-3 text-xs text-ink-faint">
                    {formatDate(sermon.sermonDate)} · {duration(sermon.durationSeconds) ?? "Not available"}
                    {sermon.audioUrl ? " · audio" : ""}{sermon.videoUrl ? " · video" : ""}
                  </span>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
          <div className="paper-card rounded-2xl">
            <ListPaginationFooter
              page={page}
              perPage={perPage}
              total={total}
              onPageChange={setPage}
              onPerPageChange={setPerPage}
              itemName="messages"
              pending={sermons.isFetching}
            />
          </div>
        </>
      ) : (
        <ListTable className="paper-card divide-y divide-line/70 overflow-hidden rounded-2xl" tableId="library-sermons-1" records={rows ?? []} recordKey="sermonId">
          <div className="rule-label grid grid-cols-[minmax(0,2.4fr)_1fr_0.8fr_0.9fr_0.8fr_1fr_auto] items-center gap-3 border-b border-line px-5 py-2.5">
            <span>Sermon</span>
            <span>Speaker</span>
            <span>Series</span>
            <span>Date</span>
            <span>Length</span>
            <span>Media</span>
            <ManageHeading />
          </div>
          {rows.map((sermon) => (
            <StaggerItem key={sermon.sermonId}>
              <div className="group grid grid-cols-[minmax(0,2.4fr)_1fr_0.8fr_0.9fr_0.8fr_1fr_auto] items-center gap-3 px-5 py-3">
                <button type="button" onClick={() => router.push(`/library/sermons/${sermon.sermonId}`)} className="min-w-0 text-left">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold hover:text-brand">{sermon.title}</span>
                    {sermon.archivedAt ? <Tag tone="neutral">Archived</Tag> : null}
                  </span>
                  <span className="block truncate font-mono text-xs text-brand">{sermon.scriptureReference ?? ""}</span>
                </button>
                <span className="truncate text-sm text-ink-soft">{sermon.speaker ?? "Not available"}</span>
                <span className="truncate">
                  {sermon.seriesName ? (
                    <Tag tone="gold">{sermon.seriesName}</Tag>
                  ) : (
                    <span className="text-sm text-ink-faint">: </span>
                  )}
                </span>
                <span className="num text-sm text-ink-soft">{formatDate(sermon.sermonDate)}</span>
                <span className="num text-sm text-ink-faint">{duration(sermon.durationSeconds) ?? "Not available"}</span>
                <span className="flex items-center gap-1.5 text-ink-faint">
                  {sermon.audioUrl ? <Headphones className="size-3.5 text-moss" aria-label="Has audio" /> : null}
                  {sermon.videoUrl ? <Video className="size-3.5 text-sky" aria-label="Has video" /> : null}
                  {sermon.tags?.length ? <span className="truncate text-xs">#{sermon.tags[0]}</span> : null}
                </span>
                <RowActions actions={manageActions(sermon)} />
              </div>
            </StaggerItem>
          ))}
          <ListPaginationFooter
            page={page}
            perPage={perPage}
            total={total}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
            itemName="messages"
            pending={sermons.isFetching}
          />
        </ListTable>
      )}

      <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-ink-faint">
        <span className="flex items-center gap-1.5"><Download className="size-3" /> Exports honour the active filters</span>
        <span>·</span>
        <span>Series and speakers are compiled from the archive itself</span>
      </div>
    </div>
  );
}

export default function SermonsPage() {
  return (
    <Suspense fallback={<div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>}>
      <SermonsInner />
    </Suspense>
  );
}
