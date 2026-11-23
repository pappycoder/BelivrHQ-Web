"use client";

import { useListFilterState } from "@/hooks/use-list-filter-state";

import { ListToolbar } from "@/components/shared/list-toolbar";

import { ErrorState } from "@/components/shared/error-state";
import { searchResultsState, type SearchRailState } from "@/lib/search-results-state";

import { formatStatusLabel } from "@/lib/status-label";
import { collectionLabel } from "@/lib/collection-label";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  Search as SearchIcon,
  UserRound,
  Users,
} from "lucide-react";
import { SectionCard } from "@/components/paper/section";
import { PageTour, type TourStep } from "@/components/tours/page-tour";
import { useCurrentProfile } from "@/hooks/use-profile";
import { Tag } from "@/components/paper/stat";
import { FilterChip, PersonAvatar } from "@/components/paper/primitives";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/use-permissions";
import { useMembersList, type Member } from "@/hooks/use-members";
import { useEventsList, type EventItem } from "@/hooks/use-events";
import { useSermonsList, type Sermon } from "@/hooks/use-sermons";
import { useFormsList, FORM_STATUS_LABELS, type Form } from "@/hooks/use-forms";
import { useVisitorsList, FOLLOW_UP_STATUSES, type Visitor } from "@/hooks/use-visitors";
import { formatDate } from "@/hooks/use-media";

const SCOPES = ["All", "People", "Gatherings", "Library"] as const;
type Scope = (typeof SCOPES)[number];

const SEARCH_TOUR_STEPS: TourStep[] = [
  { target: ".search-tour-heading", title: "Find people and records", description: "Search brings together the records your account can read. This guide explains how to search and narrow the results. It will keep you on this page." },
  { target: ".search-tour-input", title: "Start with two characters", description: "After the tour, enter at least two characters. Results update after a short pause as you type; you do not need to press Enter. Clear the box to return to the starting view." },
  { target: ".search-tour-scopes", title: "Narrow your search", description: "All searches every available category. People includes members and visitors, Gatherings includes events, and Library includes sermons and forms. Results still depend on your permissions and branch access." },
  { target: ".search-tour-recent", title: "Reuse a recent search", description: "Up to four recent search terms are saved in this browser. They appear when the search box is empty. Select one to run it again with your current category." },
  { target: ".search-tour-browse button", title: "Choose where to look", description: "The category cards set where your next search looks. This People card searches members and visitors; the other cards select Gatherings or Library. Choose a card, then enter a search term. It does not open or change records." },
  { target: ".search-tour-hint", title: "Search within your access", description: "Searches only include records your account is allowed to read. Try another spelling or choose All if a match is missing. Giving transactions and services are not included on this search page." },
  { target: ".search-tour-results", title: "Read the search results", description: "Matches are grouped by record type. This is a short list: up to six members, four visitors, four events, three sermons and three forms. A result count describes the matches shown, rather than every possible record." },
  { target: ".search-results a", title: "Open a matching record", description: "After the tour, select a result to open its details. Check the name, category and supporting information to make sure it is the record you want. The tour does not open results for you." },
  { target: ".search-tour-empty", title: "Try a different search", description: "No visible records matched this search. Try a shorter term, check the spelling or switch to All. A record may also be outside your account's permissions or branch access." },
];

const RECENT_KEY = "belivrhq:search-recent";

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]).slice(0, 4) : [];
  } catch {
    return [];
  }
}

function writeRecent(query: string) {
  try {
    const current = readRecent().filter((r) => r !== query);
    localStorage.setItem(RECENT_KEY, JSON.stringify([query, ...current].slice(0, 4)));
  } catch {
    // Storage is an enhancement, never a gate.
  }
}

type RailProps = { search: string; onSettled: (state: SearchRailState) => void };

function useReportSearchRail(query: { isPending: boolean; isError: boolean }, count: number, onSettled: RailProps["onSettled"]) {
  const status = query.isError ? "error" : query.isPending ? "pending" : "success";
  React.useEffect(() => { onSettled({ status, count: status === "success" ? count : 0 }); }, [status, count, onSettled]);
}

