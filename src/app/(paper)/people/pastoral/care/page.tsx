"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarHeart,
  Cake,
  Gift,
  PhoneCall,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { PageHeader } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import { EmptyState, PersonAvatar } from "@/components/paper/primitives";
import { StaggerGroup, StaggerItem } from "@/components/paper/motion/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/use-permissions";
import { useLifeEvents } from "@/hooks/use-pastoral";
import { cn } from "@/lib/utils";

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function daysUntil(value: string) {
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return Number.NaN;
  target.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86_400_000);
}

function label(value: string) {
  const d = daysUntil(value);
  if (Number.isNaN(d)) return value;
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d > 1 && d <= 7) return `In ${d} days`;
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

export default function CareCalendarPage() {
  const { ready } = usePermissions();
  const events = useLifeEvents({ limit: 60, upcoming: "true", sortBy: "date", sortOrder: "asc" });

  const rows = (events.data?.data ?? []).filter((event) => !event.archivedAt);
  const thisWeek = rows.filter((event) => {
    const d = daysUntil(event.date);
    return d >= 0 && d <= 7;
  });
  const birthdays = rows.filter((event) => event.type === "birthday");
  const acknowledged = rows.filter((event) => event.notified).length;

  const weekSlots = WEEK.map((day, index) => {
    const offset = index - ((new Date().getDay() + 6) % 7);
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const iso = date.toISOString().slice(0, 10);
    return {
      day,
      number: date.getDate(),
      isToday: offset === 0,
      events: rows.filter((event) => event.date?.slice(0, 10) === iso),
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/people/pastoral" className="flex items-center gap-1.5 hover:text-ink">
            <ArrowLeft className="size-3" /> People · Pastoral care
          </Link>
        }
        title="Care, kept on purpose."
        description="Keep track of important dates and plan a meal, call, card or prayer for someone."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Upcoming" value={rows.length} tone="brand" icon={<CalendarHeart className="size-4" />} />
        <StatCard label="This week" value={thisWeek.length} tone="gold" deltaLabel="send something" />
        <StatCard label="Birthdays ahead" value={birthdays.length} tone="moss" icon={<Cake className="size-4" />} />
        <StatCard label="Acknowledged" value={acknowledged} tone="sky" />
      </div>

      {ready && (events.isLoading ? (
        <Skeleton className="h-24 rounded-2xl" />
      ) : (
        <div className="paper-card overflow-x-auto rounded-2xl p-3">
          <div className="flex min-w-[560px]">
            {weekSlots.map((slot) => (
              <div
                key={slot.day}
                className={cn(
                  "flex-1 rounded-xl px-3 py-3 text-center",
                  slot.isToday ? "bg-brand-soft/70" : "hover:bg-muted/50",
                )}
              >
                <p className={cn("text-xs uppercase tracking-wider", slot.isToday ? "font-semibold text-brand" : "text-ink-faint")}>
                  {slot.day}
                </p>
                <p className="num mt-0.5 text-sm font-semibold">{slot.number}</p>
                <p className="mt-1 flex h-5 items-center justify-center gap-1">
                  {slot.events.slice(0, 2).map((event) => (
                    <span
                      key={event.id}
                      title={`${event.type} · ${event.memberFirstName}`}
                      className={cn(
                        "size-1.5 rounded-full",
                        event.type === "birthday" || event.type === "anniversary"
                          ? "bg-gold"
                          : event.type === "death"
                            ? "bg-ink-faint"
                            : "bg-moss",
                      )}
                    />
                  ))}
                  {slot.events.length > 2 ? (
                    <span className="num text-xs text-ink-faint">+{slot.events.length - 2}</span>
                  ) : null}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="space-y-6">
        {["This week", "Next thirty days", "Further ahead"].map((heading) => {
          const items = rows.filter((event) => {
            const d = daysUntil(event.date);
            if (heading === "This week") return d >= 0 && d <= 7;
            if (heading === "Next thirty days") return d > 7 && d <= 30;
            return d > 30;
          });
          if (!items.length) return null;
          return (
            <section key={heading}>
              <p className="rule-label mb-2">{heading}</p>
              <StaggerGroup className="paper-card divide-y divide-line/70 overflow-hidden rounded-2xl">
                {items.map((event) => (
                  <StaggerItem key={event.id}>
                    <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-ink-soft">
                        {event.type === "birthday" ? <Cake className="size-3.5" /> : <Gift className="size-3.5" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold capitalize">
                            {event.type.replace(/[_-]/g, " ")} · {event.memberFirstName} {event.memberLastName}
                          </p>
                          {event.notified ? <Tag tone="moss">Acknowledged</Tag> : null}
                        </div>
                        <Link
                          href={`/people/members/${event.memberId}`}
                          className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-faint hover:text-brand"
                        >
                          <PersonAvatar name={`${event.memberFirstName} ${event.memberLastName}`} size="xs" />
                          {label(event.date)}
                        </Link>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 shrink-0 gap-1.5 rounded-full border-line bg-card text-sm"
                        onClick={() => toast(`Care prompt drafted for ${event.memberFirstName}.`)}
                      >
                        <PhoneCall className="size-3.5" /> Reach out
                      </Button>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerGroup>
            </section>
          );
        })}
        {!events.isLoading && !rows.length ? (
          <EmptyState
            icon={<CalendarHeart />}
            title="Nothing on the care horizon"
            description="Life events recorded on the notes hub will surface here as they approach."
            action={
              <Button asChild variant="outline" size="sm" className="rounded-full border-line text-sm">
                <Link href="/people/pastoral/life-events">Record a milestone</Link>
              </Button>
            }
          />
        ) : null}
      </div>
    </div>
  );
}
