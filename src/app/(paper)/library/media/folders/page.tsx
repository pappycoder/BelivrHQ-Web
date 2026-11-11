"use client";

import { ListTable } from "@/components/shared/list-table";
import * as React from "react";
import Link from "next/link";
import {
  ArrowUpDown as ArrowUpDownIcon,
  FolderClosed,
  FolderOpen,
  HardDrive,
  LayoutGrid,
  Rows3,
} from "lucide-react";
import { PageHeader } from "@/components/paper/section";
import { StatCard } from "@/components/paper/stat";
import {
  EmptyState,
  ListPaginationFooter,
  ManageHeading,
  RowActions,
  SearchField,
  SortDirectionToggle,
  ViewToggle,
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
import { useMediaFolders, formatDate } from "@/hooks/use-media";
import { number } from "@/lib/paper/format";

const PAGE_SIZE = 15;
const CHART_VARS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

type SortValue = "name" | "count" | "newestAt";

export default function MediaFoldersPage() {
  const folders = useMediaFolders();
  const rows = React.useMemo(() => folders.data ?? [], [folders.data]);
  const totalFiles = rows.reduce((sum, f) => sum + f.count, 0);

  const [query, setQuery] = React.useState("");
  const [sortBy, setSortBy] = React.useState<SortValue>("count");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(PAGE_SIZE);
  const [view, setView] = React.useState<"table" | "cards">("cards");

  // The folders endpoint returns the full folded summary (and is cached
  // server-side), so the controls run client-side over it.
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? rows.filter((f) => f.folder.toLowerCase().includes(q)) : rows;
    const direction = sortOrder === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortBy === "name") return a.folder.localeCompare(b.folder) * direction;
      if (sortBy === "newestAt") return (a.newestAt ?? "").localeCompare(b.newestAt ?? "") * direction;
      return (a.count - b.count) * direction;
    });
  }, [rows, query, sortBy, sortOrder]);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, pages);
  const pageRows = filtered.slice((safePage - 1) * perPage, safePage * perPage);
  // Stable colour bands keyed to the folder name, so a sort doesn't repaint
  // every card into a different hue.
  const colorOf = (name: string) =>
    CHART_VARS[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % CHART_VARS.length];

  const pagination = (
    <div className="paper-card rounded-2xl">
      <ListPaginationFooter
        page={safePage}
        perPage={perPage}
        total={total}
        onPageChange={setPage}
        onPerPageChange={(value) => { setPerPage(value); setPage(1); }}
        itemName="folders"
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/library/media" className="flex items-center gap-1.5 hover:text-ink">
            ← Library · Media
          </Link>
        }
        title="Folders, kept tidy on purpose."
        description="Organised by what the team actually reaches for: Sundays first, archives later."
        actions={
          <Button asChild variant="outline" className="h-9 gap-1.5 rounded-full border-line bg-card text-sm">
            <Link href="/library/media">
              <FolderOpen className="size-3.5" /> Open library
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Folders" value={rows.length} tone="brand" icon={<FolderClosed className="size-4" />} />
        <StatCard label="Files inside" value={totalFiles} tone="moss" deltaLabel="counted" />
        <StatCard label="Most recent activity" value={rows.filter((f) => f.newestAt).length} tone="sky" deltaLabel="folders with new arrivals" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchField
          value={query}
          onChange={(value) => { setQuery(value); setPage(1); }}
          placeholder="Search folders…"
          className="w-full max-w-xs"
        />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select value={sortBy} onValueChange={(value) => { setSortBy(value as SortValue); setPage(1); }}>
            <SelectTrigger className="h-9 w-44 rounded-full border-line bg-card text-sm shadow-none">
              <ArrowUpDownIcon /> <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="count">Most files</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="newestAt">Recently active</SelectItem>
            </SelectContent>
          </Select>
          <SortDirectionToggle
            ascending={sortOrder === "asc"}
            onToggle={() => { setSortOrder((o) => (o === "asc" ? "desc" : "asc")); setPage(1); }}
          />
          <ViewToggle
            value={view}
            onChange={setView}
            options={[
              { value: "table", label: "Table", icon: <Rows3 /> },
              { value: "cards", label: "Cards", icon: <LayoutGrid /> },
            ]}
          />
        </div>
      </div>

      {folders.isLoading ? (
        <div className={view === "cards" ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className={view === "cards" ? "h-32 rounded-2xl" : "h-14 rounded-xl"} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<HardDrive />}
          title="No folders yet"
          description="Folders appear the first time something is uploaded there."
        />
      ) : pageRows.length === 0 ? (
        <EmptyState
          icon={<FolderClosed />}
          title="No folders match that"
          description="Try a different name, or clear the search."
          action={<Button variant="outline" size="sm" className="rounded-full border-line text-sm" onClick={() => { setQuery(""); setPage(1); }}>Clear search</Button>}
        />
      ) : view === "table" ? (
        <div className="paper-card overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <ListTable className="min-w-[560px]" tableId="library-media-folders-1" records={pageRows ?? []} recordKey="folder">
              <div className="rule-label grid grid-cols-[minmax(0,2fr)_0.9fr_1.2fr_auto] items-center gap-3 border-b border-line px-5 py-2.5">
                <span>Folder</span>
                <span className="text-right">Files</span>
                <span>Newest</span>
                <ManageHeading />
              </div>
              <div className="divide-y divide-line/70">
                {pageRows.map((folder) => (
                  <div
                    key={folder.folder}
                    className="group grid grid-cols-[minmax(0,2fr)_0.9fr_1.2fr_auto] items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
                  >
                    <Link
                      href={`/library/media?folder=${encodeURIComponent(folder.folder)}`}
                      className="flex min-w-0 items-center gap-2.5"
                    >
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: colorOf(folder.folder) }}
                      />
                      <span className="truncate text-sm font-semibold hover:text-brand">{folder.folder}</span>
                    </Link>
                    <span className="num text-right text-sm tabular-nums">{number(folder.count)}</span>
                    <span className="num text-sm text-ink-faint">
                      {folder.newestAt ? formatDate(folder.newestAt) : "no files yet"}
                    </span>
                    <div className="flex justify-end">
                      <RowActions
                        actions={[
                          {
                            label: `Open ${folder.folder}`,
                            icon: <FolderOpen />,
                            href: `/library/media?folder=${encodeURIComponent(folder.folder)}`,
                          },
                        ]}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ListTable>
          </div>
          <div className="border-t border-line px-5 py-3">
            <ListPaginationFooter
              page={safePage}
              perPage={perPage}
              total={total}
              onPageChange={setPage}
              onPerPageChange={(value) => { setPerPage(value); setPage(1); }}
              itemName="folders"
            />
          </div>
        </div>
      ) : (
        <>
          <StaggerGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pageRows.map((folder) => (
              <StaggerItem key={folder.folder}>
                <Link
                  href={`/library/media?folder=${encodeURIComponent(folder.folder)}`}
                  className="paper-card lift flex h-full flex-col rounded-2xl p-5"
                >
                  <div className="h-1.5 w-full rounded-full" style={{ background: colorOf(folder.folder) }} />
                  <div className="mt-3 flex flex-1 items-start justify-between">
                    <div>
                      <p className="font-display text-sm font-semibold">{folder.folder}</p>
                      <p className="num mt-1 text-sm text-ink-soft">{number(folder.count)} files</p>
                    </div>
                    <FolderClosed className="size-4 text-ink-faint" />
                  </div>
                  <p className="mt-3 border-t border-line/70 pt-3 text-xs text-ink-faint">
                    {folder.newestAt ? `newest ${formatDate(folder.newestAt)}` : "no files yet"}
                  </p>
                </Link>
              </StaggerItem>
            ))}
          </StaggerGroup>
          {pagination}
        </>
      )}

      <div className="paper-card rounded-2xl p-5">
        <p className="rule-label mb-3">Storage shape</p>
        <div className="flex h-3 overflow-hidden rounded-full bg-muted">
          {filtered.slice(0, 5).map((folder) => (
            <span
              key={folder.folder}
              title={`${folder.folder}: ${folder.count} files`}
              style={{
                width: `${totalFiles ? Math.max(4, Math.round((folder.count / totalFiles) * 100)) : 20}%`,
                background: colorOf(folder.folder),
              }}
            />
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
          Folders are namespacing, not permissions. Each file keeps its own public/members/leadership badge.
        </p>
      </div>
    </div>
  );
}
