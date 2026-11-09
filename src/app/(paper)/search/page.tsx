"use client";

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
import { Tag } from "@/components/paper/stat";
import { FilterChip, PersonAvatar } from "@/components/paper/primitives";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/use-permissions";
import { useMembersList, type Member } from "@/hooks/use-members";
import { useEventsList, type EventItem } from "@/hooks/use-events";
import { useSermonsList, type Sermon } from "@/hooks/use-sermons";
import { useFormsList, type Form } from "@/hooks/use-forms";
import { useVisitorsList, type Visitor } from "@/hooks/use-visitors";
import { formatDate } from "@/hooks/use-media";

const SCOPES = ["All", "People", "Gatherings", "Library"] as const;
type Scope = (typeof SCOPES)[number];

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

type RailProps = { search: string; onSettled: (count: number) => void };

function MemberRail({ search, onSettled }: RailProps) {
  const members = useMembersList({ search, limit: 6, sortBy: "first_name", sortOrder: "asc" });
  const rows: Member[] = members.data?.data ?? [];
  React.useEffect(() => { if (!members.isLoading) onSettled(rows.length); }, [members.isLoading, rows.length, onSettled]);
  if (members.isLoading || !rows.length) return null;
  return (
    <SectionCard eyebrow="People" title={`${rows.length} member${rows.length === 1 ? "" : "s"}`} bodyClassName="p-0">
      <div className="divide-y divide-line/70">
        {rows.map((member) => (
          <Link key={member.memberId} href={`/people/members/${member.memberId}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40">
            <PersonAvatar name={`${member.firstName} ${member.lastName}`} src={member.photoUrl} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium">{member.firstName} {member.lastName}</span>
              <span className="block truncate text-[10px] text-ink-faint">{member.phone ?? member.email ?? "no contact"} · {member.status}</span>
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
  React.useEffect(() => { if (!visitors.isLoading) onSettled(rows.length); }, [visitors.isLoading, rows.length, onSettled]);
  if (visitors.isLoading || !rows.length) return null;
  return (
    <SectionCard eyebrow="Guests" title={`${rows.length} visitor${rows.length === 1 ? "" : "s"}`} bodyClassName="p-0">
      <div className="divide-y divide-line/70">
        {rows.map((visitor) => (
          <Link key={visitor.id} href={`/people/visitors/${visitor.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40">
            <PersonAvatar name={`${visitor.firstName} ${visitor.lastName ?? ""}`} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium">{visitor.firstName} {visitor.lastName ?? ""}</span>
              <span className="block truncate text-[10px] text-ink-faint">{visitor.phone ?? "no phone"} · first visit {formatDate(visitor.firstVisitDate)}</span>
            </span>
            <Tag tone="gold" dot>{visitor.followUpStatus.replace(/_/g, " ")}</Tag>
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}

function EventRail({ search, onSettled }: RailProps) {
  const events = useEventsList({ search, limit: 4 });
  const rows: EventItem[] = events.data?.data ?? [];
  React.useEffect(() => { if (!events.isLoading) onSettled(rows.length); }, [events.isLoading, rows.length, onSettled]);
  if (events.isLoading || !rows.length) return null;
  return (
    <SectionCard eyebrow="Gatherings" title={`${rows.length} event${rows.length === 1 ? "" : "s"}`} bodyClassName="p-0">
      <div className="divide-y divide-line/70">
        {rows.map((event) => (
          <Link key={event.eventId} href={`/gatherings/events/${event.eventId}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40">
            <span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-brand">
              <CalendarDays className="size-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium">{event.title}</span>
              <span className="block text-[10px] text-ink-faint">{formatDate(event.startDate)} · {event.location ?? "venue TBD"}</span>
            </span>
            {event.isFree ? <Tag tone="moss">free</Tag> : <Tag tone="gold">tickets</Tag>}
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}

function SermonRail({ search, onSettled }: RailProps) {
  const sermons = useSermonsList({ search, limit: 3 });
  const rows: Sermon[] = sermons.data?.data ?? [];
  React.useEffect(() => { if (!sermons.isLoading) onSettled(rows.length); }, [sermons.isLoading, rows.length, onSettled]);
  if (sermons.isLoading || !rows.length) return null;
  return (
    <SectionCard eyebrow="Sermons" title={`${rows.length} message${rows.length === 1 ? "" : "s"}`} bodyClassName="p-0">
      <div className="divide-y divide-line/70">
        {rows.map((sermon) => (
          <Link key={sermon.sermonId} href={`/library/sermons/${sermon.sermonId}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40">
            <span className="grid size-8 place-items-center rounded-lg bg-muted text-ink-faint">
              <BookOpen className="size-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium">{sermon.title}</span>
              <span className="block text-[10px] text-ink-faint">{sermon.speaker ?? "Unknown speaker"} · {formatDate(sermon.sermonDate)}</span>
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
  React.useEffect(() => { if (!forms.isLoading) onSettled(rows.length); }, [forms.isLoading, rows.length, onSettled]);
  if (forms.isLoading || !rows.length) return null;
  return (
    <SectionCard eyebrow="Forms" title={`${rows.length} form${rows.length === 1 ? "" : "s"}`} bodyClassName="p-0">
      <div className="divide-y divide-line/70">
        {rows.map((form) => (
          <Link key={form.id} href={`/library/forms/${form.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40">
            <span className="grid size-8 place-items-center rounded-lg bg-sky-soft text-sky">
              <ClipboardList className="size-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium">{form.title}</span>
              <span className="block text-[10px] text-ink-faint">{form.fields?.length ?? 0} questions · {form.submissionCount ?? 0} answers</span>
            </span>
            <Tag tone={form.status === "published" ? "moss" : "neutral"} dot>{form.status}</Tag>
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}

function SearchInner() {
  const searchParams = useSearchParams();
  const { can, ready } = usePermissions();

  const [query, setQuery] = React.useState(searchParams.get("q") ?? "");
  const [search, setSearch] = React.useState("");
  const [scope, setScope] = React.useState<Scope>("All");
  const [recent, setRecent] = React.useState<string[]>([]);
  const [settled, setSettled] = React.useState<Record<string, number>>({});

  React.useEffect(() => setRecent(readRecent()), []);
  React.useEffect(() => {
    const t = setTimeout(() => {
      const next = query.trim();
      setSearch(next);
      setSettled({});
      if (next.length >= 2) { writeRecent(next); setRecent(readRecent()); }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

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

  const settledNames = Object.keys(settled);
  const allSettled = expected.every((name) => settledNames.includes(name));
  const total = settledNames.reduce((sum, name) => sum + (settled[name] ?? 0), 0);

  const onSettled = React.useCallback(
    (name: string) => (count: number) => setSettled((current) => ({ ...current, [name]: count })),
    [],
  );

  return (
    <div className="space-y-6">
      <div className="pt-4">
        <p className="rule-label text-center">Everything, one box</p>
        <h1 className="mt-2 text-center font-display text-[clamp(1.6rem,3vw,2.3rem)] font-semibold tracking-tight">
          Who or what are you looking for?
        </h1>
        <div className="relative mx-auto mt-6 max-w-2xl">
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
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
            <span className="text-[10px] text-ink-faint">Recent:</span>
            {recent.map((item) => (
              <button key={item} type="button" onClick={() => setQuery(item)} className="rounded-full border border-line bg-card px-2.5 py-1 text-[10px] text-ink-soft hover:border-ink/20 hover:text-ink">
                {item}
              </button>
            ))}
          </div>
        ) : null}
        <div className="mt-4 flex justify-center gap-1.5">
          {SCOPES.map((item) => (
            <FilterChip key={item} active={scope === item} onClick={() => setScope(item)}>{item}</FilterChip>
          ))}
        </div>
      </div>

      {active && (!ready || !allSettled) ? (
        <div className="mx-auto max-w-3xl space-y-3">
          {Array.from({ length: Math.min(3, Math.max(1, expected.length)) }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      ) : active && allSettled && total === 0 ? (
        <div className="mx-auto max-w-3xl">
          <div className="paper-card rounded-2xl px-5 py-10 text-center">
            <p className="font-display text-sm font-semibold">Nothing answers to &ldquo;{search}&rdquo;</p>
            <p className="mt-1 text-[11px] text-ink-faint">Searches only reach what your role can read. A person may exist in a branch you don&apos;t see, or sit behind a grant you don&apos;t hold.</p>
          </div>
        </div>
      ) : active ? (
        <div className="mx-auto max-w-3xl space-y-4">
          {showMembers ? <MemberRail search={search} onSettled={onSettled("members")} /> : null}
          {showVisitors ? <VisitorRail search={search} onSettled={onSettled("visitors")} /> : null}
          {showEvents ? <EventRail search={search} onSettled={onSettled("events")} /> : null}
          {showSermons ? <SermonRail search={search} onSettled={onSettled("sermons")} /> : null}
          {showForms ? <FormRail search={search} onSettled={onSettled("forms")} /> : null}
          <p className="text-center text-[10px] text-ink-faint">
            {total} result{total === 1 ? "" : "s"} · every rail runs only on the grants your role holds.
          </p>
        </div>
      ) : (
        <div className="mx-auto max-w-2xl">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Users, title: "People" as Scope, line: "Members and guests, by name or number." },
              { icon: CalendarDays, title: "Gatherings" as Scope, line: "Services and events, dated and titled." },
              { icon: BookOpen, title: "Library" as Scope, line: "Sermons and forms, found by memory." },
            ].map((card) => (
              <button key={card.title} type="button" onClick={() => setScope(card.title)} className="paper-card lift flex flex-col items-start gap-2 rounded-2xl p-4 text-left">
                <span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand">
                  <card.icon className="size-4" />
                </span>
                <span className="text-xs font-semibold">{card.title}</span>
                <span className="text-[10px] leading-relaxed text-ink-faint">{card.line}</span>
              </button>
            ))}
          </div>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-ink-faint">
            <UserRound className="size-3" />
            Two characters start the hunt. Giving rows join once the ledger grant is yours.
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
