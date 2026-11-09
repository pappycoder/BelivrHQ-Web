"use client";

import * as React from "react";
import Link from "next/link";
import { HeartHandshake, Lock, PencilLine, Plus, Search } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/paper/section";
import { StatCard, Tag } from "@/components/paper/stat";
import {
  EmptyState,
  FilterChip,
  ListPaginationFooter,
  PersonAvatar,
  RowActions,
} from "@/components/paper/primitives";
import { StaggerGroup, StaggerItem } from "@/components/paper/motion/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/use-permissions";
import {
  usePastoralNotes,
  CONFIDENTIALITY_LABELS,
  type ConfidentialityLevel,
  type PastoralNote,
} from "@/hooks/use-pastoral";
import { NoteFormDialog } from "@/components/pastoral/note-form-dialog";

const CONF_FILTERS: { value: ConfidentialityLevel | "all"; label: string }[] = [
  { value: "all", label: "All notes" },
  { value: "standard", label: "Standard" },
  { value: "confidential", label: "Confidential" },
  { value: "restricted", label: "Restricted" },
];

const CONF_TONES: Record<ConfidentialityLevel, "neutral" | "gold" | "rose"> = {
  standard: "neutral",
  confidential: "gold",
  restricted: "rose",
};

function formatDate(value?: string) {
  if (!value) return "Not available";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function PastoralNotesPage() {
  const { can, ready } = usePermissions();
  const canCreate = ready && can("pastoral", "create");
  const canUpdate = ready && can("pastoral", "update");

  const [confidentiality, setConfidentiality] = React.useState<ConfidentialityLevel | "all">("all");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(15);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<PastoralNote | null>(null);

  const notes = usePastoralNotes({
    page,
    limit: perPage,
    confidentiality: confidentiality === "all" ? undefined : confidentiality,
    sortBy: "created_at",
    sortOrder: "desc",
  });

  const rows = notes.data?.data ?? [];
  const total = notes.data?.meta?.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <PageHeader
            eyebrow="People · Pastoral care"
            title="The quiet record of caring."
            description="Keep pastoral conversations private and share them only with the people providing care."
            actions={
              canCreate ? (
                <Button className="h-9 gap-1.5 rounded-full text-xs" onClick={() => { setEditTarget(null); setFormOpen(true); }}>
                  <Plus className="size-3.5" /> Add note
                </Button>
              ) : null
            }
          />

          <div className="flex flex-wrap items-center gap-2">
            {CONF_FILTERS.map((item) => (
              <FilterChip
                key={item.value}
                active={confidentiality === item.value}
                onClick={() => { setConfidentiality(item.value); setPage(1); }}
              >
                {item.label}
              </FilterChip>
            ))}
          </div>

          {notes.isError ? (
            <EmptyState
              icon={<Search />}
              title="Couldn&apos;t reach the care log"
              description="Notes will appear as soon as the server answers."
              action={<Button size="sm" variant="outline" className="rounded-full border-line text-xs" onClick={() => notes.refetch()}>Retry</Button>}
            />
          ) : notes.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<HeartHandshake />}
              title="No notes yet"
              description="The first one is often where care becomes deliberate."
            />
          ) : (
            <StaggerGroup className="space-y-3">
              {rows.map((note) => (
                <StaggerItem key={note.id}>
                  <article className="paper-card lift rounded-2xl p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Tag tone={CONF_TONES[note.confidentiality]} dot>
                        {CONFIDENTIALITY_LABELS[note.confidentiality]}
                      </Tag>
                      {note.confidentiality !== "standard" ? (
                        <span className="flex items-center gap-1 text-[10px] text-ink-faint">
                          <Lock className="size-2.5" /> limited audience
                        </span>
                      ) : null}
                      <span className="ml-auto text-[10px] text-ink-faint">{formatDate(note.createdAt)}</span>
                    </div>
                    <p className="mt-3 whitespace-pre-line text-xs leading-relaxed text-ink-soft">
                      {note.content.length > 320 ? `${note.content.slice(0, 320)}…` : note.content}
                    </p>
                    {note.tags.length ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {note.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-ink-soft">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-3 text-[11px]">
                      <Link href={`/people/members/${note.memberId}`} className="flex min-w-0 items-center gap-2 hover:text-brand">
                        <PersonAvatar name={`${note.memberFirstName} ${note.memberLastName}`} size="xs" />
                        <span className="truncate font-medium">{note.memberFirstName} {note.memberLastName}</span>
                      </Link>
                      <span className="flex shrink-0 items-center gap-2 text-ink-faint">
                        with {note.authorFirstName} {note.authorLastName}
                        {canUpdate ? (
                          <RowActions
                            reveal={false}
                            className="justify-start"
                            actions={[
                              {
                                label: "Edit note",
                                icon: <PencilLine />,
                                onSelect: () => { setEditTarget(note); setFormOpen(true); },
                              },
                            ]}
                          />
                        ) : null}
                      </span>
                    </div>
                  </article>
                </StaggerItem>
              ))}
            </StaggerGroup>
          )}

          {rows.length ? (
            <div className="paper-card rounded-2xl">
              <ListPaginationFooter
                page={page}
                perPage={perPage}
                total={total}
                onPageChange={setPage}
                onPerPageChange={setPerPage}
                itemName="notes"
                pending={notes.isFetching}
              />
            </div>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <SectionCard eyebrow="This month" title="Care at a glance">
            <div className="space-y-3">
              <StatCard label="Notes on file" value={total} tone="brand" icon={<HeartHandshake className="size-4" />} />
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-ink-faint">
              {CONFIDENTIALITY_LABELS.confidential} and {CONFIDENTIALITY_LABELS.restricted} notes stay with the
              people carrying them; presence beats paperwork.
            </p>
          </SectionCard>
          <div className="rounded-2xl border border-dashed border-line p-4 text-[11px] leading-relaxed text-ink-soft">
            <p className="mb-1 font-display text-xs font-semibold text-ink">A note on notes</p>
            Record what was said, not what you concluded. Pastoral notes outlive the moment. Write the way you&apos;d want your own story written.
          </div>
          <SectionCard eyebrow="Coming in this wave" title="More of People" bodyClassName="p-3">
            <ul className="space-y-1.5 text-[11px] text-ink-soft">
              <li>· Care calendar &amp; risk radar</li>
              <li>· Life events &amp; engagement</li>
              <li>· Visitor follow-up board</li>
            </ul>
            <p className="mt-2 text-[10px] text-ink-faint">The existing pages remain available as these features are updated.</p>
          </SectionCard>
        </aside>
      </div>

      <NoteFormDialog open={formOpen} onOpenChange={setFormOpen} note={editTarget} />
    </div>
  );
}
