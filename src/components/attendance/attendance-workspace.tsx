"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ClipboardList, Users } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** Both methods describe one gathering; neither is a prerequisite for the other. */
export function AttendanceWorkspace({
  name, scope, children, canSeeHeadcount = true, canSeePeople = true,
  peopleValue = "individual", headcountValue = "general", defaultValue,
  busy = false,
}: {
  name: string;
  scope: string;
  children: ReactNode;
  canSeeHeadcount?: boolean;
  canSeePeople?: boolean;
  peopleValue?: string;
  headcountValue?: string;
  defaultValue?: string;
  busy?: boolean;
}) {
  const [value, setValue] = useState(defaultValue ?? (canSeePeople ? peopleValue : headcountValue));
  useEffect(() => {
    if (canSeeHeadcount && new URLSearchParams(window.location.search).get("tab") === "reported") setValue(headcountValue);
  }, [canSeeHeadcount, headcountValue]);
  return (
    <Tabs value={value} onValueChange={setValue} className="min-w-0 space-y-4">
      <section className="paper-card rounded-2xl p-4 sm:p-5" aria-label="Attendance workspace">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-faint">{scope} · Attendance</p>
            <h2 className="mt-1 break-words font-display text-lg font-semibold">{name}</h2>
          </div>
          <span className="rounded-full border border-line px-3 py-1 text-sm text-ink-muted">Choose either method</span>
        </div>
        <TabsList aria-label="Attendance method" className="grid h-auto w-full grid-cols-1 gap-3 overflow-visible bg-transparent p-0 group-data-[orientation=horizontal]/tabs:h-auto sm:grid-cols-2">
          {canSeePeople && <TabsTrigger disabled={busy} value={peopleValue} className="h-auto justify-start gap-3 whitespace-normal rounded-xl border border-line p-4 text-left data-[state=active]:border-brand data-[state=active]:bg-brand/10 data-[state=active]:shadow-none">
            <Users className="size-5 shrink-0 text-brand" />
            <span><span className="block text-sm font-semibold">Check in people</span><span className="mt-1 block text-sm font-normal leading-relaxed text-ink-muted">Record members and visitors by name.</span></span>
          </TabsTrigger>}
          {canSeeHeadcount && <TabsTrigger disabled={busy} value={headcountValue} className="h-auto justify-start gap-3 whitespace-normal rounded-xl border border-line p-4 text-left data-[state=active]:border-brand data-[state=active]:bg-brand/10 data-[state=active]:shadow-none">
            <ClipboardList className="size-5 shrink-0 text-brand" />
            <span><span className="block text-sm font-semibold">Record headcount</span><span className="mt-1 block text-sm font-normal leading-relaxed text-ink-muted">Save the room total without selecting people.</span></span>
          </TabsTrigger>}
        </TabsList>
        <p className="mt-4 text-sm leading-relaxed text-ink-muted">Use either method independently. Named attendance and headcounts stay separate and are never added together. Attendance saved here applies only to this gathering and date.</p>
      </section>
      {children}
    </Tabs>
  );
}
