"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  CalendarCheck,
  CircleHelp,
  HandCoins,
  Rocket,
  Search,
  Settings2,
  Users,
  X,
} from "lucide-react";
import { helpTopics, type HelpTopic } from "@/lib/help/catalog";
import { searchHelpArticles, type HelpSearchEntry } from "@/lib/help/search";
import { Button } from "@/components/ui/button";
const topicIcons = {
  start: Rocket,
  people: Users,
  attendance: CalendarCheck,
  ministry: CalendarCheck,
  billing: HandCoins,
  workspace: Settings2,
  help: CircleHelp,
};

function HelpSearchUrlSync({ restore }: { restore: (query: string, topic: HelpTopic | "all") => void }) {
  const params = useSearchParams();
  useEffect(() => {
    const chosen = params.get("topic");
    restore((params.get("q") || "").slice(0, 160), helpTopics.some(item => item.id === chosen) ? chosen as HelpTopic : "all");
  }, [params, restore]);
  return null;
}
export function HelpSearch({
  index,
  compact = false,
}: {
  index: HelpSearchEntry[];
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<HelpTopic | "all">("all");
  const restore = useCallback((nextQuery: string, nextTopic: HelpTopic | "all") => {
    setQuery(nextQuery);
    setTopic(nextTopic);
  }, []);
  function update(nextQuery: string, nextTopic: HelpTopic | "all") {
    setQuery(nextQuery);
    setTopic(nextTopic);
    const url = new URL(window.location.href);
    if (nextQuery) url.searchParams.set("q", nextQuery);
    else url.searchParams.delete("q");
    if (nextTopic !== "all") url.searchParams.set("topic", nextTopic);
    else url.searchParams.delete("topic");
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }
  const matching = searchHelpArticles(index, query, topic);
  const showPopular = compact && !query && topic === "all";
  const results = showPopular
    ? matching.filter((article) => article.popular).slice(0, 6)
    : matching;
  return (
    <div className="space-y-8">
      <Suspense fallback={null}><HelpSearchUrlSync restore={restore} /></Suspense>
      <form
        role="search"
        onSubmit={(event) => event.preventDefault()}
        className="relative"
      >
        <label htmlFor="help-search" className="sr-only">
          Search help articles
        </label>
        <Search className="pointer-events-none absolute left-4 top-5 size-5 text-muted-foreground" />
        <input
          id="help-search"
          name="q"
          type="search"
          autoComplete="off"
          maxLength={160}
          value={query}
          onChange={(event) => update(event.target.value, topic)}
          placeholder="Try “import members” or “payment pending”"
          aria-controls="help-results"
          className="h-16 w-full rounded-2xl border bg-card pl-12 pr-14 text-base shadow-sm outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => update("", topic)}
            className="absolute right-3 top-4 rounded-md p-2 text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
          >
            <X className="size-4" />
          </button>
        )}
      </form>
      <section
        aria-label="Help topics"
        className={
          compact
            ? "flex flex-wrap gap-2"
            : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        }
      >
        <button
          type="button"
          aria-pressed={topic === "all"}
          onClick={() => update(query, "all")}
          className={
            compact
              ? `rounded-full border px-3 py-2 text-sm ${topic === "all" ? "border-primary bg-accent" : "bg-card"}`
              : `flex items-start gap-3 rounded-xl border p-5 text-left transition hover:border-primary/50 ${topic === "all" ? "border-primary bg-accent" : "bg-card"}`
          }
        >
          {!compact && (
            <BookOpen className="mt-0.5 size-5 shrink-0 text-primary" />
          )}
          <span>
            <span className="font-medium">All guides</span>
            {!compact && (
              <span className="mt-1 block text-sm text-muted-foreground">
                Find your next step in {index.length} practical guides.
              </span>
            )}
          </span>
        </button>
        {helpTopics.map((item) => {
          const Icon = topicIcons[item.icon];
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={topic === item.id}
              onClick={() => update(query, item.id)}
              className={
                compact
                  ? `rounded-full border px-3 py-2 text-sm ${topic === item.id ? "border-primary bg-accent" : "bg-card"}`
                  : `flex items-start gap-3 rounded-xl border p-5 text-left transition hover:border-primary/50 ${topic === item.id ? "border-primary bg-accent" : "bg-card"}`
              }
            >
              {!compact && (
                <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
              )}
              <span>
                <span className="font-medium">{item.title}</span>
                {!compact && (
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {item.description}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </section>
      <section
        id="help-results"
        aria-labelledby="help-results-title"
        className="space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="help-results-title" className="text-xl font-semibold">
            {query
              ? "Search results"
              : topic === "all"
                ? showPopular
                  ? "Popular guides"
                  : "Explore the guides"
                : helpTopics.find((item) => item.id === topic)?.title}
          </h2>
          <p
            role="status"
            className="min-w-0 max-w-full break-words text-sm text-muted-foreground"
          >
            {results.length} {results.length === 1 ? "guide" : "guides"}
            {query ? ` matching “${query}”` : ""}
          </p>
        </div>
        {showPopular && (
          <Link
            href="/help"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary"
          >
            Browse all {index.length} guides
            <ArrowUpRight className="size-4" />
          </Link>
        )}
        {results.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {results.map((article) => (
              <Link
                key={article.slug}
                href={`/help/${article.slug}`}
                className="group flex min-w-0 flex-col rounded-xl border bg-card p-5 transition hover:border-primary/50 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-primary"
              >
                <span className="mb-3 text-sm font-medium text-primary">
                  {helpTopics.find((item) => item.id === article.topic)?.title}{" "}
                  · {article.minutes} min read
                </span>
                <span className="flex items-start justify-between gap-3 font-semibold">
                  {article.title}
                  <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
                </span>
                <span className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {article.summary}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <h3 className="font-semibold">No matching guides yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Try fewer words, a different topic or a phrase such as “member
              import”. Your church administrator can help with questions these
              guides don’t cover.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => update("", "all")}
            >
              Reset search and topics
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
