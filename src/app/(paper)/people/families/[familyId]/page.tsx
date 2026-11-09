"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Crown,
  Home,
  PencilLine,
  UserRoundPlus,
  Users,
  UserX,
} from "lucide-react";
import { StatCard, Tag } from "@/components/paper/stat";
import {
  DataList,
  EmptyState,
  FieldRow,
  PersonAvatar,
  RowActions,
} from "@/components/paper/primitives";
import { StaggerGroup, StaggerItem } from "@/components/paper/motion/primitives";
import { Button } from "@/components/ui/button";
import { FamilyFormDialog } from "@/components/families/family-form-dialog";
import { DeleteFamilyDialog } from "@/components/families/delete-family-dialog";
import { AddFamilyMemberDialog } from "@/components/families/add-family-member-dialog";
import { RemoveFamilyMemberDialog } from "@/components/families/remove-family-member-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import { useFamily, type FamilyMemberInfo } from "@/hooks/use-families";

function formatDate(value?: string) {
  if (!value) return "Not available";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function FamilyDetailPage({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const { familyId } = React.use(params);
  const { can, ready } = usePermissions();
  const canUpdate = ready && can("families", "update");
  const canDelete = ready && can("families", "delete");

  const family = useFamily(familyId);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [removeTarget, setRemoveTarget] = React.useState<FamilyMemberInfo | null>(null);

  if (family.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-4 w-40 animate-pulse rounded bg-line" />
        <div className="h-64 animate-pulse rounded-2xl bg-line" />
      </div>
    );
  }

  if (family.isError || !family.data) {
    return (
      <EmptyState
        icon={<Home />}
        title="We couldn&apos;t find that household"
        description="The link may be old, or the family removed."
        action={
          <Button asChild variant="outline" size="sm" className="rounded-full border-line text-xs">
            <Link href="/people/families">Back to households</Link>
          </Button>
        }
      />
    );
  }

  const f = family.data;
  const head = f.members.find((m) => m.isHead);

  return (
    <div className="space-y-6">
      <Link
        href="/people/families"
        className="inline-flex items-center gap-1.5 text-[11px] text-ink-faint hover:text-ink"
      >
        <ArrowLeft className="size-3" /> People · Families
      </Link>

      <div className="paper-card rounded-2xl p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand">
              <Home className="size-6" />
            </span>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-semibold tracking-tight">{f.name}</h1>
                {f.archivedAt ? <Tag tone="neutral">Archived</Tag> : null}
              </div>
              <p className="text-xs text-ink-soft">
                {f.members.length} {f.members.length === 1 ? "person" : "people"}
                {head ? ` · headed by ${head.firstName} ${head.lastName}` : " · no head assigned"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canUpdate ? (
              <>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full border-line bg-card text-xs" onClick={() => setEditOpen(true)}>
                  <PencilLine className="size-3.5" /> Edit
                </Button>
                <Button size="sm" className="h-8 gap-1.5 rounded-full text-xs" onClick={() => setAddOpen(true)}>
                  <UserRoundPlus className="size-3.5" /> Add member
                </Button>
              </>
            ) : null}
            {canDelete && !f.archivedAt ? (
              <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full border-line bg-card text-xs text-destructive" onClick={() => setDeleteOpen(true)}>
                <UserX className="size-3.5" /> Delete
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="People together" value={f.members.length} tone="brand" icon={<Users className="size-4" />} />
        <StatCard label="Linked records" value={f.members.filter((m) => m.memberId).length} tone="moss" deltaLabel="with member profiles" />
        <div className="paper-card flex flex-col justify-between gap-4 rounded-2xl p-5">
          <span className="rule-label">Created</span>
          <span className="font-display text-xl font-semibold tracking-tight">{formatDate(f.createdAt)}</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <StaggerGroup className="paper-card divide-y divide-line/70 overflow-hidden rounded-2xl">
          <div className="rule-label px-5 py-2.5">Family members</div>
          {f.members.length ? (
            f.members.map((member) => (
              <StaggerItem key={member.id}>
                <div className="group flex items-center gap-3 px-5 py-3">
                  <PersonAvatar name={`${member.firstName} ${member.lastName}`} size="sm" />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/people/members/${member.memberId}`}
                      className="block truncate text-xs font-semibold hover:text-brand"
                    >
                      {member.firstName} {member.lastName}
                    </Link>
                    <p className="text-[10px] capitalize text-ink-faint">
                      {member.relationship.replace(/[_-]/g, " ")}
                      {member.isHead ? " · head of household" : ""}
                    </p>
                  </div>
                  {member.isHead ? (
                    <span className="flex items-center gap-1 text-[10px] text-gold">
                      <Crown className="size-3" /> head
                    </span>
                  ) : null}
                  <RowActions
                    actions={[
                      canUpdate && {
                        label: `Remove ${member.firstName} ${member.lastName}`,
                        icon: <UserX />,
                        tone: "danger",
                        onSelect: () => setRemoveTarget(member),
                      },
                    ]}
                  />
                </div>
              </StaggerItem>
            ))
          ) : (
            <StaggerItem>
              <p className="px-5 py-10 text-center text-xs text-ink-soft">
                No members linked to this household yet.
              </p>
            </StaggerItem>
          )}
        </StaggerGroup>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="paper-card rounded-2xl p-4">
            <p className="rule-label mb-2">Household notes</p>
            <DataList>
              <FieldRow label="Head">{head ? `${head.firstName} ${head.lastName}` : "Not available"}</FieldRow>
              <FieldRow label="Members">{f.members.length}</FieldRow>
              <FieldRow label="Status">{f.archivedAt ? "Archived" : "Active"}</FieldRow>
            </DataList>
          </div>
          <div className="rounded-2xl border border-dashed border-line p-4 text-[11px] leading-relaxed text-ink-soft">
            <p className="mb-1 font-display text-xs font-semibold text-ink">Care follows families</p>
            A visit note on one person is a visit to the household. Statements,
            greetings, and follow-up all read better with the whole home in view.
          </div>
        </aside>
      </div>

      <FamilyFormDialog open={editOpen} onOpenChange={setEditOpen} family={f} />
      <DeleteFamilyDialog open={deleteOpen} onOpenChange={setDeleteOpen} families={[f]} />
      <AddFamilyMemberDialog open={addOpen} onOpenChange={setAddOpen} family={f} />
      <RemoveFamilyMemberDialog
        open={!!removeTarget}
        onOpenChange={(value) => !value && setRemoveTarget(null)}
        familyId={f.familyId}
        familyName={f.name}
        member={removeTarget}
      />
    </div>
  );
}