function MemberRail({ search, onSettled }: RailProps) {
  const members = useMembersList({ search, limit: 6, sortBy: "first_name", sortOrder: "asc" });
  const rows: Member[] = members.data?.data ?? [];
  useReportSearchRail(members, rows.length, onSettled);
  if (members.isError) return <ErrorState title="Unable to search members" />;
  if (members.isPending || !rows.length) return null;
  return (
    <SectionCard eyebrow="People" title={`${rows.length} member${rows.length === 1 ? "" : "s"}`} bodyClassName="p-0">
      <div className="divide-y divide-line/70">
        {rows.map((member) => (
          <Link key={member.memberId} href={`/people/members/${member.memberId}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40">
            <PersonAvatar name={`${member.firstName} ${member.lastName}`} src={member.photoUrl} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{member.firstName} {member.lastName}</span>
              <span className="block truncate text-xs text-ink-faint">{member.phone ?? member.email ?? "no contact"} · {formatStatusLabel(member.status)}</span>
            </span>
            <Tag tone="neutral">{member.memberSince?.slice(0, 4) || "member"}</Tag>
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}

function VisitorRail({ search, onSettled }: RailProps) {
  const visitors = useVisitorsList({ search, limit: 4 });
  const rows: Visitor[] = visitors.data?.data ?? [];
  useReportSearchRail(visitors, rows.length, onSettled);
  if (visitors.isError) return <ErrorState title="Unable to search visitors" />;
  if (visitors.isPending || !rows.length) return null;
  return (
    <SectionCard eyebrow="Guests" title={`${rows.length} visitor${rows.length === 1 ? "" : "s"}`} bodyClassName="p-0">
      <div className="divide-y divide-line/70">
        {rows.map((visitor) => (
          <Link key={visitor.id} href={`/people/visitors/${visitor.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40">
            <PersonAvatar name={`${visitor.firstName} ${visitor.lastName ?? ""}`} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{visitor.firstName} {visitor.lastName ?? ""}</span>
              <span className="block truncate text-xs text-ink-faint">{visitor.phone ?? "no phone"} · first visit {formatDate(visitor.firstVisitDate)}</span>
            </span>
            <Tag tone="gold" dot>{FOLLOW_UP_STATUSES.find(item => item.value === visitor.followUpStatus)?.label ?? formatStatusLabel(visitor.followUpStatus)}</Tag>
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}

function EventRail({ search, onSettled }: RailProps) {
  const events = useEventsList({ search, limit: 4 });
  const rows: EventItem[] = events.data?.data ?? [];
  useReportSearchRail(events, rows.length, onSettled);
  if (events.isError) return <ErrorState title="Unable to search events" />;
  if (events.isPending || !rows.length) return null;
  return (
    <SectionCard eyebrow="Gatherings" title={`${rows.length} event${rows.length === 1 ? "" : "s"}`} bodyClassName="p-0">
      <div className="divide-y divide-line/70">
        {rows.map((event) => (
          <Link key={event.eventId} href={`/gatherings/events/${event.eventId}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40">
            <span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-brand">
              <CalendarDays className="size-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{event.title}</span>
              <span className="block text-xs text-ink-faint">{formatDate(event.startDate)} · {event.location ?? "venue TBD"}</span>
            </span>
            {event.isFree ? <Tag tone="moss">Free</Tag> : <Tag tone="gold">Tickets</Tag>}
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}

function SermonRail({ search, onSettled }: RailProps) {
  const sermons = useSermonsList({ search, limit: 3 });
  const rows: Sermon[] = sermons.data?.data ?? [];
  useReportSearchRail(sermons, rows.length, onSettled);
  if (sermons.isError) return <ErrorState title="Unable to search sermons" />;
  if (sermons.isPending || !rows.length) return null;
  return (
    <SectionCard eyebrow="Sermons" title={`${rows.length} message${rows.length === 1 ? "" : "s"}`} bodyClassName="p-0">
      <div className="divide-y divide-line/70">
        {rows.map((sermon) => (
          <Link key={sermon.sermonId} href={`/library/sermons/${sermon.sermonId}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40">
            <span className="grid size-8 place-items-center rounded-lg bg-muted text-ink-faint">
              <BookOpen className="size-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{sermon.title}</span>
              <span className="block text-xs text-ink-faint">{sermon.speaker ?? "Unknown speaker"} · {formatDate(sermon.sermonDate)}</span>
            </span>
            {sermon.seriesName ? <Tag tone="gold">{sermon.seriesName}</Tag> : null}
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}

function FormRail({ search, onSettled }: RailProps) {
  const forms = useFormsList({ search, limit: 3 });
  const rows: Form[] = forms.data?.data ?? [];
  useReportSearchRail(forms, rows.length, onSettled);
  if (forms.isError) return <ErrorState title="Unable to search forms" />;
  if (forms.isPending || !rows.length) return null;
  return (
    <SectionCard eyebrow="Forms" title={`${rows.length} form${rows.length === 1 ? "" : "s"}`} bodyClassName="p-0">
      <div className="divide-y divide-line/70">
        {rows.map((form) => (
          <Link key={form.id} href={`/library/forms/${form.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40">
            <span className="grid size-8 place-items-center rounded-lg bg-sky-soft text-sky">
              <ClipboardList className="size-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{form.title}</span>
              <span className="block text-xs text-ink-faint">{form.fields?.length ?? 0} {collectionLabel(form.fields?.length ?? 0, "questions")} · {form.submissionCount ?? 0} {collectionLabel(form.submissionCount ?? 0, "answers")}</span>
            </span>
            <Tag tone={form.status === "published" ? "moss" : "neutral"} dot>{FORM_STATUS_LABELS[form.status]}</Tag>
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}

function SearchInner() {
  const searchParams = useSearchParams();
  const { can, ready } = usePermissions();
  const { data: profile } = useCurrentProfile();

  const [query, setQuery] = useListFilterState("query", searchParams.get("q") ?? "");
  const [search, setSearch] = useListFilterState("search", "");
  const [scope, setScope] = useListFilterState<Scope>("scope", "All");
  const [recent, setRecent] = React.useState<string[]>([]);
  const [settled, setSettled] = React.useState<{ query: string; rails: Record<string, SearchRailState> }>({ query: "", rails: {} });

  React.useEffect(() => setRecent(readRecent()), []);
  React.useEffect(() => {
    const t = setTimeout(() => {
      const next = query.trim();
      setSearch(next);
      if (next.length >= 2) { writeRecent(next); setRecent(readRecent()); }
    }, 350);
    return () => clearTimeout(t);
  }, [query, setSearch]);

  const active = search.length >= 2;
  const inPeople = scope === "All" || scope === "People";
  const inGatherings = scope === "All" || scope === "Gatherings";
  const inLibrary = scope === "All" || scope === "Library";

  const showMembers = active && inPeople && ready && can("members:all", "read");
  const showVisitors = active && inPeople && ready && can("visitors:list", "read");
  const showEvents = active && inGatherings && ready && can("events:list", "read");
  const showSermons = active && inLibrary && ready && can("sermons:list", "read");
  const showForms = active && inLibrary && ready && can("forms:list", "read");

  const expected = [
    showMembers && "members",
    showVisitors && "visitors",
    showEvents && "events",
    showSermons && "sermons",
    showForms && "forms",
  ].filter(Boolean) as string[];

  const searchKey = `${scope}:${search}`;
  const rails = settled.query === searchKey ? settled.rails : {};
  const { settled: allSettled, total, failed, empty } = searchResultsState(expected, rails);

  const onSettled = React.useMemo(() => {
    const report = (name: string) => (state: SearchRailState) => setSettled((current) => {
      const previous = current.query === searchKey ? current.rails : {};
      return previous[name]?.status === state.status && previous[name]?.count === state.count
        ? current : { query: searchKey, rails: { ...previous, [name]: state } };
    });
    return { members: report("members"), visitors: report("visitors"), events: report("events"), sermons: report("sermons"), forms: report("forms") };
  }, [searchKey]);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <PageTour page="Search" account={profile ? `${profile.churchId}:${profile.profileId}` : undefined} ready={ready && (!active || allSettled)} steps={SEARCH_TOUR_STEPS} />
      </div>
      <div className="pt-4">
        <p className="rule-label text-center">Everything, one box</p>
        <h1 className="search-tour-heading mt-2 text-center font-display text-[clamp(1.6rem,3vw,2.3rem)] font-semibold tracking-tight">
          Who or what are you looking for?
        </h1>
        <div className="search-tour-input relative mx-auto mt-6 max-w-2xl">
          <SearchIcon className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-ink-faint" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="A name, a sermon, an event…"
            className="h-14 rounded-2xl border-line bg-card pl-13 pr-4 text-lg shadow-none"
            aria-label="Search the church register"
          />
        </div>
        {recent.length && !query ? (
          <div className="search-tour-recent mt-3 flex flex-wrap items-center justify-center gap-1.5">
            <span className="text-xs text-ink-faint">Recent:</span>
            {recent.map((item) => (
              <button key={item} type="button" onClick={() => setQuery(item)} className="rounded-full border border-line bg-card px-2.5 py-1 text-xs text-ink-soft hover:border-ink/20 hover:text-ink">
                {item}
              </button>
            ))}
          </div>
        ) : null}
        <ListToolbar inlineFilters>
          {SCOPES.map((item) => (
            <FilterChip key={item} active={scope === item} onClick={() => setScope(item)}>{item}</FilterChip>
          ))}
        </ListToolbar>
      </div>

      {active ? (
        <div className="search-results mx-auto max-w-3xl space-y-4">
          <div className="search-tour-results space-y-1">
            <h2 className="font-display text-lg font-semibold">Search results</h2>
            <p role="status" className="text-sm text-ink-soft">
              {!ready || !allSettled ? "Searching the records you can access…" : failed.length ? (total ? `${total} result${total === 1 ? "" : "s"} shown · some categories are unavailable.` : "Some search results could not be loaded.") : `${total} result${total === 1 ? "" : "s"} shown · only records your account can read.`}
            </p>
          </div>
          {!ready || !allSettled ? (
            <div className="space-y-3">
              {Array.from({ length: Math.min(3, Math.max(1, expected.length)) }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
            </div>
          ) : null}
          {showMembers ? <MemberRail key={`members:${search}`} search={search} onSettled={onSettled.members} /> : null}
          {showVisitors ? <VisitorRail key={`visitors:${search}`} search={search} onSettled={onSettled.visitors} /> : null}
          {showEvents ? <EventRail key={`events:${search}`} search={search} onSettled={onSettled.events} /> : null}
          {showSermons ? <SermonRail key={`sermons:${search}`} search={search} onSettled={onSettled.sermons} /> : null}
          {showForms ? <FormRail key={`forms:${search}`} search={search} onSettled={onSettled.forms} /> : null}
          {ready && empty ? (
            <div className="search-tour-empty paper-card rounded-2xl px-5 py-10 text-center">
              <p className="font-display text-sm font-semibold">Nothing answers to &ldquo;{search}&rdquo;</p>
              <p className="mt-1 text-sm text-ink-faint">Searches only reach what your role can read. Try another term or choose All to search more categories.</p>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mx-auto max-w-2xl">
          <div className="search-tour-browse grid gap-3 sm:grid-cols-3">
            {[
              { icon: Users, title: "People" as Scope, line: "Members and guests, by name or number." },
              { icon: CalendarDays, title: "Gatherings" as Scope, line: "Events, dated and titled." },
              { icon: BookOpen, title: "Library" as Scope, line: "Sermons and forms, found by memory." },
            ].map((card) => (
              <button key={card.title} type="button" onClick={() => setScope(card.title)} className="paper-card lift flex flex-col items-start gap-2 rounded-2xl p-4 text-left">
                <span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand">
                  <card.icon className="size-4" />
                </span>
                <span className="text-sm font-semibold">{card.title}</span>
                <span className="text-xs leading-relaxed text-ink-faint">{card.line}</span>
              </button>
            ))}
          </div>
          <p className="search-tour-hint mt-4 flex items-center justify-center gap-1.5 text-xs text-ink-faint">
            <UserRound className="size-3" />
            Type at least two characters. Results only include records your account can read.
          </p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="mx-auto h-14 max-w-2xl rounded-2xl" /><Skeleton className="mx-auto h-40 max-w-3xl rounded-2xl" /></div>}>
      <SearchInner />
    </Suspense>
  );
}
