"use client";

import { ListTable } from "@/components/shared/list-table";
import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown as ArrowUpDownIcon,
  LayoutGrid,
  Rows3,
  Search,
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
import { ExportDropdown } from "@/components/shared/export-dropdown";
import { formatDate } from "@/hooks/use-media";
import type { AggregatedItem } from "@/hooks/use-sermons";

const PAGE_SIZE = 15;

type SortValue = "count" | "name" | "lastDate";

/**
 * Shared browser for the sermon series and speakers aggregates: server payload
 * is complete, so search, sort, paging and export run client-side, and the
 * card design stays per-content (the host passes its own card renderer).
 */
export function SermonAggregateBrowser({
  eyebrow,
  title,
  description,
  nounSingular,
  nounPlural,
  rows,
  isLoading,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  filterParam,
  nameColumnLabel,
  lastColumnLabel,
  renderCard,
}: {
  eyebrow: string;
  title: string;
  description: string;
  nounSingular: string;
  nounPlural: string;
  rows: AggregatedItem[];
  isLoading: boolean;
  emptyIcon: React.ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  /** Query param the sermons archive understands (`series` or `speaker`). */
  filterParam: "series" | "speaker";
  nameColumnLabel: string;
  lastColumnLabel: string;
  renderCard: (item: AggregatedItem, open: () => void) => React.ReactNode;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [sortBy, setSortBy] = React.useState<SortValue>("count");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(PAGE_SIZE);
  const [view, setView] = React.useState<"table" | "cards">("cards");

  const open = (item: AggregatedItem) =>
    router.push(`/library/sermons?${filterParam}=${encodeURIComponent(item.name)}`);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? rows.filter((item) => item.name.toLowerCase().includes(q)) : rows;
    const direction = sortOrder === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name) * direction;
      if (sortBy === "lastDate") return a.lastDate.localeCompare(b.lastDate) * direction;
      return (a.count - b.count) * direction;
    });
  }, [rows, query, sortBy, sortOrder]);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, pages);
  const rowsPage = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  const exportColumns = [
    { key: "name", label: nameColumnLabel },
    { key: "count", label: `${nounPlural} counted` },
    { key: "lastDate", label: lastColumnLabel },
  ];
  const exportData = filtered.map((item) => ({
    name: item.name,
    count: item.count,
    lastDate: item.lastDate ? formatDate(item.lastDate) : "Not available",
  }));

  const manageActions = (item: AggregatedItem) => [
    {
      label: `Open ${nounSingular.toLowerCase()}'s ${nounPlural.toLowerCase()}`,
      icon: <Search />,
      onSelect: () => open(item),
    },
  ];

  const pagination = (
    <div className="paper-card rounded-2xl">
      <ListPaginationFooter
        page={safePage}
        perPage={perPage}
        total={total}
        onPageChange={setPage}
        onPerPageChange={(value) => { setPerPage(value); setPage(1); }}
        itemName={nounPlural.toLowerCase()}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={
          total ? (
            <ExportDropdown
              columns={exportColumns}
              data={exportData}
              title={title}
              filename={filterParam}
              disabled={!total}
            />
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label={nounPlural} value={rows.length} tone="brand" />
        <StatCard label={`${nounSingular} counted`} value={rows.reduce((sum, s) => sum + s.count, 0)} tone="moss" />
        <StatCard label="Most active" value={rows.reduce((max, s) => Math.max(max, s.count), 0)} tone="sky" deltaLabel={`${nounSingular.toLowerCase()} with the most`} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchField
          value={query}
          onChange={(value) => { setQuery(value); setPage(1); }}
          placeholder={`Search ${nounPlural.toLowerCase()}…`}
          className="w-full max-w-xs"
        />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select value={sortBy} onValueChange={(value) => { setSortBy(value as SortValue); setPage(1); }}>
            <SelectTrigger className="h-9 w-44 rounded-full border-line bg-card text-sm shadow-none">
              <ArrowUpDownIcon /> <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="count">Most {nounPlural.toLowerCase()}</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="lastDate">Recently active</SelectItem>
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

      {isLoading ? (
        <div className={view === "cards" ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className={view === "cards" ? "h-32 rounded-2xl" : "h-14 rounded-xl"} />
          ))}
        </div>
      ) : rowsPage.length === 0 ? (
        <EmptyState
          icon={emptyIcon}
          title={query ? `No ${nounPlural.toLowerCase()} match that` : emptyTitle}
          description={query ? "Try a different name, or clear the search." : emptyDescription}
          action={query ? <Button variant="outline" size="sm" className="rounded-full border-line text-sm" onClick={() => { setQuery(""); setPage(1); }}>Clear search</Button> : undefined}
        />
      ) : view === "table" ? (
        <div className="paper-card overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <ListTable className="min-w-[560px]" tableId="sermons-sermon-aggregate-browser-1" recordType="aggregate" records={rowsPage ?? []} recordKey="name">
              <div className="rule-label grid grid-cols-[minmax(0,2.2fr)_0.8fr_1.2fr_auto] items-center gap-3 border-b border-line px-5 py-2.5">
                <span>{nameColumnLabel}</span>
                <span className="text-right">Sermons</span>
                <span>{lastColumnLabel}</span>
                <ManageHeading />
              </div>
              <div className="divide-y divide-line/70">
                {rowsPage.map((item) => (
                  <div
                    key={item.name}
                    className="group grid grid-cols-[minmax(0,2.2fr)_0.8fr_1.2fr_auto] items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
                  >
                    <button type="button" onClick={() => open(item)} className="min-w-0 text-left">
                      <span className="block truncate text-sm font-semibold hover:text-brand">{item.name}</span>
                    </button>
                    <span className="num text-right text-sm tabular-nums">{item.count}</span>
                    <span className="num text-sm text-ink-faint">{item.lastDate ? formatDate(item.lastDate) : "Not available"}</span>
                    <div className="flex justify-end">
                      <RowActions actions={manageActions(item)} />
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
              itemName={nounPlural.toLowerCase()}
            />
          </div>
        </div>
      ) : (
        <>
          <StaggerGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rowsPage.map((item) => (
              <StaggerItem key={item.name}>{renderCard(item, () => open(item))}</StaggerItem>
            ))}
          </StaggerGroup>
          {pagination}
        </>
      )}
    </div>
  );
}
